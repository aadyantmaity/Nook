import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  SpeakerSimpleNone,
  SpeakerSimpleLow,
  SpeakerSimpleHigh,
  Users,
  User,
  UsersThree,
  Check,
} from "phosphor-react-native";

const NOISE_OPTIONS = [
  { label: "Silent", value: 0, icon: <SpeakerSimpleNone size={23} /> },
  { label: "Buzz", value: 1, icon: <SpeakerSimpleLow size={23} /> },
  { label: "Loud", value: 2, icon: <SpeakerSimpleHigh size={23} /> },
];
const CROWD_OPTIONS = [
  { label: "Empty", value: 0, icon: <User size={23} /> },
  { label: "Busy", value: 1, icon: <Users size={23} /> },
  { label: "Full", value: 2, icon: <UsersThree size={23} /> },
];

export default function LiveUpdateSliders({
  liveNoise,
  setLiveNoise,
  liveCrowd,
  setLiveCrowd,
  isSubmittingLive,
  onSubmit,
  themeColors,
}) {
  return (
    <View
      style={{
        marginBottom: 14,
        padding: 15,
        backgroundColor: themeColors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: themeColors.gray,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <Text
        style={{
          fontSize: 17,
          fontWeight: "bold",
          color: themeColors.black,
          marginBottom: 11,
          textAlign: "center",
        }}
      >
        Live Update
      </Text>
      <View style={{ flexDirection: "row", gap: 18 }}>
        {/* Noise */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              color: themeColors.black,
              marginBottom: 8,
              fontWeight: "700",
              fontSize: 15,
              letterSpacing: 0.2,
            }}
          >
            Noise
          </Text>
          {NOISE_OPTIONS.map((opt) => (
            <View
              key={opt.value}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 9,
              }}
            >
              <View style={{ marginRight: 10 }}>
                {React.cloneElement(opt.icon, {
                  color:
                    liveNoise === opt.value
                      ? themeColors.purple
                      : themeColors.darkGray,
                  size: 23,
                })}
              </View>
              <TouchableOpacity
                onPress={() => setLiveNoise(opt.value)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor:
                    liveNoise === opt.value
                      ? themeColors.purple
                      : themeColors.gray,
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  minWidth: 90,
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color:
                      liveNoise === opt.value
                        ? themeColors.white
                        : themeColors.black,
                    fontSize: 13,
                    fontWeight: liveNoise === opt.value ? "bold" : "normal",
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        {/* Crowd */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              color: themeColors.black,
              marginBottom: 8,
              fontWeight: "700",
              fontSize: 15,
              letterSpacing: 0.2,
            }}
          >
            Crowd
          </Text>
          {CROWD_OPTIONS.map((opt) => (
            <View
              key={opt.value}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 9,
              }}
            >
              <View style={{ marginRight: 10 }}>
                {React.cloneElement(opt.icon, {
                  color:
                    liveCrowd === opt.value
                      ? themeColors.purple
                      : themeColors.darkGray,
                  size: 23,
                })}
              </View>
              <TouchableOpacity
                onPress={() => setLiveCrowd(opt.value)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor:
                    liveCrowd === opt.value
                      ? themeColors.purple
                      : themeColors.gray,
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  minWidth: 90,
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color:
                      liveCrowd === opt.value
                        ? themeColors.white
                        : themeColors.black,
                    fontSize: 13,
                    fontWeight: liveCrowd === opt.value ? "bold" : "normal",
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
      {/* Submit button */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          marginTop: 10,
          gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={onSubmit}
          style={{
            backgroundColor: themeColors.purple,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 18,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            opacity: isSubmittingLive ? 0.7 : 1,
          }}
          disabled={isSubmittingLive}
        >
          <Check
            size={16}
            color={themeColors.white}
            weight="bold"
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              color: themeColors.white,
              fontWeight: "bold",
              fontSize: 13,
            }}
          >
            {isSubmittingLive ? "Submitting..." : "Submit"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
