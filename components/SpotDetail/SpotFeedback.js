import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { ThumbsUp, ThumbsDown } from "phosphor-react-native";
import { db, auth } from "../../firebaseConfig";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { FONTS } from "../../constants/fonts";

export default function SpotFeedback({ spotId, themeColors }) {
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState(null);
  const resetTimeout = useRef(null);

  const handleFeedback = async (value) => {
    if (!spotId || submitted) return;
    setSelected(value);
    setSubmitted(true);
    try {
      await addDoc(collection(db, "spotFeedback"), {
        spotId,
        userId: auth.currentUser?.uid || null,
        feedback: value, // "up" or "down"
        createdAt: Timestamp.now(),
      });
    } catch (e) {
      Alert.alert("Error", "Failed to submit feedback.");
    }
    // Reset after 3 seconds so user can submit again
    if (resetTimeout.current) clearTimeout(resetTimeout.current);
    resetTimeout.current = setTimeout(() => {
      setSubmitted(false);
      setSelected(null);
    }, 3000);
  };

  return (
    <View
      style={{
        marginTop: 18,
        marginBottom: 4,
        alignItems: "center",
        backgroundColor: themeColors.lightGray,
        borderRadius: 10,
        padding: 12,
      }}
    >
      <Text
        style={{
          color: themeColors.black,
          fontSize: 15,
          fontWeight: "bold",
          marginBottom: 8,
          fontFamily: FONTS.PRIMARY,
        }}
      >
        Did the noise & crowd ratings match your expectations?
      </Text>
      <View style={{ flexDirection: "row", gap: 18 }}>
        <TouchableOpacity
          onPress={() => handleFeedback("up")}
          disabled={submitted}
          style={{
            backgroundColor:
              selected === "up" ? themeColors.green : themeColors.white,
            borderRadius: 24,
            padding: 10,
            marginHorizontal: 8,
            borderWidth: 1,
            borderColor: themeColors.green,
            opacity: submitted && selected !== "up" ? 0.5 : 1,
          }}
        >
          <ThumbsUp
            size={28}
            color={
              submitted
                ? themeColors.darkGray
                : selected === "up"
                ? themeColors.white
                : themeColors.green
            }
            weight={selected === "up" ? "fill" : "regular"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleFeedback("down")}
          disabled={submitted}
          style={{
            backgroundColor:
              selected === "down" ? themeColors.red : themeColors.white,
            borderRadius: 24,
            padding: 10,
            marginHorizontal: 8,
            borderWidth: 1,
            borderColor: themeColors.red,
            opacity: submitted && selected !== "down" ? 0.5 : 1,
          }}
        >
          <ThumbsDown
            size={28}
            color={
              submitted
                ? themeColors.darkGray
                : selected === "down"
                ? themeColors.white
                : themeColors.red
            }
            weight={selected === "down" ? "fill" : "regular"}
          />
        </TouchableOpacity>
      </View>
      {submitted && (
        <Text
          style={{
            color: themeColors.purple,
            fontSize: 13,
            marginTop: 8,
            fontWeight: "bold",
            fontFamily: FONTS.PRIMARY,
          }}
        >
          Thank you for your feedback!
        </Text>
      )}
    </View>
  );
}
