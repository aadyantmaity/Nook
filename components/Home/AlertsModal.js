import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";

export default function AlertsModal({ visible, onClose, alerts, themeColors }) {
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
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPressOut={onClose}
      >
        <View
          style={{
            width: "90%",
            maxWidth: 400,
            backgroundColor: themeColors.white,
            borderRadius: 8,
            padding: 16,
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.black,
              marginBottom: 12,
            }}
          >
            Location Alerts
          </Text>
          {alerts && alerts.length > 0 ? (
            alerts.map((alert, index) => (
              <Text
                key={index}
                style={{
                  fontSize: 16,
                  color: themeColors.black,
                  marginBottom: 8,
                }}
              >
                - {alert}
              </Text>
            ))
          ) : (
            <Text style={{ fontSize: 16, color: themeColors.darkGray }}>
              No alerts available.
            </Text>
          )}
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 16,
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: themeColors.orange,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
