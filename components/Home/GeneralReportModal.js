import React, { useState, useContext } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
                fontFamily: "CarosSoft",
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
                fontFamily: "CarosSoft",
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
                <Text
                  style={{
                    color: themeColors.white,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
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
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
