// FocusGoalComponents.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { Trophy, PencilSimple, Trash } from "phosphor-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Goal constants
export const GOAL_STATE_KEY = "focusGoalState";

// Custom hook for goal state management
export const useGoal = () => {
  const [goal, setGoal] = useState({
    title: "",
    target: 0,
    progress: 0,
    sessionIds: [],
    achieved: false,
    type: "time",
  });
  const [goalLoaded, setGoalLoaded] = useState(false);
  const [goalCongratsShown, setGoalCongratsShown] = useState(false);

  // Load goal from storage on mount
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

  // Persist goal to storage when it changes
  useEffect(() => {
    if (goalLoaded && goal && typeof goal === "object") {
      AsyncStorage.setItem(GOAL_STATE_KEY, JSON.stringify(goal)).catch(
        () => {}
      );
    }
  }, [goal, goalLoaded]);

  // Show congrats when goal is achieved
  useEffect(() => {
    if (
      goal.type === "time" &&
      goal.target > 0 &&
      goal.progress >= goal.target &&
      !goal.achieved
    ) {
      setGoal((prev) => ({ ...prev, achieved: true }));
    }

    if (
      goal.achieved &&
      !goalCongratsShown &&
      ((goal.type === "time" && goal.target > 0) || goal.type === "custom")
    ) {
      setGoalCongratsShown(true);
      setTimeout(() => {
        Alert.alert("Goal Achieved!");
      }, 300);
    }

    if (!goal.achieved && goalCongratsShown) {
      setGoalCongratsShown(false);
    }
  }, [goal.achieved, goal.progress, goal.type, goal.target, goalCongratsShown]);

  // Add session to goal progress
  const addSessionToGoal = async (sessionObj) => {
    if (!sessionObj || !sessionObj.sessionId || sessionObj.isBreak) return;
    if (goal.type !== "time") return;
    if (goal.sessionIds.includes(sessionObj.sessionId)) return;
    if (goal.achieved) return; // Prevent adding progress if already achieved

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
      if (achieved) {
        const archiveEntry = {
          ...updatedGoal,
          achievedAt: Date.now(),
          spotId: selectedSpot?.id || null,
          spotName:
            selectedSpot?.buildingName || selectedSpot?.name || "Unknown",
        };

        const prevArchiveRaw = await AsyncStorage.getItem("focusGoalArchive");
        let prevArchive = [];
        if (prevArchiveRaw) {
          try {
            prevArchive = JSON.parse(prevArchiveRaw);
          } catch {}
        }
        prevArchive.push(archiveEntry);
        await AsyncStorage.setItem(
          "focusGoalArchive",
          JSON.stringify(prevArchive)
        );
      }
    } catch (e) {}
  };

  // Remove session from goal progress
  const removeSessionFromGoal = async (sessionId, duration) => {
    if (!sessionId || !goal.sessionIds.includes(sessionId)) return;

    const newProgress = Math.max(
      0,
      goal.progress - Math.floor((duration || 0) / 1000)
    );

    setGoal((prev) => ({
      ...prev,
      progress: newProgress,
      sessionIds: prev.sessionIds.filter((id) => id !== sessionId),
      achieved: newProgress < prev.target ? false : prev.achieved,
    }));
  };

  // Delete goal
  const deleteGoal = async () => {
    setGoal({
      title: "",
      target: 0,
      progress: 0,
      sessionIds: [],
      achieved: false,
      type: "time",
    });

    try {
      await AsyncStorage.setItem(
        GOAL_STATE_KEY,
        JSON.stringify({
          title: "",
          target: 0,
          progress: 0,
          sessionIds: [],
          achieved: false,
          type: "time",
        })
      );
    } catch (e) {}
  };

  // Mark custom goal as achieved
  const markCustomGoalAchieved = async () => {
    const archiveEntry = {
      ...goal,
      achieved: true,
      achievedAt: Date.now(),
      spotId: selectedSpot?.id || null,
      spotName: selectedSpot?.buildingName || selectedSpot?.name || "Unknown",
    };

    try {
      const prevArchiveRaw = await AsyncStorage.getItem("focusGoalArchive");
      let prevArchive = [];
      if (prevArchiveRaw) {
        try {
          prevArchive = JSON.parse(prevArchiveRaw);
        } catch {}
      }
      prevArchive.push(archiveEntry);
      await AsyncStorage.setItem(
        "focusGoalArchive",
        JSON.stringify(prevArchive)
      );
    } catch (e) {}

    setGoal({
      title: "",
      target: 0,
      progress: 0,
      sessionIds: [],
      achieved: false,
      type: "time",
    });

    setGoalCongratsShown(false);
  };

  return {
    goal,
    setGoal,
    goalLoaded,
    addSessionToGoal,
    removeSessionFromGoal,
    deleteGoal,
    markCustomGoalAchieved,
  };
};

// Goal Modal Component
export const GoalModal = ({ visible, onClose, themeColors, goal, setGoal }) => {
  const [goalInput, setGoalInput] = useState({ h: "", m: "", s: "" });
  const [goalTitleInput, setGoalTitleInput] = useState("");
  const [goalTypeInput, setGoalTypeInput] = useState("time");
  const [goalCustomInput, setGoalCustomInput] = useState("");

  const handleSave = () => {
    if (goalTypeInput === "custom") {
      setGoal({
        title: goalTitleInput.trim() || "Custom Goal",
        target: 0,
        progress: 0,
        sessionIds: [],
        achieved: false,
        type: "custom",
      });
      onClose();
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

    onClose();
    setGoalTitleInput("");
    setGoalInput({ h: "", m: "", s: "" });
    setGoalCustomInput("");
    setGoalTypeInput("time");
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
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
            padding: 24,
            width: "92%",
            alignItems: "center",
            position: "absolute",
            left: "4%",
            right: "4%",
            bottom: "45%",
            borderWidth: 1,
            borderColor: themeColors.black,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: themeColors.purple,
              marginBottom: 12,
              fontFamily: "CarosSoft",
            }}
          >
            Set Focus Goal
          </Text>
          {/* Goal type selector */}
          <View style={{ flexDirection: "row", marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => setGoalTypeInput("time")}
              style={{
                flex: 1,
                backgroundColor:
                  goalTypeInput === "time"
                    ? themeColors.purple
                    : themeColors.gray,
                borderRadius: 8,
                paddingVertical: 8,
                alignItems: "center",
                marginRight: 6,
              }}
            >
              <Text
                style={{
                  color:
                    goalTypeInput === "time"
                      ? themeColors.white
                      : themeColors.purple,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                Time
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setGoalTypeInput("custom")}
              style={{
                flex: 1,
                backgroundColor:
                  goalTypeInput === "custom"
                    ? themeColors.purple
                    : themeColors.gray,
                borderRadius: 8,
                paddingVertical: 8,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color:
                    goalTypeInput === "custom"
                      ? themeColors.white
                      : themeColors.purple,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                Task
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: themeColors.purple,
              borderRadius: 8,
              padding: 10,
              color: themeColors.black,
              backgroundColor: themeColors.white,
              fontSize: 16,
              fontFamily: "CarosSoft",
              marginBottom: 12,
              width: "100%",
            }}
            placeholder={
              goalTypeInput === "time"
                ? "Eg. Study for 2 hours"
                : "Complete 3 ALEKS topics"
            }
            placeholderTextColor={themeColors.darkGray}
            value={goalTitleInput}
            onChangeText={setGoalTitleInput}
            maxLength={40}
          />
          {goalTypeInput === "time" ? (
            <View
              style={{
                flexDirection: "row",
                width: "100%",
                marginBottom: 12,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: themeColors.purple,
                  borderRadius: 8,
                  padding: 10,
                  color: themeColors.black,
                  backgroundColor: themeColors.white,
                  fontSize: 16,
                  fontFamily: "CarosSoft",
                  marginRight: 6,
                }}
                keyboardType="numeric"
                value={goalInput.h}
                onChangeText={(v) =>
                  setGoalInput((prev) => ({
                    ...prev,
                    h: v.replace(/[^0-9]/g, ""),
                  }))
                }
                maxLength={2}
                placeholder="H"
                placeholderTextColor={themeColors.darkGray}
              />
              <TextInput
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: themeColors.purple,
                  borderRadius: 8,
                  padding: 10,
                  color: themeColors.black,
                  backgroundColor: themeColors.white,
                  fontSize: 16,
                  fontFamily: "CarosSoft",
                  marginRight: 6,
                }}
                keyboardType="numeric"
                value={goalInput.m}
                onChangeText={(v) =>
                  setGoalInput((prev) => ({
                    ...prev,
                    m: v.replace(/[^0-9]/g, ""),
                  }))
                }
                maxLength={2}
                placeholder="M"
                placeholderTextColor={themeColors.darkGray}
              />
              <TextInput
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: themeColors.purple,
                  borderRadius: 8,
                  padding: 10,
                  color: themeColors.black,
                  backgroundColor: themeColors.white,
                  fontSize: 16,
                  fontFamily: "CarosSoft",
                  marginRight: 6,
                }}
                keyboardType="numeric"
                value={goalInput.s}
                onChangeText={(v) =>
                  setGoalInput((prev) => ({
                    ...prev,
                    s: v.replace(/[^0-9]/g, ""),
                  }))
                }
                maxLength={2}
                placeholder="S"
                placeholderTextColor={themeColors.darkGray}
              />
            </View>
          ) : (
            <View></View>
          )}
          <View style={{ flexDirection: "row", width: "100%" }}>
            <TouchableOpacity
              onPress={handleSave}
              style={{
                flex: 1,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: "center",
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                Save
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                backgroundColor: themeColors.gray,
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
