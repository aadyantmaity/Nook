import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { User, Check } from "phosphor-react-native";
import { FONTS } from "../../constants/fonts";

export default function PrivateNookShareModal({
  visible,
  onClose,
  spotId,
  themeColors,
  ownerUid,
  collectionName = "studySpots",
  fieldName = "sharedWith",
}) {
  const [sharedWith, setSharedWith] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [pendingSharedWith, setPendingSharedWith] = useState([]);

  // Live update sharedWith from Firestore
  useEffect(() => {
    if (!spotId) return;
    setLoading(true);
    const unsub = onSnapshot(doc(db, collectionName, spotId), (docSnap) => {
      if (docSnap.exists()) {
        const arr = docSnap.data()[fieldName] || [];
        setSharedWith(arr);
        setPendingSharedWith(arr);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [spotId, collectionName, fieldName]);

  // Fetch mutual friends for owner (real-time, every open)
  useEffect(() => {
    if (!ownerUid || !visible) return;
    setLoading(true);
    const unsub = onSnapshot(doc(db, "users", ownerUid), async (userDoc) => {
      if (userDoc.exists()) {
        const following = userDoc.data().following || [];
        const followers = userDoc.data().followers || [];
        const mutualUids = following.filter((uid) => followers.includes(uid));
        const users = [];
        await Promise.all(
          mutualUids.map(async (uid) => {
            const uDoc = await getDoc(doc(db, "users", uid));
            if (uDoc.exists()) {
              users.push({
                uid,
                name:
                  `${uDoc.data().firstName || ""} ${
                    uDoc.data().lastName || ""
                  }`.trim() || uDoc.data().email,
                profilePic: uDoc.data().profilePic || null,
              });
            }
          })
        );
        setFollowingList(users);
      } else {
        setFollowingList([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [ownerUid, visible]);

  // Only update Firestore when Done is pressed
  const handleDone = async () => {
    setUpdating(true);
    try {
      const spotRef = doc(db, collectionName, spotId);
      await updateDoc(spotRef, { [fieldName]: pendingSharedWith });
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to update sharing.");
    }
    setUpdating(false);
    onClose && onClose();
  };

  // Toggle user in local pendingSharedWith only
  const handleToggleUser = (uid) => {
    setPendingSharedWith((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
        }}
        activeOpacity={1}
        onPressOut={onClose}
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
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Manage Shared Users
          </Text>
          {loading ? (
            <ActivityIndicator color={themeColors.purple} />
          ) : followingList.length === 0 ? (
            <Text
              style={{ color: themeColors.darkGray, fontFamily: FONTS.PRIMARY }}
            >
              You are not following anyone yet.
            </Text>
          ) : (
            <ScrollView style={{ width: "100%" }}>
              {followingList.map((user) => (
                <View
                  key={user.uid}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: themeColors.gray,
                    opacity: updating ? 0.6 : 1,
                  }}
                >
                  {/* Select/Deselect */}
                  <TouchableOpacity
                    onPress={() => handleToggleUser(user.uid)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 1,
                      borderColor: themeColors.purple,
                      backgroundColor: pendingSharedWith.includes(user.uid)
                        ? themeColors.purple
                        : themeColors.white,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                    disabled={updating}
                  >
                    {pendingSharedWith.includes(user.uid) && (
                      <Check
                        size={16}
                        color={themeColors.white}
                        weight="bold"
                      />
                    )}
                  </TouchableOpacity>
                  {/* Profile Picture */}
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: themeColors.purple,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                      overflow: "hidden",
                    }}
                  >
                    {user.profilePic ? (
                      <Image
                        source={{ uri: user.profilePic }}
                        style={{ width: 32, height: 32, borderRadius: 16 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <User size={20} color={themeColors.white} />
                    )}
                  </View>
                  {/* Name only */}
                  <Text
                    style={{
                      color: themeColors.black,
                      fontFamily: FONTS.PRIMARY,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {user.name
                      ? (() => {
                          const parts = user.name.split(" ");
                          const first = parts[0] || "";
                          const lastInitial =
                            parts.length > 1 && parts[1]
                              ? parts[1][0] + "."
                              : "";
                          return `${first} ${lastInitial}`;
                        })()
                      : ""}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            onPress={handleDone}
            style={{
              marginTop: 16,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 24,
              alignItems: "center",
              opacity: updating ? 0.7 : 1,
            }}
            disabled={updating}
          >
            <Text
              style={{
                color: updating ? themeColors.darkGray : themeColors.white,
                fontWeight: "bold",
                fontFamily: FONTS.PRIMARY,
              }}
            >
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
