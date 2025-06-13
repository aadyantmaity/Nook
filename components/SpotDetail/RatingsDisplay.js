import React from "react";
import { View, Text } from "react-native";
import { SpeakerHigh, UsersThree } from "phosphor-react-native";

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
          marginBottom: 16,
          marginTop: 4,
        }}
      >
        <View
          style={{
            alignItems: "center",
            padding: 16,
            backgroundColor: themeColors.white,
            borderRadius: 8,
            flex: 1,
            marginRight: 8,
            borderColor: themeColors.black,
            borderWidth: 0.5,
          }}
        >
          <SpeakerHigh size={24} color={themeColors.purple} />
          <Text
            style={{
              color: themeColors.purple,
              fontSize: 16,
              fontWeight: "bold",
              marginTop: 8,
            }}
          >
            Noise: {ratings?.noise || "N/A"}
          </Text>
        </View>
        <View
          style={{
            alignItems: "center",
            padding: 16,
            backgroundColor: themeColors.white,
            borderRadius: 8,
            flex: 1,
            borderColor: themeColors.black,
            borderWidth: 0.5,
          }}
        >
          <UsersThree size={24} color={themeColors.purple} />
          <Text
            style={{
              color: themeColors.purple,
              fontSize: 16,
              fontWeight: "bold",
              marginTop: 8,
            }}
          >
            Crowd: {ratings?.crowd || "N/A"}
          </Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 12,
          color: themeColors.darkGray,
          marginBottom: 24,
          textAlign: "right",
          alignSelf: "flex-end",
        }}
      >
        {getLastUpdatedLabel(ratings)}
      </Text>
    </>
  );
}
