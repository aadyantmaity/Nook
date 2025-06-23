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
  Platform, // <-- add this import
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
  Timer,
} from "phosphor-react-native";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  setDoc, // <-- add this import
  Timestamp,
  query,
  where,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { ThemeContext } from "../../App";
import { colors } from "../../constants/colors";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import PomodoroSettingsModal from "./PomodoroSettingsModal";
import { ArchiveButton } from "./FocusTimerComponents/ArchiveButton";
import { LocationPickerModal } from "./FocusTimerComponents/LocationPicker";
import { FocusStatsDropdown } from "./FocusTimerComponents/FocusStatsDropdown";
import { PauseStopButtons } from "./FocusTimerComponents/PauseStopButtons";
import { TimerControls } from "./FocusTimerComponents/TimerControls";
import { FocusGoalCard } from "./FocusTimerComponents/FocusGoalCard";
import { useGoal, GoalModal, GOAL_STATE_KEY } from "./FocusGoalComponents";

// Add these constants at the top (after imports)
const POMODORO_SETTINGS_KEY = "focusPomodoroSettings";

// --- Timer Feature State ---
const DEFAULT_POMODORO_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;

export function FocusTimerView({ navigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  // Add these lines to fix the missing state for pomodoroMinutes and breakMinutes
  const [pomodoroMinutes, setPomodoroMinutes] = useState(
    DEFAULT_POMODORO_MINUTES
  );
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MINUTES);

  const [studySpots, setStudySpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [timer, setTimer] = useState(DEFAULT_POMODORO_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [focusStats, setFocusStats] = useState({}); // { spotId: [session, ...] }
  const [showSpotModal, setShowSpotModal] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false); // Add this line to fix the error

  // Track timer start time and duration for persistence
  const timerStartRef = useRef(null); // {start: Date, duration: seconds}
  const appState = useRef(AppState.currentState);

  // Add a unique key for saving timer state
  const TIMER_STATE_KEY = "focusTimerState";

  // Auto-start next session state
  const [autoStartNext, setAutoStartNext] = useState(false);

  // --- Goal Feature State ---
  const {
    goal,
    setGoal,
    goalLoaded,
    addSessionToGoal,
    removeSessionFromGoal,
    deleteGoal,
    markCustomGoalAchieved,
  } = useGoal();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCustomGoalModal, setShowCustomGoalModal] = useState(false); // new
  const [goalTypeInput, setGoalTypeInput] = useState("time");
  const [goalTitleInput, setGoalTitleInput] = useState("");
  const [goalInput, setGoalInput] = useState({ h: "", m: "", s: "" });
  const [goalCustomInput, setGoalCustomInput] = useState("");

  // Persist goal to AsyncStorage whenever it changes
  useEffect(() => {
    if (goalLoaded && goal && typeof goal === "object") {
      AsyncStorage.setItem(GOAL_STATE_KEY, JSON.stringify(goal)).catch(
        () => {}
      );
    }
  }, [goal, goalLoaded]);

  // --- Robust Goal Restore on Tab/Screen Focus and on mount ---
  useEffect(() => {
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
      setGoalLoaded(true);
    };
    restoreGoal();
  }, []);

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
        setGoalLoaded(true);
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
        const start = data.start
          ? data.start.seconds
            ? data.start.seconds * 1000
            : data.start.toMillis()
          : null;
        const end = data.end
          ? data.end.seconds
            ? data.end.seconds * 1000
            : data.end.toMillis()
          : null;
        if (end !== null && start !== null && end > weekAgo) {
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
      await recalculateGoalProgressOnBack();
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

  // --- Live Goal Progress Update ---
  const goalProgressIntervalRef = useRef(null);

  // Helper to update goal progress in real time
  const updateGoalProgressLive = useCallback(() => {
    if (
      isRunning &&
      !isBreak &&
      goal.type === "time" &&
      !goal.achieved &&
      sessionStart &&
      timerStartRef.current &&
      goal.target > 0
    ) {
      const now = Date.now();
      const elapsed = Math.floor((now - timerStartRef.current.start) / 1000);
      const sessionElapsed = Math.min(
        timerStartRef.current.duration - (timer - elapsed),
        timerStartRef.current.duration
      );
      const newProgress = goal.progress + elapsed;
      setGoal((prev) => {
        if (prev.achieved) return prev;
        let progress = prev.progress + 1;
        if (progress > prev.target) progress = prev.target;
        return { ...prev, progress };
      });
    }
  }, [isRunning, isBreak, goal, sessionStart, timer]);

  // Effect to update goal progress every second while running
  useEffect(() => {
    if (
      isRunning &&
      !isBreak &&
      goal.type === "time" &&
      !goal.achieved &&
      sessionStart &&
      timerStartRef.current &&
      goal.target > 0
    ) {
      goalProgressIntervalRef.current = setInterval(() => {
        setGoal((prev) => {
          if (prev.achieved) return prev;
          let progress = prev.progress + 1;
          if (progress > prev.target) progress = prev.target;
          return { ...prev, progress };
        });
      }, 1000);
    } else {
      if (goalProgressIntervalRef.current) {
        clearInterval(goalProgressIntervalRef.current);
        goalProgressIntervalRef.current = null;
      }
    }
    return () => {
      if (goalProgressIntervalRef.current) {
        clearInterval(goalProgressIntervalRef.current);
        goalProgressIntervalRef.current = null;
      }
    };
  }, [
    isRunning,
    isBreak,
    goal.type,
    goal.achieved,
    sessionStart,
    timerStartRef.current,
    goal.target,
  ]);

  // --- Recalculate goal progress on app resume/quit ---
  // Remove recalculateGoalProgressOnBack from backgrounding logic
  // Instead, only update goal progress on resume, using lastBackgroundTimeRef

  // Remove this function if not used elsewhere
  // const recalculateGoalProgressOnBack = async () => { ... }

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
        // DO NOT update goal progress here (removes double count)
        // await recalculateTimerOnBack(); // Remove any goal progress update here
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
              // --- Only update goal progress here, once, based on elapsed time ---
              if (
                !isBreak &&
                goal.type === "time" &&
                !goal.achieved &&
                sessionStart &&
                goal.target > 0 &&
                typeof lastBackgroundTime === "number"
              ) {
                const elapsedGoal = Math.floor(
                  (now - lastBackgroundTime) / 1000
                );
                if (elapsedGoal > 0) {
                  setGoal((prev) => {
                    let progress = prev.progress + elapsedGoal;
                    if (progress > prev.target) progress = prev.target;
                    return { ...prev, progress };
                  });
                }
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
  }, [
    isRunning,
    timer,
    isBreak,
    goal.type,
    goal.achieved,
    sessionStart,
    goal.target,
  ]);

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
  const addSessionAndUpdateStats = async (
    start,
    end,
    isBreakSession,
    note,
    skipGoal
  ) => {
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
      // Use setDoc with sessionId as the document ID
      await setDoc(doc(db, "focusSessions", sessionId), sessionObj);
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
      // --- Add session to goal progress if not a break and has sessionId ---
      if (!isBreakSession && sessionObj.sessionId && !skipGoal) {
        await addSessionToGoal({
          ...sessionObj,
          duration,
        });
      }
    }
  };

  // When timer ends (Pomodoro or break complete)
  const handleSessionEnd = async () => {
    // Send a local notification
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isBreak
            ? "Break Over!"
            : "Pomodoro Complete! Go to the Focus mode to start another Pomodoro.",
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
        // Always use the custom Pomodoro duration for work session
        const sessionEnd = new Timestamp(
          sessionStart.seconds !== undefined
            ? sessionStart.seconds + pomodoroMinutes * 60
            : Math.floor(sessionStart / 1000) + pomodoroMinutes * 60,
          sessionStart.nanoseconds !== undefined ? sessionStart.nanoseconds : 0
        );
        setPendingSession({
          start: sessionStart,
          end: sessionEnd,
          isBreak: isBreak,
          sessionDuration: pomodoroMinutes * 60,
        });
        if (reflectionsEnabled) {
          setShowNoteModal(true);
        } else {
          // Save session without note and start break
          await addSessionAndUpdateStats(sessionStart, sessionEnd, isBreak, "");
          setSessionNote("");
          setPendingSession(null);
          setTimeout(() => {
            setIsBreak(true);
            setTimer(breakMinutes * 60);
            setSessionStart(Timestamp.now());
            timerStartRef.current = {
              start: Date.now(),
              duration: breakMinutes * 60,
            };
            setIsRunning(true);
          }, 500);
        }
        return;
      } else {
        // If break ends, just transition to Pomodoro, no reflection
        setSessionStart(null);
        setIsBreak(false);
        setTimer(pomodoroMinutes * 60);
        Alert.alert("Break over!", "Ready for another Pomodoro?");
        if (autoStartNext) {
          setTimeout(() => {
            if (!showNoteModal) {
              setIsRunning(true);
              setSessionStart(Timestamp.now());
              timerStartRef.current = {
                start: Date.now(),
                duration: pomodoroMinutes * 60,
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
      setTimer(breakMinutes * 60);
      Alert.alert(
        "Pomodoro complete!",
        "Go to the Focus mode to start another Pomodoro."
      );
      if (autoStartNext) {
        setTimeout(() => {
          if (!showNoteModal) {
            setIsRunning(true);
            setSessionStart(Timestamp.now());
            timerStartRef.current = {
              start: Date.now(),
              duration: breakMinutes * 60,
            };
          }
        }, 1200);
      }
    } else {
      setIsBreak(false);
      setTimer(pomodoroMinutes * 60);
      Alert.alert("Break over!", "Ready for another Pomodoro?");
      if (autoStartNext) {
        setTimeout(() => {
          if (!showNoteModal) {
            setIsRunning(true);
            setSessionStart(Timestamp.now());
            timerStartRef.current = {
              start: Date.now(),
              duration: pomodoroMinutes * 60,
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
      // Subtract 1 second from end time
      const now = Timestamp.now();
      const endMillis = now.toMillis();
      const end = new Timestamp(
        Math.floor(endMillis / 1000),
        (endMillis % 1000) * 1000000
      );
      if (!isBreak) {
        setPendingSession({
          start: sessionStart,
          end: end,
          isBreak: isBreak,
          sessionDuration: pomodoroMinutes * 60,
        });
        if (reflectionsEnabled) {
          setShowNoteModal(true);
        } else {
          // Save session without note and start break, but skip goal update to avoid double-counting
          await addSessionAndUpdateStats(sessionStart, end, isBreak, "", true);
          setSessionNote("");
          setPendingSession(null);
          setTimeout(() => {
            setIsBreak(true);
            setTimer(breakMinutes * 60);
            setSessionStart(Timestamp.now());
            timerStartRef.current = {
              start: Date.now(),
              duration: breakMinutes * 60,
            };
            setIsRunning(true);
          }, 500);
        }
      } else {
        await addSessionAndUpdateStats(
          sessionStart,
          end,
          isBreak,
          undefined,
          true
        );
        setSessionStart(null);
        setTimer(pomodoroMinutes * 60);
        setIsBreak(false);
      }
    } else {
      setSessionStart(null);
      setTimer(pomodoroMinutes * 60);
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
      // Only add to goal if not already counted (skipGoal: false)
      await addSessionAndUpdateStats(
        pendingSession.start,
        end,
        pendingSession.isBreak,
        sessionNote,
        false
      );
      setSessionNote("");
      setPendingSession(null);
      setShowNoteModal(false);
      // After saving note, start break timer
      setTimeout(() => {
        setIsBreak(true);
        setTimer(breakMinutes * 60);
        setSessionStart(Timestamp.now());
        timerStartRef.current = {
          start: Date.now(),
          duration: breakMinutes * 60,
        };
        setIsRunning(true);
      }, 500);
    }
  };

  // Modal state for stat card
  const [selectedStatSpot, setSelectedStatSpot] = useState(null);
  const [showStatModal, setShowStatModal] = useState(false);
  const [deletingStat, setDeletingStat] = useState(false);

  // --- Archive Modal State ---
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveData, setArchiveData] = useState({});
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [openArchiveMonths, setOpenArchiveMonths] = useState({}); // {year_month: true/false}
  const [openArchiveLocations, setOpenArchiveLocations] = useState({}); // {year_month_spotId: true/false}

  // --- Fetch all-time sessions for archive ---
  const fetchArchiveData = async () => {
    if (!auth.currentUser) return;
    setArchiveLoading(true);
    try {
      const q = query(
        collection(db, "focusSessions"),
        where("userId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      // Group by year -> month -> spotId, EXCLUDE breaks
      const data = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (!d.spotId || !d.start || !d.end || d.isBreak) return;
        const spotId = d.spotId;
        const startMillis = d.start.seconds
          ? d.start.seconds * 1000
          : d.start.toMillis();
        const date = new Date(startMillis);
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // 1-based
        if (!data[year]) data[year] = {};
        if (!data[year][month]) data[year][month] = {};
        if (!data[year][month][spotId]) data[year][month][spotId] = [];
        data[year][month][spotId].push({
          ...d,
          start: startMillis,
          end: d.end.seconds ? d.end.seconds * 1000 : d.end.toMillis(),
          duration: d.duration,
        });
      });
      setArchiveData(data);
    } catch (e) {
      // Optionally handle error
    }
    setArchiveLoading(false);
  };

  // --- Open/close month dropdown in archive ---
  const toggleArchiveMonth = (year, month) => {
    const key = `${year}_${month}`;
    setOpenArchiveMonths((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // --- Open/close location dropdown in archive ---
  const toggleArchiveLocation = (year, month, spotId) => {
    const key = `${year}_${month}_${spotId}`;
    setOpenArchiveLocations((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // --- Open Archive Modal Handler ---
  const handleOpenArchive = async () => {
    await fetchArchiveData();
    setShowArchiveModal(true);
  };

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
        <Text
          style={{
            color: themeColors.darkGray,
            marginTop: 8,
            fontFamily: "CarosSoft",
          }}
        >
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
              fontFamily: "CarosSoft",
            }}
          >
            Total Focus Time
          </Text>
          <Text
            style={{
              color: themeColors.white,
              fontSize: 18,
              marginTop: 2,
              fontFamily: "CarosSoft",
            }}
          >
            {totalHours}h {totalMinutes}m {totalSecs}s
          </Text>
        </View>
        <ScrollView
          style={{ maxHeight: 220 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
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
                      fontFamily: "CarosSoft",
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
                      fontFamily: "CarosSoft",
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
                      fontFamily: "CarosSoft",
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

  // --- Goal Modal Handlers ---
  const handleGoalSave = () => {
    if (goalTypeInput === "custom") {
      setGoal({
        title: goalTitleInput.trim() || "Custom Goal",
        target: 0,
        progress: 0,
        sessionIds: [],
        achieved: false,
        type: "custom",
      });
      setShowGoalModal(false);
      // Do NOT show the custom goal modal immediately after creation
      setGoalTitleInput("");
      setGoalInput({ h: "", m: "", s: "" });
      setGoalCustomInput("");
      setGoalTypeInput("time");
      return;
    }
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
      type: "time",
    });
    setShowGoalModal(false);
    setGoalTitleInput("");
    setGoalInput({ h: "", m: "", s: "" });
    setGoalCustomInput("");
    setGoalTypeInput("time");
  };

  // When opening the goal modal, reset all fields
  const openGoalModal = () => {
    setGoalTitleInput("");
    setGoalInput({ h: "", m: "", s: "" });
    setGoalCustomInput("");
    setGoalTypeInput("time");
    setShowGoalModal(true);
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
                  timerEndedOnFocusRef.current = true; // <-- defer session end
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
  const handleDeleteSession = async (session, spotId, archiveContext) => {
    console.log(
      "Deleting session",
      session.sessionId,
      session.userId,
      auth.currentUser?.uid
    );

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

              await deleteDoc(doc(db, "focusSessions", session.sessionId));

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

              await removeSessionFromGoal(session.sessionId, session.duration);

              // Archive modal UI update (move here, after confirmation)
              if (archiveContext) {
                const { year, month, spotId: archiveSpotId } = archiveContext;
                setArchiveData((prev) => {
                  const newData = JSON.parse(JSON.stringify(prev));
                  try {
                    if (
                      newData[year] &&
                      newData[year][month] &&
                      newData[year][month][archiveSpotId]
                    ) {
                      newData[year][month][archiveSpotId] = newData[year][
                        month
                      ][archiveSpotId].filter(
                        (sess) => sess.sessionId !== session.sessionId
                      );
                      if (newData[year][month][archiveSpotId].length === 0) {
                        delete newData[year][month][archiveSpotId];
                      }
                      if (Object.keys(newData[year][month]).length === 0) {
                        delete newData[year][month];
                      }
                      if (Object.keys(newData[year]).length === 0) {
                        delete newData[year];
                      }
                    }
                  } catch {}
                  return newData;
                });
              }
            } catch (e) {
              Alert.alert("Error", `Failed to delete session: ${e.message}`);
            }
          },
        },
      ]
    );
  };

  // Add this ref at the top-level of the component
  const timerEndedOnFocusRef = useRef(false);

  // After all state declarations, add this effect:
  useEffect(() => {
    if (timerEndedOnFocusRef.current && sessionStart) {
      timerEndedOnFocusRef.current = false;
      handleSessionEnd();
    }
  }, [sessionStart]);

  // --- Reflections Feature State ---
  const REFLECTIONS_ENABLED_KEY = "focusReflectionsEnabled";
  const [reflectionsEnabled, setReflectionsEnabled] = useState(true);

  // Load reflectionsEnabled from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(REFLECTIONS_ENABLED_KEY);
        if (stored !== null) setReflectionsEnabled(stored === "true");
      } catch {}
    })();
  }, []);

  // Persist reflectionsEnabled to AsyncStorage
  const persistReflectionsEnabled = async (val) => {
    setReflectionsEnabled(val);
    try {
      await AsyncStorage.setItem(
        REFLECTIONS_ENABLED_KEY,
        val ? "true" : "false"
      );
    } catch {}
  };

  // Only render UI after goalLoaded is true
  if (!goalLoaded) {
    return null;
  }

  return (
    <>
      {/* Session Note Modal */}
      <Modal
        visible={showNoteModal && reflectionsEnabled}
        transparent
        animationType="fade"
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
              borderRadius: 18,
              padding: 26,
              width: "92%",
              alignItems: "center",
              position: "absolute",
              left: "4%",
              right: "4%",
              bottom: "45%",
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
                fontFamily: "CarosSoft",
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
                fontFamily: "CarosSoft",
              }}
            >
              How did your session go (optional)?. You can disable this in timer
              settings.
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
              placeholderTextColor={themeColors.darkGray}
              value={sessionNote}
              onChangeText={setSessionNote}
              multiline
              maxLength={200}
              returnKeyType="done"
              onSubmitEditing={handleSaveSessionNote}
              blurOnSubmit={true}
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
                    fontFamily: "CarosSoft",
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* --- Archive Modal --- */}
      {/* REMOVE the entire archive modal here */}

      {/* --- Main Timer View --- */}
      <View style={{ flex: 1 }}>
        {/* Archive Icon Button (top right, overlay absolute) */}

        {/* Move all content below the archive button */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            alignItems: "center",
            paddingBottom: 32,
            paddingTop: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          <ArchiveButton
            themeColors={themeColors}
            studySpots={studySpots}
            auth={auth}
            db={db}
            handleDeleteSession={handleDeleteSession}
            setGoal={setGoal} // <-- pass setGoal here
          />
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2,
              width: "100%",
            }}
          >
            {/* --- Focus Goal Card --- */}
            <FocusGoalCard
              goal={goal}
              setShowGoalModal={openGoalModal}
              themeColors={themeColors}
              onDelete={deleteGoal}
              onMarkCustomGoalAchieved={markCustomGoalAchieved}
            />
            {/* --- Location Picker Button --- */}
            <TouchableOpacity
              onPress={() => setShowSpotModal(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: themeColors.white,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: themeColors.purple,
                paddingVertical: 10,
                paddingHorizontal: 18,
                marginBottom: 18,
                marginTop: 54,
                alignSelf: "center",
                shadowColor: themeColors.black,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 2,
                elevation: 1,
              }}
              accessibilityLabel="Select Location"
            >
              <MapPin size={22} color={themeColors.purple} weight="bold" />
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontSize: 15,
                  marginLeft: 8,
                  fontFamily: "CarosSoft",
                }}
              >
                {selectedSpot
                  ? `${selectedSpot.buildingName}${
                      selectedSpot.roomNumber
                        ? ` - Floor ${selectedSpot.roomNumber}`
                        : ""
                    }`
                  : "Select Location"}
              </Text>
            </TouchableOpacity>
            {/* Timer display and controls */}
            <TimerControls
              timer={timer}
              isBreak={isBreak}
              isRunning={isRunning}
              onStart={handleStart}
              onPause={handlePause}
              onStop={handleStop}
              onSettings={() => setShowSettingsModal(true)}
              themeColors={themeColors}
            />
            {/* --- This Week's Focus Stats Dropdown --- */}
            <FocusStatsDropdown
              focusStats={focusStats}
              studySpots={studySpots}
              openWeekLocations={openWeekLocations}
              toggleWeekLocation={toggleWeekLocation}
              handleDeleteSession={handleDeleteSession}
              themeColors={themeColors}
              selectedStatSpot={selectedStatSpot}
              setSelectedStatSpot={setSelectedStatSpot}
              showStatModal={showStatModal}
              setShowStatModal={setShowStatModal}
              deletingStat={deletingStat}
            />
            {/* Location Picker Modal */}
            <LocationPickerModal
              visible={showSpotModal}
              onClose={() => setShowSpotModal(false)}
              studySpots={studySpots}
              setSelectedSpot={setSelectedSpot}
              isRunning={isRunning}
              themeColors={themeColors}
            />
            {/* REMOVE Stat Card Modal here */}
            {/* Pomodoro Settings Modal */}
            <PomodoroSettingsModal
              visible={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
              pomodoroMinutes={pomodoroMinutes}
              setPomodoroMinutes={setPomodoroMinutes}
              breakMinutes={breakMinutes}
              setBreakMinutes={setBreakMinutes}
              isRunning={isRunning}
              isBreak={isBreak}
              setTimer={setTimer}
              themeColors={themeColors}
              reflectionsEnabled={reflectionsEnabled}
              setReflectionsEnabled={persistReflectionsEnabled}
            />
            <GoalModal
              visible={showGoalModal}
              onClose={() => setShowGoalModal(false)}
              goalTypeInput={goalTypeInput}
              setGoalTypeInput={setGoalTypeInput}
              goalTitleInput={goalTitleInput}
              setGoalTitleInput={setGoalTitleInput}
              goalInput={goalInput}
              setGoal={setGoal}
              setGoalInput={setGoalInput}
              goalCustomInput={goalCustomInput}
              setGoalCustomInput={setGoalCustomInput}
              onSave={handleGoalSave}
              themeColors={themeColors}
            />
          </View>
        </ScrollView>
      </View>
    </>
  );
}
