import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as PhosphorIcons from "phosphor-react-native";
import { LockKey } from "phosphor-react-native";
import { db, auth } from "../../../firebaseConfig";
import { FONTS } from "../../../constants/fonts";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

export default function GroupList({
  loadingGroups,
  groupSearch,
  groupSearchResults,
  sortedGroups,
  favoriteGroups,
  allUsers,
  user,
  navigation,
  themeColors,
}) {
  const [isScrolled, setIsScrolled] = useState(false);

  // --- Track user's last read per group (live) ---
  const [groupLastRead, setGroupLastRead] = useState({});
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = require("firebase/firestore").onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setGroupLastRead(snap.exists() ? snap.data().groupLastRead || {} : {});
      }
    );
    return () => unsub();
  }, [user?.uid]);

  // --- Live cache all messages for each group ---
  const [groupMessagesCache, setGroupMessagesCache] = useState({});
  useEffect(() => {
    if (!sortedGroups || sortedGroups.length === 0) {
      setGroupMessagesCache({});
      return;
    }
    const unsubs = [];
    const cache = {};
    sortedGroups.forEach((group) => {
      const q = require("firebase/firestore").query(
        collection(db, "studyGroups", group.id, "messages"),
        require("firebase/firestore").orderBy("createdAt", "asc")
      );
      const unsub = require("firebase/firestore").onSnapshot(q, (snap) => {
        const msgs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aTs =
              a.createdAt?.seconds !== undefined
                ? a.createdAt.seconds
                : typeof a.createdAt === "number"
                ? a.createdAt / 1000
                : 0;
            const bTs =
              b.createdAt?.seconds !== undefined
                ? b.createdAt.seconds
                : typeof b.createdAt === "number"
                ? b.createdAt / 1000
                : 0;
            return aTs - bTs;
          });
        cache[group.id] = msgs;
        setGroupMessagesCache((prev) => ({ ...prev, [group.id]: msgs }));
      });
      unsubs.push(unsub);
    });
    return () => {
      unsubs.forEach((u) => u && u());
    };
  }, [sortedGroups]);

  // --- Helper to count unread messages for a group ---
  const getUnreadCount = (groupId, isMember) => {
    if (!isMember) return 0;
    const lastReadId = groupLastRead[groupId];
    const msgs = groupMessagesCache[groupId] || [];
    if (msgs.length === 0) return 0;
    if (!lastReadId) return msgs.length; // all unread
    const lastReadIdx = msgs.findIndex((m) => m.id === lastReadId);
    if (lastReadIdx === -1) return msgs.length; // treat all as unread
    return msgs.length - (lastReadIdx + 1);
  };

  // --- Helper to get unread messages for a group ---
  const getUnreadMessages = (groupId, isMember) => {
    if (!isMember) return [];
    const lastReadId = groupLastRead[groupId];
    const msgs = groupMessagesCache[groupId] || [];
    if (msgs.length === 0) return [];
    if (!lastReadId) return msgs; // all unread
    const lastReadIdx = msgs.findIndex((m) => m.id === lastReadId);
    if (lastReadIdx === -1) return msgs; // all unread
    return msgs.slice(lastReadIdx + 1);
  };

  if (loadingGroups) {
    return (
      <ActivityIndicator color={themeColors.purple} style={{ marginTop: 8 }} />
    );
  }

  if (
    groupSearch ? groupSearchResults.length === 0 : sortedGroups.length === 0
  ) {
    return (
      <View style={{ flex: 1, alignItems: "center", marginTop: 16 }}>
        <Text
          style={{
            color: themeColors.purple,
            fontWeight: "bold",
            fontSize: 16,
            fontFamily: FONTS.PRIMARY,
            marginBottom: 4,
          }}
        >
          Groups
        </Text>
        <Text
          style={{
            color: themeColors.darkGray,
            fontFamily: FONTS.PRIMARY,
            textAlign: "center",
            marginTop: 4,
          }}
        >
          {groupSearch
            ? "No groups found matching your search."
            : "No study groups found."}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, position: "relative", width: "100%" }}>
      {sortedGroups.length > 0 && isScrolled && (
        <LinearGradient
          colors={[themeColors.white + "FF", themeColors.white + "00"]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 24,
            zIndex: 2,
            pointerEvents: "none",
          }}
          pointerEvents="none"
        />
      )}
      <FlatList
        data={sortedGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const IconComponent =
            item.icon && PhosphorIcons[item.icon]
              ? PhosphorIcons[item.icon]
              : PhosphorIcons.UsersThree;
          const isMember =
            Array.isArray(item.memberUids) &&
            item.memberUids.includes(user.uid);
          const isPublic = !(item.isPrivate ?? false);
          const handlePress = async () => {
            if (isPublic && !isMember) {
              Alert.alert(
                "Join Group",
                "You are not a member of this public group. Would you like to join?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Join",
                    style: "default",
                    onPress: async () => {
                      try {
                        const groupRef = doc(db, "studyGroups", item.id);
                        await getDoc(groupRef).then(async (snap) => {
                          if (snap.exists()) {
                            const data = snap.data();
                            const memberUids = Array.isArray(data.memberUids)
                              ? data.memberUids
                              : [];
                            if (memberUids.length >= 32) {
                              Alert.alert(
                                "Group Full",
                                "This public group already has 32 members and cannot accept more."
                              );
                              return;
                            }
                            if (!memberUids.includes(user.uid)) {
                              await updateDoc(groupRef, {
                                memberUids: [...memberUids, user.uid],
                              });
                              // --- Add joined the group system message ---
                              let userDoc;
                              try {
                                userDoc = await getDoc(
                                  doc(db, "users", user.uid)
                                );
                              } catch {}
                              const userName =
                                userDoc && userDoc.exists()
                                  ? (userDoc.data().firstName || "User") +
                                    (userDoc.data().lastName
                                      ? " " + userDoc.data().lastName.charAt(0)
                                      : "")
                                  : "User";
                              await addDoc(
                                collection(
                                  db,
                                  "studyGroups",
                                  item.id,
                                  "messages"
                                ),
                                {
                                  type: "system",
                                  text: `${userName} joined the group.`,
                                  uid: user.uid,
                                  createdAt: serverTimestamp(),
                                }
                              );
                            }
                          }
                        });
                        navigation.navigate("GroupChat", {
                          groupId: item.id,
                        });
                      } catch (e) {
                        Alert.alert("Error", "Failed to join group.");
                      }
                    },
                  },
                ]
              );
            } else {
              navigation.navigate("GroupChat", { groupId: item.id });
            }
          };
          const unreadCount = getUnreadCount(item.id, isMember);
          // --- Log unread messages for each group only if unread and user is a member ---
          if (unreadCount > 0 && isMember) {
            const unreadMsgs = getUnreadMessages(item.id, isMember);
          }
          return (
            <TouchableOpacity
              onPress={handlePress}
              style={{
                backgroundColor: themeColors.white,
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                borderColor: themeColors.darkGray,
                borderWidth: 0.5,
                position: "relative",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {item.profilePic ? (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: themeColors.purple + "22",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    source={{ uri: item.profilePic }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: themeColors.purple + "22",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <IconComponent
                    size={28}
                    color={themeColors.purple}
                    weight="fill"
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.purple,
                      fontWeight: "bold",
                      fontSize: 18,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    {item.name}
                  </Text>
                  {item.isPrivate && (
                    <LockKey
                      size={18}
                      color={themeColors.purple}
                      weight="fill"
                      style={{
                        marginLeft: 6,
                        marginBottom: -2,
                        alignSelf: "center",
                      }}
                    />
                  )}
                </View>
                {item.description !== "" && (
                  <Text
                    style={{
                      color: themeColors.black,
                      fontSize: 15,
                      fontFamily: FONTS.PRIMARY,
                      marginBottom: 4,
                    }}
                  >
                    {item.description}
                  </Text>
                )}
                {/* --- Unread badge --- */}
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      backgroundColor: themeColors.purple,
                      borderRadius: 10,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      minWidth: 24,
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: themeColors.white,
                        fontWeight: "bold",
                        fontSize: 13,
                        fontFamily: FONTS.PRIMARY,
                      }}
                    >
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          setIsScrolled(offsetY > 2);
        }}
        scrollEventThrottle={16}
      />
      {sortedGroups.length > 0 && (
        <LinearGradient
          colors={[themeColors.white + "00", themeColors.white + "FF"]}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 24,
            zIndex: 2,
            pointerEvents: "none",
          }}
          pointerEvents="none"
        />
      )}
    </View>
  );
}
