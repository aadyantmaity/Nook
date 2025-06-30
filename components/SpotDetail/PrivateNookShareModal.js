import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";

export default function PrivateNookShareModal({
  visible,
  onClose,
  spotId,
  themeColors,
  ownerUid,
  isGroup, // new prop
  collectionName = "studySpots", // new prop
  fieldName = "sharedWith", // new prop
}) {
  const [sharedWith, setSharedWith] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Live update sharedWith/memberUids from Firestore
  useEffect(() => {
    if (!spotId) return;
    setLoading(true);
    const unsub = onSnapshot(doc(db, collectionName, spotId), (docSnap) => {
      if (docSnap.exists()) {
        setSharedWith(docSnap.data()[fieldName] || []);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [spotId, collectionName, fieldName]);

  // Fetch following list for owner
  useEffect(() => {
    if (!ownerUid) return;
    (async () => {
      const userDoc = await getDoc(doc(db, "users", ownerUid));
      if (userDoc.exists()) {
        const following = userDoc.data().following || [];
        const users = [];
        for (let uid of following) {
          const uDoc = await getDoc(doc(db, "users", uid));
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
      }
    })();
  }, [ownerUid]);

  // Add or remove user from sharedWith/memberUids
  const handleToggleUser = async (uid) => {
    setUpdating(true);
    try {
      const spotRef = doc(db, collectionName, spotId);
      const docSnap = await getDoc(spotRef);
      let arr = [];
      if (docSnap.exists()) {
        arr = docSnap.data()[fieldName] || [];
      }
      let updated;
      if (arr.includes(uid)) {
        updated = arr.filter((id) => id !== uid);
      } else {
        updated = [...arr, uid];
      }
      await updateDoc(spotRef, { [fieldName]: updated });
    } catch (e) {
      Alert.alert("Error", "Failed to update sharing.");
    }
    setUpdating(false);
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
              fontFamily: "CarosSoft",
            }}
          >
            Manage Shared Users
          </Text>
          {loading ? (
            <ActivityIndicator color={themeColors.purple} />
          ) : followingList.length === 0 ? (
            <Text
              style={{ color: themeColors.darkGray, fontFamily: "CarosSoft" }}
            >
              You are not following anyone yet.
            </Text>
          ) : (
            <ScrollView style={{ width: "100%" }}>
              {followingList.map((user) => (
                <TouchableOpacity
                  key={user.uid}
                  onPress={() => handleToggleUser(user.uid)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: themeColors.gray,
                    opacity: updating ? 0.6 : 1,
                  }}
                  disabled={updating}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 1,
                      borderColor: themeColors.purple,
                      backgroundColor: sharedWith.includes(user.uid)
                        ? themeColors.purple
                        : themeColors.white,
                      marginRight: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {sharedWith.includes(user.uid) && (
                      <Text
                        style={{ color: themeColors.white, fontWeight: "bold" }}
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
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 16,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 24,
              alignItems: "center",
            }}
            disabled={updating}
          >
            <Text
              style={{
                color: themeColors.white,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
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
