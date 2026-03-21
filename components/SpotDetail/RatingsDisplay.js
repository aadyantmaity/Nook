import React from "react";
import { View, Text } from "react-native";
import { SpeakerNone, SpeakerLow, SpeakerHigh, UserMinus, Users, UsersThree } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

function getNoiseInfo(avg) {
  if (avg === "N/A" || avg === "No rating yet" || avg == null) return { label: "N/A", Icon: SpeakerNone };
  const n = typeof avg === "string" ? parseFloat(avg) : avg;
  if (isNaN(n)) return { label: "N/A", Icon: SpeakerNone };
  if (n < 0.5) return { label: "Silent", Icon: SpeakerNone };
  if (n < 1.5) return { label: "Buzz", Icon: SpeakerLow };
  return { label: "Loud", Icon: SpeakerHigh };
}

function getCrowdInfo(avg) {
  if (avg === "N/A" || avg === "No rating yet" || avg == null) return { label: "N/A", Icon: UserMinus };
  const n = typeof avg === "string" ? parseFloat(avg) : avg;
  if (isNaN(n)) return { label: "N/A", Icon: UserMinus };
  if (n < 0.5) return { label: "Light", Icon: UserMinus };
  if (n < 1.5) return { label: "Moderate", Icon: Users };
  return { label: "Busy", Icon: UsersThree };
}

function RatingCard({ sectionLabel, icon: Icon, valueLabel, themeColors }) {
  const isNA = valueLabel === "N/A";
  const color = isNA ? themeColors.darkGray : themeColors.purple;
  return (
    <View style={{
      flex: 1,
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 8,
      backgroundColor: themeColors.white,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: themeColors.gray,
    }}>
      <Text style={{ fontSize: 12, color: themeColors.darkGray, fontFamily: FONTS.PRIMARY, marginBottom: 8 }}>
        {sectionLabel}
      </Text>
      <Icon size={28} color={color} weight={isNA ? "regular" : "fill"} />
      <Text style={{ fontSize: 14, fontWeight: "bold", color, fontFamily: FONTS.PRIMARY, marginTop: 6 }}>
        {valueLabel}
      </Text>
    </View>
  );
}

export default function RatingsDisplay({ ratings, themeColors }) {
  const noiseInfo = getNoiseInfo(ratings?.noise);
  const crowdInfo = getCrowdInfo(ratings?.crowd);

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <RatingCard sectionLabel="Noise" icon={noiseInfo.Icon} valueLabel={noiseInfo.label} themeColors={themeColors} />
      <RatingCard sectionLabel="Crowd" icon={crowdInfo.Icon} valueLabel={crowdInfo.label} themeColors={themeColors} />
    </View>
  );
}
