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

const NOISE_OPTIONS = [
  { label: "Silent", value: 0, icon: <SpeakerSimpleNone size={23} /> },
  { label: "Buzz", value: 1, icon: <SpeakerSimpleLow size={23} /> },
  { label: "Loud", value: 2, icon: <SpeakerSimpleHigh size={23} /> },
];
const CROWD_OPTIONS = [
  { label: "Empty", value: 0, icon: <User size={23} /> },
  { label: "Light", value: 1, icon: <Users size={23} /> },
  { label: "Busy", value: 2, icon: <UsersThree size={23} /> },
];
const TABLE_OPTIONS = [
  { label: "0", value: 0 },
  { label: "1-3", value: 1 },
  { label: "4-6", value: 2 },
  { label: "7+", value: 3 },
];

export default function LiveUpdateSliders({
  liveNoise,
  setLiveNoise,
  liveCrowd,
  setLiveCrowd,
  isSubmittingLive,
  onSubmit,
  themeColors,
  showTableAvailability,
  tableAvailability,
  setTableAvailability,
  spot,
  canSubmitLiveUpdate = true,
  lastLiveUpdate = 0,
}) {
  // Helper: Haversine distance in meters
  function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Handler with geofence logic
  const handleGeofencedSubmit = async () => {
    // If spot has coordinates, require user to be within 100ft
    if (
      spot &&
      spot.coordinates &&
      typeof spot.coordinates.latitude === "number" &&
      typeof spot.coordinates.longitude === "number"
    ) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Required",
          "You must allow location access to submit a live update for this Nook."
        );
        return;
      }
      let loc;
      try {
        loc = await Location.getCurrentPositionAsync({});
      } catch (e) {
        Alert.alert("Location Error", "Could not get your current location.");
        return;
      }
      const userLat = loc.coords.latitude;
      const userLon = loc.coords.longitude;
      const spotLat = spot.coordinates.latitude;
      const spotLon = spot.coordinates.longitude;
      const distance = getDistanceMeters(userLat, userLon, spotLat, spotLon);
      // if (distance > 30.48) {
      //   Alert.alert(
      //     "Too Far",
      //     "You must be within 100 feet of this Nook to submit a live update."
      //   );
      //   return;
      // }
    }
    // Call original submit handler
    onSubmit && onSubmit();
    // Reset choices after submit
    setLiveNoise(-2);
    setLiveCrowd(-2);
    if (showTableAvailability) setTableAvailability(null);
  };

  // Disable submit unless all options selected
  const noOptionsSelected =
    liveNoise === -2 ||
    liveCrowd === -2 ||
    (showTableAvailability && tableAvailability === null);

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
          fontFamily: "CarosSoft",
        }}
      >
        Live Update
      </Text>
      {/* Table Availability for Odegaard */}
      {showTableAvailability && (
        <View style={{ marginBottom: 14 }}>
          <Text
            style={{
              color: themeColors.black,
              fontWeight: "700",
              fontSize: 15,
              marginBottom: 8,
              textAlign: "center",
              letterSpacing: 0.2,
              fontFamily: "CarosSoft",
            }}
          >
            Tables Open
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {TABLE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setTableAvailability(opt.value)}
                style={{
                  backgroundColor:
                    tableAvailability === opt.value
                      ? themeColors.purple
                      : themeColors.gray,
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  marginHorizontal: 2,
                  minWidth: 50,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color:
                      tableAvailability === opt.value
                        ? themeColors.white
                        : themeColors.black,
                    fontWeight:
                      tableAvailability === opt.value ? "bold" : "normal",
                    fontFamily: "CarosSoft",
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
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
              fontFamily: "CarosSoft",
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
                    fontFamily: "CarosSoft",
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
              fontFamily: "CarosSoft",
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
                    fontFamily: "CarosSoft",
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
          onPress={handleGeofencedSubmit}
          style={{
            backgroundColor:
              canSubmitLiveUpdate && !noOptionsSelected
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
            isSubmittingLive || !canSubmitLiveUpdate || noOptionsSelected
          }
        >
          <Check
            size={16}
            color={
              !canSubmitLiveUpdate || noOptionsSelected
                ? themeColors.darkGray
                : themeColors.white
            }
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              color:
                !canSubmitLiveUpdate || noOptionsSelected
                  ? themeColors.darkGray
                  : themeColors.white,
              fontWeight: "bold",
              fontSize: 13,
              fontFamily: "CarosSoft",
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
            fontFamily: "CarosSoft",
          }}
        >
          {getCooldownLabel()}
        </Text>
      )}
      {/* Show message if no options selected */}
      {noOptionsSelected && canSubmitLiveUpdate && !isSubmittingLive && (
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 13,
            marginTop: 6,
            textAlign: "center",
            fontFamily: "CarosSoft",
          }}
        >
          Please update all options.
        </Text>
      )}
    </View>
  );
}
