import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  AppState,
  ScrollView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MapPin,
  Play,
  Pause,
  Stop,
  Trash,
  CaretRight,
  Archive,
} from "phosphor-react-native";
import { db, auth } from "../firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  Timestamp,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

// Timer durations are defined as constants at the top of the file:
const DEFAULT_POMODORO_MINUTES = 1;
const DEFAULT_BREAK_MINUTES = 5;

export function FocusTimerView({ navigation }) {
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

  // Auto-start next session state
  const [autoStartNext, setAutoStartNext] = useState(false);

  // --- Goal Feature State ---
  const GOAL_STATE_KEY = "focusGoalState";
  const [goal, setGoal] = useState({
    title: "",
    target: 0,
    progress: 0,
    sessionIds: [],
    achieved: false,
  });
  const [goalInput, setGoalInput] = useState({ h: "", m: "", s: "" });
  const [goalTitleInput, setGoalTitleInput] = useState("");
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Persist goal to AsyncStorage whenever it changes
  useEffect(() => {
    AsyncStorage.setItem(GOAL_STATE_KEY, JSON.stringify(goal)).catch(() => {});
  }, [goal]);

  // --- Robust Goal Restore on Tab/Screen Focus ---
  useFocusEffect(
    useCallback(() => {
      const restoreGoal = async () => {
        try {
          const raw = await AsyncStorage.getItem(GOAL_STATE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
              setGoal(parsed);
            }
          }
        } catch {}
      };
      restoreGoal();
    }, [])
  );

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

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line
  }, [isBreak]);

  // Add this helper function before the component return
  const recalculateTimerOnBack = async () => {
    if (isRunning && timerStartRef.current) {
      const now = Date.now();
      const elapsed = Math.floor((now - timerStartRef.current.start) / 1000);
      const newTime = Math.max(timerStartRef.current.duration - elapsed, 0);
      setTimer(newTime);
    } else {
      await AsyncStorage.setItem(
        TIMER_RUNNING_KEY,
        JSON.stringify({
          wasRunning: false,
          timer,
          isBreak,
          selectedSpot,
          sessionStart,
        })
      );
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
        if (isRunning && timerStartRef.current) {
          wasRunningRef.current = true;
          // Save the time of leaving and the current session progress
          await AsyncStorage.setItem(
            TIMER_RUNNING_KEY,
            JSON.stringify({
              wasRunning: true,
              timerStart: timerStartRef.current,
              timer,
              isBreak,
              selectedSpot,
              sessionStart,
              lastBackgroundTime: Date.now(),
            })
          );
        }
        lastBackgroundTimeRef.current = Date.now();
        await recalculateTimerOnBack();
      }
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App has come to the foreground
        const runningState = await AsyncStorage.getItem(TIMER_RUNNING_KEY);
        if (runningState) {
          const {
            wasRunning,
            timerStart,
            timer: savedTimer,
            isBreak: savedIsBreak,
            selectedSpot: savedSpot,
            sessionStart: savedSessionStart,
            lastBackgroundTime,
          } = JSON.parse(runningState);

          // Restore state values
          if (typeof savedTimer === "number") setTimer(savedTimer);
          if (typeof savedIsBreak === "boolean") setIsBreak(savedIsBreak);
          if (savedSpot) setSelectedSpot(savedSpot);
          if (savedSessionStart)
            setSessionStart(
              savedSessionStart.seconds !== undefined
                ? new Timestamp(
                    savedSessionStart.seconds,
                    savedSessionStart.nanoseconds
                  )
                : savedSessionStart
            );

          if (wasRunning) {
            if (
              timerStart &&
              typeof timerStart.start === "number" &&
              typeof timerStart.duration === "number"
            ) {
              const now = Date.now();
              const elapsed = Math.floor((now - timerStart.start) / 1000);
              const newTime = Math.max(timerStart.duration - elapsed, 0);
              setTimer(newTime);
              if (newTime > 0) {
                setIsRunning(true);
                timerStartRef.current = {
                  start: Date.now(),
                  duration: newTime,
                };
              } else {
                setIsRunning(false);
                timerStartRef.current = null;
                handleSessionEnd();
              }
            }
          } else {
            // Paused state restore
            setIsRunning(false);
            timerStartRef.current = null;
          }

          await AsyncStorage.removeItem(TIMER_RUNNING_KEY);
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

  // Timer logic (fix double decrement and off-by-one)
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
      }, 1000);
      setIntervalId(id);
    }
    return () => {
      if (id) clearInterval(id);
      setIntervalId(null);
    };
    // eslint-disable-next-line
  }, [isRunning]);

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
            })
          );
        } catch {}
      }
    };
    saveTimerState();
    // eslint-disable-next-line
  }, [isRunning, timer, isBreak, selectedSpot, sessionStart]);

  // Clear timer state from storage when stopped or completed
  const clearTimerState = async () => {
    try {
      await AsyncStorage.removeItem(TIMER_STATE_KEY);
    } catch {}
  };

  // Helper to add a session to Firestore and update stats immediately
  const addSessionAndUpdateStats = async (start, end, isBreakSession, note) => {
    if (start && end && auth.currentUser && selectedSpot) {
      const duration = end.toMillis() - start.toMillis();
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
        sessionId,
      };
      await addDoc(collection(db, "focusSessions"), sessionObj);
      // Update stats locally for immediate feedback
      const weekAgo = Timestamp.now().toMillis() - 7 * 24 * 60 * 60 * 1000;
      if (end.toMillis() > weekAgo) {
        setFocusStats((prev) => {
          const weekStats = prev[selectedSpot.id] || [];
          return {
            ...prev,
            [selectedSpot.id]: [
              ...weekStats,
              {
                ...sessionObj,
                duration,
                start: start.toMillis(),
                end: end.toMillis(),
              },
            ],
          };
        });
      }
      // --- Fetch stats from Firestore to ensure up-to-date ---
      await fetchStats();
    }
  };

  // When timer ends (Pomodoro or break complete)
  const handleSessionEnd = async () => {
    // Send a local notification
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isBreak ? "Break Over!" : "Pomodoro Complete!",
          body: isBreak ? "Ready for another Pomodoro?" : "Time for a break.",
        },
        trigger: null, // Send immediately
      });
    } catch (e) {
      // Ignore notification errors
    }

    setIsRunning(false);
    timerStartRef.current = null;
    await clearTimerState();

    if (sessionStart) {
      if (!isBreak) {
        // Always use the default Pomodoro duration for work session
        const sessionEnd = new Timestamp(
          sessionStart.seconds !== undefined
            ? sessionStart.seconds + DEFAULT_POMODORO_MINUTES * 60
            : Math.floor(sessionStart / 1000) + DEFAULT_POMODORO_MINUTES * 60,
          sessionStart.nanoseconds !== undefined ? sessionStart.nanoseconds : 0
        );
        setPendingSession({
          start: sessionStart,
          end: sessionEnd,
          isBreak: isBreak,
          sessionDuration: DEFAULT_POMODORO_MINUTES * 60,
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
      if (autoStartNext) {
        setTimeout(() => {
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

  // Stop and save session (add to Firestore and update stats)
  const handleStop = async () => {
    setIsRunning(false);
    timerStartRef.current = null;
    await clearTimerState();

    if (sessionStart) {
      const end = Timestamp.now();
      if (!isBreak) {
        // If Pomodoro, show note modal and after saving, start break
        setPendingSession({
          start: sessionStart,
          end: end,
          isBreak: isBreak,
          sessionDuration: DEFAULT_POMODORO_MINUTES * 60,
        });
        setShowNoteModal(true);
        // Don't reset timer/isBreak here, do it after note is saved
      } else {
        // If break, just save session and reset state
        await addSessionAndUpdateStats(sessionStart, end, isBreak);
        setSessionStart(null);
        setTimer(DEFAULT_POMODORO_MINUTES * 60);
        setIsBreak(false);
      }
    } else {
      setSessionStart(null);
      setTimer(DEFAULT_POMODORO_MINUTES * 60);
      setIsBreak(false);
    }
  };

  // Save session with note after modal
  const [pendingSession, setPendingSession] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [sessionNote, setSessionNote] = useState("");
  const handleSaveSessionNote = async () => {
    if (pendingSession) {
      const end = pendingSession.end;
      await addSessionAndUpdateStats(
        pendingSession.start,
        end,
        pendingSession.isBreak,
        sessionNote
      );
      setSessionNote("");
      setPendingSession(null);
      setShowNoteModal(false);
      // After saving note, start break timer
      setTimeout(() => {
        setIsBreak(true);
        setTimer(DEFAULT_BREAK_MINUTES * 60);
        setSessionStart(Timestamp.now());
        timerStartRef.current = {
          start: Date.now(),
          duration: DEFAULT_BREAK_MINUTES * 60,
        };
        setIsRunning(true);
      }, 500);
    }
  };

  // Modal state for stat card
  const [selectedStatSpot, setSelectedStatSpot] = useState(null);
  const [showStatModal, setShowStatModal] = useState(false);
  const [deletingStat, setDeletingStat] = useState(false);

  // Show stats for the week (grouped by spot, show each session's tags)
  const renderStats = () => {
    // Only consider non-break sessions for stats
    const nonBreakStats = Object.entries(focusStats)
      .map(([spotId, sessions]) => [
        spotId,
        Array.isArray(sessions) ? sessions.filter((b) => !b.isBreak) : [],
      ])
      .filter(([, sessions]) => sessions.length > 0);

    if (nonBreakStats.length === 0) {
      return (
        <Text style={{ color: themeColors.darkGray, marginTop: 8 }}>
          No focus sessions this week.
        </Text>
      );
    }

    // Calculate total focus time (only Pomodoro, not break)
    const totalMs = nonBreakStats
      .flatMap(([, sessions]) => sessions)
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
            Total Focus Time
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
          {nonBreakStats.map(([spotId, sessions]) => {
            const spot = studySpots.find((s) => s.id === spotId);
            const ms = sessions.reduce((a, b) => a + (b.duration || 0), 0);
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
                  flexDirection: "row",
                  alignItems: "center",
                  width: "94%",
                  alignSelf: "center",
                }}
              >
                <View style={{ flex: 1 }}>
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
                </View>
                <View
                  style={{
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    marginLeft: 4,
                    borderWidth: 1,
                    borderColor: themeColors.purple,
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.purple,
                      fontSize: 13,
                      fontWeight: "bold",
                    }}
                  >
                    {`${totalHours}h ${totalMinutes}m ${totalSecs}s`}
                  </Text>
                </View>
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

  // Helper: format seconds to h m s
  const formatHMS = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  // --- Add session to goal progress ---
  const addSessionToGoal = async (sessionObj) => {
    if (!sessionObj || !sessionObj.sessionId || sessionObj.isBreak) return;
    if (goal.sessionIds.includes(sessionObj.sessionId)) return;
    const newProgress =
      goal.progress + Math.floor((sessionObj.duration || 0) / 1000);
    const achieved =
      goal.target > 0 && newProgress >= goal.target && !goal.achieved;
    const updatedGoal = {
      ...goal,
      progress: newProgress,
      sessionIds: [...goal.sessionIds, sessionObj.sessionId],
      achieved: achieved ? true : goal.achieved,
    };
    setGoal(updatedGoal);
    try {
      await AsyncStorage.setItem(GOAL_STATE_KEY, JSON.stringify(updatedGoal));
    } catch (e) {
      // optional: log or handle error
    }
    if (achieved) {
      Alert.alert(
        "Goal Achieved!",
        "Congratulations, you've reached your focus goal!"
      );
    }
  };

  // --- Remove session from goal progress ---
  const removeSessionFromGoal = async (sessionId, duration) => {
    if (!goal.sessionIds.includes(sessionId)) return;
    const durSec = Math.floor((duration || 0) / 1000);
    const newIds = goal.sessionIds.filter((id) => id !== sessionId);
    let newProgress = goal.progress - durSec;
    if (newProgress < 0) newProgress = 0;
    const updatedGoal = {
      ...goal,
      progress: newProgress,
      sessionIds: newIds,
      achieved: newProgress >= goal.target && goal.target > 0,
    };
    setGoal(updatedGoal);
    try {
      await AsyncStorage.setItem(GOAL_STATE_KEY, JSON.stringify(updatedGoal));
    } catch (e) {
      // optional: log or handle error
    }
  };

  // --- Goal Modal Handlers ---
  const handleGoalSave = () => {
    const h = parseInt(goalInput.h) || 0;
    const m = parseInt(goalInput.m) || 0;
    const s = parseInt(goalInput.s) || 0;
    const total = h * 3600 + m * 60 + s;
    setGoal({
      title: goalTitleInput.trim() || "Focus Goal",
      target: total,
      progress: 0,
      sessionIds: [],
      achieved: false,
    });
    setShowGoalModal(false);
  };

  // Add this function to handle deleting the goal
  const handleGoalDelete = () => {
    setGoal({
      title: "",
      target: 0,
      progress: 0,
      sessionIds: [],
      achieved: false,
    });
    setGoalTitleInput("");
    setGoalInput({ h: "", m: "", s: "" });
    setShowGoalModal(false);
  };

  // Add a ref to track if timer was running before leaving screen
  const wasRunningRef = useRef(false);

  // Add a unique key for saving timer running state and start info
  const TIMER_RUNNING_KEY = "focusTimerRunningState";

  // Track when timer was last backgrounded for progress bar calculation
  const lastBackgroundTimeRef = useRef(null);

  // Request notification permissions on mount
  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  // Archive modal state and data
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveData, setArchiveData] = useState({}); // { weekKey: { stats: {} } }

  // Helper: get week key (e.g. "2024-W23")
  function getWeekKey(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
  }

  // Persist focus stats per week (store session details)
  useEffect(() => {
    const saveArchive = async () => {
      const weekKey = getWeekKey();
      try {
        // Load previous archive
        const raw = await AsyncStorage.getItem("focusArchive");
        let archive = raw ? JSON.parse(raw) : {};
        // Prepare sessions with location, time, and notes
        const statsWithDetails = {};
        Object.entries(focusStats).forEach(([spotId, sessions]) => {
          statsWithDetails[spotId] = (sessions || []).map((s) => ({
            buildingName:
              studySpots.find((sp) => sp.id === spotId)?.buildingName || spotId,
            roomNumber:
              studySpots.find((sp) => sp.id === spotId)?.roomNumber || "",
            start: s.start,
            end: s.end,
            duration: s.duration,
            note: s.note || "",
            isBreak: s.isBreak || false,
          }));
        });
        archive[weekKey] = {
          stats: statsWithDetails,
        };
        await AsyncStorage.setItem("focusArchive", JSON.stringify(archive));
        setArchiveData(archive);
      } catch {}
    };
    saveArchive();
    // eslint-disable-next-line
  }, [focusStats, studySpots]);

  // Load archive on mount
  useEffect(() => {
    const loadArchive = async () => {
      try {
        const raw = await AsyncStorage.getItem("focusArchive");
        if (raw) setArchiveData(JSON.parse(raw));
      } catch {}
    };
    loadArchive();
  }, []);

  // Add this state and function for the week's dropdown open/close
  const [openWeekLocations, setOpenWeekLocations] = useState({});
  const toggleWeekLocation = (spotId) => {
    setOpenWeekLocations((prev) => ({
      ...prev,
      [spotId]: !prev[spotId],
    }));
  };

  // Start handler
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

  // Pause handler: recalculate remaining time and persist
  const handlePause = () => {
    if (timerStartRef.current) {
      const elapsed = Math.floor(
        (Date.now() - timerStartRef.current.start) / 1000
      );
      const remaining = Math.max(timerStartRef.current.duration - elapsed, 0);
      setTimer(remaining);
    }
    timerStartRef.current = null;
    setIsRunning(false);
  };

  // --- Save timer state on blur (tab switch/navigation away) ---
  useFocusEffect(
    useCallback(() => {
      return () => {
        // On blur, save timer state if running
        if (isRunning && timerStartRef.current) {
          AsyncStorage.setItem(
            TIMER_RUNNING_KEY,
            JSON.stringify({
              wasRunning: true,
              timerStart: timerStartRef.current,
              timer,
              isBreak,
              selectedSpot,
              sessionStart,
              lastBackgroundTime: Date.now(),
            })
          );
        } else {
          AsyncStorage.setItem(
            TIMER_RUNNING_KEY,
            JSON.stringify({
              wasRunning: false,
              timer,
              isBreak,
              selectedSpot,
              sessionStart,
            })
          );
        }
      };
    }, [isRunning, timer, isBreak, selectedSpot, sessionStart])
  );

  // --- Restore goal and timer state on focus ---
  useFocusEffect(
    useCallback(() => {
      const restoreGoalAndTimer = async () => {
        try {
          // Restore goal
          const rawGoal = await AsyncStorage.getItem(GOAL_STATE_KEY);
          if (rawGoal) {
            const parsed = JSON.parse(rawGoal);
            if (parsed && typeof parsed === "object") {
              setGoal(parsed);
            }
          }

          // Restore running timer (if it was running before leaving)
          const runningState = await AsyncStorage.getItem(TIMER_RUNNING_KEY);
          if (runningState) {
            const {
              wasRunning,
              timerStart,
              timer: savedTimer,
              isBreak: savedIsBreak,
              selectedSpot: savedSpot,
              sessionStart: savedSessionStart,
            } = JSON.parse(runningState);

            if (typeof savedTimer === "number") setTimer(savedTimer);
            if (typeof savedIsBreak === "boolean") setIsBreak(savedIsBreak);
            if (savedSpot) setSelectedSpot(savedSpot);
            if (savedSessionStart)
              setSessionStart(
                savedSessionStart.seconds !== undefined
                  ? new Timestamp(
                      savedSessionStart.seconds,
                      savedSessionStart.nanoseconds
                    )
                  : savedSessionStart
              );

            if (
              timerStart &&
              typeof timerStart.start === "number" &&
              typeof timerStart.duration === "number"
            ) {
              const now = Date.now();
              const elapsed = Math.floor((now - timerStart.start) / 1000);
              const newTime = Math.max(timerStart.duration - elapsed, 0);
              setTimer(newTime);
              if (wasRunning && newTime > 0) {
                setIsRunning(true);
                timerStartRef.current = {
                  start: Date.now(),
                  duration: newTime,
                };
              } else {
                setIsRunning(false);
                timerStartRef.current = null;
                if (newTime === 0) {
                  handleSessionEnd();
                }
              }
            }

            await AsyncStorage.removeItem(TIMER_RUNNING_KEY);
          } else {
            // --- Restore paused timer state if present and not running ---
            const pausedState = await AsyncStorage.getItem(TIMER_STATE_KEY);
            if (pausedState) {
              const {
                timer: savedTimer,
                isBreak: savedIsBreak,
                selectedSpot: savedSpot,
                sessionStart: savedSessionStart,
              } = JSON.parse(pausedState);

              if (typeof savedTimer === "number") setTimer(savedTimer);
              if (typeof savedIsBreak === "boolean") setIsBreak(savedIsBreak);
              if (savedSpot) setSelectedSpot(savedSpot);
              if (savedSessionStart)
                setSessionStart(
                  savedSessionStart.seconds !== undefined
                    ? new Timestamp(
                        savedSessionStart.seconds,
                        savedSessionStart.nanoseconds
                      )
                    : savedSessionStart
                );
              setIsRunning(false); // Ensure timer stays paused
              timerStartRef.current = null;
            }
          }
        } catch (e) {
          // Optionally log error
        }
      };

      restoreGoalAndTimer();
    }, [])
  );

  // Add this function before the return statement
  const handleDeleteSession = async (session, spotId) => {
    Alert.alert(
      "Delete Session",
      "Are you sure you want to delete this session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!session.sessionId) {
                Alert.alert(
                  "Cannot Delete",
                  "This session does not have a valid sessionId and cannot be deleted from Firestore."
                );
                return;
              }

              const q = query(
                collection(db, "focusSessions"),
                where("sessionId", "==", session.sessionId)
              );
              const snapshot = await getDocs(q);

              if (snapshot.empty) {
                Alert.alert(
                  "Not Found",
                  "This session could not be found in Firestore."
                );
                return;
              }

              for (const docSnap of snapshot.docs) {
                await deleteDoc(doc(db, "focusSessions", docSnap.id));
              }

              // Remove from local stats
              setFocusStats((prev) => {
                const updated = { ...prev };
                if (updated[spotId]) {
                  updated[spotId] = updated[spotId].filter(
                    (s) => s.sessionId !== session.sessionId
                  );
                  if (updated[spotId].length === 0) {
                    delete updated[spotId];
                  }
                }
                return updated;
              });

              // Remove from goal progress if present
              await removeSessionFromGoal(session.sessionId, session.duration);
            } catch (e) {
              Alert.alert("Error", `Failed to delete session: ${e.message}`);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      {/* Archive Modal */}
      <Modal visible={showArchiveModal} transparent animationType="fade">
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
              borderRadius: 16,
              padding: 20,
              width: "94%",
              maxHeight: "90%",
              alignItems: "center",
              shadowColor: themeColors.black,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.13,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                marginBottom: 16,
                color: themeColors.purple,
                letterSpacing: 0.5,
              }}
            >
              Focus Archive
            </Text>
            <ScrollView
              style={{ width: "100%" }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {/* Archive location dropdown state */}
              {(() => {
                // State for open weeks and open locations per week
                const [openWeeks, setOpenWeeks] = React.useState({});
                const [openLocations, setOpenLocations] = React.useState({});
                // Helper to toggle a week dropdown
                const toggleWeek = (weekKey) => {
                  setOpenWeeks((prev) => ({
                    ...prev,
                    [weekKey]: !prev[weekKey],
                  }));
                };
                // Helper to toggle a location dropdown
                const toggleLocation = (weekKey, spotId) => {
                  setOpenLocations((prev) => ({
                    ...prev,
                    [weekKey]: {
                      ...(prev[weekKey] || {}),
                      [spotId]: !(prev[weekKey] || {})[spotId],
                    },
                  }));
                };

                // --- LIFETIME ARCHIVE: Show all weeks in archiveData ---
                // Helper to get user-friendly week range string
                function weekKeyToRange(weekKey) {
                  // weekKey: "2024-W24"
                  const [year, w] = weekKey.split("-W");
                  const weekNum = parseInt(w, 10);
                  const y = parseInt(year, 10);
                  // Get Monday of the week
                  const firstDayOfYear = new Date(y, 0, 1);
                  const daysOffset =
                    (weekNum - 1) * 7 +
                    (firstDayOfYear.getDay() <= 4
                      ? 1
                      : 8 - firstDayOfYear.getDay());
                  const monday = new Date(y, 0, 1 + daysOffset);
                  // Sunday is 6 days after Monday
                  const sunday = new Date(monday);
                  sunday.setDate(monday.getDate() + 6);
                  // Format: "Jun 10–16, 2024"
                  const options = { month: "short", day: "numeric" };
                  const startStr = monday.toLocaleDateString(
                    undefined,
                    options
                  );
                  const endStr = sunday.toLocaleDateString(undefined, options);
                  return `${startStr} – ${endStr}, ${y}`;
                }

                const weekKeys = Object.keys(archiveData).sort((a, b) =>
                  a < b ? 1 : -1
                );
                return weekKeys.map((weekKey) => {
                  const week = archiveData[weekKey];
                  // Calculate total focus time for this week (exclude breaks)
                  let totalMs = 0;
                  if (week.stats) {
                    Object.values(week.stats)
                      .flat()
                      .filter((b) => !b.isBreak) // <-- Only count non-break sessions
                      .forEach((b) => {
                        totalMs += b.duration || 0;
                      });
                  }
                  const totalSeconds = Math.floor(totalMs / 1000);
                  const totalHours = Math.floor(totalSeconds / 3600);
                  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
                  const totalSecs = totalSeconds % 60;

                  const isWeekOpen = openWeeks[weekKey] || false;

                  return (
                    <View
                      key={weekKey}
                      style={{
                        marginBottom: 20,
                        backgroundColor: themeColors.gray + "18",
                        borderRadius: 14,
                        padding: 0,
                        borderWidth: 1.5,
                        borderColor: themeColors.purple + "33",
                        shadowColor: themeColors.black,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.07,
                        shadowRadius: 4,
                        elevation: 2,
                        // Always show all corners rounded
                        borderTopLeftRadius: 14,
                        borderTopRightRadius: 14,
                        borderBottomLeftRadius: 14,
                        borderBottomRightRadius: 14,
                        overflow: "hidden",
                      }}
                    >
                      {/* Week Header as dropdown toggle */}
                      <TouchableOpacity
                        onPress={() => toggleWeek(weekKey)}
                        activeOpacity={0.85}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 16,
                          borderTopLeftRadius: 14,
                          borderTopRightRadius: 14,
                          backgroundColor: themeColors.white,
                          borderBottomWidth: isWeekOpen ? 1 : 0,
                          borderBottomColor: themeColors.purple + "33",
                          // If collapsed, round bottom corners too
                          borderBottomLeftRadius: isWeekOpen ? 0 : 14,
                          borderBottomRightRadius: isWeekOpen ? 0 : 14,
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: "bold",
                            color: themeColors.purple,
                            fontSize: 17,
                            marginRight: 8,
                            flex: 1,
                          }}
                        >
                          {weekKeyToRange(weekKey)}
                        </Text>
                        <View
                          style={{
                            // Remove backgroundColor: themeColors.purple,
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            marginLeft: 4,
                          }}
                        >
                          <Text
                            style={{
                              color: themeColors.black,
                              fontSize: 13,
                              fontWeight: "bold",
                            }}
                          >
                            {`${totalHours}h ${totalMinutes}m ${totalSecs}s`}
                          </Text>
                        </View>
                        <CaretRight
                          size={22}
                          color={themeColors.purple}
                          weight="bold"
                          style={{
                            marginLeft: 12,
                            transform: [
                              { rotate: isWeekOpen ? "90deg" : "0deg" },
                            ],
                          }}
                        />
                      </TouchableOpacity>
                      {isWeekOpen && (
                        <View
                          style={{
                            padding: 16,
                            paddingTop: 8,
                            borderBottomLeftRadius: 14,
                            borderBottomRightRadius: 14,
                            backgroundColor: themeColors.gray + "18",
                          }}
                        >
                          {/* Focus Sessions as dropdowns per location */}
                          <Text
                            style={{
                              color: themeColors.purple,
                              fontWeight: "bold",
                              fontSize: 15,
                              marginTop: 6,
                              marginBottom: 4,
                              letterSpacing: 0.2,
                            }}
                          >
                            Focus Sessions
                          </Text>
                          {week.stats &&
                          Object.entries(week.stats)
                            .map(([spotId, sessions]) => [
                              spotId,
                              Array.isArray(sessions)
                                ? sessions.filter((b) => !b.isBreak)
                                : [],
                            ])
                            .filter(([, sessions]) => sessions.length > 0)
                            .length > 0 ? (
                            Object.entries(week.stats)
                              .map(([spotId, sessions]) => [
                                spotId,
                                Array.isArray(sessions)
                                  ? sessions.filter((b) => !b.isBreak)
                                  : [],
                              ])
                              .filter(([, sessions]) => sessions.length > 0)
                              .map(([spotId, nonBreakSessions]) => {
                                const isOpen =
                                  openLocations[weekKey]?.[spotId] || false;
                                const ms = nonBreakSessions.reduce(
                                  (a, b) => a + (b.duration || 0),
                                  0
                                );
                                const totalSeconds = Math.floor(ms / 1000);
                                const hours = Math.floor(totalSeconds / 3600);
                                const minutes = Math.floor(
                                  (totalSeconds % 3600) / 60
                                );
                                const seconds = totalSeconds % 60;
                                return (
                                  <View
                                    key={spotId}
                                    style={{ marginBottom: 8 }}
                                  >
                                    <TouchableOpacity
                                      onPress={() =>
                                        toggleLocation(weekKey, spotId)
                                      }
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        backgroundColor: themeColors.white,
                                        borderRadius: 8,
                                        padding: 10,
                                        borderWidth: 1,
                                        borderColor: themeColors.purple,
                                        shadowColor: themeColors.black,
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.04,
                                        shadowRadius: 2,
                                        elevation: 1,
                                        marginBottom: isOpen ? 4 : 0,
                                      }}
                                      activeOpacity={0.85}
                                    >
                                      <Text
                                        style={{
                                          color: themeColors.purple,
                                          fontWeight: "bold",
                                          fontSize: 14,
                                          flex: 1,
                                        }}
                                      >
                                        {nonBreakSessions[0]?.buildingName ||
                                          spotId}
                                        {nonBreakSessions[0]?.roomNumber
                                          ? ` - Floor ${nonBreakSessions[0].roomNumber}`
                                          : ""}
                                      </Text>
                                      <Text
                                        style={{
                                          color: themeColors.black,
                                          fontSize: 13,
                                          marginRight: 8,
                                          fontWeight: "bold",
                                        }}
                                      >
                                        {hours}h {minutes}m {seconds}s
                                      </Text>
                                      <CaretRight
                                        size={20}
                                        color={themeColors.purple}
                                        weight="bold"
                                        style={{
                                          transform: [
                                            {
                                              rotate: isOpen ? "90deg" : "0deg",
                                            },
                                          ],
                                        }}
                                      />
                                    </TouchableOpacity>
                                    {isOpen && (
                                      <View style={{ marginTop: 2 }}>
                                        {nonBreakSessions.length > 0 ? (
                                          nonBreakSessions
                                            .sort((a, b) => b.start - a.start)
                                            .map((s, idx) => (
                                              <View
                                                key={idx}
                                                style={{
                                                  marginLeft: 8,
                                                  marginBottom: 4,
                                                  backgroundColor:
                                                    themeColors.gray + "10",
                                                  borderRadius: 8,
                                                  padding: 8,
                                                  borderWidth: 1,
                                                  borderColor:
                                                    themeColors.gray + "44",
                                                  shadowColor:
                                                    themeColors.black,
                                                  shadowOffset: {
                                                    width: 0,
                                                    height: 1,
                                                  },
                                                  shadowOpacity: 0.04,
                                                  shadowRadius: 2,
                                                  elevation: 1,
                                                  flexDirection: "row",
                                                  alignItems: "center",
                                                }}
                                              >
                                                <View style={{ flex: 1 }}>
                                                  <Text
                                                    style={{
                                                      color: themeColors.black,
                                                      fontSize: 13,
                                                      fontWeight: "bold",
                                                    }}
                                                  >
                                                    {s.start
                                                      ? new Date(
                                                          s.start
                                                        ).toLocaleString([], {
                                                          month: "short",
                                                          day: "numeric",
                                                          hour: "2-digit",
                                                          minute: "2-digit",
                                                        })
                                                      : ""}
                                                    {" - "}
                                                    <Text
                                                      style={{
                                                        color:
                                                          themeColors.black,
                                                      }}
                                                    >
                                                      {(() => {
                                                        const sec = Math.floor(
                                                          (s.duration || 0) /
                                                            1000
                                                        );
                                                        const h = Math.floor(
                                                          sec / 3600
                                                        );
                                                        const m = Math.floor(
                                                          (sec % 3600) / 60
                                                        );
                                                        const sec2 = sec % 60;
                                                        let out = [];
                                                        if (h > 0)
                                                          out.push(`${h}h`);
                                                        if (m > 0 || h > 0)
                                                          out.push(`${m}m`);
                                                        out.push(`${sec2}s`);
                                                        return out.join(" ");
                                                      })()}
                                                    </Text>
                                                  </Text>
                                                  {s.note ? (
                                                    <Text
                                                      style={{
                                                        color:
                                                          themeColors.purple,
                                                        fontSize: 13,
                                                        marginTop: 2,
                                                        fontStyle: "italic",
                                                      }}
                                                    >
                                                      “{s.note}”
                                                    </Text>
                                                  ) : null}
                                                </View>
                                                <TouchableOpacity
                                                  onPress={() =>
                                                    handleDeleteSession(
                                                      s,
                                                      spotId
                                                    )
                                                  }
                                                  style={{
                                                    marginLeft: 8,
                                                    padding: 4,
                                                    borderRadius: 6,
                                                    backgroundColor:
                                                      themeColors.red + "22",
                                                  }}
                                                  accessibilityLabel="Delete session"
                                                >
                                                  <Trash
                                                    size={18}
                                                    color={themeColors.red}
                                                    weight="bold"
                                                  />
                                                </TouchableOpacity>
                                              </View>
                                            ))
                                        ) : (
                                          <Text
                                            style={{
                                              color: themeColors.darkGray,
                                              fontSize: 13,
                                              marginLeft: 8,
                                            }}
                                          >
                                            No sessions.
                                          </Text>
                                        )}
                                      </View>
                                    )}
                                  </View>
                                );
                              })
                          ) : (
                            <Text
                              style={{
                                color: themeColors.darkGray,
                                fontSize: 13,
                                marginLeft: 4,
                              }}
                            >
                              No focus sessions.
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                });
              })()}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowArchiveModal(false)}
              style={{
                marginTop: 10,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 32,
                alignItems: "center",
                shadowColor: themeColors.black,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 2,
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
                Close
              </Text>
            </TouchableOpacity>
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
              borderRadius: 18,
              padding: 26,
              width: "92%",
              alignItems: "center",
              shadowColor: themeColors.black,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.13,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 4,
                textAlign: "center",
                letterSpacing: 0.2,
              }}
            >
              Session Reflection
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: themeColors.darkGray,
                marginBottom: 18,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              How did your Pomodoro session go? Write a quick note or reflection
              (optional).
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: themeColors.purple,
                borderRadius: 10,
                width: "100%",
                minHeight: 80,
                maxHeight: 120,
                marginBottom: 10,
                padding: 12,
                fontSize: 16,
                color: themeColors.black,
                textAlignVertical: "top",
                backgroundColor: themeColors.gray + "18",
              }}
              placeholder="E.g. Stayed focused, got distracted, what did you work on, etc."
              placeholderTextColor={themeColors.gray}
              value={sessionNote}
              onChangeText={setSessionNote}
              multiline
              maxLength={200}
              returnKeyType="done"
            />
            <View
              style={{
                width: "100%",
                alignItems: "flex-end",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: themeColors.darkGray, fontSize: 13 }}>
                {sessionNote.length}/200
              </Text>
            </View>
            <View style={{ flexDirection: "row", width: "100%" }}>
              <TouchableOpacity
                onPress={handleSaveSessionNote}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.purple,
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: "center",
                  marginRight: 8,
                  shadowColor: themeColors.black,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 2,
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
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          alignItems: "center",
          paddingBottom: 32,
          paddingTop: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", marginTop: 2, width: "100%" }}>
          {/* Archive icon button moved here, above location picker */}
          <TouchableOpacity
            onPress={() => setShowArchiveModal(true)}
            style={{
              alignSelf: "flex-end",
              marginRight: 18,
              marginBottom: 24,
              backgroundColor: themeColors.gray,
              borderRadius: 24,
              paddingVertical: 7,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: themeColors.black,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 2,
              elevation: 2,
            }}
            accessibilityLabel="View Focus Archive"
            activeOpacity={0.85}
          >
            <Archive size={20} color={themeColors.purple} weight="bold" />
            <Text
              style={{
                color: themeColors.purple,
                fontSize: 15,
                fontWeight: "bold",
                marginLeft: 8,
                letterSpacing: 0.2,
              }}
            >
              Archive
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (isRunning) {
                Alert.alert(
                  "Cannot Switch Location",
                  "Please finish or stop your current session before changing location."
                );
                return;
              }
              setShowSpotModal(true);
            }}
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
          </View>

          {/* --- This Week's Focus Stats Dropdown --- */}
          <View
            style={{
              width: "94%",
              alignSelf: "center",
              marginTop: 24,
              marginBottom: 8,
              backgroundColor: themeColors.gray + "18",
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: themeColors.purple + "33",
              shadowColor: themeColors.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.07,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                borderTopLeftRadius: 14,
                borderTopRightRadius: 14,
                backgroundColor: themeColors.white,
                borderBottomWidth: 1,
                borderBottomColor: themeColors.purple + "33",
              }}
            >
              <Text
                style={{
                  fontWeight: "bold",
                  color: themeColors.purple,
                  fontSize: 17,
                  flex: 1,
                }}
              >
                This Week's Focus Stats
              </Text>
            </View>
            <View style={{ padding: 16, paddingTop: 8 }}>
              {/* Per-location dropdowns */}
              {Object.entries(focusStats)
                .map(([spotId, sessions]) => [
                  spotId,
                  Array.isArray(sessions)
                    ? sessions.filter((b) => !b.isBreak)
                    : [],
                ])
                .filter(([, sessions]) => sessions.length > 0).length > 0 ? (
                Object.entries(focusStats)
                  .map(([spotId, sessions]) => [
                    spotId,
                    Array.isArray(sessions)
                      ? sessions.filter((b) => !b.isBreak)
                      : [],
                  ])
                  .filter(([, sessions]) => sessions.length > 0)
                  .map(([spotId, nonBreakSessions]) => {
                    const isOpen = openWeekLocations[spotId] || false;
                    const ms = nonBreakSessions.reduce(
                      (a, b) => a + (b.duration || 0),
                      0
                    );
                    const totalSeconds = Math.floor(ms / 1000);
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;
                    const spot = studySpots.find((s) => s.id === spotId);
                    return (
                      <View key={spotId} style={{ marginBottom: 8 }}>
                        <TouchableOpacity
                          onPress={() => toggleWeekLocation(spotId)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: themeColors.white,
                            borderRadius: 8,
                            padding: 10,
                            borderWidth: 1,
                            borderColor: themeColors.purple,
                            shadowColor: themeColors.black,
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.04,
                            shadowRadius: 2,
                            elevation: 1,
                            marginBottom: isOpen ? 4 : 0,
                          }}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={{
                              color: themeColors.purple,
                              fontWeight: "bold",
                              fontSize: 14,
                              flex: 1,
                            }}
                          >
                            {spot?.buildingName || spotId}
                            {spot?.roomNumber
                              ? ` - Floor ${spot.roomNumber}`
                              : ""}
                          </Text>
                          <Text
                            style={{
                              color: themeColors.black,
                              fontSize: 13,
                              marginRight: 8,
                              fontWeight: "bold",
                            }}
                          >
                            {hours}h {minutes}m {seconds}s
                          </Text>
                          <CaretRight
                            size={20}
                            color={themeColors.purple}
                            weight="bold"
                            style={{
                              transform: [
                                { rotate: isOpen ? "90deg" : "0deg" },
                              ],
                            }}
                          />
                        </TouchableOpacity>
                        {isOpen && (
                          <View style={{ marginTop: 2 }}>
                            {nonBreakSessions.length > 0 ? (
                              nonBreakSessions
                                .sort((a, b) => b.start - a.start)
                                .map((s, idx) => (
                                  <View
                                    key={s.sessionId || idx}
                                    style={{
                                      marginLeft: 8,
                                      marginBottom: 4,
                                      backgroundColor: themeColors.gray + "10",
                                      borderRadius: 8,
                                      padding: 8,
                                      borderWidth: 1,
                                      borderColor: themeColors.gray + "44",
                                      shadowColor: themeColors.black,
                                      shadowOffset: {
                                        width: 0,
                                        height: 1,
                                      },
                                      shadowOpacity: 0.04,
                                      shadowRadius: 2,
                                      elevation: 1,
                                      flexDirection: "row",
                                      alignItems: "center",
                                    }}
                                  >
                                    <View style={{ flex: 1 }}>
                                      <Text
                                        style={{
                                          color: themeColors.black,
                                          fontSize: 13,
                                          fontWeight: "bold",
                                        }}
                                      >
                                        {s.start
                                          ? new Date(s.start).toLocaleString(
                                              [],
                                              {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              }
                                            )
                                          : ""}
                                        {" - "}
                                        <Text
                                          style={{
                                            color: themeColors.black,
                                          }}
                                        >
                                          {(() => {
                                            const sec = Math.floor(
                                              (s.duration || 0) / 1000
                                            );
                                            const h = Math.floor(sec / 3600);
                                            const m = Math.floor(
                                              (sec % 3600) / 60
                                            );
                                            const sec2 = sec % 60;
                                            let out = [];
                                            if (h > 0) out.push(`${h}h`);
                                            if (m > 0 || h > 0)
                                              out.push(`${m}m`);
                                            out.push(`${sec2}s`);
                                            return out.join(" ");
                                          })()}
                                        </Text>
                                      </Text>
                                      {s.note ? (
                                        <Text
                                          style={{
                                            color: themeColors.purple,
                                            fontSize: 13,
                                            marginTop: 2,
                                            fontStyle: "italic",
                                          }}
                                        >
                                          “{s.note}”
                                        </Text>
                                      ) : null}
                                    </View>
                                    <TouchableOpacity
                                      onPress={() =>
                                        handleDeleteSession(s, spotId)
                                      }
                                      style={{
                                        marginLeft: 8,
                                        padding: 4,
                                        borderRadius: 6,
                                        backgroundColor: themeColors.red + "22",
                                      }}
                                      accessibilityLabel="Delete session"
                                    >
                                      <Trash
                                        size={18}
                                        color={themeColors.red}
                                        weight="bold"
                                      />
                                    </TouchableOpacity>
                                  </View>
                                ))
                            ) : (
                              <Text
                                style={{
                                  color: themeColors.darkGray,
                                  fontSize: 13,
                                  marginLeft: 8,
                                }}
                              >
                                No sessions.
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
              ) : (
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 13,
                    marginLeft: 4,
                  }}
                >
                  No focus sessions.
                </Text>
              )}
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
                        if (isRunning) {
                          Alert.alert(
                            "Cannot Switch Location",
                            "Please finish or stop your current session before changing location."
                          );
                          return;
                        }
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
                        style={{
                          color: themeColors.purple,
                          fontWeight: "bold",
                        }}
                      >
                        {item.buildingName}
                      </Text>
                      {item.roomNumber && (
                        <Text
                          style={{ color: themeColors.darkGray, fontSize: 13 }}
                        >
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
                  <Text
                    style={{ color: themeColors.white, fontWeight: "bold" }}
                  >
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
                {/* Session List with Notes (delete button removed) */}
                <ScrollView
                  style={{ width: "100%", maxHeight: 220, marginBottom: 12 }}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={{ paddingBottom: 40 }}
                >
                  {selectedStatSpot?.sessions?.length > 0 ? (
                    selectedStatSpot.sessions
                      .filter((session) => !session.isBreak)
                      .sort((a, b) => b.start - a.start)
                      .map((session, idx, arr) => {
                        const date = new Date(session.start);
                        const durationSec = Math.floor(
                          (session.duration || 0) / 1000
                        );
                        const hours = Math.floor(durationSec / 3600);
                        const minutes = Math.floor((durationSec % 3600) / 60);
                        const seconds = durationSec % 60;
                        return (
                          <View
                            key={session.sessionId}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "flex-start",
                              borderBottomWidth: idx === arr.length - 1 ? 0 : 1,
                              borderBottomColor: themeColors.gray,
                              paddingVertical: 10,
                              backgroundColor: "#fff",
                              minHeight: 48,
                            }}
                          >
                            <View style={{ flex: 1 }}>
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
                            {/* Delete button removed */}
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
                  You can view your sessions for this spot.
                </Text>
                <View style={{ flexDirection: "row", width: "100%" }}>
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
                    <Text
                      style={{ color: themeColors.purple, fontWeight: "bold" }}
                    >
                      Close
                    </Text>
                  </TouchableOpacity>
                  {/* Delete All button removed */}
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>
    </>
  );
}

// Optionally, keep the default export for backward compatibility
// export default FocusTimerScreen;
