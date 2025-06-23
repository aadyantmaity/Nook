import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
} from "react-native";

export default function AddAlertModal({
  visible,
  onClose,
  onAddAlert,
  themeColors,
}) {
  const [alertText, setAlertText] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleAdd = () => {
    onAddAlert(alertText, () => {
      setAlertText("");
      onClose();
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        activeOpacity={1}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPressOut={onClose}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 16,
            padding: 24,
            width: "85%",
            alignItems: "center",
            position: "absolute",
            left: "7.5%",
            right: "7.5%",
            bottom: "45%",
            borderWidth: 1,
            borderColor: themeColors.black,
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
              marginBottom: 12,
              color: themeColors.black,
              fontFamily: "CarosSoft",
            }}
          >
            Add Alert
          </Text>
          <TextInput
            placeholder="Ex. Building access blocked for UW Investment Group"
            placeholderTextColor={themeColors.darkGray}
            value={alertText}
            onChangeText={setAlertText}
            style={{
              borderWidth: 1,
              borderColor: themeColors.darkGray,
              borderRadius: 8,
              padding: 12,
              width: "100%",
              marginBottom: 16,
              color: themeColors.black,
              backgroundColor: themeColors.white,
              fontFamily: "CarosSoft",
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
              <Text
                style={{
                  color: themeColors.black,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
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
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
