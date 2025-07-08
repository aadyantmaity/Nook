import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CheckCircle, Circle } from "phosphor-react-native";

export default function GroupTaskPinned({
  task,
  members,
  onCheckToggle,
  themeColors,
  checked,
  loading,
}) {
  if (!task) return null;
  const total = members.length || 1;
  const checkedCount = Array.isArray(task.checkedOff)
    ? task.checkedOff.length
    : 0;
  const percent = Math.round((checkedCount / total) * 100);

  return (
    <View
      style={{
        backgroundColor: themeColors.purple + "10",
        borderRadius: 12,
        padding: 14,
        marginHorizontal: 18,
        marginTop: 10,
        marginBottom: 6,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: themeColors.purple + "33",
      }}
    >
      <TouchableOpacity
        onPress={onCheckToggle}
        disabled={loading}
        style={{ marginRight: 12 }}
        accessibilityLabel={checked ? "Uncheck task" : "Check off task"}
      >
        {checked ? (
          <CheckCircle size={28} color={themeColors.purple} weight="fill" />
        ) : (
          <Circle size={28} color={themeColors.purple} weight="bold" />
        )}
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: themeColors.purple,
            fontWeight: "bold",
            fontSize: 16,
            fontFamily: "CarosSoft",
            marginBottom: 2,
          }}
        >
          Group Task
        </Text>
        <Text
          style={{
            color: themeColors.black,
            fontSize: 15,
            fontFamily: "CarosSoft",
            marginBottom: 6,
          }}
        >
          {task.text}
        </Text>
        <View
          style={{
            height: 8,
            backgroundColor: themeColors.gray + "33",
            borderRadius: 4,
            overflow: "hidden",
            marginBottom: 2,
          }}
        >
          <View
            style={{
              width: `${percent}%`,
              height: 8,
              backgroundColor: themeColors.purple,
              borderRadius: 4,
            }}
          />
        </View>
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 13,
            fontFamily: "CarosSoft",
          }}
        >
          {checkedCount} of {total} checked off ({percent}%)
        </Text>
      </View>
    </View>
  );
}
