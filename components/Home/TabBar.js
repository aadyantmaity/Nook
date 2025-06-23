import React from "react";
import { View, TouchableOpacity, Text, Dimensions } from "react-native";

export default function TabBar({
  navigationState,
  jumpTo,
  themeColors,
  currentIndex,
}) {
  // Calculate 90% of screen width for centering
  const tabBarWidth = Math.round(Dimensions.get("window").width * 0.9);

  return (
    <View
      style={{
        backgroundColor: themeColors.white,
        paddingHorizontal: 0,
        paddingTop: 16,
        zIndex: 100,
        elevation: 8,
        alignSelf: "center",
        alignItems: "center",
        width: "100%",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          width: tabBarWidth,
          maxWidth: 420,
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
                fontSize: 14,
                fontFamily: "CarosSoft",
              }}
            >
              {route.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
