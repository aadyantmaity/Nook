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

  return (
    <View>
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
          },
          buttonStyle,
        ]}
        accessibilityLabel="Open Filters"
      >
        <Text
          style={[
            { color: themeColors.white, fontWeight: "bold", fontSize: 13 },
            textStyle,
          ]}
        >
          Filters
        </Text>
      </TouchableOpacity>
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
            {/* Show all filters in a grid layout */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "flex-start",
                width: "100%",
                marginBottom: 16,
              }}
            >
              {TAGS.map((label) => {
                const selected = isSelected(label);
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => handlePress(label)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      backgroundColor: selected
                        ? themeColors.purple
                        : themeColors.white,
                      borderRadius: 25,
                      marginRight: 8,
                      marginBottom: 8,
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
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
    </View>
  );
}
