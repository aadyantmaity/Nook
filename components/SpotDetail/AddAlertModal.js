import React, { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity } from "react-native";

export default function AddAlertModal({
  visible,
  onClose,
  onAddAlert,
  themeColors,
}) {
  const [alertText, setAlertText] = useState("");

  const handleAdd = () => {
    onAddAlert(alertText, () => {
      setAlertText("");
      onClose();
    });
  };

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
            borderRadius: 16,
            padding: 24,
            width: "85%",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
              color: themeColors.black,
            }}
          >
            Add Alert
          </Text>
          <TextInput
            placeholder="Enter alert text"
            placeholderTextColor={themeColors.darkGray}
            value={alertText}
            onChangeText={setAlertText}
            style={{
              borderWidth: 1,
              borderColor: themeColors.gray,
              borderRadius: 8,
              padding: 12,
              width: "100%",
              marginBottom: 16,
              color: themeColors.black,
              backgroundColor: themeColors.white,
            }}
            multiline
          />
          <View
            style={{
              flexDirection: "row",
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: themeColors.gray,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 18,
                alignItems: "center",
                flex: 1,
                marginRight: 8,
              }}
            >
              <Text style={{ color: themeColors.black, fontWeight: "bold" }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              style={{
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 18,
                alignItems: "center",
                flex: 1,
                marginLeft: 8,
              }}
            >
              <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
