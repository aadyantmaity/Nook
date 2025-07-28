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
import { doc, updateDoc } from "firebase/firestore";
import * as Location from "expo-location";

export default function CheckInButton({ spot, spotId, themeColors }) {
  const user = auth.currentUser;
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkedIn, setCheckedIn] = useState(null); // { spotId, checkedInAt }
  const [loadingCheckedIn, setLoadingCheckedIn] = useState(true);

  // --- Determine if check-in is allowed ---
  let canCheckIn = false;
  let canCheckOut = false;
  let checkInDisabledReason = "";

  if (loadingCheckedIn) {
    canCheckIn = false;
    canCheckOut = false;
  } else if (!checkedIn || !checkedIn.spotId) {
    canCheckIn = true;
    canCheckOut = false;
  } else if (checkedIn.spotId === spotId) {
    canCheckIn = false;
    canCheckOut = true;
  } else {
    canCheckIn = false;
    canCheckOut = false;
    checkInDisabledReason = "You are already checked in at another Nook.";
  }

  // --- New: handle check-in with geofence ---
  const handleCheckIn = async () => {
    if (!user || !spotId || !spot) return;
    // --- Geofence logic ---
    if (
      spot.coordinates &&
      typeof spot.coordinates.latitude === "number" &&
      typeof spot.coordinates.longitude === "number"
    ) {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Required",
          "You must allow location access to check in at this Nook."
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
      //     "You must be within 100 feet of this Nook to check in."
      //   );
      //   return;
      // }
    }
    // Direct check-in without tagging
    await confirmCheckIn();
  };

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

  return (
    <View style={{ marginTop: 16, marginBottom: 8, alignItems: "center" }}>
      {canCheckOut ? (
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
                  fontFamily: "CarosSoft",
                }}
              >
                Check Out
              </Text>
            </>
          )}
        </TouchableOpacity>
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
          accessibilityLabel="Check In"
        >
          {isCheckingIn ? (
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
                  fontFamily: "CarosSoft",
                }}
              >
                {isCheckingIn
                  ? "Checking In..."
                  : canCheckIn
                  ? "Check In"
                  : "Check In"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
      {/* Show cooldown message if tagged */}
      {!canCheckIn && checkInDisabledReason && (
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 12,
            marginTop: 4,
            fontFamily: "CarosSoft",
          }}
        >
          {checkInDisabledReason}
        </Text>
      )}
    </View>
  );
}
