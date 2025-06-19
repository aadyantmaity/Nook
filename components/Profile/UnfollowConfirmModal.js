import React from "react";
import { Modal, Pressable, View, Text, TouchableOpacity } from "react-native";

export default function UnfollowConfirmModal({
  visible,
  onClose,
  onConfirm,
  themeColors,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
        onPress={onClose}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 12,
            padding: 24,
            alignItems: "center",
            minWidth: 240,
            width: "100%",
            maxWidth: 400,
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
            Unfollow User?
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: themeColors.purple,
              marginBottom: 20,
              textAlign: "center",
              fontFamily: "CarosSoft",
            }}
          >
            Are you sure you want to unfollow this user?
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
                Unfollow
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
              onPress={onClose}
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
