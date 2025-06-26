import React from "react";
import { View, Text } from "react-native";
import { SpeakerHigh, UsersThree } from "phosphor-react-native";

// Helper functions to map average to label
function getNoiseLabel(avg) {
  if (avg === "N/A" || avg === "No rating yet" || avg == null) return "N/A";
  if (typeof avg === "string") {
    const normalized = avg.trim().toLowerCase();
    if (["silent", "buzz", "loud"].includes(normalized)) {
      // Capitalize first letter
      return avg.charAt(0).toUpperCase() + avg.slice(1).toLowerCase();
    }
    avg = parseFloat(avg);
  }
  if (isNaN(avg)) return "N/A";
  if (avg < 0.5) return "Silent";
  if (avg < 1.5) return "Buzz";
  return "Loud";
}
function getCrowdLabel(avg) {
  if (avg === "N/A" || avg === "No rating yet" || avg == null) return "N/A";
  if (typeof avg === "string") {
    const normalized = avg.trim().toLowerCase();
    if (["empty", "light", "busy"].includes(normalized)) {
      return avg.charAt(0).toUpperCase() + avg.slice(1).toLowerCase();
    }
    avg = parseFloat(avg);
  }
  if (isNaN(avg)) return "N/A";
  if (avg < 0.5) return "Empty";
  if (avg < 1.5) return "Light";
  return "Busy";
}

export default function RatingsDisplay({
  ratings,
  themeColors,
  getLastUpdatedLabel,
}) {
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            alignItems: "center",
            paddingHorizontal: 16,
            backgroundColor: themeColors.white,
            borderRadius: 8,
            flex: 1,
            marginRight: 8,
          }}
        >
          <SpeakerHigh size={24} color={themeColors.purple} />
          <Text
            style={{
              color: themeColors.purple,
              fontSize: 16,
              fontWeight: "bold",
              marginTop: 8,
              fontFamily: "CarosSoft",
            }}
          >
            Noise: {getNoiseLabel(ratings?.noise)}
          </Text>
          {typeof ratings?.noise === "number" && (
            <Text
              style={{
                color: themeColors.darkGray,
                fontSize: 12,
                fontFamily: "CarosSoft",
              }}
            >
              ({ratings.noise.toFixed(1)} avg)
            </Text>
          )}
        </View>
        <View
          style={{
            alignItems: "center",
            paddingHorizontal: 16,
            backgroundColor: themeColors.white,
            borderRadius: 8,
            flex: 1,
          }}
        >
          <UsersThree size={24} color={themeColors.purple} />
          <Text
            style={{
              color: themeColors.purple,
              fontSize: 16,
              fontWeight: "bold",
              marginTop: 8,
              fontFamily: "CarosSoft",
            }}
          >
            Crowd: {getCrowdLabel(ratings?.crowd)}
          </Text>
          {typeof ratings?.crowd === "number" && (
            <Text
              style={{
                color: themeColors.darkGray,
                fontSize: 12,
                fontFamily: "CarosSoft",
              }}
            >
              ({ratings.crowd.toFixed(1)} avg)
            </Text>
          )}
        </View>
      </View>
    </>
  );
}
