import React from "react";
import { Modal, View, Text, TouchableOpacity, TextInput } from "react-native";
import { FONTS } from "../../constants/fonts";

export default function DeleteAccountModal({
  visible,
  onCancel,
  onConfirm,
  themeColors,
  loading = false,
  errorMessage = "",
  needReauth = false,
  password = "",
  onChangePassword,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
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
            borderRadius: 12,
            padding: 24,
            alignItems: "center",
            minWidth: 280,
            borderWidth: 1,
            borderColor: themeColors.gray + "70",
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
              marginBottom: 12,
              color: themeColors.black,
              fontFamily: FONTS.PRIMARY,
              textAlign: "center",
            }}
          >
            Permanently delete your account?
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: themeColors.purple,
              marginBottom: 14,
              fontFamily: FONTS.PRIMARY,
              textAlign: "center",
            }}
          >
            This will delete your profile and any study spots you created. This
            action cannot be undone.
          </Text>
          {errorMessage ? (
            <Text
              style={{
                color: themeColors.red,
                marginBottom: 10,
                fontFamily: FONTS.PRIMARY,
                textAlign: "center",
              }}
            >
              {errorMessage}
            </Text>
          ) : null}
          {needReauth ? (
            <View style={{ width: "100%", marginBottom: 12 }}>
              <Text
                style={{
                  color: themeColors.black,
                  marginBottom: 6,
                  fontFamily: FONTS.PRIMARY,
                  textAlign: "left",
                }}
              >
                Confirm your password to continue:
              </Text>
              <TextInput
                value={password}
                onChangeText={onChangePassword}
                placeholder="Password"
                placeholderTextColor={themeColors.darkGray}
                secureTextEntry
                autoCapitalize="none"
                style={{
                  borderWidth: 0.5,
                  borderColor: themeColors.black,
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: themeColors.white,
                  color: themeColors.purple,
                  fontFamily: FONTS.PRIMARY,
                }}
              />
            </View>
          ) : null}
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
                opacity: loading ? 0.7 : 1,
              }}
              onPress={onConfirm}
              disabled={loading}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {loading ? "Deleting..." : "Delete Account"}
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
              disabled={loading}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
