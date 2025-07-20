import React, { useContext } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../constants/colors";
import { ThemeContext } from "../App";
import StudyGroupsSection from "../components/FindPeople/StudyGroupsSection";

export default function FindPeopleView({ navigation: propNavigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const navigation = propNavigation || useNavigation();

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.white }}>
      {/* Directly render the study group section */}
      <StudyGroupsSection
        navigation={navigation}
        onProfilePress={(closeModal) => {
          if (typeof closeModal === "function") {
            closeModal();
          }
        }}
      />
    </View>
  );
}
