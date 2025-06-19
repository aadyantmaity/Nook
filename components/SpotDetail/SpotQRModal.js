import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import QRCode from "react-native-qrcode-svg";

export default function SpotQRModal({ visible, onClose, spotId, themeColors }) {
  // Expo Go expects the QR code to contain the base Expo project URL.
  // Scanning this will open the project in Expo Go.
  // Deep links (e.g., /spot/:spotId) only work in a custom dev client or standalone app.
  // You can find your Expo URL in .expo/settings.json or from the Expo CLI output.
  const expoProjectUrl = "exp://192.168.1.151:8081"; // <-- Use your LAN Expo URL here

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
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
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple,
              marginBottom: 18,
              textAlign: "center",
              fontFamily: "CarosSoft",
            }}
          >
            Spot QR Code
          </Text>
          <QRCode
            value={expoProjectUrl}
            size={200}
            backgroundColor={themeColors.white}
            color={themeColors.purple}
          />
          <Text
            style={{
              color: themeColors.black,
              fontSize: 15,
              marginTop: 18,
              textAlign: "center",
              fontFamily: "CarosSoft",
            }}
          >
            Scan to open this app in Expo Go.
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 18,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 24,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: themeColors.white,
                fontWeight: "bold",
                fontSize: 16,
                fontFamily: "CarosSoft",
              }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
