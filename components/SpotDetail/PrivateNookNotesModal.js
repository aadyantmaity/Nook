import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function PrivateNookNotesModal({
  visible,
  onClose,
  spotId,
  themeColors,
}) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    const fetchNotes = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "studySpots", spotId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const userId = auth.currentUser?.uid;
          if (isMounted) {
            setNotes((data.personalNotes && data.personalNotes[userId]) || "");
          }
        }
      } catch {}
      setLoading(false);
    };
    fetchNotes();
    return () => {
      isMounted = false;
      setNotes(""); // Clear notes when modal closes
    };
  }, [visible, spotId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error("Not signed in");
      const docRef = doc(db, "studySpots", spotId);
      const docSnap = await getDoc(docRef);
      let personalNotes = {};
      if (docSnap.exists()) {
        personalNotes = docSnap.data().personalNotes || {};
      }
      personalNotes[userId] = notes;
      await updateDoc(docRef, { personalNotes });
      Alert.alert("Saved", "Your notes have been saved.");
      onClose();
    } catch (e) {
      Alert.alert("Error", "Failed to save notes.");
    }
    setSaving(false);
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
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            borderRadius: 14,
            padding: 20,
            width: "88%",
            alignItems: "center",
            borderWidth: 1,
            borderColor: themeColors.black,
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
              color: themeColors.purple,
              marginBottom: 8,
              fontFamily: "CarosSoft",
            }}
          >
            Notes
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: themeColors.purple,
              borderRadius: 8,
              padding: 12,
              width: "100%",
              minHeight: 80,
              color: themeColors.black,
              backgroundColor: themeColors.white,
              marginBottom: 12,
              textAlignVertical: "top",
              fontFamily: "CarosSoft",
            }}
            placeholder="Write your notes for this nook..."
            placeholderTextColor={themeColors.darkGray}
            multiline
            value={notes}
            onChangeText={setNotes}
            editable={!saving}
          />
          <View style={{ flexDirection: "row", width: "100%" }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                backgroundColor: themeColors.white,
                borderColor: themeColors.purple,
                borderWidth: 1,
                borderRadius: 8,
                alignItems: "center",
                padding: 10,
                marginRight: 8,
              }}
              disabled={saving}
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
              onPress={handleSave}
              style={{
                flex: 1,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                alignItems: "center",
                padding: 10,
                opacity: saving ? 0.7 : 1,
              }}
              disabled={saving}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontFamily: "CarosSoft",
                }}
              >
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
