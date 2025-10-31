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
import { FadersHorizontal, Rows, MapTrifold } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

const TAGS = [
  "All",
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
  { label: "A-Z (default)", value: "name-asc" },
  { label: "Noise (Low-High)", value: "noise-asc" },
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
  isOpen,
  onOpenChange,
  showMapView,
  setShowMapView,
}) {
  // Modal open state
  const [modalVisible, setModalVisible] = useState(false);
  // Local filter state for modal (so parent state doesn't interfere)
  const [localFilters, setLocalFilters] = useState(filters);
  // Local sort state for modal
  const [localSortBy, setLocalSortBy] = useState(sortBy || "name-asc");
  // Local view state for modal
  const [localShowMapView, setLocalShowMapView] = useState(showMapView ?? false);

  // When modal opens, sync local state with parent state
  useEffect(() => {
    if (modalVisible) {
      setLocalSortBy(sortBy || "name-asc");
      setLocalShowMapView(showMapView ?? false);
    }
  }, [modalVisible, sortBy, showMapView]);

  // Keep localFilters in sync with parent filters only when modal is closed
  useEffect(() => {
    if (!modalVisible) setLocalFilters(filters);
    // eslint-disable-next-line
  }, [filters, modalVisible]);

  // Keep localSortBy in sync with parent sortBy only when modal is closed
  useEffect(() => {
    if (!modalVisible) setLocalSortBy(sortBy || "name-asc");
  }, [sortBy, modalVisible]);

  // Sync with external isOpen prop
  useEffect(() => {
    if (isOpen !== undefined) {
      setModalVisible(isOpen);
    }
  }, [isOpen]);

  // Notify parent when modal visibility changes
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(modalVisible);
    }
  }, [modalVisible, onOpenChange]);

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

  const handleButtonPress = () => {
    setModalVisible(true);
    if (onOpenChange) onOpenChange(true);
  };

  return (
    <TouchableOpacity
      onPress={handleButtonPress}
      style={[
        {
          backgroundColor: themeColors.purple,
          borderRadius: 25,
          paddingVertical: 10,
          alignItems: "center",
          alignSelf: "flex-start",
          flexDirection: "row",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 4,
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
          onPressOut={() => {
            setModalVisible(false);
            if (onOpenChange) onOpenChange(false);
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              padding: 20,
              width: "92%",
              maxWidth: 400,
              alignItems: "center",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
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
                      shadowColor: themeColors.black,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 4,
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
                  // Highlight A-Z as default if nothing is selected
                  const isSelected =
                    localSortBy === opt.value ||
                    (!localSortBy && opt.value === "name-asc");
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setLocalSortBy(opt.value)}
                      style={{
                        backgroundColor: isSelected
                          ? themeColors.purple
                          : themeColors.white,
                        borderRadius: 18,
                        marginRight: 8,
                        marginBottom: 8,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        shadowColor: themeColors.black,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 4,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected
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
            {/* --- View Toggle Section --- */}
            {showMapView !== undefined && setShowMapView && (
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
                  View
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setLocalShowMapView(false)}
                    style={{
                      backgroundColor: !localShowMapView
                        ? themeColors.purple
                        : themeColors.white,
                      borderRadius: 18,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      shadowColor: themeColors.black,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 4,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Rows
                      size={16}
                      color={!localShowMapView ? themeColors.white : themeColors.purple}
                    />
                    <Text
                      style={{
                        color: !localShowMapView
                          ? themeColors.white
                          : themeColors.purple,
                        fontWeight: "bold",
                        fontSize: 12.5,
                        fontFamily: FONTS.PRIMARY,
                      }}
                    >
                      List View
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setLocalShowMapView(true)}
                    style={{
                      backgroundColor: localShowMapView
                        ? themeColors.purple
                        : themeColors.white,
                      borderRadius: 18,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      shadowColor: themeColors.black,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 4,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MapTrifold
                      size={16}
                      color={localShowMapView ? themeColors.white : themeColors.purple}
                    />
                    <Text
                      style={{
                        color: localShowMapView
                          ? themeColors.white
                          : themeColors.purple,
                        fontWeight: "bold",
                        fontSize: 12.5,
                        fontFamily: FONTS.PRIMARY,
                      }}
                    >
                      Map View
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {/* --- End View Toggle Section --- */}
            {/* --- Reset Filters Button --- */}
            <TouchableOpacity
              onPress={() => {
                setLocalFilters([]);
                setLocalSortBy("name-asc");
                if (showMapView !== undefined) {
                  setLocalShowMapView(false);
                }
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
                  if (onOpenChange) onOpenChange(false);
                  setLocalFilters(filters); // Reset to parent filters
                  setLocalSortBy(sortBy || "name-asc");
                  if (showMapView !== undefined) {
                    setLocalShowMapView(showMapView ?? false);
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.white,
                  borderRadius: 8,
                  alignItems: "center",
                  padding: 12,
                  marginRight: 8,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
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
                  if (showMapView !== undefined && setShowMapView) {
                    setShowMapView(localShowMapView);
                  }
                  setModalVisible(false);
                  if (onOpenChange) onOpenChange(false);
                }}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.purple,
                  borderRadius: 8,
                  alignItems: "center",
                  padding: 12,
                  marginLeft: 8,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
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
