import React from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { FONTS } from "../../constants/fonts";

export default function TagSelector({
  tags,
  selectedTags,
  onToggle,
  themeColors,
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        marginBottom: 16,
      }}
    >
      {tags.map((tag) => (
        <TouchableOpacity
          key={tag}
          onPress={() => onToggle(tag)}
          style={{
            margin: 6,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: selectedTags.includes(tag)
              ? themeColors.purple
              : themeColors.white,
            borderRadius: 25,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: themeColors.black,
          }}
        >
          <Text
            style={{
              color: selectedTags.includes(tag)
                ? themeColors.white
                : themeColors.purple,
              fontSize: 14,
              fontWeight: "bold",
              fontFamily: FONTS.PRIMARY,
            }}
          >
            {tag}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
