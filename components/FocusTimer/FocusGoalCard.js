import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Trophy, Trash, Check } from "phosphor-react-native";
import { db, auth } from "../../firebaseConfig";
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { FONTS } from "../../constants/fonts";

export function FocusGoalCard({
  goal,
  setShowGoalModal,
  themeColors,
  onDelete,
  setGoal,
  saveGoal,
  isRunning,
}) {
  const [archiving, setArchiving] = useState(false);
  const [archived, setArchived] = useState(false);

  // Reset archived state when goal changes
  useEffect(() => {
    setArchived(false);
  }, [goal]);

  // Helper to archive goal to Firestore
  const handleArchiveGoal = async () => {
    if (!auth.currentUser) return;
    setArchiving(true);
    try {
      const userId = auth.currentUser.uid;
      const archiveRef = doc(db, "goalArchives", userId);
      const archiveDoc = await getDoc(archiveRef);
      const now = Date.now();
      const archiveObj = {
        title: goal.title,
        description: goal.description || "",
        achievedAt: now,
        type: "custom",
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
        padding: 14,
        marginBottom: 20,
        marginTop: 8,
        width: "100%",
        alignSelf: "center",
        shadowColor: themeColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
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
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
      >
        <Text
          style={{
            fontWeight: "bold",
            fontSize: 17,
            color: themeColors.purple,
            fontFamily: FONTS.PRIMARY,
            textAlign: "left",
          }}
        >
          {goal && goal.title ? goal.title : "Focus Goal"}
        </Text>
        {!goal && !goal.title && (
          <Trophy
            size={22}
            color={themeColors.orange}
            weight="fill"
            style={{
              marginLeft: 8,
            }}
          />
        )}
        <View style={{ flex: 1 }} />
        {/* Show check and delete buttons only when goal is set */}
        {goal && goal.title && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              onPress={() => {
                const updatedGoal = { ...goal, achieved: !goal.achieved };
                setGoal(updatedGoal);
                saveGoal(updatedGoal);

                // If marking as complete, show congrats alert and auto-archive
                if (!goal.achieved) {
                  Alert.alert(
                    "Goal Completed! 🎉",
                    "Congratulations on completing your goal!",
                    [
                      {
                        text: "Continue",
                        onPress: () => handleArchiveGoal(),
                      },
                    ]
                  );
                }
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: goal.achieved
                  ? themeColors.green
                  : themeColors.lightGray,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: goal.achieved
                  ? themeColors.green
                  : themeColors.darkGray,
              }}
            >
              {goal.achieved && (
                <Check size={14} color={themeColors.white} weight="bold" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete}>
              <Trash size={20} color={themeColors.red} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      {/* Content area */}
      <View style={{ marginBottom: 8 }}>
        {!goal || !goal.title ? (
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 15,
              marginBottom: 4,
              fontFamily: FONTS.PRIMARY,
              textAlign: "left",
              fontStyle: "italic",
            }}
          >
            Tap to set a goal
          </Text>
        ) : (
          goal.description && (
            <Text
              style={{
                fontSize: 14,
                color: themeColors.darkGray,
                fontFamily: FONTS.PRIMARY,
                lineHeight: 18,
              }}
            >
              {goal.description}
            </Text>
          )
        )}
      </View>
      {archived && (
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <Text
            style={{
              color: themeColors.purple,
              fontWeight: "bold",
              fontSize: 12,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Goal archived!
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
