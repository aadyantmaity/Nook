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
import { doc, getDoc } from "firebase/firestore";
import CircleLoader from "../common/CircleLoader";
import { FONTS } from "../../constants/fonts";

export default function FocusSessionsModal({ visible, onClose, colors }) {
  const [sessions, setSessions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [filteredGoals, setFilteredGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalFocusTime, setTotalFocusTime] = useState(0);
  const [filteredFocusTime, setFilteredFocusTime] = useState(0);

  // Filter states
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedType, setSelectedType] = useState("sessions"); // "sessions" or "goals"
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSessions();
      loadGoals();
    }
  }, [visible]);

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

  const filterSessions = () => {
    let filtered = sessions;

    // Filter by year
    filtered = filtered.filter((session) => {
      const sessionDate = session.timestamp?.toDate
        ? session.timestamp.toDate()
        : new Date(session.createdAt);
      return sessionDate.getFullYear() === selectedYear;
    });

    // Filter by month
    filtered = filtered.filter((session) => {
      const sessionDate = session.timestamp?.toDate
        ? session.timestamp.toDate()
        : new Date(session.createdAt);
      return sessionDate.getMonth() === selectedMonth;
    });

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

    // Filter by month
    filtered = filtered.filter((goal) => {
      const goalDate = new Date(goal.achievedAt);
      return goalDate.getMonth() === selectedMonth;
    });

    setFilteredGoals(filtered);
  };

  const getAvailableYears = () => {
    const years = [
      ...new Set(
        sessions.map((session) => {
          const sessionDate = session.timestamp?.toDate
            ? session.timestamp.toDate()
            : new Date(session.createdAt);
          return sessionDate.getFullYear();
        })
      ),
    ];
    return years.sort((a, b) => b - a);
  };

  const getAvailableMonths = () => {
    const months = [
      ...new Set(
        sessions
          .filter((session) => {
            const sessionDate = session.timestamp?.toDate
              ? session.timestamp.toDate()
              : new Date(session.createdAt);
            return sessionDate.getFullYear() === selectedYear;
          })
          .map((session) => {
            const sessionDate = session.timestamp?.toDate
              ? session.timestamp.toDate()
              : new Date(session.createdAt);
            return sessionDate.getMonth();
          })
      ),
    ];
    return months.sort((a, b) => a - b);
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
        minWidth: 100,
      }}
    >
      <Text
        style={{
          color: colors.black,
          fontFamily: FONTS.PRIMARY,
          fontSize: 14,
        }}
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

  const DropdownMenu = ({ items, onSelect, isVisible, onClose }) => {
    if (!isVisible) return null;

    return (
      <View
        style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          backgroundColor: colors.white,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.purple,
          maxHeight: 150,
          zIndex: 1000,
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
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
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
            style={{
              backgroundColor: colors.white,
              borderRadius: 16,
              width: "90%",
              height: 500,
              borderWidth: 1,
              borderColor: colors.black,
              shadowColor: colors.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 20,
                paddingBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: colors.black,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {selectedType === "sessions"
                  ? "Focus Sessions"
                  : "Archived Goals"}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <X size={24} color={colors.black} />
              </TouchableOpacity>
            </View>

            {/* Filters */}
            <View
              style={{
                flexDirection: "row",
                gap: 6,
                paddingHorizontal: 20,
                marginBottom: 16,
              }}
            >
              {/* Type Dropdown */}
              <View style={{ flex: 1, position: "relative" }}>
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
              <View style={{ flex: 1, position: "relative" }}>
                <DropdownButton
                  label="Year"
                  value={selectedYear.toString()}
                  onPress={() => {
                    setShowYearDropdown(!showYearDropdown);
                    setShowMonthDropdown(false);
                    setShowTypeDropdown(false);
                  }}
                  isOpen={showYearDropdown}
                />
                <DropdownMenu
                  items={getAvailableYears().map((year) => year.toString())}
                  onSelect={(year) => setSelectedYear(parseInt(year))}
                  isVisible={showYearDropdown}
                  onClose={() => setShowYearDropdown(false)}
                />
              </View>

              {/* Month Dropdown */}
              <View style={{ flex: 1, position: "relative" }}>
                <DropdownButton
                  label="Month"
                  value={monthNames[selectedMonth]}
                  onPress={() => {
                    setShowMonthDropdown(!showMonthDropdown);
                    setShowYearDropdown(false);
                    setShowTypeDropdown(false);
                  }}
                  isOpen={showMonthDropdown}
                />
                <DropdownMenu
                  items={getAvailableMonths().map((month) => monthNames[month])}
                  onSelect={(monthName) => {
                    const monthIndex = monthNames.indexOf(monthName);
                    setSelectedMonth(monthIndex);
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
            ) : selectedType === "sessions" && filteredSessions.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  padding: 40,
                  paddingHorizontal: 20,
                }}
              >
                <Clock size={48} color={colors.darkGray || "#6B7280"} />
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 16,
                    color: colors.darkGray || "#6B7280",
                    fontFamily: FONTS.PRIMARY,
                    textAlign: "center",
                  }}
                >
                  No sessions in this period
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    color: colors.darkGray || "#6B7280",
                    fontFamily: FONTS.PRIMARY,
                    textAlign: "center",
                    opacity: 0.8,
                  }}
                >
                  Try selecting a different time period
                </Text>
              </View>
            ) : selectedType === "goals" && filteredGoals.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  padding: 40,
                  paddingHorizontal: 20,
                }}
              >
                <Clock size={48} color={colors.darkGray || "#6B7280"} />
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 16,
                    color: colors.darkGray || "#6B7280",
                    fontFamily: FONTS.PRIMARY,
                    textAlign: "center",
                  }}
                >
                  No archived goals in this period
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    color: colors.darkGray || "#6B7280",
                    fontFamily: FONTS.PRIMARY,
                    textAlign: "center",
                    opacity: 0.8,
                  }}
                >
                  Complete some goals to see them here
                </Text>
              </View>
            ) : (
              <View style={{ flex: 1, paddingHorizontal: 20 }}>
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
                            borderColor: colors.gray || "#E5E7EB",
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
                                  {session.wasCompleted
                                    ? "Completed"
                                    : "Skipped"}
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
                          <View style={{ marginLeft: 12 }}>
                            <Trash size={20} color={colors.red || "#EF4444"} />
                          </View>
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

                          {/* Completed Icon */}
                          <View style={{ marginLeft: 12 }}>
                            <CheckCircle
                              size={24}
                              color={colors.green || "#22C55E"}
                              weight="fill"
                            />
                          </View>
                        </TouchableOpacity>
                      ))}
                </ScrollView>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
