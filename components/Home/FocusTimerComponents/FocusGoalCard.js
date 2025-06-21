import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Trophy, PencilSimple, Trash } from "phosphor-react-native";

export function FocusGoalCard({
  goal,
  setShowGoalModal,
  themeColors,
  onDelete,
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

  return (
    <View
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
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Trophy
          size={22}
          color={themeColors.orange}
          weight="fill"
          style={{ marginRight: 8 }}
        />
        <Text
          style={{
            fontWeight: "bold",
            fontSize: 17,
            color: themeColors.purple,
            flex: 1,
            fontFamily: "CarosSoft",
          }}
        >
          {goal.title ||
            (goal.type === "custom" ? "Custom Goal" : "Focus Goal")}
        </Text>
        {/* Edit and Delete buttons */}
        <TouchableOpacity
          onPress={() => setShowGoalModal(true)}
          style={{ marginRight: 8 }}
        >
          <PencilSimple size={22} color={themeColors.purple} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          style={{ marginRight: goal.type === "custom" ? 8 : 0 }}
        >
          <Trash size={22} color={themeColors.red} />
        </TouchableOpacity>
        {/* Custom goal: show check button if not achieved */}
        {goal.type === "custom" && !goal.achieved && (
          <TouchableOpacity
            onPress={() => {
              // Show confirmation alert and clear goal on OK
              Alert.alert(
                "Goal Achieved!",
                "Congratulations, you've reached your focus goal!",
                [
                  {
                    text: "OK",
                    onPress: async () => {
                      onDelete && onDelete();
                    },
                  },
                ]
              );
            }}
            style={{
              marginLeft: 2,
              backgroundColor: themeColors.green,
              borderRadius: 6,
              padding: 4,
            }}
            accessibilityLabel="Mark as Achieved"
          >
            <Text
              style={{
                color: themeColors.white,
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              ✓
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Custom goal description or time progress */}
      {goal.type === "custom" ? (
        <Text
          style={{
            color: themeColors.black,
            fontSize: 15,
            marginBottom: 8,
            fontFamily: "CarosSoft",
          }}
        >
          {goal.customDescription}
        </Text>
      ) : (
        <Text
          style={{
            color: themeColors.black,
            fontSize: 15,
            marginBottom: 8,
            fontFamily: "CarosSoft",
          }}
        >
          {target > 0
            ? `Progress: ${formatHMS(progress)} / ${formatHMS(target)}`
            : "No goal set"}
        </Text>
      )}
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
      {goal.achieved && (
        <Text
          style={{
            color: themeColors.green,
            fontWeight: "bold",
            fontSize: 14,
            marginTop: 2,
            fontFamily: "CarosSoft",
          }}
        >
          🎉 Goal Achieved!
        </Text>
      )}
    </View>
  );
}
