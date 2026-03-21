import React from "react";
import { View, Text } from "react-native";
import { Star } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

function getRatingLabel(avg) {
  if (avg === "N/A" || avg === "No rating yet" || avg == null) return "N/A";
  const n = typeof avg === "string" ? parseFloat(avg) : avg;
  if (isNaN(n)) return "N/A";
  if (n < 1.5) return "Poor";
  if (n < 2.5) return "Fair";
  if (n < 3.5) return "Good";
  if (n < 4.5) return "Great";
  return "Excellent";
}

export default function RatingsDisplay({ ratings, themeColors }) {
  const avg = ratings?.rating;
  const numAvg = typeof avg === "number" ? avg : parseFloat(avg);
  const filled = isNaN(numAvg) ? 0 : Math.round(numAvg);

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
        {[1, 2, 3, 4, 5].map((val) => (
          <Star
            key={val}
            size={24}
            color={themeColors.purple}
            weight={filled >= val ? "fill" : "regular"}
          />
        ))}
      </View>
      <Text
        style={{
          color: themeColors.purple,
          fontSize: 16,
          fontWeight: "bold",
          fontFamily: FONTS.PRIMARY,
        }}
      >
        {getRatingLabel(avg)}
        {!isNaN(numAvg) && avg !== "N/A" && avg !== "No rating yet"
          ? ` (${numAvg.toFixed(1)})`
          : ""}
      </Text>
    </View>
  );
}
