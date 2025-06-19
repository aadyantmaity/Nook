import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { Warning } from "phosphor-react-native";

export default function ActionButtons({ onAddAlert, themeColors }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "flex-end",
        alignItems: "flex-start",
        width: "100%",
        marginTop: 12,
        gap: 8,
      }}
    >
      <TouchableOpacity
        onPress={onAddAlert}
        style={{
          flexDirection: "row",
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
        <Warning
          size={20}
          color="#fff"
          weight="fill"
          style={{ marginRight: 8 }}
        />
        <Text
          style={{
            color: "#FFFFFF",
            fontWeight: "bold",
            fontSize: 16,
            fontFamily: "CarosSoft",
          }}
        >
          Add Alert
        </Text>
      </TouchableOpacity>
    </View>
  );
}
