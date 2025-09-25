import React, { useEffect, useState } from "react";
import {
  TouchableOpacity,
  Text,
  Alert,
  View,
  ActivityIndicator,
} from "react-native";
import { MapPin } from "phosphor-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../../firebaseConfig";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import * as Location from "expo-location";
import { FONTS } from "../../constants/fonts";
import { addCheckinActivity } from "../../utils/checkinActivity";
import useLocationDistance from "../../hooks/useLocationDistance";

export default function CheckInButton({ spot, spotId, themeColors }) {
  const user = auth.currentUser;
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkedIn, setCheckedIn] = useState(null); // { spotId, checkedInAt }
  const [loadingCheckedIn, setLoadingCheckedIn] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null); // Add countdown state

  // Use location distance hook
  const { isWithinDistance, isLoading: isLocationLoading, error: locationError, distance } = useLocationDistance(spot, 100);

  // --- Determine if check-in is allowed ---
  let canCheckIn = false;
  let canCheckOut = false;
  let checkInDisabledReason = "";

  if (loadingCheckedIn || isLocationLoading) {
    canCheckIn = false;
    canCheckOut = false;
  } else if (!checkedIn || !checkedIn.spotId) {
    // Check if user is within distance for check-in
    if (!isWithinDistance) {
      canCheckIn = false;
      canCheckOut = false;
      checkInDisabledReason = locationError || "You must be within 100 meters to check in.";
    } else {
      canCheckIn = true;
      canCheckOut = false;
    }
  } else if (checkedIn.spotId === spotId) {
    canCheckIn = false;
    canCheckOut = true;
  } else {
    canCheckIn = false;
    canCheckOut = false;
    checkInDisabledReason = "You are already checked in at another Nook.";
  }

  // --- Handle check-in ---
  const handleCheckIn = async () => {
    if (!user || !spotId || !spot) return;
    // Location distance is now handled in the disabled state
    await confirmCheckIn();
  };


  // --- New: confirm check-in after selecting tags ---
  const confirmCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const { db } = await import("../../firebaseConfig");
      // Update checkedIn field in user doc
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

      // Add check-in activity to the nook owner's recentActivity
      try {
        if (spot && spot.addedBy) {
          const spotName = spot.buildingName || spot.name || "Nook";
          
          // Get the current user's display name from Firestore
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
        // Don't show error to user, just log it
      }

      Alert.alert("Checked In!", "You have successfully checked in.");
    } catch (e) {
      console.error("Check-in error:", e);
      Alert.alert("Error", "Failed to check in.");
    }
    setIsCheckingIn(false);
  };

  // --- Update: Clear checkedIn state after check-out ---
  // --- Update: Confirm before check-out ---
  const handleCheckOut = async () => {
    if (!user || !spotId) return;
    Alert.alert(
      "Confirm Check Out",
      "Are you sure you want to check out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Check Out",
          style: "destructive",
          onPress: async () => {
            setIsCheckingOut(true);
            try {
              const { db } = await import("../../firebaseConfig");
              const { doc, updateDoc } = await import("firebase/firestore");
              // Clear checkedIn field in user doc
              await updateDoc(doc(db, "users", user.uid), {
                checkedIn: {},
              });
              setCheckedIn(null);
              // ...existing code for marking post as checked out if needed...
            } catch (e) {
              Alert.alert("Error", "Failed to check out.");
            }
            setIsCheckingOut(false);
          },
        },
      ],
      { cancelable: true }
    );
  };

  // --- Add: Fetch checkedIn state from Firestore on mount/user change ---
  useEffect(() => {
    if (!user) {
      setCheckedIn(null);
      setLoadingCheckedIn(false);
      return;
    }
    let unsub = null;
    (async () => {
      try {
        setLoadingCheckedIn(true);
        const { db } = await import("../../firebaseConfig");
        const { doc, onSnapshot } = await import("firebase/firestore");
        unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setCheckedIn(docSnap.data().checkedIn || null);
          } else {
            setCheckedIn(null);
          }
          setLoadingCheckedIn(false);
        });
      } catch {
        setCheckedIn(null);
        setLoadingCheckedIn(false);
      }
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  // --- Timer to auto-clear check-in after 60 minutes ---
  useEffect(() => {
    if (!checkedIn || !checkedIn.spotId || !checkedIn.checkedInAt) return;
    const now = Date.now();
    const elapsed = now - checkedIn.checkedInAt;
    if (elapsed >= 60 * 60 * 1000) {
      // Already expired, clear checkedIn state
      setCheckedIn(null);
    } else {
      // Set a timer to clear after remaining time
      const timeout = setTimeout(() => {
        setCheckedIn(null);
      }, 60 * 60 * 1000 - elapsed);
      return () => clearTimeout(timeout);
    }
  }, [checkedIn]);

  // --- Countdown timer effect ---
  useEffect(() => {
    if (!checkedIn || !checkedIn.checkedInAt) {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const elapsed = now - checkedIn.checkedInAt;
      const remaining = 60 * 60 * 1000 - elapsed; // 60 minutes in milliseconds

      if (remaining <= 0) {
        setTimeRemaining(null);
        return;
      }

      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeRemaining({ minutes, seconds });
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [checkedIn]);

  // Helper function to format countdown text
  const getCountdownText = () => {
    if (!timeRemaining) return "";

    if (timeRemaining.minutes > 0) {
      return `Your check-in status will be reset in ${timeRemaining.minutes}m`;
    } else {
      return `Your check-in status will be reset in less than 1m`;
    }
  };

  return (
    <View style={{ marginTop: 16, marginBottom: 8, alignItems: "center" }}>
      {canCheckOut ? (
        <>
          <TouchableOpacity
            onPress={handleCheckOut}
            disabled={isCheckingOut}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: themeColors.red,
              borderRadius: 24,
              paddingVertical: 10,
              paddingHorizontal: 24,
              opacity: isCheckingOut ? 0.7 : 1,
            }}
            accessibilityLabel="Check Out"
          >
            {isCheckingOut ? (
              <ActivityIndicator color={themeColors.white} />
            ) : (
              <>
                <MapPin size={20} color={themeColors.white} />
                <Text
                  style={{
                    color: themeColors.white,
                    fontWeight: "bold",
                    fontSize: 15,
                    marginLeft: 8,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Check Out
                </Text>
              </>
            )}
          </TouchableOpacity>
          {/* Countdown timer below check out button */}
          {timeRemaining && (
            <Text
              style={{
                color: themeColors.darkGray,
                fontSize: 12,
                marginTop: 8,
                fontFamily: FONTS.PRIMARY,
                textAlign: "center",
              }}
            >
              {getCountdownText()}
            </Text>
          )}
        </>
      ) : (
        <TouchableOpacity
          onPress={handleCheckIn}
          disabled={isCheckingIn || !canCheckIn}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: canCheckIn ? themeColors.green : themeColors.gray,
            borderRadius: 24,
            paddingVertical: 10,
            paddingHorizontal: 24,
            opacity: isCheckingIn || !canCheckIn ? 0.7 : 1,
          }}
          accessibilityLabel="Check-in"
        >
          {isCheckingIn ? (
            <ActivityIndicator color={canCheckIn ? themeColors.white : themeColors.darkGray} />
          ) : (
            <>
              <MapPin size={20} color={canCheckIn ? themeColors.white : themeColors.darkGray} />
              <Text
                style={{
                  color: canCheckIn ? themeColors.white : themeColors.darkGray,
                  fontWeight: "bold",
                  fontSize: 15,
                  marginLeft: 8,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {isCheckingIn
                  ? "Checking In..."
                  : canCheckIn
                  ? "Check-in"
                  : "Check-in"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
      {/* Show cooldown message if tagged */}
      {!canCheckIn && checkInDisabledReason && !checkInDisabledReason.includes("100 meters") && (
        <Text
          style={{
            color: themeColors.red,
            fontSize: 12,
            marginTop: 4,
            fontFamily: FONTS.PRIMARY,
          }}
        >
          {checkInDisabledReason}
        </Text>
      )}
    </View>
  );
}
