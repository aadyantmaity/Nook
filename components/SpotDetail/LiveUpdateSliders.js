import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Star, Check } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../../firebaseConfig";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { addCheckinActivity } from "../../utils/checkinActivity";
import useGeofencing from "../../hooks/useGeofencing";

const RATING_OPTIONS = [1, 2, 3, 4, 5];

export default function LiveUpdateSliders({
  liveRating,
  setLiveRating,
  isSubmittingLive,
  onSubmit,
  themeColors,
  spot,
  canSubmitLiveUpdate = true,
  lastLiveUpdate = 0,
  spotId,
}) {
  const user = auth.currentUser;
  
  // Geofencing hook
  const {
    isWithinGeofence,
    locationPermission,
    isLoading: isLocationLoading,
    error: locationError,
    requestLocationPermission,
    checkGeofence,
  } = useGeofencing(spot?.coordinates, 100); // 100 meters radius
  
  // Silent check-in handler (no UI feedback)
  const handleSilentCheckIn = async () => {
    if (!user || !spotId || !spot) return;
    try {
      const { db } = await import("../../firebaseConfig");
      await updateDoc(doc(db, "users", user.uid), {
        checkedIn: {
          spotId,
          checkedInAt: Date.now(),
          taggedSpotId: null,
          taggedAt: null,
        },
      });
      const key = `nook_checkin_${spotId}_${user.uid}`;
      try {
        await AsyncStorage.setItem(key, Date.now().toString());
      } catch {}

      // Add check-in activity
      try {
        if (spot && spot.addedBy) {
          const spotName = spot.buildingName || spot.name || "Nook";
          
          let checkedInByName = null;
          try {
            const currentUserDoc = await getDoc(doc(db, "users", user.uid));
            if (currentUserDoc.exists()) {
              const userData = currentUserDoc.data();
              checkedInByName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
            }
          } catch (nameError) {
            console.error("Error fetching user name:", nameError);
          }
          
          await addCheckinActivity(spotId, spotName, user.uid, checkedInByName, spot.addedBy);
        }
      } catch (activityError) {
        console.error("Error adding check-in activity:", activityError);
      }
    } catch (e) {
      console.error("Check-in error:", e);
    }
  };

  // Handler for live update submission
  const handleSubmit = () => {
    onSubmit && onSubmit();
    setLiveRating(0);
  };

  // Disable submit unless rating selected
  const noOptionsSelected = !liveRating;
  const isDisabled = !canSubmitLiveUpdate;
  
  // Combined submit handler that does both live update and silent check-in
  const handleCombinedSubmit = async () => {
    // Check geofencing for live updates
    if (!noOptionsSelected) {
      if (!isWithinGeofence) {
        Alert.alert(
          "Location Required",
          "You must be within 100 meters of to submit live updates.",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Check Location", 
              onPress: () => checkGeofence() 
            }
          ]
        );
        return;
      }
      handleSubmit();
    }
    
    // Always do silent check-in in background
    await handleSilentCheckIn();
  };
  
  // Simple button state - always "Submit"
  const buttonState = {
    text: isSubmittingLive ? "Submitting..." : "Submit",
    backgroundColor: !isDisabled && !noOptionsSelected && isWithinGeofence ? themeColors.purple : themeColors.gray,
    icon: <Check size={16} color={!isDisabled && !noOptionsSelected && isWithinGeofence ? themeColors.white : themeColors.darkGray} />,
    disabled: isSubmittingLive || isDisabled || noOptionsSelected || !isWithinGeofence,
    showActivity: isSubmittingLive,
  };

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
        shadowColor: themeColors.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 11 }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "bold",
            color: themeColors.black,
            fontFamily: FONTS.PRIMARY,
            marginRight: 8,
          }}
        >
          Live Update
        </Text>
      </View>
      {/* Show location status message */}
      {!isWithinGeofence && locationPermission === 'granted' && (
        <Text
          style={{
            color: themeColors.red,
            fontSize: 13,
            marginTop: -6,
            marginBottom: 11,
            textAlign: "center",
            fontFamily: FONTS.PRIMARY,
          }}
        >
          You must be within 100 meters to submit live updates.
        </Text>
      )}
      {/* Show permission request message */}
      {locationPermission !== 'granted' && (
        <View style={{ alignItems: "center", marginTop: -6, marginBottom: 11 }}>
          <Text
            style={{
              color: themeColors.orange,
              fontSize: 13,
              textAlign: "center",
              fontFamily: FONTS.PRIMARY,
              marginBottom: 8,
            }}
          >
            Location permission required for live updates
          </Text>
          <TouchableOpacity
            onPress={requestLocationPermission}
            style={{
              backgroundColor: themeColors.orange,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              shadowColor: themeColors.black,

              shadowOffset: {
                width: 0,
                height: 2
              },

              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4
            }}
          >
            <Text
              style={{
                color: themeColors.white,
                fontSize: 12,
                fontFamily: FONTS.PRIMARY,
                fontWeight: "bold",
              }}
            >
              Enable Location
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Show cooldown message if needed */}
      {!canSubmitLiveUpdate && (
        <Text
          style={{
            color: themeColors.red,
            fontSize: 13,
            marginTop: -6,
            marginBottom: 11,
            textAlign: "center",
            fontFamily: FONTS.PRIMARY,
          }}
        >
          {getCooldownLabel()}
        </Text>
      )}
      {/* Star Rating */}
      <View style={{ alignItems: "center", marginBottom: 4 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {RATING_OPTIONS.map((val) => (
            <TouchableOpacity
              key={val}
              onPress={() => setLiveRating(val)}
              disabled={isDisabled || !isWithinGeofence}
              style={{ opacity: (isDisabled || !isWithinGeofence) ? 0.5 : 1 }}
            >
              <Star
                size={36}
                color={themeColors.purple}
                weight={liveRating >= val ? "fill" : "regular"}
              />
            </TouchableOpacity>
          ))}
        </View>
        {liveRating > 0 && (
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 13,
              marginTop: 6,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            {["", "Poor", "Fair", "Good", "Great", "Excellent"][liveRating]}
          </Text>
        )}
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
          onPress={handleCombinedSubmit}
          style={{
            backgroundColor: buttonState.backgroundColor,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 18,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            opacity: buttonState.disabled ? 0.7 : 1,
            shadowColor: themeColors.black,

            shadowOffset: {
              width: 0,
              height: 2
            },

            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4
          }}
          disabled={buttonState.disabled}
        >
          {buttonState.icon && (
            <View style={{ marginRight: 6 }}>
              {buttonState.icon}
            </View>
          )}
          <Text
            style={{
              color: buttonState.backgroundColor === themeColors.gray
                ? themeColors.darkGray
                : themeColors.white,
              fontWeight: "bold",
              fontSize: 13,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            {buttonState.text}
          </Text>
        </TouchableOpacity>
      </View>
      {/* Show message if no options selected */}
      {noOptionsSelected && !isDisabled && !isSubmittingLive && isWithinGeofence && (
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 13,
            marginTop: 6,
            textAlign: "center",
            fontFamily: FONTS.PRIMARY,
          }}
        >
          Please select a rating.
        </Text>
      )}
    </View>
  );
}
