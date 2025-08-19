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
import { FONTS } from "../../constants/fonts";

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
  "Private",
];

const SORT_OPTIONS = [
  { label: "Default", value: "default", icon: null },
  { label: "A-Z", value: "name-asc" },
  { label: "Noise (Low-High)", value: "noise-asc" },
  { label: "Rating (High-Low)", value: "overall-desc" },

  { label: "Crowd (Low-High)", value: "crowd-asc" },
  { label: "Distance (Low-High)", value: "distance-asc" },
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
  sortBy,
  setSortBy,
}) {
  // Modal open state
  const [modalVisible, setModalVisible] = useState(false);
  // Local filter state for modal (so parent state doesn't interfere)
  const [localFilters, setLocalFilters] = useState(filters);
  // Local sort state for modal
  const [localSortBy, setLocalSortBy] = useState(sortBy || "default");

  // Keep localFilters in sync with parent filters only when modal is closed
  useEffect(() => {
    if (!modalVisible) setLocalFilters(filters);
    // eslint-disable-next-line
  }, [filters, modalVisible]);

  // Keep localSortBy in sync with parent sortBy only when modal is closed
  useEffect(() => {
    if (!modalVisible) setLocalSortBy(sortBy || "default");
  }, [sortBy, modalVisible]);

  const handlePress = (label) => {
    if (label === "All") {
      setLocalFilters([]);
      return;
    }
    const normalized =
      label === "No Husky Card"
        ? "no-husky-card"
        : label === "Private"
        ? "private"
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
      label === "No Husky Card"
        ? "no-husky-card"
        : label === "Private"
        ? "private"
        : label.toLowerCase();
    return localFilters.includes(normalized);
  };

  return (
    <TouchableOpacity
      onPress={() => setModalVisible(true)}
      style={[
        {
          backgroundColor: themeColors.purple,
          borderRadius: 25,
          paddingVertical: 10,
          alignItems: "center",
          alignSelf: "flex-start",
          flexDirection: "row",
        },
        buttonStyle,
      ]}
      accessibilityLabel="Open Filters"
    >
      <FadersHorizontal size={24} color={themeColors.purple} style={{}} />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              padding: 24,
              borderWidth: 1,
              borderColor: themeColors.gray + "70",
              width: "92%",
              maxWidth: 400,
              alignItems: "center",
            }}
            onStartShouldSetResponder={() => true}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 12,
                fontFamily: FONTS.PRIMARY,
              }}
            >
              Filters
            </Text>
            {/* Grid layout for tags */}
            <View
              style={{
                width: "100%",
                marginBottom: 16,
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center", // changed from "flex-start" to "center"
              }}
            >
              {TAGS.map((label, idx) => {
                const selected = isSelected(label);
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => handlePress(label)}
                    style={{
                      marginRight: 8,
                      marginBottom: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      backgroundColor: selected
                        ? themeColors.purple
                        : themeColors.white,
                      borderRadius: 25,
                      alignItems: "center",
                      alignSelf: "flex-start",
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
                      minWidth: 0,
                      maxWidth: "48%",
                    }}
                  >
                    <Text
                      style={{
                        color: selected
                          ? themeColors.white
                          : themeColors.purple,
                        fontWeight: "bold",
                        fontSize: 12.5,
                        fontFamily: FONTS.PRIMARY,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* --- Sort By Section --- */}
            <View style={{ width: "100%", marginBottom: 10 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: themeColors.purple,
                  marginBottom: 12,
                  fontFamily: FONTS.PRIMARY,
                  alignSelf: "center",
                }}
              >
                Sort By
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {SORT_OPTIONS.map((opt) => {
                  // Remove Icon usage
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setLocalSortBy(opt.value)}
                      style={{
                        backgroundColor:
                          localSortBy === opt.value
                            ? themeColors.purple
                            : themeColors.white,
                        borderRadius: 18,
                        marginRight: 8,
                        marginBottom: 8,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderWidth: 1,
                        shadowColor: themeColors.purple,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        borderColor: themeColors.purple,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      {/* No Icon */}
                      <Text
                        style={{
                          color:
                            localSortBy === opt.value
                              ? themeColors.white
                              : themeColors.purple,
                          fontWeight: "bold",
                          fontSize: 12.5,
                          fontFamily: FONTS.PRIMARY,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            {/* --- End Sort By Section --- */}
            {/* --- Reset Filters Button --- */}
            <TouchableOpacity
              onPress={() => {
                setLocalFilters([]);
                setLocalSortBy("default");
              }}
              style={{
                width: "100%",
                backgroundColor: themeColors.white,
                borderRadius: 8,
                alignItems: "center",
                padding: 12,
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  color: themeColors.purple,
                  fontSize: 16,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Reset Filters
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", marginTop: 8, width: "100%" }}>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setLocalFilters(filters); // Reset to parent filters
                  setLocalSortBy(sortBy || "default");
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
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setFilters(localFilters);
                  setSortBy && setSortBy(localSortBy);
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
                <Text
                  style={{
                    color: themeColors.white,
                    fontWeight: "bold",
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}
