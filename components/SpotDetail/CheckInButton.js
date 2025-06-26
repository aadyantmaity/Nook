import React, { useEffect, useState } from "react";
import {
  TouchableOpacity,
  Text,
  Alert,
  View,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { MapPin } from "phosphor-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../../firebaseConfig";
import {
  doc,
  updateDoc,
  arrayUnion,
  Timestamp,
  getDoc,
  getDocs,
  collection,
} from "firebase/firestore";

export default function CheckInButton({ spot, spotId, themeColors }) {
  const user = auth.currentUser;
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState(null);

  // --- New: Track if user was tagged in last 60 min at this spot ---
  const [taggedCooldown, setTaggedCooldown] = useState(false);
  // --- Track timestamp of most recent tag ---
  const [taggedAt, setTaggedAt] = useState(null);

  // --- Tag friends modal state ---
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [taggedUids, setTaggedUids] = useState([]);
  const [taggingLoading, setTaggingLoading] = useState(false);

  // Fetch following list for tagging
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setTaggingLoading(true);
        const userDoc = await getDoc(
          doc(require("../../firebaseConfig").db, "users", user.uid)
        );
        const following = userDoc.exists()
          ? userDoc.data().following || []
          : [];
        const users = [];
        for (let uid of following) {
          const uDoc = await getDoc(
            doc(require("../../firebaseConfig").db, "users", uid)
          );
          if (uDoc.exists()) {
            users.push({
              uid,
              name:
                `${uDoc.data().firstName || ""} ${
                  uDoc.data().lastName || ""
                }`.trim() || uDoc.data().email,
              email: uDoc.data().email,
            });
          }
        }
        setFollowingList(users);
      } catch {}
      setTaggingLoading(false);
    })();
  }, [user]);

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

  // New: check if user was tagged in a check-in at this spot in last 60 min
  useEffect(() => {
    if (!spotId || !user) return;
    // Check if user was tagged in a check-in at this spot in last 60 min
    let unsub = null;
    (async () => {
      try {
        const { db } = await import("../../firebaseConfig");
        const { collection, query, where, onSnapshot } = await import(
          "firebase/firestore"
        );
        const since = Date.now() - 60 * 60 * 1000;
        const q = query(
          collection(db, "posts"),
          where("spotId", "==", spotId),
          where("type", "==", "checkin")
        );
        unsub = onSnapshot(q, (snap) => {
          let tagged = false;
          let latestTaggedAt = null;
          snap.forEach((doc) => {
            const data = doc.data();
            // Check if user is tagged and post is recent
            let createdAtMs =
              data.createdAt &&
              typeof data.createdAt === "object" &&
              data.createdAt.seconds
                ? data.createdAt.seconds * 1000
                : typeof data.createdAt === "number"
                ? data.createdAt
                : 0;
            if (
              Array.isArray(data.taggedUids) &&
              data.taggedUids.includes(user.uid) &&
              data.createdAt &&
              createdAtMs > since
            ) {
              tagged = true;
              if (!latestTaggedAt || createdAtMs > latestTaggedAt) {
                latestTaggedAt = createdAtMs;
              }
            }
          });
          setTaggedCooldown(tagged);
          setTaggedAt(tagged ? latestTaggedAt : null);
        });
      } catch {}
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [spotId, user]);

  const canCheckIn =
    (!lastCheckIn || Date.now() - lastCheckIn > 60 * 60 * 1000) &&
    !taggedCooldown;

  // --- New: handle check-in with tagging ---
  const handleCheckIn = async () => {
    if (!user || !spotId || !spot) return;
    setTagModalVisible(true);
  };

  // --- New: confirm check-in after selecting tags ---
  const confirmCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const { addDoc, collection, serverTimestamp } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../../firebaseConfig");
      // Compose tagged names for message
      let taggedNames = [];
      if (taggedUids.length > 0) {
        for (let uid of taggedUids) {
          const uDoc = await getDoc(doc(db, "users", uid));
          if (uDoc.exists()) {
            taggedNames.push(
              `${uDoc.data().firstName || ""} ${
                uDoc.data().lastName || ""
              }`.trim() || uDoc.data().email
            );
          }
        }
      }
      // Improved: natural language for "with" list
      let tagString = "";
      if (taggedNames.length === 1) {
        tagString = ` with ${taggedNames[0]}`;
      } else if (taggedNames.length === 2) {
        tagString = ` with ${taggedNames[0]} and ${taggedNames[1]}`;
      } else if (taggedNames.length > 2) {
        tagString =
          " with " +
          taggedNames.slice(0, -1).join(", ") +
          ", and " +
          taggedNames[taggedNames.length - 1];
      }
      await addDoc(collection(db, "posts"), {
        uid: user.uid,
        message: `Checked in at ${spot.buildingName}${tagString + "!"}`,
        createdAt: serverTimestamp(),
        spotId,
        type: "checkin",
        taggedUids: taggedUids, // store tagged UIDs for feed display
      });
      const key = `nook_checkin_${spotId}_${user.uid}`;
      try {
        await AsyncStorage.setItem(key, Date.now().toString());
      } catch {}
      setLastCheckIn(Date.now());
      setTagModalVisible(false);
      setTaggedUids([]);
      Alert.alert("Checked In!", "Your check-in has been posted to the feed.");
    } catch (e) {
      Alert.alert("Error", "Failed to check in.");
    }
    setIsCheckingIn(false);
  };

  return (
    <View style={{ marginTop: 16, marginBottom: 8, alignItems: "center" }}>
      {/* Tag Friends Modal */}
      <Modal
        visible={tagModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTagModalVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPressOut={() => setTagModalVisible(false)}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              padding: 24,
              width: "85%",
              maxHeight: "70%",
              alignItems: "center",
            }}
            onStartShouldSetResponder={() => true}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 10,
                textAlign: "center",
                fontFamily: "CarosSoft",
              }}
            >
              Tag friends in your check-in
            </Text>
            {taggingLoading ? (
              <ActivityIndicator color={themeColors.purple} />
            ) : followingList.length === 0 ? (
              <Text
                style={{
                  color: themeColors.darkGray,
                  fontFamily: "CarosSoft",
                }}
              >
                You are not following anyone yet.
              </Text>
            ) : (
              <ScrollView style={{ width: "100%" }}>
                {followingList.map((user) => {
                  const isSelected = taggedUids.includes(user.uid);
                  const disableSelect = !isSelected && taggedUids.length >= 3;
                  return (
                    <TouchableOpacity
                      key={user.uid}
                      onPress={() => {
                        if (disableSelect) return;
                        setTaggedUids((prev) =>
                          prev.includes(user.uid)
                            ? prev.filter((id) => id !== user.uid)
                            : [...prev, user.uid]
                        );
                      }}
                      disabled={disableSelect}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: themeColors.gray,
                        opacity: disableSelect ? 0.5 : 1,
                      }}
                    >
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 1,
                          borderColor: themeColors.purple,
                          backgroundColor: isSelected
                            ? themeColors.purple
                            : themeColors.white,
                          marginRight: 12,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isSelected && (
                          <Text
                            style={{
                              color: themeColors.white,
                              fontWeight: "bold",
                            }}
                          >
                            ✓
                          </Text>
                        )}
                      </View>
                      <Text
                        style={{
                          color: themeColors.black,
                          fontFamily: "CarosSoft",
                        }}
                      >
                        {user.name} ({user.email})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            {/* Show a message if max selected */}
            {taggedUids.length === 3 && (
              <Text
                style={{
                  color: themeColors.red || "#d00",
                  fontSize: 12,
                  marginTop: 6,
                  fontFamily: "CarosSoft",
                  textAlign: "center",
                }}
              >
                You can tag up to 3 friends only.
              </Text>
            )}
            <View
              style={{ flexDirection: "row", marginTop: 16, width: "100%" }}
            >
              <TouchableOpacity
                onPress={() => {
                  setTagModalVisible(false);
                  setTaggedUids([]);
                }}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.gray,
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: "center",
                  marginRight: 8,
                }}
              >
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmCheckIn}
                disabled={isCheckingIn}
                style={{
                  flex: 1,
                  backgroundColor: themeColors.purple,
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: "center",
                  marginLeft: 8,
                  opacity: isCheckingIn ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    color: themeColors.white,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  {isCheckingIn ? "Checking In..." : "Check In"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
      {/* Show cooldown message if tagged */}
      {!canCheckIn && taggedCooldown && (
        <>
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 12,
              marginTop: 4,
              fontFamily: "CarosSoft",
            }}
          >
            You were tagged here recently.
          </Text>
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 12,
              fontFamily: "CarosSoft",
            }}
          >
            You can check in again in{" "}
            {taggedAt
              ? Math.max(1, Math.ceil(60 - (Date.now() - taggedAt) / 60000))
              : 60}{" "}
            min.
          </Text>
        </>
      )}
      {!canCheckIn && !taggedCooldown && lastCheckIn && (
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
