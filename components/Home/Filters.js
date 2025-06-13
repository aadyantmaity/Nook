import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

const TAGS = [
  "All",
  "Favorites",
  "Quiet",
  "Group Friendly",
  "WiFi",
  "Outlets",
  "Natural Light",
  "Food Nearby",
  "Open Space",
  "No Husky Card", // Add this tag for filtering spots where Husky Card is NOT required
];

export default function Filters({ filters, setFilters, themeColors }) {
  // Distribute tags into two rows with roughly equal total character length,
  // but always put "Favorites" in the first row if present
  function splitTagsEvenly(tags) {
    let row1 = [],
      row2 = [];
    let len1 = 0,
      len2 = 0;
    tags.forEach((tag) => {
      if (tag === "Favorites") {
        row1.push(tag);
        len1 += tag.length;
      } else if (len1 <= len2) {
        row1.push(tag);
        len1 += tag.length;
      } else {
        row2.push(tag);
        len2 += tag.length;
      }
    });
    return [row1, row2];
  }

  const [row1, row2] = splitTagsEvenly(TAGS);

  const handlePress = (label) => {
    if (label === "All") {
      setFilters([]);
      return;
    }

    const normalized =
      label === "Favorites"
        ? "favorites"
        : label === "No Husky Card"
        ? "no-husky-card"
        : label.toLowerCase();

    if (filters.includes(normalized)) {
      setFilters(filters.filter((f) => f !== normalized));
    } else {
      setFilters([...filters, normalized]);
    }
  };

  const isSelected = (label) => {
    if (label === "All") return filters.length === 0;
    const normalized =
      label === "Favorites"
        ? "favorites"
        : label === "No Husky Card"
        ? "no-husky-card"
        : label.toLowerCase();
    return filters.includes(normalized);
  };

  return (
    <View
      style={{
        position: "relative",
        zIndex: 1,
        backgroundColor: themeColors.white,
        paddingBottom: 8,
        // borderBottomWidth: 1, // Remove this line
        // borderBottomColor: "#E0E0E0", // Remove this line
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: "column",
        }}
      >
        {[row1, row2].map((row, rowIdx) => (
          <View
            key={rowIdx}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: rowIdx === 0 ? 8 : 0,
            }}
          >
            {row.map((label) => {
              const selected = isSelected(label);
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => handlePress(label)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    backgroundColor: selected
                      ? themeColors.purple
                      : themeColors.white,
                    borderRadius: 25,
                    marginRight: 8,
                    marginBottom: 4,
                    shadowColor: themeColors.purple,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    borderWidth:
                      themeColors.white !== "#fff" &&
                      themeColors.white !== "#ffffff"
                        ? 1
                        : 0,
                    borderColor:
                      themeColors.white !== "#fff" &&
                      themeColors.white !== "#ffffff"
                        ? themeColors.purple
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: selected ? themeColors.white : themeColors.purple,
                      fontWeight: "bold",
                      fontSize: 11,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
