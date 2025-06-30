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
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { UsersThree } from "phosphor-react-native";

export default function ShareNookToGroupModal({
  visible,
  onClose,
  spot,
  spotId,
  themeColors,
  navigation,
}) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setGroups([]);
          setLoading(false);
          return;
        }
        // Get groups where user is a member
        const q = query(
          collection(db, "studyGroups"),
          where("memberUids", "array-contains", user.uid)
        );
        const snap = await getDocs(q);
        const arr = [];
        snap.forEach((doc) => {
          arr.push({ id: doc.id, ...doc.data() });
        });
        if (isMounted) setGroups(arr);
      } catch {
        if (isMounted) setGroups([]);
      }
      setLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleShare = async (group) => {
    if (!spot || !spotId || !group?.id) return;
    setSending(true);
    try {
      // --- Fetch current user's name from Firestore ---
      let senderName = "User";
      let senderUid = auth.currentUser?.uid;
      if (senderUid) {
        const userDoc = await getDoc(doc(db, "users", senderUid));
        if (userDoc.exists()) {
          const d = userDoc.data();
          senderName =
            `${d.firstName || ""} ${d.lastName || ""}`.trim() ||
            d.email ||
            "User";
        } else {
          senderName =
            auth.currentUser?.displayName || auth.currentUser?.email || "User";
        }
      }
      // Add a message to the group's messages subcollection
      await addDoc(collection(db, "studyGroups", group.id, "messages"), {
        type: "nook_share",
        spotId,
        spotName: spot.buildingName || spot.name || "Nook",
        spotPhoto: spot.photoUrl || null,
        senderUid,
        senderName,
        createdAt: serverTimestamp(),
      });
      Alert.alert("Shared!", `Nook shared to "${group.name}".`);
      onClose && onClose();
    } catch (e) {
      Alert.alert("Error", "Failed to share nook.");
    }
    setSending(false);
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
            Share this Nook to a Group
          </Text>
          {loading ? (
            <ActivityIndicator color={themeColors.purple} />
          ) : groups.length === 0 ? (
            <Text
              style={{ color: themeColors.darkGray, fontFamily: "CarosSoft" }}
            >
              You are not a member of any groups.
            </Text>
          ) : (
            <ScrollView style={{ width: "100%" }}>
              {groups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  onPress={() => handleShare(group)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: themeColors.gray,
                    opacity: sending ? 0.6 : 1,
                  }}
                  disabled={sending}
                >
                  <UsersThree
                    size={22}
                    color={themeColors.purple}
                    weight="bold"
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={{
                      color: themeColors.black,
                      fontFamily: "CarosSoft",
                      fontSize: 16,
                    }}
                  >
                    {group.name}
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
              opacity: sending ? 0.7 : 1,
            }}
            disabled={sending}
          >
            <Text
              style={{
                color: themeColors.white,
                fontWeight: "bold",
                fontFamily: "CarosSoft",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
