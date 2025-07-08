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
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

export default function GroupTaskModal({
  visible,
  onClose,
  groupId,
  themeColors,
}) {
  const [taskText, setTaskText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [groupOwner, setGroupOwner] = useState(null);
  const [hasTask, setHasTask] = useState(false);

  // Fetch group owner and check if a task exists
  useEffect(() => {
    if (!groupId) return;
    // Fetch group owner
    const fetchGroupOwner = async () => {
      try {
        const groupDoc = await getDoc(doc(db, "studyGroups", groupId));
        if (groupDoc.exists()) {
          setGroupOwner(groupDoc.data().createdBy);
        }
      } catch {}
    };
    // Check if a task exists (latest task)
    const fetchLatestTask = async () => {
      try {
        const qTasks = query(
          collection(db, "studyGroups", groupId, "tasks"),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(qTasks);
        setHasTask(!snap.empty);
      } catch {
        setHasTask(false);
      }
    };
    fetchGroupOwner();
    fetchLatestTask();
  }, [groupId, visible]);

  const handleSubmit = async () => {
    if (!taskText.trim()) {
      Alert.alert("Please enter a task.");
      return;
    }
    // Prevent non-owner from creating a new task if one exists
    if (hasTask && groupOwner && auth.currentUser?.uid !== groupOwner) {
      Alert.alert(
        "Task Already Exists",
        "Only the group owner can override the current group task."
      );
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
            borderWidth: 1,
            borderColor: themeColors.black,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
            marginTop: -50, // Move modal 50px up
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
