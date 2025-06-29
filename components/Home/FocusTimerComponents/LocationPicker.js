import React from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";

export function LocationPickerModal({
  visible,
  onClose,
  studySpots,
  setSelectedSpot,
  isRunning,
  themeColors,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
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
            borderRadius: 12,
            padding: 16,
            width: "85%",
            maxHeight: "70%",
            borderWidth: 1,
            borderColor: themeColors.black,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.black,
              marginBottom: 12,
              fontFamily: "CarosSoft",
            }}
          >
            Select Location
          </Text>
          <FlatList
            data={studySpots}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  if (isRunning) {
                    Alert.alert(
                      "Cannot Switch Location",
                      "Please finish or stop your current session before changing location."
                    );
                    return;
                  }
                  setSelectedSpot(item);
                  onClose();
                }}
                style={{
                  padding: 12,
                  borderBottomWidth: 0.5,
                  borderBottomColor: themeColors.gray,
                }}
              >
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  {item.buildingName}
                </Text>
                {item.roomNumber && (
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontSize: 13,
                      fontFamily: "CarosSoft",
                    }}
                  >
                    Floor {item.roomNumber}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 12,
              backgroundColor: themeColors.white,
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: "center",
              borderWidth: 1,
              borderColor: themeColors.purple,
            }}
          >
            <Text
              style={{
                color: themeColors.purple,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
              }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
