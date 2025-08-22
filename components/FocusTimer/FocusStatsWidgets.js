import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import {
  Clock,
  CheckCircle,
  Fire,
  Trophy,
  Calendar,
  TrendUp,
  TrendDown,
  ListNumbers,
} from "phosphor-react-native";
import { getFocusSessions } from "../../services/focusSessions";
import CircleLoader from "../common/CircleLoader";
import { FONTS } from "../../constants/fonts";

const { width: screenWidth } = Dimensions.get("window");

export default function FocusStatsWidgets({ themeColors, userId = null }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to log sessions for the last 5 days
  const logLastFiveDaysSessions = () => {
    if (!sessions.length) {
      console.log("No sessions available");
      return;
    }

    const workSessions = sessions.filter((s) => s.mode === "work");
    const today = new Date();

    console.log("=== SESSIONS IN LAST 5 DAYS ===");

    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = workSessions.filter((s) => {
        const sessionDate = s.timestamp?.toDate
          ? s.timestamp.toDate()
          : new Date(s.createdAt);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      const dateString = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      console.log(`${dayName} (${dateString}): ${daySessions.length} sessions`);

      if (daySessions.length > 0) {
        daySessions.forEach((session, index) => {
          const sessionDate = session.timestamp?.toDate
            ? session.timestamp.toDate()
            : new Date(session.createdAt);
          const timeString = sessionDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const durationMinutes = Math.round(session.duration / 60);
          console.log(
            `  ${index + 1}. ${timeString} - ${durationMinutes}m (${
              session.wasCompleted ? "Completed" : "Skipped"
            })`
          );
        });
      }
    }
    console.log("================================");
  };

  // Fetch focus sessions data
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const sessionsData = await getFocusSessions(userId);
        setSessions(sessionsData);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [userId]);

  // Process data for different chart types
  const chartData = useMemo(() => {
    if (!sessions.length) return {};

    // Filter work sessions only
    const workSessions = sessions.filter((s) => s.mode === "work");

    // If no work sessions, return empty data
    if (!workSessions.length) return {};

    // Weekly focus time data (current Sunday to Saturday week)
    const weeklyData = [];
    const today = new Date();

    // Find the most recent Sunday (start of week)
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysSinceSunday = currentDay; // How many days since last Sunday
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - daysSinceSunday);
    lastSunday.setHours(0, 0, 0, 0);

    // Generate data for Sunday through Saturday
    for (let i = 0; i < 7; i++) {
      const date = new Date(lastSunday);
      date.setDate(lastSunday.getDate() + i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = workSessions.filter((s) => {
        const sessionDate = s.timestamp?.toDate
          ? s.timestamp.toDate()
          : new Date(s.createdAt);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      const totalSeconds = daySessions.reduce((sum, s) => sum + s.duration, 0);
      const totalMinutes = totalSeconds / 60;
      weeklyData.push({
        value: Math.round(totalMinutes * 10) / 10,
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        dataPointText:
          totalMinutes < 1 && totalSeconds > 0
            ? `${totalSeconds}s`
            : `${Math.round(totalMinutes)}m`,
        hasData: daySessions.length > 0,
      });
    }

    // Calculate focus streak
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    let lastSessionDay = -1; // Track the last day with a session

    // Check streak backwards from today
    for (let i = 0; i < 365; i++) {
      // Check up to a year back
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const daySessions = workSessions.filter((s) => {
        const sessionDate = s.timestamp?.toDate
          ? s.timestamp.toDate()
          : new Date(s.createdAt);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      if (daySessions.length > 0) {
        tempStreak++;
        if (lastSessionDay === -1) {
          lastSessionDay = i; // Record the most recent day with a session
        }
        if (i === 0) {
          // Today has sessions, this is the current streak
          currentStreak = tempStreak;
        }
      } else {
        // Found a day with no sessions
        if (tempStreak > maxStreak) {
          maxStreak = tempStreak;
        }

        if (i === 0) {
          // Today has no sessions, check if the last session was yesterday
          if (lastSessionDay === 1) {
            // Last session was yesterday, so current streak is 1
            currentStreak = 1;
          } else {
            // There's a gap, no current streak
            currentStreak = 0;
          }
        }

        tempStreak = 0;
      }
    }

    // If we haven't set currentStreak yet and there are sessions, check if the last session was yesterday
    if (currentStreak === 0 && lastSessionDay !== -1) {
      if (lastSessionDay === 1) {
        currentStreak = 1; // Last session was yesterday
      } else {
        currentStreak = 0; // There's a gap
      }
    }

    // Update max streak if current streak is longer
    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
    }

    const streakData = {
      current: currentStreak,
      max: maxStreak,
    };

    // Session completion rate data
    const completedSessions = workSessions.filter((s) => s.wasCompleted).length;
    const totalSessions = workSessions.length;
    const completionRate =
      totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    const completionData = {
      rate: completionRate,
      completed: completedSessions,
      total: totalSessions,
    };

    // Session duration distribution
    const durationRanges = [
      { min: 0, max: 15, label: "0-15m" },
      { min: 15, max: 30, label: "15-30m" },
      { min: 30, max: 60, label: "30-60m" },
      { min: 60, max: 120, label: "60-120m" },
      { min: 120, max: Infinity, label: "120m+" },
    ];

    const durationData = durationRanges.map((range) => {
      const count = workSessions.filter((s) => {
        const minutes = s.duration / 60;
        return minutes >= range.min && minutes < range.max;
      }).length;

      return {
        value: count,
        label: range.label,
        dataPointText: count.toString(),
      };
    });

    // Monthly progress (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(today.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthSessions = workSessions.filter((s) => {
        const sessionDate = s.timestamp?.toDate
          ? s.timestamp.toDate()
          : new Date(s.createdAt);
        return sessionDate >= monthStart && sessionDate <= monthEnd;
      });

      const totalSeconds = monthSessions.reduce(
        (sum, s) => sum + s.duration,
        0
      );
      const totalHours = totalSeconds / 3600;
      const totalMinutes = totalSeconds / 60;

      let dataPointText;
      if (totalSeconds === 0) {
        dataPointText = "-";
      } else if (totalHours >= 1) {
        dataPointText = `${Math.round(totalHours)}h`;
      } else if (totalMinutes >= 1) {
        dataPointText = `${Math.round(totalMinutes)}m`;
      } else {
        dataPointText = `${totalSeconds}s`;
      }

      monthlyData.push({
        value: Math.round(totalHours * 10) / 10,
        label: date.toLocaleDateString("en-US", { month: "short" }),
        dataPointText: dataPointText,
      });
    }

    // --- Calculate this week and last week stats for change widgets ---
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - currentDay);
    thisWeekStart.setHours(0, 0, 0, 0);
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
    thisWeekEnd.setHours(23, 59, 59, 999);

    // Last week (previous Sunday to Saturday)
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekEnd);
    lastWeekEnd.setDate(thisWeekEnd.getDate() - 7);

    const thisWeekSessions = workSessions.filter((s) => {
      const sessionDate = s.timestamp?.toDate
        ? s.timestamp.toDate()
        : new Date(s.createdAt);
      return sessionDate >= thisWeekStart && sessionDate <= thisWeekEnd;
    });
    const lastWeekSessions = workSessions.filter((s) => {
      const sessionDate = s.timestamp?.toDate
        ? s.timestamp.toDate()
        : new Date(s.createdAt);
      return sessionDate >= lastWeekStart && sessionDate <= lastWeekEnd;
    });

    const thisWeekFocusTime = thisWeekSessions.reduce(
      (sum, s) => sum + s.duration,
      0
    );
    const lastWeekFocusTime = lastWeekSessions.reduce(
      (sum, s) => sum + s.duration,
      0
    );
    const thisWeekSessionCount = thisWeekSessions.length;
    const lastWeekSessionCount = lastWeekSessions.length;

    // Calculate percentage change for focus time
    let focusTimeChange = 0;
    let focusTimeChangeDir = "up";
    if (lastWeekFocusTime === 0 && thisWeekFocusTime > 0) {
      focusTimeChange = 100;
      focusTimeChangeDir = "up";
    } else if (lastWeekFocusTime === 0 && thisWeekFocusTime === 0) {
      focusTimeChange = 0;
      focusTimeChangeDir = "up";
    } else {
      focusTimeChange =
        ((thisWeekFocusTime - lastWeekFocusTime) / lastWeekFocusTime) * 100;
      focusTimeChangeDir = focusTimeChange >= 0 ? "up" : "down";
      focusTimeChange = Math.round(focusTimeChange);
    }

    // Calculate absolute change for session count
    const sessionCountChange = thisWeekSessionCount - lastWeekSessionCount;
    const sessionCountChangeDir = sessionCountChange >= 0 ? "up" : "down";

    return {
      weekly: weeklyData,
      streak: streakData,
      completion: completionData,
      duration: durationData,
      monthly: monthlyData,
      focusTimeChange: {
        value: focusTimeChange,
        dir: focusTimeChangeDir,
        thisWeek: thisWeekFocusTime,
        lastWeek: lastWeekFocusTime,
      },
      sessionCountChange: {
        value: sessionCountChange,
        dir: sessionCountChangeDir,
        thisWeek: thisWeekSessionCount,
        lastWeek: lastWeekSessionCount,
      },
    };
  }, [sessions, themeColors]);

  const widgets = [
    {
      id: 0,
      title: "This Week's Focus Time",
      subtitle: "Sunday to Saturday",
      icon: Calendar,
      data: chartData.weekly,
      type: "verticalBar",
      color: themeColors.purple,
      width: "full", // Full width (2 columns)
    },
    {
      id: 1,
      title: "Session Streak",
      icon: Fire,
      data: chartData.streak,
      type: "streak",
      color: themeColors.orange,
      width: "half", // Half width (1 column)
    },
    {
      id: 2,
      title: "Completion Rate",
      icon: CheckCircle,
      data: chartData.completion,
      type: "completion",
      color: themeColors.green || "#22C55E",
      width: "half", // Half width (1 column)
    },
    {
      id: 5,
      title: "Focus Time",
      icon: chartData.focusTimeChange?.dir === "down" ? TrendDown : TrendUp,
      data: chartData.focusTimeChange,
      type: "focusTimeChange",
      color:
        chartData.focusTimeChange?.dir === "down"
          ? themeColors.red
          : themeColors.green || "#22C55E",
      width: "half",
    },
    {
      id: 6,
      title: "Sessions",
      icon: chartData.sessionCountChange?.dir === "down" ? TrendDown : TrendUp,
      data: chartData.sessionCountChange,
      type: "sessionCountChange",
      color:
        chartData.sessionCountChange?.dir === "down"
          ? themeColors.red
          : themeColors.green || "#22C55E",
      width: "half",
    },

    // {
    //   id: 3,
    //   title: "Session Duration Distribution",
    //   subtitle: "How long your sessions are",
    //   icon: Clock,
    //   data: chartData.duration,
    //   type: "duration",
    //   color: themeColors.blue || "#3B82F6",
    //   width: "full", // Full width (2 columns)
    // },
    {
      id: 4,
      title: "Monthly Progress",
      subtitle: "Last 6 months",
      icon: Trophy,
      data: chartData.monthly,
      type: "monthly",
      color: themeColors.purple,
      width: "full", // Full width (2 columns)
    },
  ];

  // Filter widgets to only show those with data
  const availableWidgets = widgets.filter(
    (widget) =>
      widget.data &&
      (widget.type === "streak" ||
      widget.type === "completion" ||
      widget.type === "focusTimeChange" ||
      widget.type === "sessionCountChange"
        ? true
        : widget.data.length > 0)
  );

  const renderWidget = (widget) => {
    if (
      !widget.data ||
      (widget.type !== "streak" &&
        widget.type !== "completion" &&
        widget.type !== "focusTimeChange" &&
        widget.type !== "sessionCountChange" &&
        widget.data.length === 0)
    ) {
      return null;
    }

    const IconComponent = widget.icon;

    const renderChart = () => {
      switch (widget.type) {
        case "verticalBar":
          return (
            <View style={{ alignItems: "center", width: "100%" }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "space-around",
                  width: "100%",
                  height: 160,
                }}
              >
                {widget.data.map((item, index) => {
                  const maxValue = Math.max(...widget.data.map((d) => d.value));
                  const height =
                    maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                  return (
                    <View key={index} style={{ alignItems: "center", flex: 1 }}>
                      <View
                        style={{
                          width: widget.width === "full" ? 24 : 16,
                          height: height,
                          backgroundColor: item.hasData
                            ? widget.color
                            : themeColors.gray || "#E5E7EB",
                          borderRadius: widget.width === "full" ? 4 : 2,
                          marginBottom: 6,
                          opacity: item.hasData ? 1 : 0.3,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: widget.width === "full" ? 14 : 12,
                          color: themeColors.darkGray,
                          fontFamily: FONTS.PRIMARY,
                          textAlign: "center",
                        }}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: widget.width === "full" ? 12 : 10,
                          color: themeColors.black,
                          fontFamily: FONTS.PRIMARY,
                          fontWeight: "bold",
                          marginTop: 2,
                        }}
                      >
                        {item.dataPointText}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        case "streak":
          return (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 120,
              }}
            >
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: "bold",
                  color: widget.color,
                  fontFamily: FONTS.PRIMARY,
                  marginBottom: 8,
                }}
              >
                {widget.data.current}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: themeColors.darkGray,
                  fontFamily: FONTS.PRIMARY,
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                {widget.data.current === 1 ? "day" : "days"}
              </Text>
            </View>
          );
        case "completion":
          return (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 120,
              }}
            >
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: "bold",
                  color: widget.color,
                  fontFamily: FONTS.PRIMARY,
                  marginBottom: 8,
                }}
              >
                {Math.round(widget.data.rate)}%
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: themeColors.darkGray,
                  fontFamily: FONTS.PRIMARY,
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                {widget.data.completed}/{widget.data.total} completed
              </Text>
            </View>
          );
        case "duration":
          return (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 120,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-around",
                  width: "100%",
                }}
              >
                {widget.data.map((item, index) => (
                  <View
                    key={index}
                    style={{
                      alignItems: "center",
                      margin: 8,
                      minWidth: widget.width === "full" ? 60 : 40,
                      flex: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: widget.width === "full" ? 20 : 16,
                        fontWeight: "bold",
                        color: widget.color,
                        fontFamily: FONTS.PRIMARY,
                        marginBottom: 4,
                      }}
                    >
                      {item.value}
                    </Text>
                    <Text
                      style={{
                        fontSize: widget.width === "full" ? 12 : 10,
                        color: themeColors.darkGray,
                        fontFamily: FONTS.PRIMARY,
                        textAlign: "center",
                      }}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        case "monthly":
          return (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 140,
              }}
            >
              <View
                style={{
                  width: "100%",
                  height: "100%",
                }}
              >
                {widget.data.map((item, index) => {
                  const rowIndex = Math.floor(index / 3);
                  const columnIndex = index % 3;
                  const isFirstInRow = columnIndex === 0;
                  const isLastInRow = columnIndex === 2;

                  return (
                    <View
                      key={index}
                      style={{
                        position: "absolute",
                        left: columnIndex * 33.33 + "%",
                        top: rowIndex * 50,
                        width: "33.33%",
                        alignItems: "center",
                        paddingHorizontal: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: widget.width === "full" ? 18 : 14,
                          fontWeight: "bold",
                          color: widget.color,
                          fontFamily: FONTS.PRIMARY,
                          marginBottom: 4,
                        }}
                      >
                        {item.dataPointText}
                      </Text>
                      <Text
                        style={{
                          fontSize: widget.width === "full" ? 12 : 10,
                          color: themeColors.darkGray,
                          fontFamily: FONTS.PRIMARY,
                          textAlign: "center",
                        }}
                      >
                        {item.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        case "focusTimeChange":
          return (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 80,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "bold",
                    color: widget.color,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {widget.data.value > 0 ? "+" : ""}
                  {widget.data.value}%
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: themeColors.darkGray,
                  fontFamily: FONTS.PRIMARY,
                  marginTop: 2,
                  textAlign: "center",
                }}
              >
                {widget.data.thisWeek === 0 && widget.data.lastWeek === 0
                  ? "No focus time yet"
                  : `${widget.data.dir === "up" ? "Up" : "Down"} ${Math.abs(
                      widget.data.value
                    )}% since last week`}
              </Text>
            </View>
          );
        case "sessionCountChange":
          return (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                height: 80,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "bold",
                    color: widget.color,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {widget.data.value > 0 ? "+" : ""}
                  {widget.data.value}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: themeColors.darkGray,
                  fontFamily: FONTS.PRIMARY,
                  marginTop: 2,
                  textAlign: "center",
                }}
              >
                {widget.data.thisWeek === 0 && widget.data.lastWeek === 0
                  ? "No sessions yet"
                  : `${widget.data.dir === "up" ? "Up" : "Down"} ${Math.abs(
                      widget.data.value
                    )} session${
                      Math.abs(widget.data.value) === 1 ? "" : "s"
                    } since last week`}
              </Text>
            </View>
          );
        default:
          return null;
      }
    };

    const getWidgetWidth = () => {
      const baseWidth = screenWidth - 40; // Reduced padding for wider widgets
      if (widget.width === "full") {
        return baseWidth - 8; // Reduced margins for full width
      } else {
        return (baseWidth - 12) / 2 - 10; // Half width widgets now fill available space
      }
    };

    const WidgetContainer = widget.id === 0 ? TouchableOpacity : View;
    const widgetProps =
      widget.id === 0
        ? {
            onPress: logLastFiveDaysSessions,
            activeOpacity: 0.8,
          }
        : {};

    return (
      <WidgetContainer
        key={widget.id}
        {...widgetProps}
        style={{
          backgroundColor: themeColors.white,
          borderRadius: 16,
          padding: 16,
          marginVertical: 8,
          marginHorizontal: 8,
          width: getWidgetWidth(),
          shadowColor: themeColors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        {/* Widget Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: themeColors.black,
              fontFamily: FONTS.PRIMARY,
              flex: 1,
            }}
          >
            {widget.title}
          </Text>
          <IconComponent size={20} color={widget.color} weight="fill" />
        </View>

        {/* Widget Subtitle */}
        <Text
          style={{
            fontSize: 12,
            color: themeColors.darkGray,
            fontFamily: FONTS.PRIMARY,
            marginBottom: widget.subtitle ? 12 : 0,
          }}
        >
          {widget.subtitle}
        </Text>

        {/* Widget Chart */}
        {renderChart()}
      </WidgetContainer>
    );
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircleLoader
          themeColors={themeColors}
          text="Loading focus statistics..."
        />
      </View>
    );
  }

  // Check if all widgets have no data
  const hasAnyData = availableWidgets.length > 0;
  if (!hasAnyData) {
    return (
      <View
        style={{
          backgroundColor: themeColors.white,
          borderRadius: 16,
          marginHorizontal: 0,
          padding: 20,
          shadowColor: themeColors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          alignItems: "center",
          justifyContent: "center",
          height: 300,
        }}
      >
        <Clock
          size={48}
          color={themeColors.purple}
          style={{ marginBottom: 16 }}
        />
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: themeColors.black,
            fontFamily: FONTS.PRIMARY,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          No Focus Data Yet
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: themeColors.darkGray,
            fontFamily: FONTS.PRIMARY,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          Complete some focus sessions to see your detailed statistics and
          progress charts
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 0 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingVertical: 16,
          paddingBottom: 95, // Add extra padding to prevent cutoff by bottom nav bar
        }}
      >
        {availableWidgets.map(renderWidget)}
      </View>
    </ScrollView>
  );
}
