import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import {
  SpeakerSimpleNone,
  SpeakerSimpleLow,
  SpeakerSimpleHigh,
  Users,
  User,
  UsersThree,
  Check,
} from "phosphor-react-native";
import * as Location from "expo-location";
import { FONTS } from "../../constants/fonts";
import useLocationDistance from "../../hooks/useLocationDistance";

const NOISE_OPTIONS = [
  { label: "Silent", value: 0, icon: <SpeakerSimpleNone size={23} /> },
  { label: "Buzz", value: 1, icon: <SpeakerSimpleLow size={23} /> },
  { label: "Loud", value: 2, icon: <SpeakerSimpleHigh size={23} /> },
];
const CROWD_OPTIONS = [
  { label: "Light", value: 0, icon: <User size={23} /> },
  { label: "Moderate", value: 1, icon: <Users size={23} /> },
  { label: "Busy", value: 2, icon: <UsersThree size={23} /> },
];

export default function LiveUpdateSliders({
  liveNoise,
  setLiveNoise,
  liveCrowd,
  setLiveCrowd,
  isSubmittingLive,
  onSubmit,
  themeColors,
  spot,
  canSubmitLiveUpdate = true,
  lastLiveUpdate = 0,
}) {
  // Use location distance hook
  const { isWithinDistance, isLoading: isLocationLoading, error: locationError } = useLocationDistance(spot, 100);
  // Handler for live update submission
  const handleSubmit = () => {
    // Location distance is now handled in the disabled state
    onSubmit && onSubmit();
    // Reset choices after submit
    setLiveNoise(-2);
    setLiveCrowd(-2);
  };

  // Disable submit unless all options selected and within distance
  const noOptionsSelected = liveNoise === -2 || liveCrowd === -2;
  const isLocationDisabled = !isWithinDistance || isLocationLoading;
  const isDisabled = !canSubmitLiveUpdate || isLocationDisabled;

  // Helper: format cooldown time left
  function getCooldownLabel() {
    if (!lastLiveUpdate) return "";
    const msLeft = 30 * 60 * 1000 - (Date.now() - lastLiveUpdate);
    if (msLeft > 0) {
      const min = Math.ceil(msLeft / 60000);
      return `You can submit again in ${min} min`;
    }
    return "";
  }

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
          fontFamily: FONTS.PRIMARY,
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
              fontFamily: FONTS.PRIMARY,
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
                disabled={isDisabled}
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
                  opacity: isDisabled ? 0.5 : 1,
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
                    fontFamily: FONTS.PRIMARY,
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
              fontFamily: FONTS.PRIMARY,
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
                disabled={isDisabled}
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
                  opacity: isDisabled ? 0.5 : 1,
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
                    fontFamily: FONTS.PRIMARY,
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
          onPress={handleSubmit}
          style={{
            backgroundColor:
              !isDisabled && !noOptionsSelected
                ? themeColors.purple
                : themeColors.gray,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 18,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            opacity: isSubmittingLive ? 0.7 : 1,
          }}
          disabled={
            isSubmittingLive || isDisabled || noOptionsSelected
          }
        >
          <Check
            size={16}
            color={
              isDisabled || noOptionsSelected
                ? themeColors.darkGray
                : themeColors.white
            }
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              color:
                isDisabled || noOptionsSelected
                  ? themeColors.darkGray
                  : themeColors.white,
              fontWeight: "bold",
              fontSize: 13,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            {isSubmittingLive ? "Submitting..." : "Submit"}
          </Text>
        </TouchableOpacity>
      </View>
      {/* Show cooldown message if needed */}
      {!canSubmitLiveUpdate && (
        <Text
          style={{
            color: themeColors.red,
            fontSize: 13,
            marginTop: 6,
            textAlign: "center",
            fontFamily: FONTS.PRIMARY,
          }}
        >
          {getCooldownLabel()}
        </Text>
      )}
      {/* Show message if no options selected */}
      {noOptionsSelected && !isDisabled && !isSubmittingLive && (
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 13,
            marginTop: 6,
            textAlign: "center",
            fontFamily: FONTS.PRIMARY,
          }}
        >
          Please update all options.
        </Text>
      )}
    </View>
  );
}
