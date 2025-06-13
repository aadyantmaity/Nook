import React, { useState, useContext } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { ThemeContext } from "../../App";
import { colors } from "../../constants/colors";
import { db, auth } from "../../firebaseConfig";
import { addDoc, collection, Timestamp } from "firebase/firestore";

export default function GeneralReportModal({
  visible,
  onClose,
  themeColors: propColors,
}) {
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const themeCtx = useContext(ThemeContext);
  const themeColors = propColors ?? themeCtx?.themeColors ?? colors;

  const handleSubmit = async () => {
    if (!reportText.trim()) {
      Alert.alert("Please enter your suggestion or issue.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "reports"), {
        spotId: null,
        spotName: null,
        report: reportText,
        user: auth.currentUser?.uid || "Anonymous",
        createdAt: Timestamp.now(),
      });
      Alert.alert("Thank you!", "Your feedback has been submitted.");
      setReportText("");
      onClose();
    } catch (e) {
      Alert.alert("Error", "Failed to submit feedback.");
    }
    setSubmitting(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
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
            margin: 32,
            padding: 16,
            borderRadius: 8,
            width: "90%",
            maxWidth: 400,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.black,
              marginBottom: 8,
            }}
          >
            Suggestion / Report an Issue
          </Text>
          <TextInput
            style={{
              borderWidth: 0.5,
              borderColor: themeColors.purple,
              borderRadius: 8,
              padding: 12,
              minHeight: 80,
              color: themeColors.black,
              backgroundColor: themeColors.white,
              marginBottom: 12,
              textAlignVertical: "top",
            }}
            placeholder="Describe your suggestion or issue..."
            placeholderTextColor={themeColors.darkGray}
            multiline
            value={reportText}
            onChangeText={setReportText}
            editable={!submitting}
          />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                alignItems: "center",
                marginRight: 8,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                {submitting ? "Submitting..." : "Submit"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: themeColors.white,
                borderRadius: 8,
                alignItems: "center",
                borderColor: themeColors.black,
                borderWidth: 0.5,
              }}
            >
              <Text style={{ color: themeColors.purple, fontWeight: "bold" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
