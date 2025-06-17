import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  UIManager,
} from "react-native";
import { FadersHorizontal } from "phosphor-react-native";

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
  "No Husky Card",
];

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Filters({
  filters,
  setFilters,
  themeColors,
  buttonStyle,
  textStyle,
}) {
  // Modal open state
  const [modalVisible, setModalVisible] = useState(false);
  // Local filter state for modal (so parent state doesn't interfere)
  const [localFilters, setLocalFilters] = useState(filters);

  // Keep localFilters in sync with parent filters only when modal is closed
  useEffect(() => {
    if (!modalVisible) setLocalFilters(filters);
    // eslint-disable-next-line
  }, [filters, modalVisible]);

  const handlePress = (label) => {
    if (label === "All") {
      setLocalFilters([]);
      return;
    }
    const normalized =
      label === "Favorites"
        ? "favorites"
        : label === "No Husky Card"
        ? "no-husky-card"
        : label.toLowerCase();

    if (localFilters.includes(normalized)) {
      setLocalFilters(localFilters.filter((f) => f !== normalized));
    } else {
      setLocalFilters([...localFilters, normalized]);
    }
  };

  const isSelected = (label) => {
    if (label === "All") return localFilters.length === 0;
    const normalized =
      label === "Favorites"
        ? "favorites"
        : label === "No Husky Card"
        ? "no-husky-card"
        : label.toLowerCase();
    return localFilters.includes(normalized);
  };

  // --- Helper: group tags into rows for a grid layout ---
  // You can adjust numCols for your modal width and tag count
  const numCols = 3;
  function getTagRows(tags) {
    const rows = [];
    for (let i = 0; i < tags.length; i += numCols) {
      rows.push(tags.slice(i, i + numCols));
    }
    return rows;
  }

  return (
    <TouchableOpacity
      onPress={() => setModalVisible(true)}
      style={[
        {
          backgroundColor: themeColors.purple,
          borderRadius: 25,
          paddingVertical: 10,
          paddingHorizontal: 22,
          alignItems: "center",
          alignSelf: "flex-start",
          flexDirection: "row",
        },
        buttonStyle,
      ]}
      accessibilityLabel="Open Filters"
    >
      {/* Replace text with icon */}
      <Text
        style={[
          {
            color: themeColors.purple,
            fontWeight: "bold",
            fontSize: 14,
            marginRight: 8,
          },
        ]}
      >
        Filters
      </Text>
      <FadersHorizontal
        size={22}
        color={themeColors.purple}
        weight="bold"
        style={{}}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              padding: 24,
              width: "90%",
              maxWidth: 400,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 12,
              }}
            >
              Filter Study Spots
            </Text>
            {/* Grid layout for tags */}
            <View style={{ width: "100%", marginBottom: 16 }}>
              {getTagRows(TAGS).map((row, rowIdx) => (
                <View
                  key={rowIdx}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  {row.map((label, colIdx) => {
                    const selected = isSelected(label);
                    return (
                      <TouchableOpacity
                        key={label}
                        onPress={() => handlePress(label)}
                        style={{
                          flex: 1,
                          marginRight: colIdx < row.length - 1 ? 8 : 0,
                          paddingVertical: 10,
                          paddingHorizontal: 0,
                          backgroundColor: selected
                            ? themeColors.purple
                            : themeColors.white,
                          borderRadius: 25,
                          alignItems: "center",
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
                            color: selected
                              ? themeColors.white
                              : themeColors.purple,
                            fontWeight: "bold",
                            fontSize: 11,
                          }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {/* Fill empty columns for last row */}
                  {row.length < numCols &&
                    Array(numCols - row.length)
                      .fill(0)
                      .map((_, i) => (
                        <View
                          key={`empty-${i}`}
                          style={{
                            flex: 1,
                            marginRight: i < numCols - row.length - 1 ? 8 : 0,
                          }}
                        />
                      ))}
                </View>
              ))}
            </View>
            <View
              style={{ flexDirection: "row", marginTop: 18, width: "100%" }}
            >
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setLocalFilters(filters); // Reset to parent filters
                }}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.white,
                  borderColor: themeColors.purple,
                  borderWidth: 1,
                  borderRadius: 8,
                  alignItems: "center",
                  padding: 12,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: themeColors.purple, fontWeight: "bold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setFilters(localFilters);
                  setModalVisible(false);
                }}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.purple,
                  borderRadius: 8,
                  alignItems: "center",
                  padding: 12,
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                  Apply
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}
