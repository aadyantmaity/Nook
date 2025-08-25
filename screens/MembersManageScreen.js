import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ThemeContext } from "../App";
import { FONTS } from "../constants/fonts";
import { colors } from "../constants/colors";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { MagnifyingGlass, User, Check, X } from "phosphor-react-native";
import GroupHeader from "../components/common/GroupHeader";

export default function MembersManageScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params || {};

  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);

  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);

  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);

  const [selectedMemberUids, setSelectedMemberUids] = useState([]);
  const [pendingAddUids, setPendingAddUids] = useState([]);
  const [pendingAddUsers, setPendingAddUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("members"); // 'members' | 'block'
  // Block management state
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedUsersData, setBlockedUsersData] = useState([]);
  const [selectedBlockedUids, setSelectedBlockedUids] = useState([]);
  const [blockSearchQuery, setBlockSearchQuery] = useState("");
  const [blockSearchResults, setBlockSearchResults] = useState([]);
  const [blockSearchLoading, setBlockSearchLoading] = useState(false);
  const [pendingBlockUids, setPendingBlockUids] = useState([]);
  const [pendingBlockUsers, setPendingBlockUsers] = useState([]);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    const unsub = onSnapshot(doc(db, "studyGroups", groupId), async (snap) => {
      if (!snap.exists()) {
        setGroup(null);
        setLoading(false);
        return;
      }
      const groupData = { id: snap.id, ...snap.data() };
      setGroup(groupData);
      // Fetch member info
      const memberUids = groupData.memberUids || [];
      const users = [];
      for (const uid of memberUids) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          users.push({ uid, ...userDoc.data() });
        }
      }
      // Move current user to start
      const currentUid = auth.currentUser?.uid;
      const sortedUsers = [
        ...users.filter((u) => u.uid === currentUid),
        ...users.filter((u) => u.uid !== currentUid),
      ];
      setMembers(sortedUsers);
      // Initialize blocked users from group
      setBlockedUsers(
        Array.isArray(groupData.blockedUsers) ? groupData.blockedUsers : []
      );
      setLoading(false);
    });
    return () => unsub();
  }, [groupId]);

  useEffect(() => {
    if (!auth.currentUser) return;
    setFollowingLoading(true);
    const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (snap) => {
      setFollowing(snap.exists() ? snap.data().following || [] : []);
      setFollowers(snap.exists() ? snap.data().followers || [] : []);
      setFollowingLoading(false);
    });
    return () => unsub();
  }, []);

  const mutualFriends = useMemo(() => {
    return (following || []).filter((uid) => (followers || []).includes(uid));
  }, [following, followers]);

  useEffect(() => {
    // Initialize with current members (excluding owner)
    setSelectedMemberUids(
      members.filter((m) => m.uid !== group?.createdBy).map((m) => m.uid)
    );
  }, [members, group?.createdBy]);

  const searchMembers = async (query) => {
    if (!query.trim()) {
      setMemberSearchResults([]);
      return;
    }
    setMemberSearchLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((user) => {
          // Only mutual friends, not already members, not self
          if (
            !mutualFriends.includes(user.uid) ||
            group?.memberUids?.includes(user.uid) ||
            user.uid === auth.currentUser?.uid
          ) {
            return false;
          }
          const fullName = `${user.firstName || ""} ${
            user.lastName || ""
          }`.toLowerCase();
          const email = (user.email || "").toLowerCase();
          const searchTerm = query.toLowerCase();
          return fullName.includes(searchTerm) || email.includes(searchTerm);
        })
        .slice(0, 10);
      setMemberSearchResults(users);
    } catch (e) {
      setMemberSearchResults([]);
    }
    setMemberSearchLoading(false);
  };

  // Fetch blocked users' visible data
  useEffect(() => {
    const fetchBlockedUsersData = async () => {
      if (!blockedUsers.length) {
        setBlockedUsersData([]);
        setSelectedBlockedUids([]);
        return;
      }
      try {
        const data = [];
        for (const uid of blockedUsers) {
          const d = await getDoc(doc(db, "users", uid));
          if (d.exists()) data.push({ uid, ...d.data() });
          else data.push({ uid, firstName: "Deleted", lastName: "User" });
        }
        setBlockedUsersData(data);
        setSelectedBlockedUids(blockedUsers);
      } catch {
        setBlockedUsersData([]);
      }
    };
    fetchBlockedUsersData();
  }, [blockedUsers]);

  const searchUsersToBlock = async (query) => {
    if (!query.trim()) {
      setBlockSearchResults([]);
      return;
    }
    setBlockSearchLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((user) => {
          if (user.uid === auth.currentUser?.uid) return false;
          const fullName = `${user.firstName || ""} ${
            user.lastName || ""
          }`.toLowerCase();
          const email = (user.email || "").toLowerCase();
          const searchTerm = query.toLowerCase();
          return fullName.includes(searchTerm) || email.includes(searchTerm);
        })
        .slice(0, 10);
      setBlockSearchResults(users);
    } catch (e) {
      setBlockSearchResults([]);
    }
    setBlockSearchLoading(false);
  };

  const handleApplyMemberChanges = async () => {
    const currentMemberUids = members
      .filter((m) => m.uid !== group?.createdBy)
      .map((m) => m.uid);
    // Add from pending list
    const toAdd = pendingAddUids.filter(
      (uid) => !currentMemberUids.includes(uid)
    );
    const toRemove = currentMemberUids.filter(
      (uid) => !selectedMemberUids.includes(uid)
    );

    if (toAdd.length === 0 && toRemove.length === 0) {
      navigation.goBack();
      return;
    }

    // Apply without extra confirmation since this screen is dedicated to managing
    // members and mirrors the modal behavior
    // Add new members
    for (const uid of toAdd) {
      try {
        await updateDoc(doc(db, "studyGroups", groupId), {
          memberUids: arrayUnion(uid),
        });
        const userDoc = await getDoc(doc(db, "users", uid));
        const userName = userDoc.exists()
          ? `${userDoc.data().firstName || ""} ${
              userDoc.data().lastName || ""
            }`.trim()
          : "User";
        await addDoc(collection(db, "studyGroups", groupId, "messages"), {
          type: "system",
          text: `${userName} was added to the group.`,
          uid,
          createdAt: serverTimestamp(),
        });
      } catch {}
    }
    // Remove members
    for (const uid of toRemove) {
      try {
        await updateDoc(doc(db, "studyGroups", groupId), {
          memberUids: arrayRemove(uid),
        });
        const userDoc = await getDoc(doc(db, "users", uid));
        const userName = userDoc.exists()
          ? `${userDoc.data().firstName || ""} ${
              userDoc.data().lastName || ""
            }`.trim()
          : "User";
        await addDoc(collection(db, "studyGroups", groupId, "messages"), {
          type: "system",
          text: `${userName} was removed from the group.`,
          uid,
          createdAt: serverTimestamp(),
        });
      } catch {}
    }
    // Apply block changes: block pending ones and unblock those unchecked
    for (const uid of pendingBlockUids) {
      try {
        await updateDoc(doc(db, "studyGroups", groupId), {
          blockedUsers: arrayUnion(uid),
        });
        // If they are a member, remove and post system message
        if (members.some((m) => m.uid === uid)) {
          await updateDoc(doc(db, "studyGroups", groupId), {
            memberUids: arrayRemove(uid),
          });
          const userDoc = await getDoc(doc(db, "users", uid));
          const userName = userDoc.exists()
            ? `${userDoc.data().firstName || ""} ${
                userDoc.data().lastName || ""
              }`.trim()
            : "User";
          await addDoc(collection(db, "studyGroups", groupId, "messages"), {
            type: "system",
            text: `${userName} was removed from the group.`,
            uid,
            createdAt: serverTimestamp(),
          });
        }
      } catch {}
    }
    const toUnblock = blockedUsers.filter(
      (uid) => !selectedBlockedUids.includes(uid)
    );
    for (const uid of toUnblock) {
      try {
        await updateDoc(doc(db, "studyGroups", groupId), {
          blockedUsers: arrayRemove(uid),
        });
      } catch {}
    }
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
        <ActivityIndicator color={themeColors.purple} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      <GroupHeader
        navigation={navigation}
        groupName={"Manage Members"}
        themeColors={themeColors}
        onMenuPress={() => {}}
        showMenuButton={false}
      />

      {/* Body */}
      <View style={{ padding: 16 }}>
        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: themeColors.lightGray,
            borderRadius: 10,
            padding: 4,
            marginBottom: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab("members")}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor:
                activeTab === "members" ? themeColors.white : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color:
                  activeTab === "members"
                    ? themeColors.purple
                    : themeColors.black,
                fontFamily: FONTS.PRIMARY,
                fontWeight: "bold",
              }}
            >
              Add / Remove
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("block")}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor:
                activeTab === "block" ? themeColors.white : "transparent",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color:
                  activeTab === "block"
                    ? themeColors.purple
                    : themeColors.black,
                fontFamily: FONTS.PRIMARY,
                fontWeight: "bold",
              }}
            >
              Block Members
            </Text>
          </TouchableOpacity>
        </View>
        {/* Search/Input/Lists for Members tab */}
        {activeTab === "members" && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1,
              borderColor: themeColors.darkGray,
              borderRadius: 8,
              paddingHorizontal: 12,
              marginBottom: 16,
              width: "100%",
            }}
          >
            <MagnifyingGlass size={20} color={themeColors.darkGray} />
            <TextInput
              placeholder="Search for friend to add..."
              value={memberSearchQuery}
              onChangeText={(text) => {
                setMemberSearchQuery(text);
                searchMembers(text);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingLeft: 8,
                fontFamily: FONTS.PRIMARY,
                color: themeColors.black,
              }}
              placeholderTextColor={themeColors.darkGray}
            />
          </View>
        )}
        {activeTab === "members" && (
          <ScrollView style={{ width: "100%", maxHeight: 180 }}>
            {memberSearchQuery.trim() ? (
              memberSearchLoading ? (
                <Text
                  style={{
                    color: themeColors.darkGray,
                    textAlign: "center",
                    fontFamily: FONTS.PRIMARY,
                    marginTop: 20,
                  }}
                >
                  Searching...
                </Text>
              ) : memberSearchResults.length === 0 ? (
                <Text
                  style={{
                    color: themeColors.darkGray,
                    textAlign: "center",
                    fontFamily: FONTS.PRIMARY,
                    marginTop: 20,
                  }}
                >
                  No friends found
                </Text>
              ) : (
                memberSearchResults.map((item) => {
                  const isMe = item.uid === auth.currentUser?.uid;
                  const checked = pendingAddUids.includes(item.uid);
                  return (
                    <TouchableOpacity
                      key={item.uid}
                      onPress={() => {
                        if (isMe) return;
                        setPendingAddUids((prev) =>
                          checked
                            ? prev.filter((uid) => uid !== item.uid)
                            : [...prev, item.uid]
                        );
                        setPendingAddUsers((prev) =>
                          checked
                            ? prev.filter((u) => u.uid !== item.uid)
                            : [...prev, item]
                        );
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: themeColors.gray,
                      }}
                    >
                      {/* Profile Picture */}
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: themeColors.purple,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                          overflow: "hidden",
                        }}
                      >
                        {item.profilePic ? (
                          <Image
                            source={{ uri: item.profilePic }}
                            style={{ width: 36, height: 36, borderRadius: 18 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <User size={20} color={themeColors.white} />
                        )}
                      </View>
                      {/* Name */}
                      <View style={{ flex: 1, justifyContent: "center" }}>
                        <Text
                          style={{
                            color: themeColors.black,
                            fontFamily: FONTS.PRIMARY,
                            fontSize: 16,
                            textAlign: "left",
                          }}
                          numberOfLines={1}
                        >
                          {item.firstName
                            ? `${item.firstName} ${item.lastName || ""}`
                                .trim()
                                .replace(/\s+/g, " ")
                            : "User"}
                        </Text>
                      </View>
                      {/* Check Circle (hide for me) */}
                      {!isMe && (
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 1,
                            borderColor: themeColors.purple,
                            backgroundColor: checked
                              ? themeColors.purple
                              : themeColors.white,
                            marginLeft: 10,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {checked && (
                            <Check
                              size={14}
                              color={themeColors.white}
                              weight="bold"
                            />
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )
            ) : (
              <Text
                style={{
                  color: themeColors.darkGray,
                  textAlign: "center",
                  fontFamily: FONTS.PRIMARY,
                  marginTop: 20,
                }}
              >
                Search for a friend to add to this group
              </Text>
            )}
          </ScrollView>
        )}

        {/* Pending To-Add List */}
        {activeTab === "members" && pendingAddUsers.length > 0 && (
          <View style={{ marginTop: 12, marginBottom: 8 }}>
            <Text
              style={{
                fontWeight: "bold",
                color: themeColors.purple,
                fontFamily: FONTS.PRIMARY,
                marginBottom: 8,
                marginTop: 16,
              }}
            >
              To Add ({pendingAddUsers.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {pendingAddUsers.map((u) => (
                <View
                  key={u.uid}
                  style={{ alignItems: "center", marginRight: 16 }}
                >
                  <View style={{ position: "relative" }}>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: themeColors.purple,
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {u.profilePic ? (
                        <Image
                          source={{ uri: u.profilePic }}
                          style={{ width: 56, height: 56, borderRadius: 28 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <User size={26} color={themeColors.white} />
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setPendingAddUids((prev) =>
                          prev.filter((id) => id !== u.uid)
                        );
                        setPendingAddUsers((prev) =>
                          prev.filter((x) => x.uid !== u.uid)
                        );
                      }}
                      accessibilityLabel={`Remove ${u.firstName || "User"}`}
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        backgroundColor: themeColors.white,
                        borderRadius: 12,
                        padding: 2,
                        borderWidth: 1,
                        borderColor: themeColors.gray,
                      }}
                    >
                      <X size={14} color={themeColors.purple} weight="bold" />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={{
                      color: themeColors.black,
                      fontFamily: FONTS.PRIMARY,
                      fontSize: 12,
                      marginTop: 6,
                      maxWidth: 70,
                      textAlign: "center",
                    }}
                    numberOfLines={1}
                  >
                    {u.firstName
                      ? (() => {
                          const parts = `${u.firstName} ${u.lastName || ""}`
                            .trim()
                            .split(" ");
                          const first = parts[0] || "";
                          const lastInitial =
                            parts.length > 1 && parts[1]
                              ? parts[1][0] + "."
                              : "";
                          return `${first} ${lastInitial}`;
                        })()
                      : "User"}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Current Members List */}
        {activeTab === "members" && (
          <View
            style={{
              marginTop: 20,
              paddingTop: 16,
              width: "100%",
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                color: themeColors.purple,
                fontFamily: FONTS.PRIMARY,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Current Members ({members.length})
            </Text>
            <ScrollView style={{ maxHeight: 560 }}>
              {members.map((userData) => {
                const isMe = userData.uid === auth.currentUser?.uid;
                const checked = selectedMemberUids.includes(userData.uid);
                return (
                  <TouchableOpacity
                    key={userData.uid}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isMe) return;
                      setSelectedMemberUids((prev) =>
                        checked
                          ? prev.filter((uid) => uid !== userData.uid)
                          : [...prev, userData.uid]
                      );
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: themeColors.gray,
                      backgroundColor: themeColors.white,
                    }}
                  >
                    {/* Profile Picture */}
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: themeColors.purple,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                        overflow: "hidden",
                      }}
                    >
                      {userData.profilePic ? (
                        <Image
                          source={{ uri: userData.profilePic }}
                          style={{ width: 36, height: 36, borderRadius: 18 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <User size={20} color={themeColors.white} />
                      )}
                    </View>
                    {/* Name */}
                    <View style={{ flex: 1, justifyContent: "center" }}>
                      <Text
                        style={{
                          color: themeColors.black,
                          fontFamily: FONTS.PRIMARY,
                          fontSize: 16,
                          textAlign: "left",
                        }}
                        numberOfLines={1}
                      >
                        {userData.uid === auth.currentUser?.uid
                          ? "You"
                          : userData.firstName
                          ? (() => {
                              const parts = `${userData.firstName} ${
                                userData.lastName || ""
                              }`
                                .trim()
                                .split(" ");
                              const first = parts[0] || "";
                              const lastInitial =
                                parts.length > 1 && parts[1]
                                  ? parts[1][0] + "."
                                  : "";
                              return `${first} ${lastInitial}`;
                            })()
                          : "User"}
                      </Text>
                    </View>
                    {/* Check Circle (hide for me) */}
                    {!isMe && (
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 1,
                          borderColor: themeColors.purple,
                          backgroundColor: checked
                            ? themeColors.purple
                            : themeColors.white,
                          marginLeft: 10,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {checked && (
                          <Check
                            size={14}
                            color={themeColors.white}
                            weight="bold"
                          />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {members.length === 0 && (
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontFamily: FONTS.PRIMARY,
                    fontSize: 13,
                    textAlign: "center",
                    marginTop: 8,
                  }}
                >
                  No other members.
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {/* Block Members Section - only for Block tab */}
        {activeTab === "block" && (
          <View
            style={{
              width: "100%",
            }}
          >
            {/* Block Search */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: themeColors.darkGray,
                borderRadius: 8,
                paddingHorizontal: 12,
                marginBottom: 12,
                width: "100%",
              }}
            >
              <MagnifyingGlass size={20} color={themeColors.darkGray} />
              <TextInput
                placeholder="Search users to block..."
                value={blockSearchQuery}
                onChangeText={(text) => {
                  setBlockSearchQuery(text);
                  searchUsersToBlock(text);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingLeft: 8,
                  fontFamily: FONTS.PRIMARY,
                  color: themeColors.black,
                }}
                placeholderTextColor={themeColors.darkGray}
              />
            </View>
            {/* Block search results */}
            <ScrollView style={{ width: "100%", maxHeight: 180 }}>
              {blockSearchQuery.trim() ? (
                blockSearchLoading ? (
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      textAlign: "center",
                      fontFamily: FONTS.PRIMARY,
                      marginTop: 20,
                    }}
                  >
                    Searching...
                  </Text>
                ) : blockSearchResults.length === 0 ? (
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      textAlign: "center",
                      fontFamily: FONTS.PRIMARY,
                      marginTop: 20,
                    }}
                  >
                    No users found
                  </Text>
                ) : (
                  blockSearchResults.map((item) => {
                    const isMe = item.uid === auth.currentUser?.uid;
                    const checked = pendingBlockUids.includes(item.uid);
                    return (
                      <TouchableOpacity
                        key={item.uid}
                        onPress={() => {
                          if (isMe) return;
                          setPendingBlockUids((prev) =>
                            checked
                              ? prev.filter((uid) => uid !== item.uid)
                              : [...prev, item.uid]
                          );
                          setPendingBlockUsers((prev) =>
                            checked
                              ? prev.filter((u) => u.uid !== item.uid)
                              : [...prev, item]
                          );
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: themeColors.gray,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: themeColors.purple,
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                            overflow: "hidden",
                          }}
                        >
                          {item.profilePic ? (
                            <Image
                              source={{ uri: item.profilePic }}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                              }}
                              resizeMode="cover"
                            />
                          ) : (
                            <User size={20} color={themeColors.white} />
                          )}
                        </View>
                        <View style={{ flex: 1, justifyContent: "center" }}>
                          <Text
                            style={{
                              color: themeColors.black,
                              fontFamily: FONTS.PRIMARY,
                              fontSize: 16,
                              textAlign: "left",
                            }}
                            numberOfLines={1}
                          >
                            {item.firstName
                              ? `${item.firstName} ${item.lastName || ""}`
                                  .trim()
                                  .replace(/\s+/g, " ")
                              : "User"}
                          </Text>
                        </View>
                        {!isMe && (
                          <View
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              borderWidth: 1,
                              borderColor: themeColors.purple,
                              backgroundColor: checked
                                ? themeColors.purple
                                : themeColors.white,
                              marginLeft: 10,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {checked && (
                              <Check
                                size={14}
                                color={themeColors.white}
                                weight="bold"
                              />
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )
              ) : (
                <Text
                  style={{
                    color: themeColors.darkGray,
                    textAlign: "center",
                    fontFamily: FONTS.PRIMARY,
                    marginTop: 20,
                  }}
                >
                  Search for a user to block
                </Text>
              )}
            </ScrollView>

            {/* Pending To-Block List */}
            {pendingBlockUsers.length > 0 && (
              <View style={{ marginTop: 12, marginBottom: 8 }}>
                <Text
                  style={{
                    fontWeight: "bold",
                    color: themeColors.purple,
                    fontFamily: FONTS.PRIMARY,
                    marginBottom: 8,
                  }}
                >
                  To Block ({pendingBlockUsers.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {pendingBlockUsers.map((u) => (
                    <View
                      key={u.uid}
                      style={{ alignItems: "center", marginRight: 16 }}
                    >
                      <View style={{ position: "relative" }}>
                        <View
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 28,
                            backgroundColor: themeColors.purple,
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          {u.profilePic ? (
                            <Image
                              source={{ uri: u.profilePic }}
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                              }}
                              resizeMode="cover"
                            />
                          ) : (
                            <User size={26} color={themeColors.white} />
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            setPendingBlockUids((prev) =>
                              prev.filter((id) => id !== u.uid)
                            );
                            setPendingBlockUsers((prev) =>
                              prev.filter((x) => x.uid !== u.uid)
                            );
                          }}
                          accessibilityLabel={`Remove ${u.firstName || "User"}`}
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            backgroundColor: themeColors.white,
                            borderRadius: 12,
                            padding: 2,
                            borderWidth: 1,
                            borderColor: themeColors.gray,
                          }}
                        >
                          <X
                            size={14}
                            color={themeColors.purple}
                            weight="bold"
                          />
                        </TouchableOpacity>
                      </View>
                      <Text
                        style={{
                          color: themeColors.black,
                          fontFamily: FONTS.PRIMARY,
                          fontSize: 12,
                          marginTop: 6,
                          maxWidth: 70,
                          textAlign: "center",
                        }}
                        numberOfLines={1}
                      >
                        {u.firstName
                          ? (() => {
                              const parts = `${u.firstName} ${u.lastName || ""}`
                                .trim()
                                .split(" ");
                              const first = parts[0] || "";
                              const lastInitial =
                                parts.length > 1 && parts[1]
                                  ? parts[1][0] + "."
                                  : "";
                              return `${first} ${lastInitial}`;
                            })()
                          : "User"}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Currently Blocked List */}
            {blockedUsersData.length > 0 && (
              <View style={{ marginTop: 36 }}>
                <Text
                  style={{
                    fontWeight: "bold",
                    color: themeColors.purple,
                    fontFamily: FONTS.PRIMARY,
                    marginBottom: 8,

                    textAlign: "center",
                  }}
                >
                  Currently Blocked ({blockedUsersData.length})
                </Text>
                <ScrollView style={{ maxHeight: 200 }}>
                  {blockedUsersData.map((userData) => {
                    const checked = selectedBlockedUids.includes(userData.uid);
                    return (
                      <TouchableOpacity
                        key={userData.uid}
                        onPress={() => {
                          setSelectedBlockedUids((prev) =>
                            checked
                              ? prev.filter((uid) => uid !== userData.uid)
                              : [...prev, userData.uid]
                          );
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: themeColors.gray,
                          backgroundColor: themeColors.white,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: themeColors.purple,
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                            overflow: "hidden",
                          }}
                        >
                          {userData.profilePic ? (
                            <Image
                              source={{ uri: userData.profilePic }}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                              }}
                              resizeMode="cover"
                            />
                          ) : (
                            <User size={20} color={themeColors.white} />
                          )}
                        </View>
                        <View style={{ flex: 1, justifyContent: "center" }}>
                          <Text
                            style={{
                              color: themeColors.black,
                              fontFamily: FONTS.PRIMARY,
                              fontSize: 16,
                              textAlign: "left",
                            }}
                            numberOfLines={1}
                          >
                            {userData.firstName
                              ? (() => {
                                  const parts = `${userData.firstName} ${
                                    userData.lastName || ""
                                  }`
                                    .trim()
                                    .split(" ");
                                  const first = parts[0] || "";
                                  const lastInitial =
                                    parts.length > 1 && parts[1]
                                      ? parts[1][0] + "."
                                      : "";
                                  return `${first} ${lastInitial}`;
                                })()
                              : "User"}
                          </Text>
                        </View>
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 1,
                            borderColor: themeColors.purple,
                            backgroundColor: checked
                              ? themeColors.purple
                              : themeColors.white,
                            marginLeft: 10,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {checked && (
                            <Check
                              size={14}
                              color={themeColors.white}
                              weight="bold"
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}
        {/* Done Button */}
        <TouchableOpacity
          onPress={handleApplyMemberChanges}
          style={{
            marginTop: 16,
            backgroundColor: themeColors.purple,
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 24,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: themeColors.white,
              fontWeight: "bold",
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Done
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
