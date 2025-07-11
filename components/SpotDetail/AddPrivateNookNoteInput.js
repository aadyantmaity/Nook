import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { PaperPlaneRight } from "phosphor-react-native";

export default function AddPrivateNookNoteInput({
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
    } catch (e) {
      Alert.alert("Error", "Failed to save note.");
    }
    setIsSavingNote(false);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center", // changed from "flex-end" to "center"
        marginBottom: 10,
        marginTop: 8,
      }}
    >
      <TextInput
        placeholder="Add a note..."
        placeholderTextColor={themeColors.darkGray}
        value={noteInput}
        onChangeText={setNoteInput}
        style={{
          borderWidth: 1,
          borderColor: themeColors.purple,
          borderRadius: 8,
          padding: 10,
          color: themeColors.black,
          fontFamily: "CarosSoft",
          minHeight: 40,
          flex: 1,
          marginRight: 8,
        }}
        multiline
        editable={!isSavingNote}
      />
      <TouchableOpacity
        onPress={handleSaveNote}
        disabled={isSavingNote || !noteInput.trim()}
        style={{
          borderRadius: 8,
          paddingVertical: 10,
          paddingRight: 16,
          alignItems: "center",
        }}
      >
        {isSavingNote ? (
          <ActivityIndicator color={themeColors.white} size="small" />
        ) : (
          <PaperPlaneRight
            size={26}
            color={
              isSavingNote || !noteInput.trim()
                ? themeColors.darkGray
                : themeColors.purple
            }
          />
        )}
      </TouchableOpacity>
    </View>
  );
}
