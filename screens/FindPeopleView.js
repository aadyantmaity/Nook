import React, { useContext } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { ThemeContext } from "../App";
import SocialFeedSection from "../components/FindPeople/SocialFeedSection";
import StudyGroupsSection from "../components/FindPeople/StudyGroupsSection";

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
      {/* Minimalistic Pill Tab Bar */}
      <View
        style={{
          flexDirection: "row",
          marginTop: 24,
          marginBottom: 8,
          alignSelf: "center",
          backgroundColor: themeColors.gray + "22", // subtle background
          borderRadius: 24,
          padding: 4,
          width: 220,
        }}
      >
        <TouchableOpacity
          onPress={() => setSelectedTab("socialFeed")}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 0,
            height: 36,
            borderRadius: 20,
            backgroundColor:
              selectedTab === "socialFeed" ? themeColors.purple : "transparent",
            marginRight: 2,
          }}
        >
          <Text
            style={{
              color:
                selectedTab === "socialFeed"
                  ? themeColors.white
                  : themeColors.darkGray,
              fontWeight: "bold",
              fontSize: 16,
              fontFamily: "CarosSoft",
              letterSpacing: 0.1,
              textAlign: "center",
              textAlignVertical: "center",
            }}
          >
            Feed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedTab("studyGroups")}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 0,
            height: 36,
            borderRadius: 20,
            backgroundColor:
              selectedTab === "studyGroups"
                ? themeColors.purple
                : "transparent",
            marginLeft: 2,
          }}
        >
          <Text
            style={{
              color:
                selectedTab === "studyGroups"
                  ? themeColors.white
                  : themeColors.darkGray,
              fontWeight: "bold",
              fontSize: 16,
              fontFamily: "CarosSoft",
              letterSpacing: 0.1,
              textAlign: "center",
              textAlignVertical: "center",
            }}
          >
            Groups
          </Text>
        </TouchableOpacity>
      </View>
      {/* Render selected view */}
      {selectedTab === "socialFeed" ? (
        <SocialFeedSection navigation={navigation} />
      ) : (
        <StudyGroupsSection navigation={navigation} />
      )}
    </View>
  );
}
