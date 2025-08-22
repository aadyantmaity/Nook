import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import {
  X,
  Clock,
  CheckCircle,
  ArrowRight,
  CaretDown,
  Trash,
  MapPin,
} from "phosphor-react-native";
import {
  getFocusSessions,
  formatDuration,
  formatTimestamp,
  getTotalFocusTime,
  deleteFocusSession,
} from "../../services/focusSessions";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import CircleLoader from "../common/CircleLoader";
import { FONTS } from "../../constants/fonts";

export default function FocusSessionsModal({
  visible,
  onClose,
  colors,
  inline = false,
  fullPage = false,
  navigation,
}) {
  const [sessions, setSessions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [filteredGoals, setFilteredGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [filteredFocusTime, setFilteredFocusTime] = useState(0);

  // Filter states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState("all"); // "all" or month index (0-11)
  const [selectedType, setSelectedType] = useState("sessions"); // "sessions" or "goals"
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    if (visible || fullPage) {
      loadSessions();
      loadGoals();
    }
  }, [visible, fullPage]);

  useEffect(() => {
    filterSessions();
    filterGoals();
  }, [sessions, goals, selectedYear, selectedMonth]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const [sessionsData, totalTime] = await Promise.all([
        getFocusSessions(),
        getTotalFocusTime(),
      ]);
      setSessions(sessionsData);
      setTotalFocusTime(totalTime);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoals = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const archiveRef = doc(db, "goalArchives", user.uid);
      const archiveDoc = await getDoc(archiveRef);

      if (archiveDoc.exists()) {
        const data = archiveDoc.data();
        setGoals(data.goals || []);
      } else {
        setGoals([]);
      }
    } catch (error) {
      console.error("Error loading goals:", error);
      setGoals([]);
    }
  };

  const handleDeleteSession = (session) => {
    Alert.alert("Delete Session", `Do you want to delete this session?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFocusSession(session.id);
            // Reload sessions after deletion
            await loadSessions();
          } catch (error) {
            console.error("Error deleting session:", error);
            Alert.alert("Error", "Failed to delete session. Please try again.");
          }
        },
      },
    ]);
  };

  const handleDeleteGoal = (goalToDelete) => {
    Alert.alert("Delete Goal", `Do you want to delete this archived goal?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const user = auth.currentUser;
            if (!user) return;

            const archiveRef = doc(db, "goalArchives", user.uid);
            const archiveDoc = await getDoc(archiveRef);

            if (archiveDoc.exists()) {
              const currentGoals = archiveDoc.data().goals || [];
              const updatedGoals = currentGoals.filter(
                (goal) =>
                  goal.achievedAt !== goalToDelete.achievedAt ||
                  goal.title !== goalToDelete.title
              );

              await updateDoc(archiveRef, {
                goals: updatedGoals,
              });

              // Reload goals after deletion
              await loadGoals();
            }
          } catch (error) {
            console.error("Error deleting goal:", error);
            Alert.alert("Error", "Failed to delete goal. Please try again.");
          }
        },
      },
    ]);
  };

  const filterSessions = () => {
    let filtered = sessions;

    // Filter by year
    filtered = filtered.filter((session) => {
      const sessionDate = session.timestamp?.toDate
        ? session.timestamp.toDate()
        : new Date(session.createdAt);
      return sessionDate.getFullYear() === selectedYear;
    });

    // Filter by month (only if not "all")
    if (selectedMonth !== "all") {
      filtered = filtered.filter((session) => {
        const sessionDate = session.timestamp?.toDate
          ? session.timestamp.toDate()
          : new Date(session.createdAt);
        return sessionDate.getMonth() === selectedMonth;
      });
    }

    setFilteredSessions(filtered);

    // Calculate filtered focus time
    const filteredTime = filtered
      .filter((session) => session.mode === "work")
      .reduce((total, session) => total + session.duration, 0);
    setFilteredFocusTime(filteredTime);
  };

  const filterGoals = () => {
    let filtered = goals;

    // Filter by year
    filtered = filtered.filter((goal) => {
      const goalDate = new Date(goal.achievedAt);
      return goalDate.getFullYear() === selectedYear;
    });

    // Filter by month (only if not "all")
    if (selectedMonth !== "all") {
      filtered = filtered.filter((goal) => {
        const goalDate = new Date(goal.achievedAt);
        return goalDate.getMonth() === selectedMonth;
      });
    }

    // Sort by achievedAt timestamp in descending order (newest first) to match sessions order
    filtered.sort((a, b) => new Date(b.achievedAt) - new Date(a.achievedAt));

    setFilteredGoals(filtered);
  };

  // Only show years that have sessions (for the selected type)
  const getAvailableYears = () => {
    let items = [];
    if (selectedType === "sessions") {
      items = sessions;
    } else {
      items = goals;
    }
    const yearsSet = new Set(
      items.map((item) => {
        const date =
          selectedType === "sessions"
            ? item.timestamp?.toDate
              ? item.timestamp.toDate()
              : new Date(item.createdAt)
            : new Date(item.achievedAt);
        return date.getFullYear();
      })
    );
    // Sort descending
    return Array.from(yearsSet).sort((a, b) => b - a);
  };

  const getAvailableMonths = () => {
    // Return all 12 months for the selected year
    return Array.from({ length: 12 }, (_, i) => i);
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const DropdownButton = ({ label, value, onPress, isOpen }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: colors.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.purple,
        width: "100%",
      }}
    >
      <Text
        style={{
          color: colors.black,
          fontFamily: FONTS.PRIMARY,
          fontSize: 14,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
      <CaretDown
        size={16}
        color={colors.purple}
        style={{
          transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
          marginLeft: 8,
        }}
      />
    </TouchableOpacity>
  );

  // DropdownMenu with tap-out to close
  const DropdownMenu = ({ items, onSelect, isVisible, onClose }) => {
    if (!isVisible) return null;
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.purple,
            maxHeight: 150,
            elevation: 5,
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {items.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderBottomWidth: index < items.length - 1 ? 1 : 0,
                  borderBottomColor: colors.gray || "#E5E7EB",
                }}
              >
                <Text
                  style={{
                    color: colors.black,
                    fontFamily: FONTS.PRIMARY,
                    fontSize: 14,
                    width: "100%",
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    );
  };

  const getModeIcon = (mode) => {
    return mode === "work" ? (
      <Clock size={16} color={colors.purple} weight="bold" />
    ) : (
      <CheckCircle size={16} color={colors.green || "#22C55E"} weight="bold" />
    );
  };

  const getModeColor = (mode) => {
    return mode === "work" ? colors.purple : colors.green || "#22C55E";
  };

  // Only show "no sessions" or "no goals" message after loading is done AND the first load has completed
  // Instead, show nothing (not even "no sessions found") until loading is done and data is available

  const CardContent = (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: fullPage ? 0 : 16,
        width: fullPage ? "100%" : inline ? "100%" : "90%",
        height: fullPage ? undefined : inline ? undefined : 500,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: fullPage ? 0 : 0.25,
        shadowRadius: fullPage ? 0 : 4,
        elevation: fullPage ? 0 : 5,
        position: "relative",
        overflow: "hidden",
        flex: fullPage ? 1 : undefined,
        marginTop: fullPage ? 0 : undefined,
      }}
    >
      {/* Tap-out overlay for dropdowns */}
      {(showTypeDropdown || showYearDropdown || showMonthDropdown) && (
        <TouchableOpacity
          onPress={() => {
            setShowTypeDropdown(false);
            setShowYearDropdown(false);
            setShowMonthDropdown(false);
          }}
          activeOpacity={1}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 800,
          }}
        />
      )}

      {/* Filters */}
      <View
        style={{
          flexDirection: "row",
          gap: 4,
          marginTop: 12,
          marginBottom: 16,
          width: "100%",
          zIndex: 1000, // Ensure dropdowns and filter row are above tap-out overlay
        }}
      >
        {/* Type Dropdown */}
        <View
          style={{
            width: 110,
            position: "relative",
            zIndex: showTypeDropdown ? 1100 : 1000,
          }}
        >
          <DropdownButton
            label="Type"
            value={selectedType === "sessions" ? "Sessions" : "Goals"}
            onPress={() => {
              setShowTypeDropdown(!showTypeDropdown);
              setShowYearDropdown(false);
              setShowMonthDropdown(false);
            }}
            isOpen={showTypeDropdown}
          />
          <DropdownMenu
            items={["Sessions", "Goals"]}
            onSelect={(type) => setSelectedType(type.toLowerCase())}
            isVisible={showTypeDropdown}
            onClose={() => setShowTypeDropdown(false)}
          />
        </View>

        {/* Year Dropdown */}
        <View
          style={{
            flex: 1,
            position: "relative",
            flexBasis: 0,
            zIndex: showYearDropdown ? 1100 : 1000,
          }}
        >
          <DropdownButton
            label="Year"
            value={selectedYear}
            onPress={() => {
              setShowYearDropdown(!showYearDropdown);
              setShowTypeDropdown(false);
              setShowMonthDropdown(false);
            }}
            isOpen={showYearDropdown}
          />
          <DropdownMenu
            items={getAvailableYears()}
            onSelect={(year) => {
              setSelectedYear(year);
              setShowYearDropdown(false);
            }}
            isVisible={showYearDropdown}
            onClose={() => setShowYearDropdown(false)}
          />
        </View>

        {/* Month Dropdown */}
        <View
          style={{
            flex: 1,
            position: "relative",
            flexBasis: 0,
            zIndex: showMonthDropdown ? 1100 : 1000,
          }}
        >
          <DropdownButton
            label="Month"
            value={selectedMonth === "all" ? "All" : monthNames[selectedMonth]}
            onPress={() => {
              setShowMonthDropdown(!showMonthDropdown);
              setShowTypeDropdown(false);
              setShowYearDropdown(false);
            }}
            isOpen={showMonthDropdown}
          />
          <DropdownMenu
            items={["All", ...monthNames]}
            onSelect={(month) => {
              setSelectedMonth(
                month === "All" ? "all" : monthNames.indexOf(month)
              );
              setShowMonthDropdown(false);
            }}
            isVisible={showMonthDropdown}
            onClose={() => setShowMonthDropdown(false)}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        {/* Main Stats Row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          {selectedType === "sessions" ? (
            <>
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    color: colors.black,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {formatDuration(filteredFocusTime)}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.darkGray || "#6B7280",
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Lifetime Focus
                </Text>
              </View>

              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    color: colors.black,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {filteredSessions.length}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.darkGray || "#6B7280",
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Sessions
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    color: colors.black,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {filteredGoals.length}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.darkGray || "#6B7280",
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Archived Goals
                </Text>
              </View>

              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    color: colors.black,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {goals.length}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.darkGray || "#6B7280",
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Total Goals
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Sessions List */}
      {loading ? (
        <View
          style={{
            alignItems: "center",
            padding: 40,
            paddingHorizontal: 20,
          }}
        >
          <CircleLoader themeColors={colors} text="Loading sessions..." />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {selectedType === "sessions"
              ? filteredSessions.map((session, index) => (
                  <TouchableOpacity
                    key={session.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      backgroundColor: colors.white,
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: colors.darkGray + "70",
                    }}
                    activeOpacity={1}
                  >
                    {/* Session Details */}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color: colors.darkGray || "#6B7280",
                            fontFamily: FONTS.PRIMARY,
                          }}
                        >
                          {formatTimestamp(session.timestamp)}
                        </Text>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "bold",
                            color: getModeColor(session.mode),
                            fontFamily: FONTS.PRIMARY,
                          }}
                        >
                          {formatDuration(session.duration)}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: session.wasCompleted
                                ? colors.green || "#22C55E"
                                : colors.orange,
                              fontFamily: FONTS.PRIMARY,
                            }}
                          >
                            {session.wasCompleted ? "Completed" : "Skipped"}
                          </Text>
                        </View>
                        {session.location && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              marginTop: 2,
                            }}
                          >
                            <MapPin
                              size={12}
                              color={colors.darkGray || "#6B7280"}
                              weight="regular"
                            />
                            <Text
                              style={{
                                fontSize: 12,
                                color: colors.darkGray || "#6B7280",
                                fontFamily: FONTS.PRIMARY,
                                fontStyle: "italic",
                              }}
                            >
                              {session.location.name}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Trash Icon */}
                    <TouchableOpacity
                      onPress={() => handleDeleteSession(session)}
                      style={{ marginLeft: 12 }}
                      hitSlop={10}
                    >
                      <Trash size={20} color={colors.red || "#EF4444"} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              : filteredGoals.map((goal, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      backgroundColor: colors.white,
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: colors.gray || "#E5E7EB",
                    }}
                    activeOpacity={0.7}
                    onPress={() => {}}
                  >
                    {/* Goal Details */}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color: colors.darkGray || "#6B7280",
                            fontFamily: FONTS.PRIMARY,
                          }}
                        >
                          {new Date(goal.achievedAt).toLocaleDateString()}
                        </Text>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "bold",
                            color: colors.purple,
                            fontFamily: FONTS.PRIMARY,
                          }}
                        >
                          {goal.title}
                        </Text>
                        {goal.description && (
                          <Text
                            style={{
                              fontSize: 14,
                              color: colors.darkGray || "#6B7280",
                              fontFamily: FONTS.PRIMARY,
                            }}
                          >
                            {goal.description}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Trash Icon */}
                    <TouchableOpacity
                      onPress={() => handleDeleteGoal(goal)}
                      style={{ marginLeft: 12 }}
                      hitSlop={10}
                    >
                      <Trash size={20} color={colors.red || "#EF4444"} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  if (inline) {
    return <View style={{ width: "100%" }}>{CardContent}</View>;
  }

  if (fullPage) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        {CardContent}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            flex: 1,
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {CardContent}
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
