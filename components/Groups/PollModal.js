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
import { X, Trash } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

export default function PollModal({ visible, onClose, onSubmit, themeColors }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([]);
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

  const questionInputStyle = {
    borderRadius: 10,
    padding: 12,
    width: "100%",
    marginBottom: 18,
    color: themeColors.black,
    fontFamily: FONTS.PRIMARY,
    fontSize: 16,
    backgroundColor: themeColors.white,
    shadowColor: themeColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  };

  const MAX_OPTIONS = 4;

  const handleAddOption = () => {
    setOptions((prev) => {
      if (prev.length >= MAX_OPTIONS) return prev;
      return [...prev, ""];
    });
  };

  const handleChangeOption = (text, index) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? text : opt)));
  };

  const handleRemoveOption = (index) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      Alert.alert("Please enter a question.");
      return;
    }
    const cleanedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (cleanedOptions.length < 2) {
      Alert.alert("Please add at least two options.");
      return;
    }
    setSubmitting(true);
    setPendingPoll({
      question: question.trim(),
      options: cleanedOptions,
    });
    setQuestion("");
    setOptions([]);
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
            marginBottom: 250, // <-- move modal up by 60px
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
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
            <X size={24} color={themeColors.red} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: themeColors.purple,
              marginBottom: 18,
              fontFamily: FONTS.PRIMARY,
              letterSpacing: 0.5,
            }}
          >
            Create a Poll
          </Text>
          <TextInput
            placeholder="Poll question"
            value={question}
            onChangeText={setQuestion}
            style={questionInputStyle}
            placeholderTextColor={themeColors.darkGray}
            maxLength={100}
          />
          <View style={{ width: "100%", marginBottom: 8 }}>
            {options.map((opt, index) => (
              <View
                key={index}
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
              >
                <TextInput
                  placeholder={`Option ${index + 1}`}
                  value={opt}
                  onChangeText={(text) => handleChangeOption(text, index)}
                  style={[questionInputStyle, { flex: 1, marginBottom: 0 }]}
                  placeholderTextColor={themeColors.darkGray}
                  maxLength={80}
                />
                <TouchableOpacity
                  onPress={() => handleRemoveOption(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginLeft: 8, padding: 6 }}
                >
                  <Trash size={20} color={themeColors.red || "#FF3B30"} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={handleAddOption}
              disabled={options.length >= MAX_OPTIONS}
              style={{
                alignSelf: "flex-start",
                paddingVertical: 8,
                paddingHorizontal: 6,
                marginTop: 4,
                opacity: options.length >= MAX_OPTIONS ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  color: themeColors.purple,
                  fontFamily: FONTS.PRIMARY,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                + Add option
              </Text>
            </TouchableOpacity>
          </View>
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
                fontFamily: FONTS.PRIMARY,
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