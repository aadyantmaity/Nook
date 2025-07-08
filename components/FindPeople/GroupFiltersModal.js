import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";

export default function GroupFiltersModal({
  visible,
  onClose,
  FILTERS,
  pendingFilter,
  setPendingFilter,
  selectedFilter,
  setSelectedFilter,
  themeColors,
}) {
  // --- Multi-select state ---
  const [localFilters, setLocalFilters] = useState(
    Array.isArray(pendingFilter) ? pendingFilter : [pendingFilter]
  );

  // Sync localFilters with pendingFilter when modal opens/closes
  useEffect(() => {
    if (visible) {
      setLocalFilters(
        Array.isArray(pendingFilter) ? pendingFilter : [pendingFilter]
      );
    }
  }, [visible, pendingFilter]);

  // Handle filter press (multi-select logic)
  const handlePress = (key) => {
    if (key === "default") {
      setLocalFilters(["default"]);
      return;
    }
    let next;
    if (localFilters.includes(key)) {
      next = localFilters.filter((f) => f !== key);
      if (next.length === 0) next = ["default"];
    } else {
      next = localFilters.filter((f) => f !== "default").concat(key);
    }
    setLocalFilters(next);
  };

  // Is selected helper
  const isSelected = (key) =>
    localFilters.includes(key) ||
    (key === "default" && localFilters.length === 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 16,
            padding: 24,
            borderWidth: 1,
            borderColor: themeColors.black,
            width: "88%",
            maxWidth: 400,
            alignItems: "center",
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple,
              marginBottom: 12,
              fontFamily: "CarosSoft",
            }}
          >
            Group Filters
          </Text>
          <View
            style={{
              width: "100%",
              marginBottom: 16,
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => handlePress(f.key)}
                style={{
                  marginRight: 8,
                  marginBottom: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  backgroundColor: isSelected(f.key)
                    ? themeColors.purple
                    : themeColors.white,
                  borderRadius: 25,
                  alignItems: "center",
                  alignSelf: "flex-start",
                  shadowColor: themeColors.purple,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  borderWidth: 1,
                  borderColor: themeColors.purple,
                  minWidth: 0,
                  maxWidth: "48%",
                }}
              >
                <Text
                  style={{
                    color: isSelected(f.key)
                      ? themeColors.white
                      : themeColors.purple,
                    fontWeight: "bold",
                    fontSize: 13,
                    fontFamily: "CarosSoft",
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* --- Reset Filters Button --- */}
          <TouchableOpacity
            onPress={() => setLocalFilters(["default"])}
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
                fontWeight: "bold",
                fontFamily: "CarosSoft",
              }}
            >
              Reset Filters
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", marginTop: 8, width: "100%" }}>
            <TouchableOpacity
              onPress={() => {
                setLocalFilters(
                  Array.isArray(selectedFilter)
                    ? selectedFilter
                    : [selectedFilter]
                );
                onClose();
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
                  fontFamily: "CarosSoft",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                // Remove "default" if other filters are selected
                const toSet =
                  localFilters.length === 1 && localFilters[0] === "default"
                    ? ["default"]
                    : localFilters.filter((f) => f !== "default");
                setPendingFilter(toSet);
                setSelectedFilter(toSet);
                onClose();
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
                  fontFamily: "CarosSoft",
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
