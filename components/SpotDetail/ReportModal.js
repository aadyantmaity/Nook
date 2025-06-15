import React, { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity } from "react-native";

export default function ReportModal({
  visible,
  onClose,
  spotId,
  spotName,
  onSubmit,
  themeColors,
}) {
  const [reportText, setReportText] = useState("");

  const handleReport = () => {
    if (onSubmit) onSubmit(reportText);
    setReportText("");
    onClose();
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
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 12,
              color: themeColors.black,
            }}
          >
            Report Incorrect Information
          </Text>
          <Text style={{ color: themeColors.black, marginBottom: 8 }}>
            Spot: <Text style={{ fontWeight: "bold" }}>{spotName}</Text>
          </Text>
          <TextInput
            placeholder="Describe the issue"
            placeholderTextColor={themeColors.darkGray}
            value={reportText}
            onChangeText={setReportText}
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
              onPress={handleReport}
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
                Submit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
