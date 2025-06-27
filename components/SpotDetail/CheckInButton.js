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

  // --- Track users who checked in or were tagged in last hour ---
  const [recentlyCheckedInUids, setRecentlyCheckedInUids] = useState([]);

  // --- Tag friends modal state ---
  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [taggedUids, setTaggedUids] = useState([]);
  const [taggingLoading, setTaggingLoading] = useState(false);

  // --- New: Track global check-in/tag cooldown ---
  const [globalCooldown, setGlobalCooldown] = useState({}); // { spotId, type: "checkin"|"tag", expiresAt }

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
          where("spotId", "==", spotId),
          where("type", "==", "checkin")
        );
        unsub = onSnapshot(q, async (snap) => {
          // --- Track all users checked in/tagged in last hour ---
          const since = Date.now() - 60 * 60 * 1000;
          let checkedInUids = new Set();
          snap.forEach((doc) => {
            const data = doc.data();
            let createdAtMs =
              data.createdAt &&
              typeof data.createdAt === "object" &&
              data.createdAt.seconds
                ? data.createdAt.seconds * 1000
                : typeof data.createdAt === "number"
                ? data.createdAt
                : 0;
            if (createdAtMs > since) {
              if (data.uid) checkedInUids.add(data.uid);
              if (Array.isArray(data.taggedUids)) {
                data.taggedUids.forEach((uid) => checkedInUids.add(uid));
              }
            }
          });
          setRecentlyCheckedInUids(Array.from(checkedInUids));
          // --- Existing logic for self cooldown ---
          const userPosts = snap.docs.filter((d) => d.data().uid === user.uid);
          if (userPosts.length === 0) {
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

  // --- New: Fetch global check-in/tag cooldown for current user ---
  useEffect(() => {
    if (!user) return;
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
          where("type", "==", "checkin"),
          where("createdAt", ">", new Date(since))
        );
        // NOTE: This query requires a composite Firestore index:
        // https://console.firebase.google.com/v1/r/project/nook-9c7bc/firestore/indexes?create_composite=Ckhwcm9qZWN0cy9ub29rLTljN2JjL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9wb3N0cy9pbmRleGVzL18QARoICgR0eXBlEAEaDQoJY3JlYXRlZEF0EAEaDAoIX19uYW1lX18QAQ
        unsub = onSnapshot(q, (snap) => {
          let cooldown = null;
          snap.forEach((doc) => {
            const data = doc.data();
            let createdAtMs =
              data.createdAt &&
              typeof data.createdAt === "object" &&
              data.createdAt.seconds
                ? data.createdAt.seconds * 1000
                : typeof data.createdAt === "number"
                ? data.createdAt
                : 0;
            // If user checked in
            if (data.uid === user.uid && createdAtMs > since) {
              cooldown = {
                spotId: data.spotId,
                type: "checkin",
                expiresAt: createdAtMs + 60 * 60 * 1000,
              };
            }
            // If user was tagged
            if (
              Array.isArray(data.taggedUids) &&
              data.taggedUids.includes(user.uid) &&
              createdAtMs > since
            ) {
              cooldown = {
                spotId: data.spotId,
                type: "tag",
                expiresAt: createdAtMs + 60 * 60 * 1000,
              };
            }
          });
          setGlobalCooldown(cooldown);
        });
      } catch {}
    })();
    return () => {
      if (unsub) unsub();
    };
  }, [spotId, user]);

  // --- Determine if check-in is allowed globally ---
  let canCheckIn = true;
  if (globalCooldown) {
    // If checked in anywhere, disable everywhere
    if (
      globalCooldown.type === "checkin" &&
      globalCooldown.spotId &&
      globalCooldown.spotId !== spotId
    ) {
      canCheckIn = false;
    }
    // If tagged anywhere, only allow check-in at that spot if not already checked in
    if (
      globalCooldown.type === "tag" &&
      globalCooldown.spotId &&
      globalCooldown.spotId !== spotId
    ) {
      canCheckIn = false;
    }
    // If tagged at this spot, allow check-in here if not already checked in
    if (
      globalCooldown.type === "tag" &&
      globalCooldown.spotId === spotId &&
      (!lastCheckIn || Date.now() - lastCheckIn > 60 * 60 * 1000)
    ) {
      canCheckIn = true;
    }
    // If checked in at this spot, disable everywhere
    if (
      globalCooldown.type === "checkin" &&
      globalCooldown.spotId === spotId &&
      (!lastCheckIn || Date.now() - lastCheckIn > 60 * 60 * 1000)
    ) {
      canCheckIn = false;
    }
  } else {
    // Fallback to local cooldown
    canCheckIn = !lastCheckIn || Date.now() - lastCheckIn > 60 * 60 * 1000;
  }

  // --- Fix: If lastCheckIn is within cooldown, always disable ---
  if (lastCheckIn && Date.now() - lastCheckIn < 60 * 60 * 1000) {
    canCheckIn = false;
  }

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
        message: `Checked in at ${spot.buildingName}`,
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
                  // Disable select if already checked in/tagged in last hour and not already selected
                  const disableSelect =
                    (!isSelected &&
                      (recentlyCheckedInUids.includes(user.uid) ||
                        // Prevent tagging if user is on global cooldown
                        (user.uid !== undefined &&
                          recentlyCheckedInUids.includes(user.uid)))) ||
                    (!isSelected && taggedUids.length >= 3);
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
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: themeColors.black,
                            fontFamily: "CarosSoft",
                          }}
                        >
                          {user.name}
                        </Text>
                        <Text
                          style={{
                            color: themeColors.darkGray,
                            fontSize: 12,
                            fontFamily: "CarosSoft",
                          }}
                        >
                          {user.email}
                        </Text>
                        {recentlyCheckedInUids.includes(user.uid) &&
                          !isSelected && (
                            <Text
                              style={{
                                color: themeColors.red,
                                fontSize: 12,
                                marginTop: 2,
                                fontFamily: "CarosSoft",
                              }}
                            >
                              (Checked in)
                            </Text>
                          )}
                      </View>
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
                : "Check In"}
            </Text>
          </>
        )}
      </TouchableOpacity>
      {/* Show cooldown message if tagged */}
      {!canCheckIn && globalCooldown && (
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 12,
            marginTop: 4,
            fontFamily: "CarosSoft",
          }}
        >
          {globalCooldown.type === "checkin"
            ? "You can check in again in " +
              Math.ceil((globalCooldown.expiresAt - Date.now()) / 60000) +
              " min"
            : globalCooldown.type === "tag" && globalCooldown.spotId === spotId
            ? "You were tagged here. You can check in here if you haven't already."
            : "You were tagged at another location. You can check in after " +
              Math.ceil((globalCooldown.expiresAt - Date.now()) / 60000) +
              " min"}
        </Text>
      )}
    </View>
  );
}
