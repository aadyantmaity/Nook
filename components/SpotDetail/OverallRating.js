import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Star, Check } from "phosphor-react-native"; // import Check icon

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
    <View
      style={{
        alignItems: "flex-start",
        backgroundColor: themeColors.lightGray,
        borderRadius: 14,
        shadowColor: themeColors.black,
        shadowOpacity: 0.04,
        shadowRadius: 4,
        paddingVertical: 10,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 2,
          alignSelf: "flex-start",
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: themeColors.darkGray,
            marginRight: 8,
          }}
        >
          {overallRatingsCount > 0
            ? `${averageOverallRating.toFixed(1)} (${overallRatingsCount})`
            : "No rating"}
        </Text>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setPendingOverallRating(star)}
            activeOpacity={0.6}
            style={{ marginHorizontal: 1 }}
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
        <TouchableOpacity
          onPress={onSubmit}
          disabled={
            isSubmittingOverall ||
            pendingOverallRating === 0 ||
            pendingOverallRating === userOverallRating
          }
          style={{
            marginLeft: 8,
            backgroundColor:
              pendingOverallRating !== 0 &&
              pendingOverallRating !== userOverallRating
                ? themeColors.purple
                : themeColors.darkGray, // use gray if no new rating is selected
            borderRadius: 16,
            padding: 4,
            alignItems: "center",
            justifyContent: "center",
            opacity:
              pendingOverallRating !== 0 &&
              pendingOverallRating !== userOverallRating
                ? 1
                : 0.5,
          }}
        >
          <Check
            size={14}
            color={themeColors.white}
            weight={isSubmittingOverall ? "regular" : "bold"}
          />
        </TouchableOpacity>
      </View>
      <View
        style={{
          width: "100%",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: themeColors.darkGray,
            marginBottom: 2,
            marginTop: 2,
            textAlign: "center",
            marginLeft: -84, // move slightly to the left
          }}
        >
          Tap a star to rate
        </Text>
      </View>
    </View>
  );
}
