import React, { useContext, useState } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { ThemeContext } from "../App";
import FindPeopleSection from "../components/FindPeople/FindPeopleSection";
import SocialFeedSection from "../components/FindPeople/SocialFeedSection";

export default function FindPeopleView({ navigation: propNavigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const navigation = propNavigation || useNavigation();

  const [selectedTab, setSelectedTab] = useState("findPeople");

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
        }}
      >
        <TouchableOpacity
          onPress={() => setSelectedTab("findPeople")}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 28,
            backgroundColor:
              selectedTab === "findPeople" ? themeColors.purple : "transparent",
            borderRadius: 10,
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
            paddingVertical: 10,
            paddingHorizontal: 28,
            backgroundColor:
              selectedTab === "socialFeed" ? themeColors.purple : "transparent",
            borderRadius: 10,
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
            Social Feed
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
