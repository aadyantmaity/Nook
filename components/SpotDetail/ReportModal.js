import React, { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity } from "react-native";
import PrimaryActionButton from "../PrimaryActionButton";
import { FONTS } from "../../constants/fonts";

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
            position: "absolute",
            left: "7.5%",
            right: "7.5%",
            bottom: "45%",
            alignItems: "center",
            borderWidth: 1,
            borderColor: themeColors.gray + "70",
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
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Report Incorrect Information
          </Text>
          <Text
            style={{
              color: themeColors.black,
              marginBottom: 8,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Spot:{" "}
            <Text style={{ fontWeight: "bold", fontFamily: FONTS.PRIMARY }}>
              {spotName}
            </Text>
          </Text>
          <TextInput
            placeholder="Describe the issue"
            placeholderTextColor={themeColors.darkGray}
            value={reportText}
            onChangeText={setReportText}
            style={{
              borderWidth: 1,
              borderColor: themeColors.darkGray,
              borderRadius: 8,
              padding: 12,
              width: "100%",
              marginBottom: 16,
              color: themeColors.black,
              backgroundColor: themeColors.white,
              fontFamily: FONTS.PRIMARY,
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
                backgroundColor: themeColors.white,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 18,
                alignItems: "center",
                flex: 1,
                marginRight: 8,
                borderWidth: 1,
                borderColor: themeColors.purple,
              }}
            >
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <PrimaryActionButton
              label="Submit"
              onPress={handleReport}
              themeColors={themeColors}
              style={{ marginLeft: 8 }}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
