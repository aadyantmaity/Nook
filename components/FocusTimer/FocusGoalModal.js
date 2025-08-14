import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { Target, X } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

export function FocusGoalModal({
  visible,
  onClose,
  goal,
  onSave,
  themeColors,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Initialize form when modal opens
  useEffect(() => {
    if (visible) {
      if (goal && goal.title) {
        // Editing existing goal
        setTitle(goal.title || "");
        setDescription(goal.description || "");
      } else {
        // Creating new goal
        setTitle("");
        setDescription("");
      }
    }
  }, [visible, goal]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a goal title.");
      return;
    }

    const goalData = {
      type: "custom",
      title: title.trim(),
      description: description.trim(),
      achieved: goal?.achieved || false,
    };

    onSave(goalData);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert("Delete Goal", "Are you sure you want to delete this goal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onSave(null); // Pass null to delete
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingBottom: 230,
        }}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            backgroundColor: themeColors.white,
            borderWidth: 1,
            borderColor: themeColors.black,
            borderRadius: 16,
            width: "100%",
            maxWidth: 400,
            paddingTop: 20,
            paddingHorizontal: 20,
            paddingBottom: 20,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={() => {}} // Prevent tap-through
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Goal Title */}
            <Text
              style={{
                fontSize: 19,
                fontWeight: "600",
                color: themeColors.black,
                marginBottom: 8,
                fontFamily: FONTS.PRIMARY,
              }}
            >
              Goal Title
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: themeColors.darkGray,
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                fontFamily: FONTS.PRIMARY,
                color: themeColors.black,
                backgroundColor: themeColors.white,
                marginBottom: 16,
              }}
              placeholder="Complete assignment"
              placeholderTextColor={themeColors.darkGray}
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />

            {/* Description */}
            <Text
              style={{
                fontSize: 19,
                fontWeight: "600",
                color: themeColors.black,
                marginBottom: 8,
                fontFamily: FONTS.PRIMARY,
              }}
            >
              Description (Optional)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: themeColors.darkGray,
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                fontFamily: FONTS.PRIMARY,
                color: themeColors.black,
                backgroundColor: themeColors.white,
                marginBottom: 20,
              }}
              placeholder="Add a brief description..."
              placeholderTextColor={themeColors.darkGray}
              value={description}
              onChangeText={setDescription}
              maxLength={50}
            />

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.white,
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: themeColors.purple,
                }}
              >
                <Text
                  style={{
                    color: themeColors.purple,
                    fontSize: 16,
                    fontWeight: "bold",
                    fontFamily: FONTS.PRIMARY,
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
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: themeColors.white,
                    fontSize: 16,
                    fontWeight: "bold",
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
