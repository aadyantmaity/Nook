import React from "react";
import { View, TouchableOpacity, Text } from "react-native";

export default function TabBar({
  navigationState,
  jumpTo,
  themeColors,
  currentIndex,
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: themeColors.white,
      }}
    >
      {navigationState.routes.map((route, i) => (
        <TouchableOpacity
          key={route.key}
          onPress={() => jumpTo(route.key)}
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: "center",
            borderBottomWidth: 3,
            borderBottomColor:
              currentIndex === i ? themeColors.purple : "transparent",
            backgroundColor: themeColors.white,
          }}
        >
          <Text
            style={{
              color:
                currentIndex === i ? themeColors.black : themeColors.darkGray,
              fontWeight: currentIndex === i ? "bold" : "normal",
              fontSize: 16,
            }}
          >
            {route.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
