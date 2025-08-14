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
} from "firebase/firestore";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";
import {
  ArrowLeft,
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
} from "phosphor-react-native";
import { LinearGradient } from "expo-linear-gradient";
import GroupShareModal from "../components/SpotDetail/GroupShareModal";
import useGroupLeaderboard from "../hooks/useGroupLeaderboard";
import { formatDuration } from "../services/focusSessions";
import CircleLoader from "../components/common/CircleLoader";
import { FONTS } from "../constants/fonts";

export default function GroupDetailsScreen({ route, navigation }) {
  const { groupId } = route.params;
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starredNooks, setStarredNooks] = useState([]);
  const [starredNooksData, setStarredNooksData] = useState([]);
  const [following, setFollowing] = useState([]);
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
      const users = [];
      for (const uid of memberUids) {
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

  // Fetch current user's following list
  useEffect(() => {
    if (!auth.currentUser) return;
    setFollowingLoading(true);
    const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (snap) => {
      setFollowing(snap.exists() ? snap.data().following || [] : []);
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
            createdAt: Date.now(),
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

  // Set navigation header to match GroupDetailView (no DotsThreeVertical)
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple,
              fontFamily: FONTS.PRIMARY,
              textAlign: "center",
              maxWidth: 200,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Group Details
          </Text>
        </View>
      ),
      headerTitleAlign: "center",
      headerStyle: {
        backgroundColor: themeColors.white,
        shadowColor: "transparent",
        elevation: 0,
      },
      headerTitleStyle: {
        color: themeColors.purple,
        fontWeight: "bold",
        fontFamily: FONTS.PRIMARY,
        fontSize: 18,
      },
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={24} color={themeColors.purple} />
        </TouchableOpacity>
      ),
      headerRight: () => null, // No DotsThreeVertical
    });
  }, [navigation, group, themeColors, members.length]);

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
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: themeColors.purple,
              fontFamily: FONTS.PRIMARY,
              marginBottom: 8,
              flex: 1,
            }}
          >
            {group?.name}
          </Text>
          {/* Show edit button for owner */}
          {group?.createdBy === auth.currentUser?.uid && (
            <TouchableOpacity
              onPress={openEditModal}
              style={{
                marginLeft: 8,
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
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Members row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              color: themeColors.purple,
              fontSize: 17,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Members{" "}
            {("(" + group?.memberUids?.length || members.length || 0) + ")"}
          </Text>
          {group?.createdBy === auth.currentUser?.uid && (
            <TouchableOpacity
              onPress={() => setShowMembersModal(true)}
              style={{
                marginLeft: 8,
                padding: 4,
                borderRadius: 6,
                backgroundColor: themeColors.white,
                alignItems: "center",
                justifyContent: "center",
                height: 28, // Ensures vertical centering with text
              }}
              accessibilityLabel="Manage Members"
            >
              <PlusMinus size={22} color={themeColors.purple} style={{}} />
            </TouchableOpacity>
          )}
        </View>

        {members.length === 0 ? (
          <Text
            style={{
              color: themeColors.darkGray,
              fontFamily: FONTS.PRIMARY,
              marginBottom: 12,
            }}
          >
            No members.
          </Text>
        ) : null}
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
      {/* Manage Members Modal (owner only, uses PrivateNookShareModal in group mode) */}
      {group?.createdBy === auth.currentUser?.uid && (
        <GroupShareModal
          visible={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          spotId={groupId}
          themeColors={themeColors}
          ownerUid={group?.createdBy}
          collectionName="studyGroups"
          fieldName="memberUids"
        />
      )}
      {/* Main FlatList */}
      <FlatList
        style={{ flex: 1, backgroundColor: themeColors.white }}
        contentContainerStyle={{ paddingTop: 32 }}
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
              onPress={() => navigation.navigate("Profile", { uid: item.uid })}
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
              onPress={() => navigation.navigate("Profile", { uid: item.uid })}
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
            {item.uid !== auth.currentUser?.uid &&
              (following.includes(item.uid) ? (
                <TouchableOpacity
                  onPress={() => handleUnfollow(item.uid)}
                  disabled={followingLoading}
                  style={{
                    backgroundColor: themeColors.red,
                    borderRadius: 6,
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                    opacity: followingLoading ? 0.6 : 1,
                    minWidth: 80, // <-- ensure same width
                    width: 90, // <-- set fixed width for both buttons
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
                    Unfollow
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => handleFollow(item.uid)}
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
                    minWidth: 80, // <-- ensure same width
                    width: 90, // <-- set fixed width for both buttons
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
                    Follow
                  </Text>
                </TouchableOpacity>
              ))}
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
    </>
  );
}
