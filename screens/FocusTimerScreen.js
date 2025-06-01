import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
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
  Switch, // add Switch import
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ArrowLeft,
  Timer,
  MapPin,
  Play,
  Pause,
  Stop,
  Gear,
  ArrowCounterClockwise, // <-- add this for reset icon
  Trash, // <-- add this for delete icon
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
  doc, // <-- add this import
} from "firebase/firestore";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";
import { View as RNView } from "react-native"; // for progress bar container

// Timer durations are defined as constants at the top of the file:
const DEFAULT_POMODORO_MINUTES = 15;
const DEFAULT_BREAK_MINUTES = 5;

export default function FocusTimerScreen({ navigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  const [studySpots, setStudySpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [timer, setTimer] = useState(DEFAULT_POMODORO_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [focusStats, setFocusStats] = useState({}); // { spotId: [session, ...] }
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
  const [goalSecondsInput, setGoalSecondsInput] = useState(""); // <-- add this line
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTitleInput, setGoalTitleInput] = useState("");
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Session note state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [sessionNote, setSessionNote] = useState("");
  const [pendingSession, setPendingSession] = useState(null);

  // Auto-start next session state
  const [autoStartNext, setAutoStartNext] = useState(false);

  // Track achieved goals this week
  const [achievedGoalsThisWeek, setAchievedGoalsThisWeek] = useState([]);

  // Key for storing achieved goals
  const ACHIEVED_GOALS_KEY = "achievedGoalsThisWeek";

  // Global goal progress state
  const [goalProgressSeconds, setGoalProgressSeconds] = useState(0);
  const GOAL_PROGRESS_KEY = "globalGoalProgressSeconds";

  // Track session progress for live goal progress bar
  const [sessionProgressSeconds, setSessionProgressSeconds] = useState(0);

  // Add this state to prevent duplicate alerts for the same goal
  const [goalJustAchieved, setGoalJustAchieved] = useState(false);

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

  // Fetch focus stats for the current user (sessions for the week, grouped by spotId)
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
            if (!stats[data.spotId]) stats[data.spotId] = [];
            stats[data.spotId].push({
              ...data,
              duration: end - start,
              start,
              end,
              tags: data.tags || [],
            });
          }
        }
      });
      setFocusStats(stats);
    };
    fetchStats();
    // eslint-disable-next-line
  }, [isBreak]);

  // Restore goal progress on mount
  useEffect(() => {
    const restoreGoalProgress = async () => {
      try {
        const saved = await AsyncStorage.getItem(GOAL_PROGRESS_KEY);
        if (saved) setGoalProgressSeconds(Number(saved) || 0);
      } catch {}
    };
    restoreGoalProgress();
  }, []);

  // Save goal progress when it changes
  useEffect(() => {
    AsyncStorage.setItem(GOAL_PROGRESS_KEY, String(goalProgressSeconds)).catch(
      () => {}
    );
  }, [goalProgressSeconds]);

  // Add this helper function before the component return
  const recalculateTimerOnBack = async () => {
    if (isRunning && timerStartRef.current) {
      const now = Date.now();
      const elapsed = Math.floor((now - timerStartRef.current.start) / 1000);
      const newTime = Math.max(timerStartRef.current.duration - elapsed, 0);
      setTimer(newTime);
      setIsRunning(false);
      timerStartRef.current = null;
      // Timer state will be saved by effect
    }
  };

  // AppState effect to handle background/foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (
        appState.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App is going to background or closed: pause timer and save state
        await recalculateTimerOnBack();
      }
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

  // Timer logic (fix double decrement)
  useEffect(() => {
    let id;
    if (isRunning) {
      if (!timerStartRef.current) {
        timerStartRef.current = {
          start: Date.now(),
          duration: timer,
        };
      }
      id = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(id);
            handleSessionEnd();
            return 0;
          }
          return t - 1;
        });
        setSessionProgressSeconds((prev) => prev + 1);
      }, 1000);
      setIntervalId(id);
    }
    return () => {
      if (id) clearInterval(id);
      setIntervalId(null);
    };
    // eslint-disable-next-line
  }, [isRunning]);

  // Reset session progress when timer resets or session starts
  useEffect(() => {
    if (
      !isRunning ||
      timer === DEFAULT_POMODORO_MINUTES * 60 ||
      timer === DEFAULT_BREAK_MINUTES * 60
    ) {
      setSessionProgressSeconds(0);
    }
  }, [isRunning, timer, isBreak]);

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

  // Update getGoalProgress to use global progress
  const getGoalProgress = () => {
    if (!goalMinutes) return null;
    const min = parseInt(goalMinutes, 10);
    const sec = goalSecondsInput ? parseInt(goalSecondsInput, 10) : 0;
    // Defensive: treat NaN as 0
    const safeMin = isNaN(min) ? 0 : min;
    const safeSec = isNaN(sec) ? 0 : sec;
    const totalGoalSeconds = safeMin * 60 + safeSec;
    return {
      progressSeconds: goalProgressSeconds,
      totalGoalSeconds,
    };
  };

  // Calculate progress for goal
  const getGoalProgressV2 = () => {
    if (!goalMinutes) return null;
    const min = parseInt(goalMinutes, 10);
    const sec = goalSecondsInput ? parseInt(goalSecondsInput, 10) : 0;
    // Defensive: treat NaN as 0
    const safeMin = isNaN(min) ? 0 : min;
    const safeSec = isNaN(sec) ? 0 : sec;
    const totalGoalSeconds = safeMin * 60 + safeSec;
    const totalSessionSeconds = DEFAULT_POMODORO_MINUTES * 60;
    const elapsed =
      sessionStart && timerStartRef.current
        ? Math.floor((Date.now() - timerStartRef.current.start) / 1000)
        : totalSessionSeconds - timer;
    const progressSeconds = Math.max(elapsed, 0);
    return {
      progressSeconds,
      totalGoalSeconds,
    };
  };

  // Auto-clear goal if achieved
  useEffect(() => {
    if (goalMinutes) {
      const progress = getGoalProgress();
      if (progress && progress.progressMinutes >= goalMinutes) {
        // Add to achieved goals
        setAchievedGoalsThisWeek((prev) => [
          ...prev,
          {
            title: goalTitle || "Untitled",
            minutes: goalMinutes,
            timestamp: Date.now(),
          },
        ]);
        Alert.alert("Goal Achieved!", "You reached your study goal.");
        setGoalMinutes(null);
        setGoalTitle(""); // clear title when goal is cleared
      }
    }
    // eslint-disable-next-line
  }, [timer, isRunning]);

  // Helper to add a session to Firestore and update stats immediately
  const addSessionAndUpdateStats = async (
    start,
    end,
    isBreakSession,
    note
    // tags
  ) => {
    if (start && auth.currentUser && selectedSpot) {
      const duration = end.toMillis() - start.toMillis();
      // Generate a unique sessionId
      const sessionId = `${
        auth.currentUser.uid
      }_${start.toMillis()}_${Math.floor(Math.random() * 1000000)}`;
      const sessionObj = {
        userId: auth.currentUser.uid,
        spotId: selectedSpot.id,
        start,
        end,
        duration,
        isBreak: isBreakSession,
        note: note || "",
        sessionId, // <-- add sessionId
        // tags: tags || [],
      };
      await addDoc(collection(db, "focusSessions"), sessionObj);
      // Update stats locally for immediate feedback
      const weekAgo = Timestamp.now().toMillis() - 7 * 24 * 60 * 60 * 1000;
      if (end.toMillis() > weekAgo) {
        setFocusStats((prev) => {
          const prevArr = Array.isArray(prev[selectedSpot.id])
            ? prev[selectedSpot.id]
            : [];
          return {
            ...prev,
            [selectedSpot.id]: [
              ...prevArr,
              {
                ...sessionObj,
                duration,
                start: start.toMillis(),
                end: end.toMillis(),
                // tags: tags || [],
              },
            ],
          };
        });
      }
    }
  };

  // When timer ends (Pomodoro or break complete)
  const handleSessionEnd = async () => {
    setIsRunning(false);
    timerStartRef.current = null;
    await clearTimerState();
    if (sessionStart) {
      if (!isBreak) {
        // Only show note modal when Pomodoro ends
        setPendingSession({
          start: sessionStart,
          isBreak: isBreak,
          sessionDuration: DEFAULT_POMODORO_MINUTES * 60 - timer, // duration in seconds
        });
        setShowNoteModal(true);
      } else {
        // If break ends, just transition to Pomodoro, no reflection
        setSessionStart(null);
        setIsBreak(false);
        setTimer(DEFAULT_POMODORO_MINUTES * 60);
        Alert.alert("Break over!", "Ready for another Pomodoro?");
        if (autoStartNext) {
          setTimeout(() => {
            if (!showNoteModal) {
              setIsRunning(true);
              setSessionStart(Timestamp.now());
              timerStartRef.current = {
                start: Date.now(),
                duration: DEFAULT_POMODORO_MINUTES * 60,
              };
            }
          }, 1200);
        }
        return;
      }
    }
    setSessionStart(null);
    if (!isBreak) {
      setIsBreak(true);
      setTimer(DEFAULT_BREAK_MINUTES * 60);
      Alert.alert("Pomodoro complete!", "Time for a break.");
      // Auto-start break if enabled and no note modal
      if (autoStartNext) {
        setTimeout(() => {
          // Only auto-start if note modal is not open
          if (!showNoteModal) {
            setIsRunning(true);
            setSessionStart(Timestamp.now());
            timerStartRef.current = {
              start: Date.now(),
              duration: DEFAULT_BREAK_MINUTES * 60,
            };
          }
        }, 1200);
      }
    } else {
      setIsBreak(false);
      setTimer(DEFAULT_POMODORO_MINUTES * 60);
      Alert.alert("Break over!", "Ready for another Pomodoro?");
      if (autoStartNext) {
        setTimeout(() => {
          if (!showNoteModal) {
            setIsRunning(true);
            setSessionStart(Timestamp.now());
            timerStartRef.current = {
              start: Date.now(),
              duration: DEFAULT_POMODORO_MINUTES * 60,
            };
          }
        }, 1200);
      }
    }
  };

  // Save session with note after modal
  const handleSaveSessionNote = async () => {
    if (pendingSession) {
      const end = Timestamp.now();
      await addSessionAndUpdateStats(
        pendingSession.start,
        end,
        pendingSession.isBreak,
        sessionNote
      );
      // Add session duration to global goal progress if not break
      if (!pendingSession.isBreak && pendingSession.sessionDuration) {
        setGoalProgressSeconds((prev) => prev + pendingSession.sessionDuration);
      }
      setSessionNote("");
      setPendingSession(null);
      setShowNoteModal(false);
      setTimeout(() => {
        setIsRunning(true);
        setSessionStart(Timestamp.now());
        timerStartRef.current = {
          start: Date.now(),
          duration: DEFAULT_BREAK_MINUTES * 60,
        };
        setIsBreak(true);
        setTimer(DEFAULT_BREAK_MINUTES * 60);
      }, 500);
    }
  };

  // Start handler: require tags before starting
  const handleStart = () => {
    if (!selectedSpot) {
      Alert.alert("Select a location to start Focus Mode.");
      return;
    }
    setIsRunning(true);
    setSessionStart(Timestamp.now());
    timerStartRef.current = {
      start: Date.now(),
      duration: timer,
    };
  };

  // Pause
  const handlePause = () => {
    setIsRunning(false);
    timerStartRef.current = null;
    // Add current session progress to total progress
    if (sessionProgressSeconds > 0) {
      setGoalProgressSeconds((prev) => prev + sessionProgressSeconds);
      setSessionProgressSeconds(0);
    }
    // Timer state will be saved by effect above
  };

  // Stop and save session (add to Firestore and update stats)
  const handleStop = async () => {
    setIsRunning(false);
    setTimer(DEFAULT_POMODORO_MINUTES * 60);
    setIsBreak(false);
    timerStartRef.current = null;
    // Add current session progress to total progress
    if (sessionProgressSeconds > 0) {
      setGoalProgressSeconds((prev) => prev + sessionProgressSeconds);
      setSessionProgressSeconds(0);
    }
    await clearTimerState();
    if (sessionStart) {
      const end = Timestamp.now();
      await addSessionAndUpdateStats(sessionStart, end, isBreak);
      // Do NOT update goalProgressSeconds here; handled above
    }
    setSessionStart(null);
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

  // Show stats for the week (grouped by spot, show each session's tags)
  const renderStats = () => {
    if (!Object.keys(focusStats).length) {
      return (
        <Text style={{ color: themeColors.darkGray, marginTop: 8 }}>
          No focus sessions this week.
        </Text>
      );
    }

    // Calculate total focus time (only Pomodoro, not break)
    const totalMs = Object.values(focusStats)
      .flat()
      .filter((b) => !b.isBreak) // Only work sessions
      .reduce((a, b) => a + (b.duration || 0), 0);
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
          {Object.entries(focusStats).map(([spotId, sessions]) => {
            const spot = studySpots.find((s) => s.id === spotId);
            // Fix: Only render if sessions is an array
            if (!Array.isArray(sessions) || sessions.length === 0) return null;
            // Sum durations for this spot (only Pomodoro)
            const ms = sessions
              .filter((b) => !b.isBreak)
              .reduce((a, b) => a + (b.duration || 0), 0);
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
                    sessions,
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
                {/* Remove tags display */}
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

  // Remove handleResetSession and its usages

  const GoalProgressBar = ({ progress, total, color, height = 12 }) => {
    const percent = total > 0 ? Math.min(progress / total, 1) : 0;
    return (
      <RNView
        style={{
          width: "100%",
          height,
          backgroundColor: themeColors.gray,
          borderRadius: height / 2,
          overflow: "hidden",
          marginTop: 4,
          marginBottom: 8,
        }}
      >
        <RNView
          style={{
            width: `${percent * 100}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: height / 2,
            transition: "width 0.2s",
          }}
        />
      </RNView>
    );
  };

  // Live goal progress (updates as timer runs)
  const liveGoalProgress = useMemo(() => {
    if (!goalMinutes) return null;
    const min = parseInt(goalMinutes, 10);
    const sec = goalSecondsInput ? parseInt(goalSecondsInput, 10) : 0;
    const safeMin = isNaN(min) ? 0 : min;
    const safeSec = isNaN(sec) ? 0 : sec;
    const totalGoalSeconds = safeMin * 60 + safeSec;
    // Only count Pomodoro sessions toward goal
    const sessionAdd = isRunning && !isBreak ? sessionProgressSeconds : 0;
    return {
      progressSeconds: goalProgressSeconds + sessionAdd,
      totalGoalSeconds,
    };
  }, [
    goalMinutes,
    goalSecondsInput,
    goalProgressSeconds,
    isRunning,
    isBreak,
    sessionProgressSeconds,
  ]);

  // Goal completion effect (use liveGoalProgress)
  useEffect(() => {
    if (!goalMinutes) {
      setGoalJustAchieved(false);
      return;
    }
    const progress = liveGoalProgress;
    if (
      progress &&
      progress.totalGoalSeconds > 0 &&
      progress.progressSeconds >= progress.totalGoalSeconds &&
      !goalJustAchieved
    ) {
      setGoalJustAchieved(true);
      setAchievedGoalsThisWeek((prev) => [
        ...prev,
        {
          title: goalTitle || "Untitled",
          minutes: goalMinutes,
          timestamp: Date.now(),
        },
      ]);
      Alert.alert("Goal Achieved!", "You reached your study goal.");
      setGoalMinutes(null);
      setGoalTitle("");
      setGoalProgressSeconds(0);
      AsyncStorage.removeItem(GOAL_PROGRESS_KEY).catch(() => {});
    }
  }, [
    liveGoalProgress,
    goalMinutes,
    goalTitle,
    setAchievedGoalsThisWeek,
    goalJustAchieved,
  ]);

  const handleDeleteSession = async (sessionId, spotId) => {
    if (!auth.currentUser || !sessionId || !spotId) return;
    try {
      // Find the session doc in Firestore by matching sessionId and spotId
      const q = query(
        collection(db, "focusSessions"),
        where("userId", "==", auth.currentUser.uid),
        where("spotId", "==", spotId),
        where("sessionId", "==", sessionId)
      );
      const snapshot = await getDocs(q);
      let docIdToDelete = null;
      snapshot.forEach((docSnap) => {
        docIdToDelete = docSnap.id;
      });
      if (docIdToDelete) {
        await deleteDoc(doc(db, "focusSessions", docIdToDelete));
        setFocusStats((prev) => {
          const updated = { ...prev };
          if (Array.isArray(updated[spotId])) {
            updated[spotId] = updated[spotId].filter(
              (s) => s.sessionId !== sessionId
            );
            if (updated[spotId].length === 0) delete updated[spotId];
          }
          return updated;
        });
        setSelectedStatSpot((prev) => {
          if (!prev) return prev;
          if (prev.spotId !== spotId) return prev;
          const newSessions = prev.sessions.filter(
            (s) => s.sessionId !== sessionId
          );
          return { ...prev, sessions: newSessions };
        });
      }
    } catch (e) {
      Alert.alert("Error", "Failed to delete this session.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
        <TouchableOpacity
          onPress={async () => {
            if (isRunning) {
              Alert.alert(
                "Pause Timer?",
                "Navigating back will pause your timer and save your progress.",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Pause & Go Back",
                    style: "destructive",
                    onPress: async () => {
                      await recalculateTimerOnBack();
                      navigation.goBack();
                    },
                  },
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
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
      {/* Make the entire main content scrollable */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: "center", paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginTop: 2, width: "100%" }}>
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
          {/* Timer control buttons row */}
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            {!isRunning && (
              <TouchableOpacity
                onPress={handleStart}
                style={{
                  backgroundColor: themeColors.green,
                  borderRadius: 30,
                  padding: 18,
                  marginHorizontal: 8,
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
                  marginHorizontal: 8,
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
                marginHorizontal: 8,
              }}
            >
              <Stop size={28} color={themeColors.white} />
            </TouchableOpacity>
            {/* Removed Reset Button */}
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
                  Goal: {goalTitle ? `"${goalTitle}"` : "Untitled"} (
                  {goalMinutes} min)
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
          {goalMinutes &&
            (() => {
              const progress = liveGoalProgress;
              if (!progress || !progress.totalGoalSeconds) return null;
              const percent =
                progress.totalGoalSeconds > 0
                  ? Math.min(
                      progress.progressSeconds / progress.totalGoalSeconds,
                      1
                    )
                  : 0;
              const mins = Math.floor(progress.progressSeconds / 60)
                .toString()
                .padStart(2, "0");
              const secs = (progress.progressSeconds % 60)
                .toString()
                .padStart(2, "0");
              const totalMins = Math.floor(progress.totalGoalSeconds / 60)
                .toString()
                .padStart(2, "0");
              const totalSecs = (progress.totalGoalSeconds % 60)
                .toString()
                .padStart(2, "0");
              return (
                <View style={{ width: "80%", alignItems: "center" }}>
                  <GoalProgressBar
                    progress={progress.progressSeconds}
                    total={progress.totalGoalSeconds}
                    color={themeColors.green}
                    height={14}
                  />
                  <Text
                    style={{
                      color: themeColors.green,
                      fontSize: 15,
                      marginBottom: 8,
                    }}
                  >
                    {mins}:{secs} / {totalMins}:{totalSecs} min
                  </Text>
                </View>
              );
            })()}
          {/* Remove the old Reset Timer Button from below progress display */}
          <View style={{ marginTop: 32, width: "80%" }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.black,
                paddingBottom: 12,
              }}
            >
              This Week's Focus Stats
            </Text>
            {/* Total Focus Time Card */}
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
                {(() => {
                  // Only count Pomodoro sessions (not break)
                  const totalMs = Object.values(focusStats)
                    .flat()
                    .filter((b) => !b.isBreak)
                    .reduce((a, b) => a + (b.duration || 0), 0);
                  const totalSeconds = Math.floor(totalMs / 1000);
                  const totalHours = Math.floor(totalSeconds / 3600);
                  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
                  const totalSecs = totalSeconds % 60;
                  return `${totalHours}h ${totalMinutes}m ${totalSecs}s`;
                })()}
              </Text>
            </View>
            {/* Stats List */}
            {(() => {
              if (!Object.keys(focusStats).length) {
                return (
                  <Text style={{ color: themeColors.darkGray, marginTop: 8 }}>
                    No focus sessions this week.
                  </Text>
                );
              }
              return (
                <View style={{ marginTop: 12 }}>
                  {Object.entries(focusStats).map(([spotId, sessions]) => {
                    const spot = studySpots.find((s) => s.id === spotId);
                    if (!Array.isArray(sessions) || sessions.length === 0)
                      return null;
                    const ms = sessions.reduce(
                      (a, b) => a + (b.duration || 0),
                      0
                    );
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
                            sessions,
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
                          {spot?.roomNumber
                            ? ` - Floor ${spot.roomNumber}`
                            : ""}
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
                </View>
              );
            })()}
            {/* Goals Achieved This Week Section */}
            <View style={{ marginTop: 24 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: themeColors.black,
                  paddingBottom: 12,
                }}
              >
                Goals Achieved This Week
              </Text>
              {achievedGoalsThisWeek.length === 0 ? (
                <Text style={{ color: themeColors.darkGray, fontSize: 15 }}>
                  No goals achieved yet this week.
                </Text>
              ) : (
                achievedGoalsThisWeek
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((goal, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: themeColors.green + "18",
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 6,
                        borderWidth: 1,
                        borderColor: themeColors.green,
                      }}
                    >
                      <Text
                        style={{
                          color: themeColors.green,
                          fontWeight: "bold",
                          fontSize: 15,
                        }}
                      >
                        {goal.title || "Untitled"} ({goal.minutes} min)
                      </Text>
                      <Text
                        style={{ color: themeColors.darkGray, fontSize: 13 }}
                      >
                        {new Date(goal.timestamp).toLocaleDateString()}{" "}
                        {new Date(goal.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
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
              maxHeight: "85%",
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
            {/* Session List with Notes and Delete Button */}
            <ScrollView
              style={{ width: "100%", maxHeight: 220, marginBottom: 12 }}
              showsVerticalScrollIndicator={false}
            >
              {selectedStatSpot?.sessions?.length > 0 ? (
                selectedStatSpot.sessions
                  .sort((a, b) => b.start - a.start) // newest first
                  .map((session, idx) => {
                    // Format start time
                    const date = new Date(session.start);
                    const endDate = new Date(session.end);
                    const durationSec = Math.floor(
                      (session.duration || 0) / 1000
                    );
                    const hours = Math.floor(durationSec / 3600);
                    const minutes = Math.floor((durationSec % 3600) / 60);
                    const seconds = durationSec % 60;
                    // Use session.id if available, else fallback to session.start as unique key
                    const sessionKey = session.sessionId;
                    return (
                      <View
                        key={sessionKey}
                        style={{
                          borderBottomWidth:
                            idx === selectedStatSpot.sessions.length - 1
                              ? 0
                              : 1,
                          borderBottomColor: themeColors.gray,
                          paddingVertical: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text
                            style={{
                              color: themeColors.black,
                              fontWeight: "bold",
                              fontSize: 15,
                            }}
                          >
                            {date.toLocaleDateString()}{" "}
                            {date.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" - "}
                            {session.isBreak ? "Break" : "Pomodoro"}
                          </Text>
                          <Text
                            style={{
                              color: themeColors.darkGray,
                              fontSize: 13,
                            }}
                          >
                            Duration: {hours}h {minutes}m {seconds}s
                          </Text>
                          {session.note ? (
                            <Text
                              style={{
                                color: themeColors.purple,
                                fontSize: 14,
                                marginTop: 2,
                                fontStyle: "italic",
                              }}
                            >
                              “{session.note}”
                            </Text>
                          ) : (
                            <Text
                              style={{
                                color: themeColors.gray,
                                fontSize: 13,
                                marginTop: 2,
                                fontStyle: "italic",
                              }}
                            >
                              No reflection
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() =>
                            Alert.alert(
                              "Delete Session?",
                              "Are you sure you want to delete this session?",
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Delete",
                                  style: "destructive",
                                  onPress: () =>
                                    handleDeleteSession(
                                      sessionKey,
                                      selectedStatSpot.spotId
                                    ),
                                },
                              ]
                            )
                          }
                          style={{
                            padding: 6,
                            backgroundColor: themeColors.red,
                            borderRadius: 6,
                            alignSelf: "flex-start",
                          }}
                        >
                          <Trash size={18} color={themeColors.white} />
                        </TouchableOpacity>
                      </View>
                    );
                  })
              ) : (
                <Text style={{ color: themeColors.darkGray, fontSize: 14 }}>
                  No sessions for this spot this week.
                </Text>
              )}
            </ScrollView>
            <Text
              style={{
                fontSize: 14,
                color: themeColors.darkGray,
                marginBottom: 18,
                textAlign: "center",
              }}
            >
              {/* Updated text */}
              You can delete individual sessions from this spot.
            </Text>
            <View style={{ flexDirection: "row", width: "100%" }}>
              {/* Cancel (negative) on left, Delete All (positive) on right */}
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
                  Close
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
                  {deletingStat ? "Deleting..." : "Delete All"}
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
                  setGoalProgressSeconds(0);
                  AsyncStorage.removeItem(GOAL_PROGRESS_KEY).catch(() => {});
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
      {/* Session Note Modal */}
      <Modal visible={showNoteModal} transparent animationType="fade">
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
                color: themeColors.white,
              }}
            >
              Session Notes / Reflection
            </Text>
            <TextInput
              value={sessionNote}
              onChangeText={setSessionNote}
              placeholder="What did you work on? How did it go?"
              multiline
              style={{
                borderWidth: 1,
                borderColor: themeColors.purple,
                borderRadius: 8,
                padding: 10,
                width: "100%",
                minHeight: 80,
                marginBottom: 18,
                color: themeColors.black,
                fontSize: 16,
                backgroundColor: themeColors.gray + "10",
                textAlignVertical: "top",
              }}
              maxLength={500}
            />
            <View style={{ flexDirection: "row", width: "100%" }}>
              <TouchableOpacity
                onPress={() => {
                  setShowNoteModal(false);
                  setSessionNote("");
                  setPendingSession(null);
                }}
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
                onPress={handleSaveSessionNote}
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
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
