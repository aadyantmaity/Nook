import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  CheckCircle,
  Circle,
  CaretDown,
  CaretRight,
  Trash,
} from "phosphor-react-native";

export default function GroupTaskPinned({
  task,
  members,
  onCheckToggle,
  themeColors,
  checked,
  loading,
  currentUserId, // <-- add this prop
  ownerUid, // <-- add this prop
  onDeleteTask, // <-- add this prop
}) {
  const [expanded, setExpanded] = useState(true);

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
          <CheckCircle
            size={28}
            color={loading ? themeColors.darkGray : themeColors.purple}
            weight="fill"
          />
        ) : (
          <Circle
            size={28}
            color={loading ? themeColors.darkGray : themeColors.purple}
          />
        )}
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          onPress={() => setExpanded((prev) => !prev)}
          style={{ flexDirection: "row", alignItems: "center" }}
          accessibilityLabel={
            expanded ? "Collapse group task" : "Expand group task"
          }
        >
          <Text
            style={{
              color: themeColors.purple,
              fontWeight: "bold",
              fontSize: 16,
              fontFamily: "CarosSoft",
              marginBottom: 2,
              flex: 1,
            }}
          >
            {task.text}
          </Text>
          {expanded ? (
            <CaretDown
              size={20}
              color={themeColors.purple}
              style={{ marginLeft: 8, marginBottom: 2 }}
            />
          ) : (
            <CaretRight
              size={20}
              color={themeColors.purple}
              style={{ marginLeft: 8, marginBottom: 2 }}
            />
          )}
          {/* Show delete button if current user is group owner */}
          {currentUserId === ownerUid ? (
            <TouchableOpacity
              onPress={onDeleteTask}
              style={{ marginLeft: 10, padding: 4 }}
              accessibilityLabel="Delete group task"
            >
              <Trash size={20} color={themeColors.red} />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
        {expanded && (
          <>
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
          </>
        )}
      </View>
    </View>
  );
}
