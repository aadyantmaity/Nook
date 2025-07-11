import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { X, Plus } from "phosphor-react-native";

export default function PollModal({ visible, onClose, onSubmit, themeColors }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [pendingPoll, setPendingPoll] = useState(null); // store poll to send after close

  // When modal closes and there's a pending poll, send it
  useEffect(() => {
    if (!visible && pendingPoll) {
      // Wait for modal to fully close (next tick)
      setTimeout(() => {
        onSubmit(pendingPoll);
        setPendingPoll(null);
      }, 0);
    }
  }, [visible, pendingPoll, onSubmit]);

  const handleOptionChange = (idx, val) => {
    setOptions((prev) => {
      const arr = [...prev];
      arr[idx] = val;
      return arr;
    });
  };

  const addOption = () => {
    if (options.length < 6) setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (idx) => {
    if (options.length > 2)
      setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!question.trim() || options.filter((o) => o.trim()).length < 2) {
      Alert.alert("Please enter a question and at least 2 options.");
      return;
    }
    setSubmitting(true);
    setPendingPoll({
      question: question.trim(),
      options: options.map((o) => o.trim()).filter(Boolean),
    });
    setQuestion("");
    setOptions(["", ""]);
    setSubmitting(false);
    onClose();
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
            borderRadius: 20,
            padding: 28,
            width: "92%",
            maxWidth: 420,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
            elevation: 8,
            marginBottom: 250, // <-- move modal up by 60px
            borderWidth: 1,
            borderColor: themeColors.black,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
          onStartShouldSetResponder={() => true}
        >
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 10,
              padding: 8,
              borderRadius: 20,
            }}
          >
            <X size={24} color={themeColors.purple} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: themeColors.purple,
              marginBottom: 18,
              fontFamily: "CarosSoft",
              letterSpacing: 0.5,
            }}
          >
            Create a Poll
          </Text>
          <TextInput
            placeholder="Poll question"
            value={question}
            onChangeText={setQuestion}
            style={{
              borderWidth: 1.5,
              borderColor: themeColors.purple,
              borderRadius: 10,
              padding: 12,
              width: "100%",
              marginBottom: 18,
              color: themeColors.black,
              fontFamily: "CarosSoft",
              fontSize: 16,
            }}
            placeholderTextColor={themeColors.darkGray}
            maxLength={100}
            selectionColor={themeColors.purple}
          />
          <View
            style={{
              width: "100%",
              height: 1,
              backgroundColor: themeColors.purple + "22",
              marginBottom: 14,
            }}
          />
          <ScrollView style={{ width: "100%", maxHeight: 180 }}>
            {options.map((opt, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <TextInput
                  placeholder={`Option ${idx + 1}`}
                  value={opt}
                  onChangeText={(v) => handleOptionChange(idx, v)}
                  style={{
                    flex: 1,
                    borderWidth: 1.2,
                    borderColor: themeColors.purple,
                    borderRadius: 8,
                    padding: 10,
                    color: themeColors.black,
                    fontFamily: "CarosSoft",
                    fontSize: 15,
                  }}
                  placeholderTextColor={themeColors.darkGray}
                  maxLength={50}
                  selectionColor={themeColors.purple}
                />
                {options.length > 2 && (
                  <TouchableOpacity
                    onPress={() => removeOption(idx)}
                    style={{
                      marginLeft: 8,
                      backgroundColor: themeColors.red + "11",
                      borderRadius: 16,
                      padding: 4,
                    }}
                  >
                    <X size={18} color={themeColors.red} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            onPress={addOption}
            disabled={options.length >= 6}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 18,
              paddingVertical: 8,
              alignSelf: "flex-start",
            }}
          >
            <Plus
              size={20}
              color={
                options.length >= 6 ? themeColors.darkGray : themeColors.purple
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              backgroundColor: themeColors.purple,
              borderRadius: 10,
              paddingVertical: 13,
              paddingHorizontal: 36,
              alignItems: "center",
              opacity: submitting ? 0.7 : 1,
              width: "100%",
              shadowColor: themeColors.purple,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.13,
              shadowRadius: 5,
              elevation: 3,
            }}
          >
            <Text
              style={{
                color: submitting ? themeColors.darkGray : themeColors.white,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
                fontSize: 17,
                letterSpacing: 0.2,
              }}
            >
              {submitting ? "Submitting..." : "Send Poll"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
