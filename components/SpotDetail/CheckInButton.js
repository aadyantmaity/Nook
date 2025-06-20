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
import { doc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";

export default function CheckInButton({ spot, spotId, themeColors }) {
  const user = auth.currentUser;
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState(null);

  // --- Listen for check-in post deletion and clear cooldown if deleted ---
  useEffect(() => {
    if (!spotId || !user) return;
    const key = `nook_checkin_${spotId}_${user.uid}`;
    let unsub = null;
    (async () => {
      try {
        // Listen for check-in posts for this user and spot
        const { db } = await import("../../firebaseConfig");
        const { collection, query, where, onSnapshot } = await import(
          "firebase/firestore"
        );
        const q = query(
          collection(db, "posts"),
          where("uid", "==", user.uid),
          where("spotId", "==", spotId),
          where("type", "==", "checkin")
        );
        unsub = onSnapshot(q, async (snap) => {
          if (snap.empty) {
            // No check-in post exists, clear cooldown
            await AsyncStorage.removeItem(key);
            setLastCheckIn(0);
          }
        });
      } catch {}
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [spotId, user]);

  useEffect(() => {
    if (!spotId || !user) return;
    const key = `nook_checkin_${spotId}_${user.uid}`;
    (async () => {
      try {
        const last = Number((await AsyncStorage.getItem(key)) || 0);
        setLastCheckIn(last);
      } catch {
        setLastCheckIn(0);
      }
    })();
  }, [spotId, user]);

  const canCheckIn = !lastCheckIn || Date.now() - lastCheckIn > 60 * 60 * 1000;

  const handleCheckIn = async () => {
    if (!user || !spotId || !spot) return;
    setIsCheckingIn(true);
    try {
      const { addDoc, collection, serverTimestamp } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../../firebaseConfig");
      await addDoc(collection(db, "posts"), {
        uid: user.uid,
        message: `📍 checked in at ${spot.buildingName}${
          spot.roomNumber ? " - Floor " + spot.roomNumber : ""
        }!`,
        createdAt: serverTimestamp(),
        spotId,
        type: "checkin",
      });
      const key = `nook_checkin_${spotId}_${user.uid}`;
      try {
        await AsyncStorage.setItem(key, Date.now().toString());
      } catch {}
      setLastCheckIn(Date.now());
      Alert.alert("Checked In!", "Your check-in has been posted to the feed.");
    } catch (e) {
      Alert.alert("Error", "Failed to check in.");
    }
    setIsCheckingIn(false);
  };

  return (
    <View style={{ marginTop: 16, marginBottom: 8, alignItems: "center" }}>
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
            <MapPin size={20} color={themeColors.white} weight="bold" />
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
                : "Checked In"}
            </Text>
          </>
        )}
      </TouchableOpacity>
      {!canCheckIn && lastCheckIn && (
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 12,
            marginTop: 4,
            fontFamily: "CarosSoft",
          }}
        >
          You can check in again in{" "}
          {Math.ceil(60 - (Date.now() - lastCheckIn) / 60000)} min
        </Text>
      )}
    </View>
  );
}
