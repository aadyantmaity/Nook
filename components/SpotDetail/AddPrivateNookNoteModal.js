import React, { useState } from "react";
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
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function AddPrivateNookNoteModal({
  visible,
  onClose,
  spotId,
  themeColors,
  onNoteAdded,
}) {
  const [noteInput, setNoteInput] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleSaveNote = async () => {
    if (!noteInput.trim()) return;
    setIsSavingNote(true);
    try {
      const spotRef = doc(db, "studySpots", spotId);
      const spotSnap = await getDoc(spotRef);
      let prevNotes = [];
      if (spotSnap.exists()) {
        prevNotes = spotSnap.data().privateNotes || [];
      }
      // Add author info to note
      const user = auth.currentUser;
      const author = user?.displayName || user?.email || user?.uid || "Unknown";
      const newNote = {
        text: noteInput.trim(),
        createdAt: Date.now(),
        author,
      };
      const updatedNotes = [...prevNotes, newNote];
      await updateDoc(spotRef, { privateNotes: updatedNotes });
      setNoteInput("");
      if (typeof onNoteAdded === "function") onNoteAdded(updatedNotes);
      setTimeout(() => {
        onClose();
      }, 0);
    } catch (e) {
      Alert.alert("Error", "Failed to save note.");
    }
    setIsSavingNote(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 0,
        }}
        keyboardVerticalOffset={-100}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              padding: 24,
              width: "85%",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 16,
                color: themeColors.purple,
                marginBottom: 6,
                fontFamily: "CarosSoft",
              }}
            >
              Add Note
            </Text>
            <TextInput
              placeholder="Write a note about this nook..."
              placeholderTextColor={themeColors.darkGray}
              value={noteInput}
              onChangeText={setNoteInput}
              style={{
                borderWidth: 1,
                borderColor: themeColors.purple,
                borderRadius: 8,
                padding: 10,
                backgroundColor: themeColors.white,
                color: themeColors.black,
                marginBottom: 8,
                fontFamily: "CarosSoft",
                width: "100%",
                minHeight: 60,
                textAlignVertical: "top",
              }}
              multiline
              editable={!isSavingNote}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                width: "100%",
              }}
            >
              <TouchableOpacity
                onPress={onClose}
                style={{
                  backgroundColor: themeColors.gray,
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 18,
                  alignItems: "center",
                  marginRight: 8,
                }}
                disabled={isSavingNote}
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
                onPress={handleSaveNote}
                disabled={isSavingNote || !noteInput.trim()}
                style={{
                  backgroundColor: themeColors.purple,
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 18,
                  alignItems: "center",
                  opacity: isSavingNote || !noteInput.trim() ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    color: themeColors.white,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  {isSavingNote ? "Saving..." : "Save Note"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
