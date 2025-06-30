import React, { useContext } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { ThemeContext } from "../App";
import FindPeopleSection from "../components/FindPeople/FindPeopleSection";
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
      {/* Segmented control */}
      <View
        style={{
          flexDirection: "row",
          marginTop: 24,
          marginBottom: 8,
          alignSelf: "center",
          borderRadius: 10,
          overflow: "hidden",
          paddingHorizontal: 16,
        }}
      >
        {/* Find People Tab */}
        <TouchableOpacity
          onPress={() => setSelectedTab("findPeople")}
          style={{
            flex: 1,
            paddingVertical: 10,
            backgroundColor:
              selectedTab === "findPeople"
                ? themeColors.purple
                : themeColors.white,
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
        {/* Feed Tab */}
        <TouchableOpacity
          onPress={() => setSelectedTab("socialFeed")}
          style={{
            flex: 1,
            paddingVertical: 10,
            backgroundColor:
              selectedTab === "socialFeed"
                ? themeColors.purple
                : themeColors.white,
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
        {/* Study Groups Tab */}
        <TouchableOpacity
          onPress={() => setSelectedTab("studyGroups")}
          style={{
            flex: 1,
            paddingVertical: 10,
            backgroundColor:
              selectedTab === "studyGroups"
                ? themeColors.purple
                : themeColors.white,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color:
                selectedTab === "studyGroups"
                  ? themeColors.white
                  : themeColors.purple,
              fontWeight: "bold",
              fontSize: 16,
              fontFamily: "CarosSoft",
            }}
          >
            Groups
          </Text>
        </TouchableOpacity>
      </View>
      {/* Render selected view */}
      {selectedTab === "findPeople" ? (
        <FindPeopleSection navigation={navigation} />
      ) : selectedTab === "socialFeed" ? (
        <SocialFeedSection navigation={navigation} />
      ) : (
        <StudyGroupsSection navigation={navigation} />
      )}
    </View>
  );
}
