import React from "react";
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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
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
            borderWidth: 1,
            borderColor: themeColors.black,
            width: "88%",
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
                onPress={() => setPendingFilter(f.key)}
                style={{
                  marginRight: 8,
                  marginBottom: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  backgroundColor:
                    pendingFilter === f.key
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
                    color:
                      pendingFilter === f.key
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
          <View style={{ flexDirection: "row", marginTop: 18, width: "100%" }}>
            <TouchableOpacity
              onPress={() => {
                setPendingFilter(selectedFilter);
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
                setSelectedFilter(pendingFilter);
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
      </View>
    </Modal>
  );
}
