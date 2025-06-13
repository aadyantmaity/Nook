import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Broadcast } from "phosphor-react-native";

export default function ActionButtons({
  onLiveUpdate,
  onAddAlert,
  themeColors,
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        width: "100%",
        marginTop: 12,
        gap: 8,
      }}
    >
      <TouchableOpacity
        onPress={onLiveUpdate}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: themeColors.purple,
          borderRadius: 8,
          marginLeft: 0,
          shadowColor: themeColors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Broadcast size={20} color={themeColors.white} />
        <Text
          style={{
            marginLeft: 8,
            color: themeColors.white,
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          Update
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onAddAlert}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: themeColors.orange,
          borderRadius: 8,
          marginLeft: 0,
          marginTop: 0,
          shadowColor: themeColors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          Add Alert
        </Text>
      </TouchableOpacity>
    </View>
  );
}
