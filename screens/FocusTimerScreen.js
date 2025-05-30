import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  AppState,
  ScrollView,
  TextInput, // <-- add this
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ArrowLeft,
  Timer,
  MapPin,
  Play,
  Pause,
  Stop,
} from "phosphor-react-native";
import { db, auth } from "../firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  query,
  where,
  deleteDoc, // <-- add this
} from "firebase/firestore";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";

const POMODORO_MINUTES = 25;
const BREAK_MINUTES = 5;

export default function FocusTimerScreen({ navigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  const [studySpots, setStudySpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [timer, setTimer] = useState(POMODORO_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [focusStats, setFocusStats] = useState({});
  const [showSpotModal, setShowSpotModal] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);

  // Track timer start time and duration for persistence
  const timerStartRef = useRef(null); // {start: Date, duration: seconds}
  const appState = useRef(AppState.currentState);

  // Add a unique key for saving timer state
  const TIMER_STATE_KEY = "focusTimerState";

  // Goal state
  const [goalMinutes, setGoalMinutes] = useState(null);
  const [goalInput, setGoalInput] = useState("");
  const [goalTitle, setGoalTitle] = useState(""); // <-- add this
  const [goalTitleInput, setGoalTitleInput] = useState(""); // <-- add this
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Fetch study spots for location selection
  useEffect(() => {
    const fetchSpots = async () => {
      const snapshot = await getDocs(collection(db, "studySpots"));
      setStudySpots(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    };
    fetchSpots();
  }, []);

  // Fetch focus stats for the current user
  useEffect(() => {
    const fetchStats = async () => {
      if (!auth.currentUser) return;
      const stats = {};
      const weekAgo = Timestamp.now().toMillis() - 7 * 24 * 60 * 60 * 1000;
      const q = query(
        collection(db, "focusSessions"),
        where("userId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.spotId && data.start && data.end) {
          const start = data.start.seconds
            ? data.start.seconds * 1000
            : data.start.toMillis();
          const end = data.end.seconds
            ? data.end.seconds * 1000
            : data.end.toMillis();
          if (end > weekAgo) {
            stats[data.spotId] = (stats[data.spotId] || 0) + (end - start);
          }
        }
      });
      setFocusStats(stats);
    };
    fetchStats();
    // Only update stats after a session ends, not on every isRunning change
    // eslint-disable-next-line
  }, [isBreak]); // Change dependency from [isRunning] to [isBreak]

  // AppState effect to handle background/foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App has come to the foreground
        if (isRunning && timerStartRef.current) {
          const now = Date.now();
          const elapsed = Math.floor(
            (now - timerStartRef.current.start) / 1000
          );
          const newTime = Math.max(timerStartRef.current.duration - elapsed, 0);
          setTimer(newTime);
          if (newTime === 0) {
            setIsRunning(false);
            handleSessionEnd();
          }
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line
  }, [isRunning, timer]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      // Save start time and duration for persistence
      if (!timerStartRef.current) {
        timerStartRef.current = {
          start: Date.now(),
          duration: timer,
        };
      }
      const id = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(id);
            handleSessionEnd();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      setIntervalId(id);
      return () => clearInterval(id);
    } else if (intervalId) {
      clearInterval(intervalId);
      timerStartRef.current = null; // Clear ref when paused/stopped
    }
    // eslint-disable-next-line
  }, [isRunning]);

  // Restore timer state on mount or when screen regains focus
  useEffect(() => {
    const restoreTimerState = async () => {
      try {
        const saved = await AsyncStorage.getItem(TIMER_STATE_KEY);
        if (saved) {
          const state = JSON.parse(saved);
          if (state && typeof state.timer === "number") {
            setTimer(state.timer);
            setIsBreak(state.isBreak || false);
            setSelectedSpot(state.selectedSpot || null);
            setSessionStart(
              state.sessionStart
                ? new Timestamp(
                    state.sessionStart.seconds,
                    state.sessionStart.nanoseconds
                  )
                : null
            );
            setGoalMinutes(state.goalMinutes || null);
            setGoalTitle(state.goalTitle || ""); // restore title
            setIsRunning(false); // Always paused on restore
          }
        }
      } catch {}
    };
    restoreTimerState();
    // eslint-disable-next-line
  }, []);

  // Save timer state when paused or before leaving the screen
  useEffect(() => {
    const saveTimerState = async () => {
      if (!isRunning && timer > 0) {
        try {
          await AsyncStorage.setItem(
            TIMER_STATE_KEY,
            JSON.stringify({
              timer,
              isBreak,
              selectedSpot,
              sessionStart,
              goalMinutes,
              goalTitle, // save title
            })
          );
        } catch {}
      }
    };
    saveTimerState();
    // eslint-disable-next-line
  }, [
    isRunning,
    timer,
    isBreak,
    selectedSpot,
    sessionStart,
    goalMinutes,
    goalTitle,
  ]);

  // Clear timer state from storage when stopped or completed
  const clearTimerState = async () => {
    try {
      await AsyncStorage.removeItem(TIMER_STATE_KEY);
    } catch {}
    // Do NOT clear goalMinutes here
  };

  // Fetch study spots for location selection
  useEffect(() => {
    const fetchSpots = async () => {
      const snapshot = await getDocs(collection(db, "studySpots"));
      setStudySpots(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    };
    fetchSpots();
  }, []);

  // Fetch focus stats for the current user
  useEffect(() => {
    const fetchStats = async () => {
      if (!auth.currentUser) return;
      const stats = {};
      const weekAgo = Timestamp.now().toMillis() - 7 * 24 * 60 * 60 * 1000;
      const q = query(
        collection(db, "focusSessions"),
        where("userId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.spotId && data.start && data.end) {
          const start = data.start.seconds
            ? data.start.seconds * 1000
            : data.start.toMillis();
          const end = data.end.seconds
            ? data.end.seconds * 1000
            : data.end.toMillis();
          if (end > weekAgo) {
            stats[data.spotId] = (stats[data.spotId] || 0) + (end - start);
          }
        }
      });
      setFocusStats(stats);
    };
    fetchStats();
    // Only update stats after a session ends, not on every isRunning change
    // eslint-disable-next-line
  }, [isBreak]); // Change dependency from [isRunning] to [isBreak]

  // AppState effect to handle background/foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App has come to the foreground
        if (isRunning && timerStartRef.current) {
          const now = Date.now();
          const elapsed = Math.floor(
            (now - timerStartRef.current.start) / 1000
          );
          const newTime = Math.max(timerStartRef.current.duration - elapsed, 0);
          setTimer(newTime);
          if (newTime === 0) {
            setIsRunning(false);
            handleSessionEnd();
          }
        }
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line
  }, [isRunning, timer]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      // Save start time and duration for persistence
      if (!timerStartRef.current) {
        timerStartRef.current = {
          start: Date.now(),
          duration: timer,
        };
      }
      const id = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(id);
            handleSessionEnd();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      setIntervalId(id);
      return () => clearInterval(id);
    } else if (intervalId) {
      clearInterval(intervalId);
      timerStartRef.current = null; // Clear ref when paused/stopped
    }
    // eslint-disable-next-line
  }, [isRunning]);

  // Restore timer state on mount or when screen regains focus
  useEffect(() => {
    const restoreTimerState = async () => {
      try {
        const saved = await AsyncStorage.getItem(TIMER_STATE_KEY);
        if (saved) {
          const state = JSON.parse(saved);
          if (state && typeof state.timer === "number") {
            setTimer(state.timer);
            setIsBreak(state.isBreak || false);
            setSelectedSpot(state.selectedSpot || null);
            setSessionStart(
              state.sessionStart
                ? new Timestamp(
                    state.sessionStart.seconds,
                    state.sessionStart.nanoseconds
                  )
                : null
            );
            setGoalMinutes(state.goalMinutes || null);
            setGoalTitle(state.goalTitle || ""); // restore title
            setIsRunning(false); // Always paused on restore
          }
        }
      } catch {}
    };
    restoreTimerState();
    // eslint-disable-next-line
  }, []);

  // Save timer state when paused or before leaving the screen
  useEffect(() => {
    const saveTimerState = async () => {
      if (!isRunning && timer > 0) {
        try {
          await AsyncStorage.setItem(
            TIMER_STATE_KEY,
            JSON.stringify({
              timer,
              isBreak,
              selectedSpot,
              sessionStart,
              goalMinutes,
              goalTitle, // save title
            })
          );
        } catch {}
      }
    };
    saveTimerState();
    // eslint-disable-next-line
  }, [
    isRunning,
    timer,
    isBreak,
    selectedSpot,
    sessionStart,
    goalMinutes,
    goalTitle,
  ]);

  // Calculate progress for goal
  const getGoalProgress = () => {
    if (!goalMinutes) return null;
    const totalSessionSeconds = POMODORO_MINUTES * 60;
    const elapsed =
      sessionStart && timerStartRef.current
        ? Math.floor((Date.now() - timerStartRef.current.start) / 1000)
        : totalSessionSeconds - timer;
    const progressMinutes = Math.floor(elapsed / 60);
    return {
      progressMinutes: Math.max(progressMinutes, 0),
      goalMinutes,
    };
  };

  // Auto-clear goal if achieved
  useEffect(() => {
    if (goalMinutes) {
      const progress = getGoalProgress();
      if (progress && progress.progressMinutes >= goalMinutes) {
        Alert.alert("Goal Achieved!", "You reached your study goal.");
        setGoalMinutes(null);
        setGoalTitle(""); // clear title when goal is cleared
      }
    }
    // eslint-disable-next-line
  }, [timer, isRunning]);

  // Helper to add a session to Firestore and update stats immediately
  const addSessionAndUpdateStats = async (start, end, isBreakSession) => {
    if (start && auth.currentUser && selectedSpot) {
      const duration = end.toMillis() - start.toMillis();
      await addDoc(collection(db, "focusSessions"), {
        userId: auth.currentUser.uid,
        spotId: selectedSpot.id,
        start,
        end,
        duration,
        isBreak: isBreakSession,
      });
      // Update stats locally for immediate feedback
      const weekAgo = Timestamp.now().toMillis() - 7 * 24 * 60 * 60 * 1000;
      if (end.toMillis() > weekAgo) {
        setFocusStats((prev) => {
          const prevVal = prev[selectedSpot.id] || 0;
          return { ...prev, [selectedSpot.id]: prevVal + duration };
        });
      }
    }
  };

  const handleStart = () => {
    if (!selectedSpot) {
      Alert.alert("Select a location to start focus mode.");
      return;
    }
    setIsRunning(true);
    setSessionStart(Timestamp.now());
    timerStartRef.current = {
      start: Date.now(),
      duration: timer,
    };
    // Don't clear timer state here, so it can be restored if paused again
  };

  // Pause
  const handlePause = () => {
    setIsRunning(false);
    timerStartRef.current = null;
    // Timer state will be saved by effect above
  };

  // Stop and save session (add to Firestore and update stats)
  const handleStop = async () => {
    setIsRunning(false);
    setTimer(POMODORO_MINUTES * 60);
    timerStartRef.current = null;
    await clearTimerState(); // <-- clear saved timer state
    if (sessionStart) {
      const end = Timestamp.now();
      await addSessionAndUpdateStats(sessionStart, end, isBreak);
    }
    setSessionStart(null);
    setIsBreak(false);
  };

  // When timer ends (Pomodoro or break complete)
  const handleSessionEnd = async () => {
    setIsRunning(false);
    timerStartRef.current = null;
    await clearTimerState(); // <-- clear saved timer state
    if (sessionStart) {
      const end = Timestamp.now();
      await addSessionAndUpdateStats(sessionStart, end, isBreak);
    }
    setSessionStart(null);
    if (!isBreak) {
      setIsBreak(true);
      setTimer(BREAK_MINUTES * 60);
      Alert.alert("Pomodoro complete!", "Time for a break.");
    } else {
      setIsBreak(false);
      setTimer(POMODORO_MINUTES * 60);
      Alert.alert("Break over!", "Ready for another Pomodoro?");
    }
  };

  // Modal state for stat card
  const [selectedStatSpot, setSelectedStatSpot] = useState(null);
  const [showStatModal, setShowStatModal] = useState(false);
  const [deletingStat, setDeletingStat] = useState(false);

  // Delete all focus sessions for a spot for this user (this week)
  const handleDeleteStat = async (spotId) => {
    if (!auth.currentUser) return;
    setDeletingStat(true);
    try {
      // Fetch all sessions for this user and spot
      const weekAgo = Timestamp.now().toMillis() - 7 * 24 * 60 * 60 * 1000;
      const q = query(
        collection(db, "focusSessions"),
        where("userId", "==", auth.currentUser.uid),
        where("spotId", "==", spotId)
      );
      const snapshot = await getDocs(q);
      // Delete all sessions for this spot (optionally, only those in the last week)
      const batch = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const end = data.end?.seconds
          ? data.end.seconds * 1000
          : data.end?.toMillis?.() ?? 0;
        if (end > weekAgo) {
          batch.push(deleteDoc(docSnap.ref)); // <-- fix: use deleteDoc
        }
      });
      await Promise.all(batch);
      // Remove from local stats
      setFocusStats((prev) => {
        const copy = { ...prev };
        delete copy[spotId];
        return copy;
      });
      setShowStatModal(false);
      setSelectedStatSpot(null);
    } catch (e) {
      Alert.alert("Error", "Failed to delete stats for this spot.");
    }
    setDeletingStat(false);
  };

  // Show stats for the week
  const renderStats = () => {
    if (!Object.keys(focusStats).length) {
      return (
        <Text style={{ color: themeColors.darkGray, marginTop: 8 }}>
          No focus sessions this week.
        </Text>
      );
    }

    // Calculate total focus time
    const totalMs = Object.values(focusStats).reduce((a, b) => a + b, 0);
    const totalSeconds = Math.floor(totalMs / 1000);
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalSecs = totalSeconds % 60;

    return (
      <View style={{ marginTop: 12 }}>
        <View
          style={{
            backgroundColor: themeColors.purple,
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            alignItems: "center",
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text
            style={{
              color: themeColors.white,
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Total Focus Time This Week
          </Text>
          <Text
            style={{ color: themeColors.white, fontSize: 18, marginTop: 2 }}
          >
            {totalHours}h {totalMinutes}m {totalSecs}s
          </Text>
        </View>
        <ScrollView
          style={{ maxHeight: 220 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={true}
        >
          {Object.entries(focusStats).map(([spotId, ms]) => {
            const spot = studySpots.find((s) => s.id === spotId);
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            return (
              <TouchableOpacity
                key={spotId}
                onPress={() => {
                  setSelectedStatSpot({
                    spotId,
                    spot,
                    ms,
                    hours,
                    minutes,
                    seconds,
                  });
                  setShowStatModal(true);
                }}
                style={{
                  backgroundColor: themeColors.white,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: themeColors.purple,
                  shadowColor: themeColors.black,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    fontSize: 15,
                  }}
                >
                  {spot?.buildingName || "Unknown"}
                  {spot?.roomNumber ? ` - Floor ${spot.roomNumber}` : ""}
                </Text>
                <Text
                  style={{
                    color: themeColors.black,
                    fontSize: 14,
                    marginTop: 2,
                  }}
                >
                  {hours}h {minutes}m {seconds}s
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            backgroundColor: themeColors.purple,
            borderRadius: 8,
            padding: 8,
            marginRight: 12,
          }}
        >
          <ArrowLeft size={22} color={themeColors.white} />
        </TouchableOpacity>
      </View>
      <View style={{ alignItems: "center", marginTop: 2 }}>
        <Text
          style={{
            fontSize: 40,
            fontWeight: "bold",
            color: themeColors.black,
            paddingBottom: 24,
          }}
        >
          Focus Mode
        </Text>
        <TouchableOpacity
          onPress={() => setShowSpotModal(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: themeColors.purple,
            borderRadius: 20,
            paddingHorizontal: 18,
            paddingVertical: 10,
            marginBottom: 18,
          }}
        >
          <MapPin size={20} color={themeColors.white} />
          <Text
            style={{
              color: themeColors.white,
              fontWeight: "bold",
              marginLeft: 8,
            }}
          >
            {selectedSpot ? selectedSpot.buildingName : "Select Location"}
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 48,
            fontWeight: "bold",
            color: themeColors.purple,
          }}
        >
          {formatTime(timer)}
        </Text>
        <Text style={{ color: themeColors.darkGray, marginBottom: 18 }}>
          {isBreak ? "Break" : "Pomodoro"}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 12 }}>
          {!isRunning && (
            <TouchableOpacity
              onPress={handleStart}
              style={{
                backgroundColor: themeColors.green,
                borderRadius: 30,
                padding: 18,
                marginHorizontal: 12,
              }}
            >
              <Play size={28} color={themeColors.white} />
            </TouchableOpacity>
          )}
          {isRunning && (
            <TouchableOpacity
              onPress={handlePause}
              style={{
                backgroundColor: themeColors.purple,
                borderRadius: 30,
                padding: 18,
                marginHorizontal: 12,
              }}
            >
              <Pause size={28} color={themeColors.white} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleStop}
            style={{
              backgroundColor: themeColors.red,
              borderRadius: 30,
              padding: 18,
              marginHorizontal: 12,
            }}
          >
            <Stop size={28} color={themeColors.white} />
          </TouchableOpacity>
        </View>
        {/* Goal display and set button */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 10,
            marginTop: 16,
          }}
        >
          {goalMinutes ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                Goal: {goalTitle ? `"${goalTitle}"` : "Untitled"} ({goalMinutes}{" "}
                min)
              </Text>
            </View>
          ) : (
            <Text style={{ color: themeColors.darkGray, fontSize: 15 }}>
              No goal set
            </Text>
          )}
          <TouchableOpacity
            onPress={() => {
              setGoalInput(goalMinutes ? String(goalMinutes) : "");
              setGoalTitleInput(goalTitle || "");
              setShowGoalModal(true);
            }}
            style={{
              marginLeft: 12,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
              {goalMinutes ? "Edit Goal" : "Set Goal"}
            </Text>
          </TouchableOpacity>
        </View>
        {/* Progress display */}
        {goalMinutes && (
          <Text
            style={{ color: themeColors.green, fontSize: 15, marginBottom: 8 }}
          >
            Progress: {getGoalProgress()?.progressMinutes ?? 0}/{goalMinutes}{" "}
            min
          </Text>
        )}
        <View style={{ marginTop: 32, width: "80%" }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.black,
            }}
          >
            This Week's Focus Stats
          </Text>
          {renderStats()}
        </View>
      </View>
      {/* Location Picker Modal */}
      <Modal visible={showSpotModal} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 12,
              padding: 16,
              width: "85%",
              maxHeight: "70%",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.black,
                marginBottom: 12,
              }}
            >
              Select Location
            </Text>
            <FlatList
              data={studySpots}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedSpot(item);
                    setShowSpotModal(false);
                  }}
                  style={{
                    padding: 12,
                    borderBottomWidth: 0.5,
                    borderBottomColor: themeColors.gray,
                  }}
                >
                  <Text
                    style={{ color: themeColors.purple, fontWeight: "bold" }}
                  >
                    {item.buildingName}
                  </Text>
                  {item.roomNumber && (
                    <Text style={{ color: themeColors.darkGray, fontSize: 13 }}>
                      Floor {item.roomNumber}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setShowSpotModal(false)}
              style={{
                marginTop: 12,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Stat Card Modal */}
      <Modal
        visible={showStatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 12,
              padding: 20,
              width: "85%",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.black,
                marginBottom: 8,
              }}
            >
              {selectedStatSpot?.spot?.buildingName || "Unknown"}
              {selectedStatSpot?.spot?.roomNumber
                ? ` - Floor ${selectedStatSpot.spot.roomNumber}`
                : ""}
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: themeColors.purple,
                marginBottom: 8,
              }}
            >
              Focused for:{" "}
              {selectedStatSpot
                ? `${selectedStatSpot.hours}h ${selectedStatSpot.minutes}m ${selectedStatSpot.seconds}s`
                : ""}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: themeColors.darkGray,
                marginBottom: 18,
                textAlign: "center",
              }}
            >
              This will delete all focus sessions for this spot from this week.
            </Text>
            <View style={{ flexDirection: "row", width: "100%" }}>
              {/* Cancel (negative) on left, Delete (positive) on right */}
              <TouchableOpacity
                onPress={() => setShowStatModal(false)}
                disabled={deletingStat}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.white,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                  borderColor: themeColors.black,
                  borderWidth: 0.5,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: themeColors.purple, fontWeight: "bold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteStat(selectedStatSpot?.spotId)}
                disabled={deletingStat}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.red,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                  opacity: deletingStat ? 0.7 : 1,
                }}
              >
                <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                  {deletingStat ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Goal Modal */}
      <Modal visible={showGoalModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 12,
              padding: 20,
              width: "80%",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 12,
                color: themeColors.black,
              }}
            >
              Set Study Goal
            </Text>
            <TextInput
              value={goalTitleInput}
              onChangeText={setGoalTitleInput}
              placeholder="Goal Title (e.g. Orgo Exam)"
              style={{
                borderWidth: 1,
                borderColor: themeColors.purple,
                borderRadius: 8,
                padding: 10,
                width: "80%",
                marginBottom: 12,
                color: themeColors.black,
                fontSize: 16,
                backgroundColor: themeColors.gray + "10",
              }}
              maxLength={40}
            />
            <TextInput
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="Enter minutes"
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: themeColors.purple,
                borderRadius: 8,
                padding: 10,
                width: "80%",
                marginBottom: 18,
                color: themeColors.black,
                fontSize: 16,
                backgroundColor: themeColors.gray + "10",
              }}
              maxLength={4}
            />
            <View
              style={{ flexDirection: "row", width: "100%", marginBottom: 8 }}
            >
              {/* Cancel (negative) on left, Save (positive) on right */}
              <TouchableOpacity
                onPress={() => setShowGoalModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.white,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                  borderColor: themeColors.black,
                  borderWidth: 0.5,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: themeColors.purple, fontWeight: "bold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const min = parseInt(goalInput, 10);
                  if (!isNaN(min) && min > 0) {
                    setGoalMinutes(min);
                    setGoalTitle(goalTitleInput.trim());
                    setShowGoalModal(false);
                  } else {
                    Alert.alert(
                      "Invalid input",
                      "Please enter a valid number of minutes."
                    );
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.green,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
            {goalMinutes && (
              <TouchableOpacity
                onPress={() => {
                  setGoalMinutes(null);
                  setGoalTitle("");
                  setShowGoalModal(false);
                }}
                style={{
                  marginTop: 4,
                  backgroundColor: themeColors.red,
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                  Delete Goal
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Firestore "focusSessions" is a COLLECTION at the root of your Firestore database.
// Each document in this collection represents a single focus session.
// Example Firestore structure:
//
// /focusSessions (COLLECTION)
//   /abc123 (DOCUMENT)
//     userId: "uid1"
//     spotId: "spot1"
//     start: <Timestamp>
//     end: <Timestamp>
//     duration: <number>
//     isBreak: <boolean>
//
// The code uses:
//   collection(db, "focusSessions")
// to refer to this collection.
//
// Note: Firestore collections are created automatically when you add the first document to them.
// You do NOT need to manually create the "focusSessions" collection in the Firebase Console.
// When you call addDoc(collection(db, "focusSessions"), {...}), Firestore will create the collection if it doesn't exist.

// If you do not see the "focusSessions" collection in your Firebase Console, make sure at least one session has been completed and saved successfully.
// Check for any errors in your addDoc calls or Firestore security rules that might prevent writing to the collection.
