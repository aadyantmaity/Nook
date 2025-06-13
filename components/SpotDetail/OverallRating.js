import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Star } from "phosphor-react-native";

export default function OverallRating({
  userOverallRating,
  averageOverallRating,
  overallRatingsCount,
  pendingOverallRating,
  setPendingOverallRating,
  isSubmittingOverall,
  onSubmit,
  themeColors,
}) {
  return (
    <View style={{ alignItems: "center", marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 16,
          color: themeColors.black,
          fontWeight: "bold",
          marginBottom: 4,
        }}
      >
        Overall Rating
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setPendingOverallRating(star)}
            activeOpacity={0.7}
          >
            <Star
              size={28}
              color={
                star <= pendingOverallRating
                  ? themeColors.purple
                  : themeColors.darkGray
              }
              weight={star <= pendingOverallRating ? "fill" : "regular"}
              style={{ marginRight: 2 }}
            />
          </TouchableOpacity>
        ))}
        <Text
          style={{
            marginLeft: 8,
            color: themeColors.black,
            fontSize: 15,
          }}
        >
          {overallRatingsCount > 0
            ? `${averageOverallRating.toFixed(1)} (${overallRatingsCount})`
            : "No rating"}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 12,
          color: themeColors.darkGray,
          marginTop: 2,
        }}
      >
        {userOverallRating
          ? `Your rating: ${userOverallRating}`
          : "Tap a star to rate"}
      </Text>
      <TouchableOpacity
        onPress={onSubmit}
        disabled={
          isSubmittingOverall ||
          pendingOverallRating === 0 ||
          pendingOverallRating === userOverallRating
        }
        style={{
          marginTop: 8,
          backgroundColor:
            pendingOverallRating !== 0 &&
            pendingOverallRating !== userOverallRating
              ? themeColors.purple
              : themeColors.darkGray,
          paddingVertical: 8,
          paddingHorizontal: 24,
          borderRadius: 8,
          alignItems: "center",
          opacity:
            pendingOverallRating !== 0 &&
            pendingOverallRating !== userOverallRating
              ? 1
              : 0.6,
        }}
      >
        <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
          {isSubmittingOverall ? "Submitting..." : "Submit"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
