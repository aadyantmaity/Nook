import React, { useContext } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { ThemeContext } from "../App";
import FindPeopleSection from "../components/FindPeople/FindPeopleSection";
import SocialFeedSection from "../components/FindPeople/SocialFeedSection";

export default function FindPeopleView({
  navigation: propNavigation,
  selectedTab,
  setSelectedTab,
}) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const navigation = propNavigation || useNavigation();

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.white }}>
      {/* Segmented control */}
      <View
        style={{
          flexDirection: "row",
          marginTop: 24,
          marginBottom: 8,
          alignSelf: "center",
          backgroundColor: themeColors.gray + "33",
          borderRadius: 10,
          overflow: "hidden",
          paddingHorizontal: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => setSelectedTab("findPeople")}
          style={{
            flex: 1,
            paddingVertical: 10,
            backgroundColor:
              selectedTab === "findPeople" ? themeColors.purple : "transparent",
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color:
                selectedTab === "findPeople"
                  ? themeColors.white
                  : themeColors.purple,
              fontWeight: "bold",
              fontSize: 16,
              fontFamily: "CarosSoft",
            }}
          >
            Find People
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedTab("socialFeed")}
          style={{
            flex: 1,
            paddingVertical: 10,
            backgroundColor:
              selectedTab === "socialFeed" ? themeColors.purple : "transparent",
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color:
                selectedTab === "socialFeed"
                  ? themeColors.white
                  : themeColors.purple,
              fontWeight: "bold",
              fontSize: 16,
              fontFamily: "CarosSoft",
            }}
          >
            Feed
          </Text>
        </TouchableOpacity>
      </View>
      {/* Render selected view */}
      {selectedTab === "findPeople" ? (
        <FindPeopleSection navigation={navigation} />
      ) : (
        <SocialFeedSection navigation={navigation} />
      )}
    </View>
  );
}
