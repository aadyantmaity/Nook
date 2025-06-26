import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Trophy, Trash } from "phosphor-react-native";
import { db, auth } from "../../../firebaseConfig";
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

export function FocusGoalCard({
  goal,
  setShowGoalModal,
  themeColors,
  onDelete,
  onMarkCustomGoalAchieved,
  setGoal, // <-- add this prop
  isRunning, // <-- pass this prop from parent
}) {
  const progress = goal.progress || 0;
  const target = goal.target || 0;
  const percent =
    target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;

  // Format seconds to h m s
  const formatHMS = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const [archiving, setArchiving] = useState(false);
  const [archived, setArchived] = useState(false);

  // Reset archived state when goal changes
  useEffect(() => {
    setArchived(false);
  }, [goal]);

  // Helper to archive goal to Firestore
  const handleArchiveGoal = async () => {
    if (!auth.currentUser) return;
    // For time goals, only allow if achieved; for custom, allow always
    if (goal.type === "time" && !goal.achieved) return;
    setArchiving(true);
    try {
      const userId = auth.currentUser.uid;
      const archiveRef = doc(db, "goalArchives", userId);
      const archiveDoc = await getDoc(archiveRef);
      const now = Date.now();
      const archiveObj = {
        title: goal.title,
        target: goal.target,
        achievedAt: now,
        location: goal.location || "",
        type: goal.type,
      };
      if (archiveDoc.exists()) {
        await updateDoc(archiveRef, {
          goals: arrayUnion(archiveObj),
        });
      } else {
        await setDoc(archiveRef, { goals: [archiveObj] });
      }
      setArchived(true);
      onDelete && onDelete(); // Call delete callback if provided
    } catch (e) {
      // Optionally show error
    }
    setArchiving(false);
  };

  // Remove edit button, make card tappable
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        if (!isRunning) setShowGoalModal(true);
      }}
      disabled={isRunning} // <-- disable touch when running
      style={{
        backgroundColor: themeColors.white,
        borderRadius: 14,
        padding: 18,
        marginBottom: -18,
        marginTop: 48,
        width: "92%",
        alignSelf: "center",
        shadowColor: themeColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
      }}
      accessibilityLabel={
        !goal || !goal.title
          ? "Tap to set a focus goal"
          : "Tap to edit focus goal"
      }
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Trophy
          size={26}
          color={themeColors.orange}
          weight="fill"
          style={{
            marginRight: 8,
            textShadowColor: "#fff8dc",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
            shadowColor: "#bfa14a",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
          }}
        />
        <Text
          style={{
            fontWeight: "bold",
            fontSize: 17,
            color: themeColors.purple,
            flex: 1,
            fontFamily: "CarosSoft",
            textAlign: "left",
          }}
        >
          {goal.title ||
            (goal.type === "custom" ? "Custom Goal" : "Focus Goal")}
        </Text>
        {/* Remove edit button */}
        <TouchableOpacity
          onPress={onDelete}
          style={{
            marginRight: goal.type === "custom" ? 8 : 0,
          }}
        >
          <Trash size={22} color={themeColors.red} />
        </TouchableOpacity>
      </View>
      {/* Custom goal description or time progress */}
      <Text
        style={{
          color: themeColors.black,
          fontSize: 14,
          marginBottom: 8,
          marginTop: 4,
          fontFamily: "CarosSoft",
          textAlign: "left", // left align
        }}
      >
        {!goal || !goal.title
          ? "Tap to set a goal"
          : // If running, show timer left-aligned
          isRunning && goal.target > 0
          ? `Progress: ${formatHMS(progress)} / ${formatHMS(target)}`
          : target > 0
          ? `Progress: ${formatHMS(progress)} / ${formatHMS(target)}`
          : ""}
      </Text>
      {/* Progress bar for time goals only */}
      {goal.type === "time" && target > 0 && (
        <View
          style={{
            height: 12,
            backgroundColor: themeColors.gray,
            borderRadius: 6,
            overflow: "hidden",
            marginBottom: 6,
          }}
        >
          <View
            style={{
              width: `${percent}%`,
              height: "100%",
              backgroundColor: goal.achieved
                ? themeColors.green
                : themeColors.purple,
              borderRadius: 6,
            }}
          />
        </View>
      )}
      {((goal.achieved && goal.type === "time") || goal.type === "custom") && (
        <View style={{ alignItems: "center" }}>
          {/* Show Add to Archive button for both time and custom goals */}
          {!archived && (
            <TouchableOpacity
              onPress={handleArchiveGoal}
              disabled={archiving}
              style={{
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 18,
                alignItems: "center",
                opacity: archiving ? 0.6 : 1,
                marginTop: goal.type === "custom" ? -8 : 8,
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 15,
                  fontFamily: "CarosSoft",
                }}
              >
                {archiving ? "Archiving..." : "Save to Archive"}
              </Text>
            </TouchableOpacity>
          )}
          {archived && (
            <Text
              style={{
                color: themeColors.purple,
                fontWeight: "bold",
                fontSize: 13,
                marginTop: 6,
                fontFamily: "CarosSoft",
              }}
            >
              Goal archived!
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
