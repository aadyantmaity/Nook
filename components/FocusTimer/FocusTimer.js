import React, { useMemo, useState, useContext, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, TextInput } from "react-native";
import { CountdownCircleTimer } from "react-native-countdown-circle-timer";
import { ThemeContext } from "../../App";
import * as Notifications from "expo-notifications";
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  GearSix,
  Clock,
  Briefcase,
  Coffee,
  ArrowRight,
  Archive,
} from "phosphor-react-native";
import {
  saveFocusSession,
  getFocusSessions,
  formatDuration,
} from "../../services/focusSessions";
import FocusSessionsModal from "./FocusSessionsModal";
import { FocusGoalCard } from "./FocusGoalCard";
import { FocusGoalModal } from "./FocusGoalModal";
import LocationPickerModal from "./LocationPickerModal";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";

// presets removed

function formatHhMmSs(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function clampSeconds(seconds) {
  const MIN = 6; // 0.1 minutes = 6 seconds minimum
  const MAX = 120 * 60; // 120 minutes
  return Math.max(MIN, Math.min(MAX, seconds));
}

function TimeAdjustRow({ label, seconds, onChange, colors }) {
  const [text, setText] = useState(String(Math.round(seconds / 60)));
  React.useEffect(() => {
    // Only show decimal if the time is not a whole number
    const minutes = seconds / 60;
    setText(Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1));
  }, [seconds]);

  const onChangeText = (value) => {
    // Allow digits, decimal point, and up to 1 decimal place
    const decimalRegex = /^\d*\.?\d{0,1}$/;
    if (!decimalRegex.test(value)) return;

    setText(value);
    if (value === "" || value === ".") return;

    const minutes = parseFloat(value);
    if (!isNaN(minutes) && minutes >= 0.1) {
      onChange(clampSeconds(minutes * 60));
    }
  };

  return (
    <View style={{ width: "100%", marginBottom: 14 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
          gap: 6,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: colors.black,
            fontFamily: "CarosSoft",
          }}
        >
          {label} (min)
        </Text>
      </View>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: colors.purple,
          borderRadius: 10,
          paddingVertical: 10,
          paddingHorizontal: 12,
          color: colors.black,
          backgroundColor: colors.white,
          fontFamily: "CarosSoft",
          fontSize: 16,
        }}
        keyboardType="decimal-pad"
        inputMode="decimal"
        value={text}
        onChangeText={onChangeText}
        maxLength={5}
        placeholder="0"
        placeholderTextColor={colors.darkGray || "#9CA3AF"}
        accessibilityLabel={`${label} minutes input`}
      />
    </View>
  );
}

function CountdownDisplay({
  isPlaying,
  duration,
  timerKey,
  colors,
  onComplete,
  mode,
  onEditPress,
  canEdit,
}) {
  const colorSequence = useMemo(
    () =>
      mode === "break"
        ? [colors.green || "#22C55E", colors.orange, "#A30000", "#A30000"]
        : [colors.purple, colors.orange, "#A30000", "#A30000"],
    [colors, mode]
  );

  const colorsTime = useMemo(() => {
    const t2 = Math.max(Math.floor(duration * 0.4), 1);
    const t3 = Math.max(Math.floor(duration * 0.1), 1);
    return [duration, t2, t3, 0];
  }, [duration]);

  return (
    <TouchableOpacity
      activeOpacity={canEdit ? 0.7 : 1}
      onPress={canEdit ? onEditPress : undefined}
      disabled={!canEdit}
      style={{ alignItems: "center" }}
      accessibilityLabel={canEdit ? "Edit times" : "Timer display"}
    >
      <CountdownCircleTimer
        key={timerKey}
        isPlaying={isPlaying}
        duration={duration}
        colors={colorSequence}
        colorsTime={colorsTime}
        size={230}
        strokeWidth={14}
        trailColor={colors.gray || colors.lightGray}
        onComplete={onComplete}
      >
        {({ remainingTime }) => (
          <View style={{ alignItems: "center" }}>
            <Text
              accessibilityRole="timer"
              accessibilityLiveRegion="assertive"
              importantForAccessibility="yes"
              style={{
                fontSize: 54,
                color: colors.black,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
              }}
            >
              {formatHhMmSs(remainingTime)}
            </Text>
            <Text
              style={{
                fontSize: 20,
                color: colors.darkGray || "#6B7280",
                fontFamily: "CarosSoft",
                marginTop: 4,
              }}
            >
              {mode === "break" ? "Break" : "Work"}
            </Text>
          </View>
        )}
      </CountdownCircleTimer>
    </TouchableOpacity>
  );
}

function TimerControls({ isPlaying, onToggle, onReset, onSkip, colors, mode }) {
  return (
    <View
      style={{
        alignItems: "center",
        marginTop: 0,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          gap: 20,
          marginBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={onToggle}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: isPlaying
              ? colors.orange
              : colors.green || "#22C55E",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
          accessibilityLabel={isPlaying ? "Pause timer" : "Start timer"}
        >
          {isPlaying ? (
            <Pause size={28} color={colors.white} weight="bold" />
          ) : (
            <Play size={28} color={colors.white} weight="bold" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onReset}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.red || "#EF4444",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
          accessibilityLabel="Reset timer"
        >
          <ArrowCounterClockwise size={28} color={colors.white} weight="bold" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSkip}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.blue || "#3B82F6",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
          accessibilityLabel="Skip to next timer"
        >
          <ArrowRight size={28} color={colors.white} weight="bold" />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", gap: 20 }}>
        <View style={{ alignItems: "center", width: 64 }}>
          <Text
            style={{
              color: colors.darkGray || "#6B7280",
              fontFamily: "CarosSoft",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {isPlaying ? "Pause" : "Start"}
          </Text>
        </View>
        <View style={{ alignItems: "center", width: 64 }}>
          <Text
            style={{
              color: colors.darkGray || "#6B7280",
              fontFamily: "CarosSoft",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            Reset
          </Text>
        </View>
        <View style={{ alignItems: "center", width: 64 }}>
          <Text
            style={{
              color: colors.darkGray || "#6B7280",
              fontFamily: "CarosSoft",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            Skip
          </Text>
        </View>
      </View>
    </View>
  );
}

function EditTimesModal({
  visible,
  onClose,
  workSeconds,
  breakSeconds,
  onSave,
  colors,
  saveUserTimerSettings,
}) {
  const [tempWork, setTempWork] = useState(workSeconds);
  const [tempBreak, setTempBreak] = useState(breakSeconds);
  const [isSaving, setIsSaving] = useState(false);

  // Keep temp state in sync when opening
  React.useEffect(() => {
    if (visible) {
      setTempWork(workSeconds);
      setTempBreak(breakSeconds);
    }
  }, [visible, workSeconds, breakSeconds]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPressOut={onClose}
      >
        <View
          style={{
            backgroundColor: colors.white,
            borderRadius: 16,
            padding: 20,
            width: "85%",
            position: "absolute",
            left: "7.5%",
            right: "7.5%",
            bottom: "45%",
            borderWidth: 1,
            borderColor: colors.black,
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
              color: colors.black,
              fontFamily: "CarosSoft",
            }}
          >
            Timer Settings
          </Text>

          <TimeAdjustRow
            label="Work"
            seconds={tempWork}
            onChange={setTempWork}
            colors={colors}
          />
          <TimeAdjustRow
            label="Break"
            seconds={tempBreak}
            onChange={setTempBreak}
            colors={colors}
          />

          <View style={{ flexDirection: "row", marginTop: 6 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: colors.white,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 18,
                alignItems: "center",
                flex: 1,
                marginRight: 8,
                borderWidth: 1,
                borderColor: colors.purple,
              }}
            >
              <Text
                style={{
                  color: colors.purple,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                setIsSaving(true);
                try {
                  // Save directly to Firebase
                  await saveUserTimerSettings(tempWork, tempBreak);
                  // Update local state
                  onSave(tempWork, tempBreak);
                  onClose();
                } catch (error) {
                  console.error("Failed to save timer settings:", error);
                  // You could show an alert here if needed
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              style={{
                backgroundColor: isSaving
                  ? colors.gray || "#9CA3AF"
                  : colors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 18,
                alignItems: "center",
                flex: 1,
                marginLeft: 8,
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              <Text
                style={{
                  color: colors.white,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                {isSaving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function FocusTimer() {
  const { themeColors } = useContext(ThemeContext) || {};
  const colors = themeColors || {
    purple: "#6C63FF",
    orange: "#F59E0B",
    white: "#FFFFFF",
    black: "#111827",
    lightGray: "#E5E7EB",
    gray: "#E5E7EB",
    green: "#22C55E",
    red: "#EF4444",
    blue: "#3B82F6",
  };

  const [mode, setMode] = useState("work"); // 'work' | 'break'
  const [workDuration, setWorkDuration] = useState(25 * 60);
  const [breakDuration, setBreakDuration] = useState(5 * 60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [archiveVisible, setArchiveVisible] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true); // Add loading state
  const [weeklyStats, setWeeklyStats] = useState({
    focusTime: 0,
    sessions: 0,
    completed: 0,
  });

  // Goal state management
  const [currentGoal, setCurrentGoal] = useState(null);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // Location picker state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Load user's timer settings from Firestore
  const loadUserTimerSettings = useCallback(async () => {
    try {
      setIsLoadingSettings(true);
      const user = auth.currentUser;
      if (!user) {
        setIsLoadingSettings(false);
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userWorkDuration = userData.workDuration || 25 * 60; // Default 25 minutes
        const userBreakDuration = userData.breakDuration || 5 * 60; // Default 5 minutes

        setWorkDuration(userWorkDuration);
        setBreakDuration(userBreakDuration);

        // Load current goal
        if (userData.currentGoal) {
          setCurrentGoal(userData.currentGoal);
        }
      }
    } catch (error) {
      console.error("Failed to load user timer settings:", error);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  // Save current goal to Firestore
  const saveCurrentGoal = useCallback(async (goal) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db, "users", user.uid), {
        currentGoal: goal,
      });
      setCurrentGoal(goal);
    } catch (error) {
      console.error("Failed to save current goal:", error);
    }
  }, []);

  // Handle goal save from modal
  const handleGoalSave = useCallback(
    (goalData) => {
      if (goalData === null) {
        // Delete goal
        saveCurrentGoal(null);
      } else {
        saveCurrentGoal(goalData);
      }
    },
    [saveCurrentGoal]
  );

  // No goal progress logic needed for task-based goals

  // Save user's timer settings to Firestore
  const saveUserTimerSettings = useCallback(
    async (workSeconds, breakSeconds) => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        await updateDoc(doc(db, "users", user.uid), {
          workDuration: workSeconds,
          breakDuration: breakSeconds,
        });
      } catch (error) {
        console.error("Failed to save user timer settings:", error);
      }
    },
    []
  );

  // Load user settings on component mount
  React.useEffect(() => {
    loadUserTimerSettings();
  }, [loadUserTimerSettings]);

  const updateDuration = useCallback(
    (seconds, target) => {
      if (target === "break") {
        setBreakDuration(seconds);
      } else {
        setWorkDuration(seconds);
      }

      if (mode === target) {
        setIsPlaying(false);
        setTimerKey((k) => k + 1);
      }
    },
    [mode]
  );

  const onReset = useCallback(() => {
    // Cancel any scheduled notifications
    Notifications.cancelAllScheduledNotificationsAsync();

    setIsPlaying(false);
    setSessionStartTime(null);
    setElapsedTime(0);
    setSelectedLocation(null); // Reset location when resetting
    if (isPlaying) {
      // If timer is running, reset to user's saved settings for current timer
      if (mode === "work") {
        setWorkDuration(workDuration); // Keep current user setting
      } else {
        setBreakDuration(breakDuration); // Keep current user setting
      }
    } else {
      // If timer is not running, reset to work timer with user's settings
      setMode("work");
      // Keep user's saved settings
    }
    setTimerKey((k) => k + 1);
  }, [isPlaying, mode, workDuration, breakDuration]);

  const saveSession = useCallback(
    async (duration, wasCompleted) => {
      try {
        await saveFocusSession(duration, mode, wasCompleted, selectedLocation);

        // Refresh weekly stats after saving a session
        calculateWeeklyStats();
      } catch (error) {
        console.error("Failed to save session:", error);
      }
    },
    [mode, calculateWeeklyStats, selectedLocation]
  );

  const handleTimerComplete = useCallback(() => {
    if (mode === "work") {
      let totalElapsed = elapsedTime;
      if (sessionStartTime) {
        totalElapsed += Math.floor((Date.now() - sessionStartTime) / 1000);
      }
      if (totalElapsed > 0) {
        saveSession(totalElapsed, true);
      }
    }

    // Switch to the next mode
    const nextMode = mode === "work" ? "break" : "work";
    setMode(nextMode);

    // Reset timer state
    setIsPlaying(false);
    setSessionStartTime(null);
    setElapsedTime(0);
    setSelectedLocation(null); // Reset location when switching modes
    setTimerKey((k) => k + 1);

    // Automatically start break timer when work session completes
    if (mode === "work") {
      // Use setTimeout to ensure state updates are processed first
      setTimeout(() => {
        setIsPlaying(true);
        setSessionStartTime(Date.now());
        // Schedule notification for break timer with a small delay
        setTimeout(() => {
          scheduleTimerNotification(breakDuration, "break");
        }, 200);
      }, 100);
    }

    return { shouldRepeat: false };
  }, [
    sessionStartTime,
    mode,
    saveSession,
    elapsedTime,
    breakDuration,
    scheduleTimerNotification,
  ]);

  const handleSkip = useCallback(() => {
    // Cancel any scheduled notifications
    Notifications.cancelAllScheduledNotificationsAsync();

    if (mode === "work") {
      let totalElapsed = elapsedTime;
      if (sessionStartTime) {
        totalElapsed += Math.floor((Date.now() - sessionStartTime) / 1000);
      }

      // Always save work time to focus stats when skipping work sessions
      if (totalElapsed > 0) {
        saveSession(totalElapsed, false);
      }
      setElapsedTime(0);
    } else {
      // When skipping break, always reset elapsed time
      setElapsedTime(0);
    }

    setIsPlaying(false);
    setSessionStartTime(null);
    setMode((m) => (m === "work" ? "break" : "work"));
    setTimerKey((k) => k + 1);
  }, [sessionStartTime, mode, saveSession, elapsedTime]);

  // Function to schedule notification for timer completion
  const scheduleTimerNotification = useCallback(async (duration, mode) => {
    try {
      console.log(
        `Scheduling ${mode} timer notification for ${duration} seconds`
      );

      // Request notification permissions first
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        console.log("Requesting notification permissions...");
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Notification permissions not granted");
        return;
      }

      console.log(
        "Notification permissions granted, scheduling notification..."
      );

      // Cancel any existing notifications first
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Add a small delay for the first notification after app restart
      // This helps ensure the notification system is fully initialized
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Schedule new notification
      const scheduledDate = new Date(Date.now() + duration * 1000);
      console.log(`Notification scheduled for: ${scheduledDate.toISOString()}`);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${mode === "work" ? "Work" : "Break"} Session Complete!`,
          body: `Your ${
            mode === "work" ? "work" : "break"
          } timer has finished.`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledDate,
        },
      });

      console.log(
        `Notification scheduled successfully with ID: ${notificationId}`
      );

      // Verify the notification was scheduled by checking scheduled notifications
      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync();
      const ourNotification = scheduledNotifications.find(
        (n) => n.identifier === notificationId
      );

      if (!ourNotification) {
        console.log("Notification not found in scheduled list, retrying...");
        // Retry once after a short delay
        await new Promise((resolve) => setTimeout(resolve, 200));

        const retryId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `${mode === "work" ? "Work" : "Break"} Session Complete!`,
            body: `Your ${
              mode === "work" ? "work" : "break"
            } timer has finished.`,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(Date.now() + duration * 1000),
          },
        });
        console.log(`Retry notification scheduled with ID: ${retryId}`);
      }
    } catch (error) {
      console.error("Failed to schedule notification:", error);
    }
  }, []);

  const handleToggle = useCallback(() => {
    // Prevent starting timer while settings are loading
    if (isLoadingSettings) {
      console.log("Settings still loading, cannot start timer");
      return;
    }

    if (!isPlaying) {
      // Before starting timer, show location picker
      setShowLocationModal(true);
    } else {
      // Pausing timer - save elapsed time
      if (sessionStartTime) {
        const newElapsedTime = Math.floor(
          (Date.now() - sessionStartTime) / 1000
        );
        setElapsedTime(elapsedTime + newElapsedTime);
      }
      setSessionStartTime(null);
      // Cancel notification when pausing
      Notifications.cancelAllScheduledNotificationsAsync();
      setIsPlaying(false);
    }
  }, [isPlaying, sessionStartTime, elapsedTime, isLoadingSettings]);

  const startTimerWithLocation = useCallback(
    (location) => {
      setSelectedLocation(location);
      setSessionStartTime(Date.now());
      setIsPlaying(true);

      // Schedule notification for timer completion with a small delay to ensure notification system is ready
      setTimeout(() => {
        scheduleTimerNotification(currentDuration, mode);
        console.log(
          `Scheduled notification for ${mode} timer completion (${currentDuration}s remaining) at ${
            location?.name || "No location"
          }`
        );
      }, 200);
    },
    [currentDuration, mode, scheduleTimerNotification]
  );

  const currentDuration = mode === "work" ? workDuration : breakDuration;

  // Determine if editing should be enabled
  // Enabled when timer is paused
  // Disabled when timer is running
  const canEdit = !isPlaying;

  // Calculate this week's stats (Monday to Sunday)
  const calculateWeeklyStats = useCallback(async () => {
    try {
      const sessions = await getFocusSessions();

      // Get Monday of current week
      const now = new Date();
      const monday = new Date(now);
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so we go back 6 days
      monday.setDate(now.getDate() - daysToMonday);
      monday.setHours(0, 0, 0, 0);

      // Get Sunday of current week
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      // Filter sessions for this week
      const thisWeekSessions = sessions.filter((session) => {
        const sessionDate = session.timestamp?.toDate
          ? session.timestamp.toDate()
          : new Date(session.createdAt);
        return sessionDate >= monday && sessionDate <= sunday;
      });

      // Calculate stats
      const workSessions = thisWeekSessions.filter((s) => s.mode === "work");
      const focusTime = workSessions.reduce(
        (total, s) => total + s.duration,
        0
      );
      const completed = workSessions.filter((s) => s.wasCompleted).length;

      setWeeklyStats({
        focusTime,
        sessions: workSessions.length,
        completed,
      });
    } catch (error) {
      console.error("Error calculating weekly stats:", error);
    }
  }, []);

  // Load weekly stats on mount
  React.useEffect(() => {
    calculateWeeklyStats();
  }, [calculateWeeklyStats]);

  // No live progress needed for task-based goals

  return (
    <View style={{ flex: 1, backgroundColor: colors.white, paddingTop: 60 }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "flex-start",
          paddingHorizontal: 20,
          paddingTop: 16,
        }}
      >
        {isLoadingSettings ? (
          <View
            style={{ alignItems: "center", justifyContent: "center", flex: 1 }}
          >
            <Text style={{ fontSize: 20, color: colors.darkGray }}>
              Loading settings...
            </Text>
          </View>
        ) : (
          <>
            {/* Focus Goal Card */}
            <FocusGoalCard
              goal={currentGoal || {}}
              setShowGoalModal={setShowGoalModal}
              themeColors={colors}
              onDelete={() => handleGoalSave(null)}
              setGoal={setCurrentGoal}
              saveGoal={saveCurrentGoal}
              isRunning={isPlaying}
            />

            <CountdownDisplay
              isPlaying={isPlaying}
              duration={currentDuration}
              timerKey={timerKey}
              colors={colors}
              mode={mode}
              onComplete={handleTimerComplete}
              onEditPress={() => setSettingsVisible(true)}
              canEdit={canEdit}
            />

            {/* Tap to edit text */}
            {canEdit && (
              <Text
                style={{
                  fontSize: 15,
                  color: colors.darkGray,
                  fontFamily: "CarosSoft",
                  textAlign: "center",
                  marginTop: 8,
                  opacity: 0.8,
                }}
              >
                Tap to edit
              </Text>
            )}

            <View style={{ marginTop: 16 }}>
              <TimerControls
                isPlaying={isPlaying}
                onToggle={handleToggle}
                onReset={onReset}
                onSkip={handleSkip}
                colors={colors}
                mode={mode}
              />
            </View>

            {/* This Week's Stats */}
            <View style={{ marginTop: 26, width: "100%" }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "bold",
                  color: colors.black,
                  fontFamily: "CarosSoft",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                This Week's Stats
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-evenly",
                  backgroundColor: colors.white,
                  borderRadius: 16,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "bold",
                      color: colors.purple,
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {formatDuration(weeklyStats.focusTime)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.darkGray || "#6B7280",
                      fontFamily: "CarosSoft",
                      textAlign: "center",
                    }}
                  >
                    Focus Time
                  </Text>
                </View>

                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "bold",
                      color: colors.black,
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {weeklyStats.sessions}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.darkGray || "#6B7280",
                      fontFamily: "CarosSoft",
                      textAlign: "center",
                    }}
                  >
                    Sessions
                  </Text>
                </View>
              </View>
            </View>

            {/* Archive Button */}
            <TouchableOpacity
              onPress={() => setArchiveVisible(true)}
              style={{
                position: "absolute",
                top: -40,
                right: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 25,
                backgroundColor: colors.white,
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
              accessibilityLabel="View focus sessions archive"
            >
              <Archive size={18} color={colors.purple} weight="bold" />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.purple,
                  fontFamily: "CarosSoft",
                }}
              >
                Archive
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <EditTimesModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        workSeconds={workDuration}
        breakSeconds={breakDuration}
        onSave={(newWork, newBreak) => {
          updateDuration(newWork, "work");
          updateDuration(newBreak, "break");
        }}
        colors={colors}
        saveUserTimerSettings={saveUserTimerSettings}
      />
      <FocusSessionsModal
        visible={archiveVisible}
        onClose={() => setArchiveVisible(false)}
        colors={colors}
      />
      <FocusGoalModal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        goal={currentGoal}
        onSave={handleGoalSave}
        themeColors={colors}
      />
      <LocationPickerModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onLocationSelect={startTimerWithLocation}
        colors={colors}
      />
    </View>
  );
}
