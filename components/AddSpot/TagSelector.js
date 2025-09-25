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
            shadowColor: selectedTags.includes(tag) ? themeColors.purple : themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: selectedTags.includes(tag) ? 0.4 : 0.3,
            shadowRadius: selectedTags.includes(tag) ? 6 : 4,
            elevation: selectedTags.includes(tag) ? 4 : 2,
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
