import React, { useMemo, useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { FONTS } from "../../constants/fonts";
import { UsersThree, X } from "phosphor-react-native";
import { db, auth } from "../../firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

export default function GroupPreviewModal({
  visible,
  onClose,
  group,
  user,
  themeColors,
  navigation,
}) {
  const [joining, setJoining] = useState(false);
  const [currentUserFollowing, setCurrentUserFollowing] = useState([]);
  const [currentUserFollowers, setCurrentUserFollowers] = useState([]);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPic, setOwnerPic] = useState(null);

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        if (user?.uid) {
          const uDoc = await getDoc(doc(db, "users", user.uid));
          if (isActive && uDoc.exists()) {
            const d = uDoc.data();
            setCurrentUserFollowing(Array.isArray(d.following) ? d.following : []);
            setCurrentUserFollowers(Array.isArray(d.followers) ? d.followers : []);
          }
        }
      } catch {}
      try {
        if (group?.createdBy) {
          const oDoc = await getDoc(doc(db, "users", group.createdBy));
          if (isActive && oDoc.exists()) {
            const d = oDoc.data();
            const first = d.firstName || "";
            const last = d.lastName || "";
            setOwnerName(`${first} ${last}`.trim() || "Owner");
            setOwnerPic(d.profilePic || null);
          }
        }
      } catch {}
    })();
    return () => {
      isActive = false;
    };
  }, [user?.uid, group?.createdBy]);

  const memberCount = Array.isArray(group?.memberUids)
    ? group.memberUids.length
    : 0;

  const mutualFriendsInGroupCount = useMemo(() => {
    const following = Array.isArray(currentUserFollowing) ? currentUserFollowing : [];
    const followers = Array.isArray(currentUserFollowers) ? currentUserFollowers : [];
    const members = Array.isArray(group?.memberUids) ? group.memberUids : [];
    if (following.length === 0 || followers.length === 0 || members.length === 0)
      return 0;
    const mutuals = new Set(following.filter((uid) => followers.includes(uid)));
    let cnt = 0;
    for (const uid of members) if (mutuals.has(uid)) cnt++;
    return cnt;
  }, [currentUserFollowing, currentUserFollowers, group?.memberUids]);

  const handleJoin = async () => {
    if (!group?.id || !user?.uid) return;
    if (Array.isArray(group.blockedUsers) && group.blockedUsers.includes(user.uid)) {
      // Blocked users cannot join; simply close.
      onClose && onClose();
      return;
    }
    setJoining(true);
    try {
      const groupRef = doc(db, "studyGroups", group.id);
      await getDoc(groupRef).then(async (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const memberUids = Array.isArray(data.memberUids) ? data.memberUids : [];
        if (memberUids.length >= 32) {
          setJoining(false);
          return;
        }
        if (Array.isArray(data.blockedUsers) && data.blockedUsers.includes(user.uid)) {
          setJoining(false);
          return;
        }
        if (!memberUids.includes(user.uid)) {
          await updateDoc(groupRef, { memberUids: [...memberUids, user.uid] });
          let userDoc;
          try {
            userDoc = await getDoc(doc(db, "users", user.uid));
          } catch {}
          const userName =
            userDoc && userDoc.exists()
              ? (userDoc.data().firstName || "User") +
                (userDoc.data().lastName
                  ? " " + userDoc.data().lastName.charAt(0)
                  : "")
              : "User";
          await addDoc(collection(db, "studyGroups", group.id, "messages"), {
            type: "system",
            text: `${userName} joined the group.`,
            uid: user.uid,
            createdAt: serverTimestamp(),
          });
        }
      });
      onClose && onClose();
      navigation?.navigate("GroupChat", { groupId: group.id });
    } catch (e) {}
    setJoining(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 520,
            backgroundColor: themeColors?.white || "#fff",
            borderRadius: 12,
            overflow: "hidden",
            position: "relative",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Close modal"
          >
            <X size={18} color={themeColors?.red} weight="bold" />
          </TouchableOpacity>
          
          <ScrollView
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {group?.profilePic ? (
                <Image
                  source={{ uri: group.profilePic }}
                  style={{ width: 56, height: 56, borderRadius: 28, marginRight: 12 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: (themeColors?.purple || "#6c5ce7") + "22",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <UsersThree size={36} color={themeColors?.purple || "#6c5ce7"} weight="fill" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: themeColors?.purple || "#6c5ce7",
                    fontWeight: "bold",
                    fontSize: 20,
                    fontFamily: FONTS.PRIMARY,
                  }}
                  numberOfLines={2}
                >
                  {group?.name || "Public Group"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                  <Text
                    style={{
                      color: themeColors?.black || themeColors.black,
                      fontSize: 13,
                      fontFamily: FONTS.PRIMARY,
                    }}
                    numberOfLines={1}
                  >
                    Owner: {ownerName || "—"}
                  </Text>
                </View>
                <Text
                  style={{
                    color: themeColors?.darkGray || "#666",
                    fontSize: 14,
                    fontFamily: FONTS.PRIMARY,
                    marginTop: 4,
                  }}
                >
                  {group?.memberUids?.length > 0 ? `${group?.memberUids?.length} ${group?.memberUids?.length === 1 ? 'member' : 'members'}` : "No members"} · 
                  {mutualFriendsInGroupCount > 0 ? `${mutualFriendsInGroupCount} ${mutualFriendsInGroupCount === 1 ? 'friend' : 'friends'} here` : "No friends here"}
                </Text>
              </View>
            </View>

            {group?.description ? (
              <Text
                style={{
                  color: themeColors?.black || themeColors.black,
                  fontSize: 15,
                  fontFamily: FONTS.PRIMARY,
                  marginTop: 14,
                  lineHeight: 20,
                }}
              >
                {group.description}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", marginTop: 18 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: themeColors?.purple || "#6c5ce7",
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
                }}
                onPress={handleJoin}
                disabled={joining}
                accessibilityLabel="Join group"
              >
                {joining ? (
                  <ActivityIndicator color={themeColors?.white || "#fff"} />
                ) : (
                  <Text
                    style={{
                      color: themeColors?.white || "#fff",
                      fontWeight: "bold",
                      fontSize: 16,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    Join Group
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}


