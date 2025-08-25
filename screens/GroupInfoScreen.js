import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { db, auth } from "../firebaseConfig";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";
import {
  Star,
  MapPin,
  UserPlus,
  User,
  Users,
  PlusMinus,
  PencilSimple,
  Trophy,
  Clock,
  Medal,
  Fire,
  MagnifyingGlass,
  X,
  DotsThreeVertical,
  Check, // <-- already imported
} from "phosphor-react-native";
import { LinearGradient } from "expo-linear-gradient";
import GroupShareModal from "../components/SpotDetail/GroupShareModal";
import useGroupLeaderboard from "../hooks/useGroupLeaderboard";
import { formatDuration } from "../services/focusSessions";
import CircleLoader from "../components/common/CircleLoader";
import GroupHeader from "../components/common/GroupHeader";
import { FONTS } from "../constants/fonts";

export default function GroupInfoScreen({ route, navigation }) {
  const { groupId } = route.params;
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starredNooks, setStarredNooks] = useState([]);
  const [starredNooksData, setStarredNooksData] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const [starredListWidth, setStarredListWidth] = useState(0);
  const [starredContentWidth, setStarredContentWidth] = useState(0);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [showManageMenu, setShowManageMenu] = useState(false);

  const starredListRef = useRef(null);

  // Weekly leaderboard
  const {
    leaderboard,
    loading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useGroupLeaderboard(groupId, group?.memberUids);

  // Open edit modal and pre-fill fields
  const openEditModal = () => {
    setEditName(group?.name || "");
    setEditDesc(group?.description || "");
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!group || !editName.trim()) return;
    setEditSaving(true);
    try {
      await updateDoc(doc(db, "studyGroups", group.id), {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setEditModalVisible(false);
    } catch (e) {
      Alert.alert("Error", "Failed to update group details.");
    } finally {
      setEditSaving(false);
    }
  };

  // Fetch group info and members (remove adminUids)
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
      setStarredNooks(
        Array.isArray(groupData.starredNooks) ? groupData.starredNooks : []
      );
      // Fetch member info
      const memberUids = groupData.memberUids || [];
      const blocked = Array.isArray(groupData.blockedUsers)
        ? groupData.blockedUsers
        : [];
      const users = [];
      for (const uid of memberUids) {
        // Exclude blocked users from members
        if (blocked.includes(uid)) continue;
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          users.push({ uid, ...userDoc.data() });
        }
      }
      // Move current user to end of list
      const currentUid = auth.currentUser?.uid;
      const sortedUsers = [
        ...users.filter((u) => u.uid !== currentUid),
        ...users.filter((u) => u.uid === currentUid),
      ];
      setMembers(sortedUsers);
      setLoading(false);
    });
    return () => unsub();
  }, [groupId]);

  // Fetch current user's following and followers lists
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

  // Fetch starred nooks data
  useEffect(() => {
    const fetchStarredNooksData = async () => {
      if (!starredNooks.length) {
        setStarredNooksData([]);
        return;
      }
      const uniqueIds = Array.from(new Set(starredNooks.filter(Boolean)));
      const nooks = [];
      for (const id of uniqueIds) {
        const nookDoc = await getDoc(doc(db, "studySpots", id));
        if (nookDoc.exists()) {
          nooks.push({ id, ...nookDoc.data() });
        }
      }
      setStarredNooksData(nooks);
    };
    fetchStarredNooksData();
  }, [starredNooks]);

  // Follow/unfollow member
  const handleFollow = async (uid) => {
    if (!auth.currentUser || !uid || uid === auth.currentUser.uid) return;
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        following: arrayUnion(uid),
      });
      await updateDoc(doc(db, "users", uid), {
        followers: arrayUnion(auth.currentUser.uid),
      });
      // --- Add recentActivity for followed user ---
      let meDoc;
      try {
        meDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      } catch {}
      const meName = meDoc?.exists()
        ? `${meDoc.data().firstName || ""} ${
            meDoc.data().lastName || ""
          }`.trim()
        : "User";
      const meProfilePic = meDoc?.exists()
        ? meDoc.data().profilePic || null
        : null;
      try {
        await updateDoc(doc(db, "users", uid), {
          recentActivity: arrayUnion({
            type: "followed_by",
            uid: auth.currentUser.uid,
            name: meName,
            profilePic: meProfilePic,
          }),
        });
      } catch (error) {
        if (
          error.code === "not-found" ||
          error.message.includes("No document to update")
        ) {
          await setDoc(
            doc(db, "users", uid),
            {
              recentActivity: [
                {
                  type: "followed_by",
                  uid: auth.currentUser.uid,
                  name: meName,
                  profilePic: meProfilePic,
                  createdAt: Date.now(),
                },
              ],
            },
            { merge: true }
          );
        }
      }
    } catch (e) {
      Alert.alert("Error", "Failed to follow user.");
    }
  };
  const handleUnfollow = async (uid) => {
    if (!auth.currentUser || !uid || uid === auth.currentUser.uid) return;
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        following: arrayRemove(uid),
      });
      await updateDoc(doc(db, "users", uid), {
        followers: arrayRemove(auth.currentUser.uid),
      });
    } catch (e) {
      Alert.alert("Error", "Failed to unfollow user.");
    }
  };

  // Search for users to block

  // --- Add state for manage members modal search ---
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [addingMemberUid, setAddingMemberUid] = useState(null);
  const [removingMemberUid, setRemovingMemberUid] = useState(null);

  // --- Only allow searching for friends to add as members ---
  // Friends = users who are both in following and followers
  const [mutualFriends, setMutualFriends] = useState([]);
  useEffect(() => {
    if (!auth.currentUser) return;
    // Find mutual friends from following and followers
    const mutual = (following || []).filter((uid) =>
      (followers || []).includes(uid)
    );
    setMutualFriends(mutual);
  }, [following, followers]);

  // --- Manage Members Selection State ---
  const [selectedMemberUids, setSelectedMemberUids] = useState([]);
  useEffect(() => {
    // Initialize with current members (excluding owner)
    setSelectedMemberUids(
      members.filter((m) => m.uid !== group?.createdBy).map((m) => m.uid)
    );
  }, [members, group?.createdBy]);

  // Search for users to add as members (only among mutual friends)
  const searchMembers = async (query) => {
    if (!query.trim()) {
      setMemberSearchResults([]);
      return;
    }
    setMemberSearchLoading(true);
    try {
      // Only fetch mutual friends
      if (!mutualFriends.length) {
        setMemberSearchResults([]);
        setMemberSearchLoading(false);
        return;
      }
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
        .slice(0, 10); // Limit results
      setMemberSearchResults(users);
    } catch (error) {
      setMemberSearchResults([]);
    }
    setMemberSearchLoading(false);
  };

  // --- Apply member changes when Done is clicked ---
  const handleApplyMemberChanges = async () => {
    // Compute members to add and remove
    const currentMemberUids = members
      .filter((m) => m.uid !== group?.createdBy)
      .map((m) => m.uid);
    const toAdd = selectedMemberUids.filter(
      (uid) => !currentMemberUids.includes(uid)
    );
    const toRemove = currentMemberUids.filter(
      (uid) => !selectedMemberUids.includes(uid)
    );
    if (toAdd.length === 0 && toRemove.length === 0) {
      setShowMembersModal(false);
      resetMembersModal();
      return;
    }
    Alert.alert(
      "Apply Changes",
      `Are you sure you want to update group members?\n\nAdd: ${toAdd.length}\nRemove: ${toRemove.length}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Apply",
          style: "destructive",
          onPress: async () => {
            // Add new members
            for (const uid of toAdd) {
              try {
                await updateDoc(doc(db, "studyGroups", groupId), {
                  memberUids: arrayUnion(uid),
                });
                // Add system message
                const userDoc = await getDoc(doc(db, "users", uid));
                const userName = userDoc.exists()
                  ? `${userDoc.data().firstName || ""} ${
                      userDoc.data().lastName || ""
                    }`.trim()
                  : "User";
                await addDoc(
                  collection(db, "studyGroups", groupId, "messages"),
                  {
                    type: "system",
                    text: `${userName} was added to the group.`,
                    uid,
                    createdAt: serverTimestamp(),
                  }
                );
              } catch {}
            }
            // Remove members
            for (const uid of toRemove) {
              try {
                await updateDoc(doc(db, "studyGroups", groupId), {
                  memberUids: arrayRemove(uid),
                });
                // Add system message
                const userDoc = await getDoc(doc(db, "users", uid));
                const userName = userDoc.exists()
                  ? `${userDoc.data().firstName || ""} ${
                      userDoc.data().lastName || ""
                    }`.trim()
                  : "User";
                await addDoc(
                  collection(db, "studyGroups", groupId, "messages"),
                  {
                    type: "system",
                    text: `${userName} was removed from the group.`,
                    uid,
                    createdAt: serverTimestamp(),
                  }
                );
              } catch {}
            }
            setShowMembersModal(false);
            resetMembersModal();
          },
        },
      ]
    );
  };

  // Reset modal values when modal is closed
  const resetMembersModal = () => {
    setMemberSearchQuery("");
    setMemberSearchResults([]);
    setSelectedMemberUids(
      members.filter((m) => m.uid !== group?.createdBy).map((m) => m.uid)
    );
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: themeColors.white,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircleLoader
          themeColors={themeColors}
          text="Loading group details..."
        />
      </View>
    );
  }

  // Remove the Manage Members button from the header section
  const listHeader = (
    <View style={{ padding: 0, marginBottom: 12 }}>
      {/* Group Name and Description */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          {/* Group name and pencil in a row, pencil right after name */}
          {group?.createdBy === auth.currentUser?.uid ? (
            <>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  color: themeColors.purple,
                  fontFamily: FONTS.PRIMARY,
                  marginRight: 2,
                }}
                numberOfLines={1}
              >
                {group?.name}
              </Text>
              <TouchableOpacity
                onPress={openEditModal}
                style={{
                  marginLeft: 4,
                  padding: 4,
                  borderRadius: 6,
                  backgroundColor: themeColors.white,
                  alignItems: "center",
                  justifyContent: "center",
                  height: 28,
                }}
                accessibilityLabel="Edit Group"
              >
                <PencilSimple size={20} color={themeColors.purple} />
              </TouchableOpacity>
              {/* Remove DotsThreeVertical from here */}
            </>
          ) : (
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: themeColors.purple,
                fontFamily: FONTS.PRIMARY,
              }}
              numberOfLines={1}
            >
              {group?.name}
            </Text>
          )}
        </View>
        {group?.description ? (
          <Text
            style={{
              color: themeColors.black,
              fontSize: 15,
              fontFamily: FONTS.PRIMARY,
              marginBottom: 32,
            }}
          >
            {group.description}
          </Text>
        ) : (
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 15,
              fontFamily: FONTS.PRIMARY,
              marginBottom: 32,
            }}
          >
            No description provided.
          </Text>
        )}

        {/* Weekly Leaderboard */}
        <View style={{ marginBottom: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Trophy
              size={20}
              color={themeColors.orange}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontWeight: "bold",
                color: themeColors.purple,
                fontSize: 17,
                fontFamily: FONTS.PRIMARY,
              }}
            >
              This Week's Focus Leaders
            </Text>
          </View>

          {leaderboardLoading ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <CircleLoader
                themeColors={themeColors}
                text="Loading leaderboard..."
              />
            </View>
          ) : leaderboard.length === 0 ? (
            <Text
              style={{
                color: themeColors.darkGray,
                fontFamily: FONTS.PRIMARY,
                fontStyle: "italic",
              }}
            >
              No focus activity this week yet. Start a timer to appear on the
              leaderboard!
            </Text>
          ) : (
            <View>
              {leaderboard.map((member, index) => {
                // Handle separator
                if (member.isSeparator) {
                  return (
                    <View
                      key={member.uid}
                      style={{
                        alignItems: "center",
                        paddingVertical: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: themeColors.darkGray,
                          fontFamily: FONTS.PRIMARY,
                          fontWeight: "500",
                        }}
                      >
                        ⋯
                      </Text>
                    </View>
                  );
                }

                const isCurrentUser = member.uid === auth.currentUser?.uid;
                const rank = member.rank;

                return (
                  <TouchableOpacity
                    key={member.uid}
                    onPress={() =>
                      navigation.navigate("Profile", { uid: member.uid })
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor:
                        rank === 1
                          ? themeColors.orange + "10"
                          : rank === 2
                          ? themeColors.purple + "10"
                          : isCurrentUser
                          ? themeColors.blue + "10"
                          : themeColors.gray + "50",
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: rank <= 2 || isCurrentUser ? 1 : 0,
                      borderColor:
                        rank === 1
                          ? themeColors.orange + "30"
                          : rank === 2
                          ? themeColors.purple + "30"
                          : isCurrentUser
                          ? themeColors.blue + "30"
                          : "transparent",
                    }}
                  >
                    {/* Rank */}
                    <View
                      style={{
                        width: 32,
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      {rank === 1 ? (
                        <Medal
                          size={24}
                          color={themeColors.orange}
                          weight="fill"
                        />
                      ) : rank === 2 ? (
                        <Medal
                          size={24}
                          color={themeColors.purple}
                          weight="fill"
                        />
                      ) : rank === 3 ? (
                        <Medal
                          size={24}
                          color={themeColors.darkGray}
                          weight="fill"
                        />
                      ) : (
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "bold",
                            color: isCurrentUser
                              ? themeColors.blue
                              : themeColors.darkGray,
                            fontFamily: FONTS.PRIMARY,
                          }}
                        >
                          {rank}
                        </Text>
                      )}
                    </View>

                    {/* Profile Picture */}
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: isCurrentUser
                          ? themeColors.blue
                          : themeColors.purple,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                        overflow: "hidden",
                        borderWidth: isCurrentUser ? 1 : 0,
                        borderColor: themeColors.blue,
                      }}
                    >
                      {member.profilePic ? (
                        <Image
                          source={{ uri: member.profilePic }}
                          style={{ width: 36, height: 36, borderRadius: 18 }}
                        />
                      ) : (
                        <User size={20} color={themeColors.white} />
                      )}
                    </View>

                    {/* Name and Stats */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: themeColors.black,
                          fontFamily: FONTS.PRIMARY,
                        }}
                      >
                        {isCurrentUser
                          ? "You"
                          : `${member.firstName} ${member.lastName}`}
                      </Text>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Clock
                          size={14}
                          color={themeColors.darkGray}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            color: themeColors.darkGray,
                            fontFamily: FONTS.PRIMARY,
                          }}
                        >
                          {formatDuration(member.weeklyFocusTime)} •{" "}
                          {member.weeklySessions} sessions
                        </Text>
                      </View>
                    </View>
                    {/* Fire icon and streak */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginLeft: 10,
                        minWidth: 38,
                        justifyContent: "flex-end",
                      }}
                    >
                      <Fire
                        size={22}
                        color={themeColors.orange}
                        weight="fill"
                        style={{ marginRight: 2 }}
                      />
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "bold",
                          color: themeColors.orange,
                          fontFamily: FONTS.PRIMARY,
                          minWidth: 10,
                        }}
                      >
                        {member.streak ?? 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Members Section */}
        <View style={{ marginTop: 24, marginBottom: 0 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 4,
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                color: themeColors.purple,
                fontSize: 19,
                fontFamily: FONTS.PRIMARY,
              }}
            >
              Members{" "}
              <Text
                style={{ color: themeColors.darkGray, fontWeight: "normal" }}
              >
                ({group?.memberUids?.length || members.length || 0})
              </Text>
            </Text>
            {group?.createdBy === auth.currentUser?.uid && (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("MembersManage", { groupId })
                }
                style={{ paddingVertical: 6, paddingHorizontal: 8 }}
                accessibilityLabel="Manage Members"
              >
                <Text
                  style={{
                    color: themeColors.purple,
                    fontFamily: FONTS.PRIMARY,
                    fontWeight: "bold",
                  }}
                >
                  Manage Members
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {members.length === 0 && (
            <View
              style={{
                backgroundColor: themeColors.lightGray,
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Users
                size={24}
                color={themeColors.darkGray}
                style={{ marginBottom: 8 }}
              />
              <Text
                style={{
                  color: themeColors.darkGray,
                  fontFamily: FONTS.PRIMARY,
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                No members yet
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // Add this function to handle starring/un-starring nooks
  const toggleStarNook = async (spotId) => {
    if (!groupId || !spotId) return;
    const groupRef = doc(db, "studyGroups", groupId);
    try {
      if (starredNooks.includes(spotId)) {
        await updateDoc(groupRef, {
          starredNooks: starredNooks.filter((id) => id !== spotId),
        });
      } else {
        await updateDoc(groupRef, {
          starredNooks: [...starredNooks, spotId],
        });
      }
    } catch (e) {
      Alert.alert("Error", "Failed to update starred nooks.");
    }
  };

  // --- Compose starred nooks section for FlatList footer ---
  const listFooter = (
    <View style={{ paddingHorizontal: 24 }}>
      {/* Starred Nooks */}
      <Text
        style={{
          fontWeight: "bold",
          color: themeColors.purple,
          fontSize: 17,
          fontFamily: FONTS.PRIMARY,
          marginTop: 24,
          marginBottom: 6,
        }}
      >
        Starred Nooks
      </Text>
      {starredNooksData.length === 0 ? (
        <Text
          style={{
            color: themeColors.darkGray,
            fontFamily: FONTS.PRIMARY,
            marginBottom: 90,
          }}
        >
          No starred nooks yet.
        </Text>
      ) : (
        <View
          style={{
            width: "100%",
            position: "relative",
            minHeight: 80,
            marginBottom: 90,
          }}
        >
          {showLeftGradient && (
            <LinearGradient
              colors={[themeColors.white, themeColors.white + "00"]}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 10,
                zIndex: 2,
              }}
              pointerEvents="none"
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            />
          )}
          {showRightGradient && (
            <LinearGradient
              colors={[themeColors.white + "00", themeColors.white]}
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 28,
                zIndex: 2,
              }}
              pointerEvents="none"
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            />
          )}
          <FlatList
            ref={starredListRef}
            data={starredNooksData}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            onLayout={(e) => {
              setStarredListWidth(e.nativeEvent.layout.width);
            }}
            onContentSizeChange={(w, h) => {
              setStarredContentWidth(w);
              setShowRightGradient(w > starredListWidth + 2);
              setShowLeftGradient(false);
            }}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const maxX = starredContentWidth - starredListWidth;
              setShowLeftGradient(x > 2);
              setShowRightGradient(maxX - x > 2);
            }}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingVertical: 8,
              paddingHorizontal: 0,
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("SpotDetail", { spotId: item.id })
                }
                style={{
                  backgroundColor: themeColors.lightGray,
                  borderRadius: 14,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  marginRight: 14,
                  marginBottom: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                  borderColor: themeColors.black,
                  borderWidth: 0.5,
                  minWidth: 180,
                }}
              >
                {item.photoUrl ? (
                  <Image
                    source={{ uri: item.photoUrl }}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      marginRight: 12,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      backgroundColor: themeColors.purple,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <MapPin size={32} color={themeColors.white} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: themeColors.purple,
                      fontWeight: "bold",
                      fontSize: 16,
                      fontFamily: FONTS.PRIMARY,
                      flexShrink: 1,
                    }}
                    numberOfLines={2}
                  >
                    {item.buildingName || item.name || "Nook"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleStarNook(item.id)}
                  style={{ padding: 4, marginLeft: 8 }}
                >
                  <Star
                    size={22}
                    color={themeColors.purple}
                    weight={starredNooks.includes(item.id) ? "fill" : "regular"}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );

  // --- Main FlatList for members, with header/footer for group info and starred nooks ---
  return (
    <>
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
        {/* Header */}
        <GroupHeader
          navigation={navigation}
          groupName={"Group Details"}
          themeColors={themeColors}
          showMenuButton={false}
        />

        {/* --- Edit Group Modal (owner only) --- */}
        {group?.createdBy === auth.currentUser?.uid && (
          <Modal
            visible={editModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setEditModalVisible(false)}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.3)",
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={1}
              onPressOut={() => setEditModalVisible(false)}
            >
              <View
                style={{
                  backgroundColor: themeColors.white,
                  borderRadius: 16,
                  padding: 24,
                  width: "85%",
                  maxWidth: 400,
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
                  Edit Group Details
                </Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Group Name"
                  style={{
                    borderWidth: 1,
                    borderColor: themeColors.darkGray,
                    borderRadius: 8,
                    padding: 10,
                    width: "100%",
                    marginBottom: 10,
                    color: themeColors.black,
                    fontFamily: FONTS.PRIMARY,
                    fontSize: 16,
                  }}
                  placeholderTextColor={themeColors.darkGray}
                  maxLength={50}
                />
                <TextInput
                  value={editDesc}
                  onChangeText={setEditDesc}
                  placeholder="Description (optional)"
                  style={{
                    borderWidth: 1,
                    borderColor: themeColors.darkGray,
                    borderRadius: 8,
                    padding: 10,
                    width: "100%",
                    marginBottom: 10,
                    color: themeColors.black,
                    fontFamily: FONTS.PRIMARY,
                    fontSize: 15,
                  }}
                  placeholderTextColor={themeColors.darkGray}
                  maxLength={50}
                />
                <View
                  style={{ flexDirection: "row", marginTop: 8, width: "100%" }}
                >
                  <TouchableOpacity
                    onPress={() => setEditModalVisible(false)}
                    style={{
                      flex: 1,
                      backgroundColor: themeColors.white,
                      borderColor: themeColors.purple,
                      borderWidth: 1,
                      borderRadius: 8,
                      alignItems: "center",
                      paddingVertical: 10,
                      marginRight: 8,
                    }}
                    disabled={editSaving}
                  >
                    <Text
                      style={{
                        color: themeColors.purple,
                        fontWeight: "bold",
                        fontFamily: FONTS.PRIMARY,
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={editSaving || !editName.trim()}
                    style={{
                      flex: 1,
                      backgroundColor: themeColors.purple,
                      borderRadius: 8,
                      paddingVertical: 10,
                      alignItems: "center",
                      marginLeft: 8,
                      opacity: editSaving ? 0.7 : 1,
                    }}
                  >
                    <Text
                      style={{
                        color: themeColors.white,
                        fontWeight: "bold",
                        fontFamily: FONTS.PRIMARY,
                      }}
                    >
                      {editSaving ? "Saving..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Main FlatList */}
        <FlatList
          style={{ flex: 1, backgroundColor: themeColors.white }}
          showsVerticalScrollIndicator={false}
          data={members}
          keyExtractor={(item) => item.uid}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
                paddingHorizontal: 24,
              }}
            >
              {/* Make pfp clickable */}
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Profile", { uid: item.uid })
                }
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
                  />
                ) : (
                  <User size={22} color={themeColors.white} />
                )}
              </TouchableOpacity>
              {/* Make name clickable */}
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Profile", { uid: item.uid })
                }
                style={{ flex: 1 }}
              >
                <Text
                  style={{
                    color: themeColors.black,
                    fontSize: 16,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {item.uid !== auth.currentUser?.uid && (
                    <Text style={{ color: themeColors.purple }}>
                      {/* Show first name and last initial */}
                      {item.firstName}{" "}
                      {item.lastName && item.lastName.length > 0
                        ? item.lastName[0] + "."
                        : ""}
                    </Text>
                  )}
                  {item.uid === auth.currentUser?.uid && (
                    <Text style={{ color: themeColors.purple }}>You</Text>
                  )}
                  {group?.createdBy === item.uid && (
                    <Text style={{ color: themeColors.purple }}> (Owner)</Text>
                  )}
                </Text>
              </TouchableOpacity>
              {item.uid !== auth.currentUser?.uid && (
                <TouchableOpacity
                  onPress={() => {
                    const isFollowing = following.includes(item.uid);
                    const isFriend = followers.includes(item.uid);

                    if (isFollowing) {
                      // Show confirmation for unfollow
                      const alertTitle = isFriend
                        ? "Unfollow Friend"
                        : "Unfollow User";
                      const alertMessage = isFriend
                        ? "Are you sure you want to unfollow this friend?"
                        : "Are you sure you want to unfollow this user?";

                      Alert.alert(alertTitle, alertMessage, [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Unfollow",
                          style: "destructive",
                          onPress: () => handleUnfollow(item.uid),
                        },
                      ]);
                    } else {
                      handleFollow(item.uid);
                    }
                  }}
                  disabled={followingLoading}
                  style={{
                    backgroundColor: themeColors.purple,
                    borderRadius: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                    opacity: followingLoading ? 0.6 : 1,
                    width: 100,
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.white,
                      fontWeight: "bold",
                      fontSize: 14,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    {following.includes(item.uid)
                      ? followers.includes(item.uid)
                        ? "Friends"
                        : "Following"
                      : "Follow"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text
              style={{
                color: themeColors.darkGray,
                fontFamily: FONTS.PRIMARY,
                marginBottom: 12,
                paddingHorizontal: 24,
              }}
            >
              No members.
            </Text>
          }
        />
      </SafeAreaView>
    </>
  );
}
