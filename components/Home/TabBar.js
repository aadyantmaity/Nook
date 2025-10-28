import React from "react";
import { View, TouchableOpacity, Text, Dimensions, Image } from "react-native";
import { House, Chats, Rows, Timer as TimerIcon, User as UserIcon } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

const TAB_ICONS = {
  focus: TimerIcon,
  home: House,
  social: Chats,
  profile: UserIcon,
};

const TAB_LABELS = {
  focus: "Focus",
  home: "Home",
  social: "Groups",
  profile: "Profile",
};

export default function TabBar({
  navigationState,
  jumpTo,
  themeColors,
  currentIndex,
  profilePic,
  isProfilePicLoading,
}) {
  // Calculate 90% of screen width for centering
  const tabBarWidth = Math.round(Dimensions.get("window").width * 0.9);

  return (
    <View
      style={{
        backgroundColor: themeColors.white,
        paddingHorizontal: 0,
        paddingTop: 5,
        paddingBottom: 15,
        borderTopWidth: 1,
        borderTopColor: themeColors.darkGray + "50",
        zIndex: 100,
        elevation: 8,
        alignSelf: "center",
        alignItems: "center",
        width: "100%",
        marginBottom: -5,
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
                paddingTop: 5,
                paddingBottom: 18,
                alignItems: "center",
                backgroundColor: themeColors.white,
              }}
              accessibilityLabel={TAB_LABELS[route.key]}
              accessible={true}
            >
              {route.key === "profile" ? (
                profilePic ? (
                  <Image
                    source={{ uri: profilePic }}
                    style={{
                      width: 25,
                      height: 25,
                      borderRadius: 12.5,
                      borderWidth: currentIndex === i ? 2 : 1,
                      borderColor:
                        currentIndex === i ? themeColors.purple : themeColors.darkGray,
                    }}
                  />
                ) : (
                  <Icon
                    size={24}
                    color={
                      currentIndex === i ? themeColors.purple : themeColors.darkGray
                    }
                    weight={currentIndex === i ? "fill" : "regular"}
                  />
                )
              ) : (
                <Icon
                  size={24}
                  color={
                    currentIndex === i ? themeColors.purple : themeColors.darkGray
                  }
                  weight={currentIndex === i ? "fill" : "regular"}
                />
              )}
              <Text
                style={{
                  color:
                    currentIndex === i
                      ? themeColors.purple
                      : themeColors.darkGray,
                  fontSize: 11,
                  fontFamily: FONTS.PRIMARY,
                  marginTop: 2,
                  fontWeight: currentIndex === i ? "bold" : "normal",
                }}
              >
                {TAB_LABELS[route.key]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
