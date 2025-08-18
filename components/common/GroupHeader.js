import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ArrowLeft, DotsThreeVertical } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

export default function GroupHeader({
  navigation,
  groupName,
  themeColors,
  onMenuPress,
  showMenuButton = true,
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 0,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: themeColors.white,
        borderBottomWidth: 1,
        borderBottomColor: themeColors.darkGray + "50",
      }}
    >
      <TouchableOpacity
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate("Home", {
              screen: "Community",
              params: { selectedTab: "groups" },
            });
          }
        }}
        style={{
          padding: 8,
          borderRadius: 8,
        }}
        activeOpacity={0.7}
      >
        <ArrowLeft size={24} color={themeColors.purple} />
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
          color: themeColors.purple,
          fontFamily: FONTS.PRIMARY,
          flex: 1,
          textAlign: "center",
          marginHorizontal: 16,
        }}
        numberOfLines={1}
      >
        {groupName || "Group"}
      </Text>

      {showMenuButton && (
        <TouchableOpacity
          onPress={onMenuPress}
          style={{
            padding: 8,
            borderRadius: 8,
          }}
          activeOpacity={0.7}
        >
          <DotsThreeVertical size={24} color={themeColors.purple} />
        </TouchableOpacity>
      )}

      {/* Invisible placeholder to maintain centering when menu button is hidden */}
      {!showMenuButton && <View style={{ width: 40, height: 40 }} />}
    </View>
  );
}
