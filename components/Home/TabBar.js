import React from "react";
import { View, TouchableOpacity, Text, Dimensions } from "react-native";
import { Timer, House, Chats } from "phosphor-react-native"; // Changed icons

const TAB_ICONS = {
  focus: Timer,
  home: House,
  social: Chats,
};

const TAB_LABELS = {
  focus: "Focus",
  home: "Home",
  social: "Community",
};

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
        zIndex: 100,
        elevation: 8,
        alignSelf: "center",
        alignItems: "center",
        width: "100%",
        marginBottom: 2,
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
        {navigationState.routes.map((route, i) => {
          const Icon = TAB_ICONS[route.key] || Rows;
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => jumpTo(route.key)}
              style={{
                flex: 1,
                paddingTop: 12,
                paddingBottom: 20,
                alignItems: "center",

                backgroundColor: themeColors.white,
              }}
              accessibilityLabel={TAB_LABELS[route.key]}
              accessible={true}
            >
              <Icon
                size={25}
                color={
                  currentIndex === i ? themeColors.purple : themeColors.darkGray
                }
                weight={currentIndex === i ? "fill" : "regular"}
              />
              {/* <Text
                style={{
                  color:
                    currentIndex === i
                      ? themeColors.purple
                      : themeColors.darkGray,
                  fontSize: 12,
                  fontFamily: "CarosSoft",
                  marginTop: 2,
                }}
              >
                {TAB_LABELS[route.key]}
              </Text> */}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
