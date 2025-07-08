import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function GroupTaskModal({
  visible,
  onClose,
  groupId,
  themeColors,
}) {
  const [taskText, setTaskText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!taskText.trim()) {
      Alert.alert("Please enter a task.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "studyGroups", groupId, "tasks"), {
        text: taskText.trim(),
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        checkedOff: [],
      });
      setTaskText("");
      onClose();
    } catch (e) {
      Alert.alert("Error", "Failed to create task.");
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
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 16,
            padding: 24,
            width: "85%",
            maxWidth: 400,
            alignItems: "center",
          }}
          onStartShouldSetResponder={() => true}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple,
              marginBottom: 10,
              textAlign: "center",
              fontFamily: "CarosSoft",
            }}
          >
            Create Group Task
          </Text>
          <TextInput
            value={taskText}
            onChangeText={setTaskText}
            placeholder="Describe the group task..."
            style={{
              borderWidth: 1,
              borderColor: themeColors.darkGray,
              borderRadius: 8,
              padding: 10,
              width: "100%",
              marginBottom: 10,
              color: themeColors.black,
              fontFamily: "CarosSoft",
              fontSize: 16,
            }}
            placeholderTextColor={themeColors.darkGray}
            maxLength={100}
          />
          <View style={{ flexDirection: "row", marginTop: 8, width: "100%" }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                backgroundColor: themeColors.white,
                borderColor: themeColors.purple,
                borderWidth: 1,
                borderRadius: 8,
                alignItems: "center",
                paddingVertical: 10,
                marginRight: 8,
              }}
              disabled={submitting}
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
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !taskText.trim()}
              style={{
                flex: 1,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: "center",
                marginLeft: 8,
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
                {submitting ? "Creating..." : "Create"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
