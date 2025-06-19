import React from "react";
import { Modal, Pressable, View, Text, TouchableOpacity } from "react-native";

export default function LogoutModal({
  visible,
  onCancel,
  onConfirm,
  themeColors,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={onCancel}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 12,
            padding: 24,
            alignItems: "center",
            minWidth: 240,
          }}
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
            Confirm Logout
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: themeColors.purple,
              marginBottom: 20,
              fontFamily: "CarosSoft",
            }}
          >
            Are you sure you want to log out?
          </Text>
          <View
            style={{
              flexDirection: "row",
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: themeColors.red,
                borderRadius: 8,
                padding: 12,
                alignItems: "center",
                marginRight: 8,
              }}
              onPress={onConfirm}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                Log Out
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: themeColors.lightPurple || themeColors.purple,
                borderRadius: 8,
                padding: 12,
                alignItems: "center",
              }}
              onPress={onCancel}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
