import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { db, auth } from "../firebaseConfig";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";
import {
  ArrowLeft,
  Star,
  MapPin,
  UserPlus,
  UserCheck,
} from "phosphor-react-native";
import { LinearGradient } from "expo-linear-gradient";

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
  const starredListRef = useRef(null);

  // Fetch group info and members
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
      setMembers(users);
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
              fontFamily: "CarosSoft",
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
        fontFamily: "CarosSoft",
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
        <ActivityIndicator color={themeColors.purple} />
      </View>
    );
  }

  // Remove the old header bar from listHeader (since header is now in navigation)
  const listHeader = (
    <View style={{ padding: 0, marginBottom: 12 }}>
      {/* Group Name and Description */}
      <View style={{ paddingHorizontal: 24 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            color: themeColors.purple,
            fontFamily: "CarosSoft",
            marginBottom: 8,
          }}
        >
          {group?.name}
        </Text>
        {group?.description ? (
          <Text
            style={{
              color: themeColors.black,
              fontSize: 15,
              fontFamily: "CarosSoft",
              marginBottom: 32,
            }}
          >
            {group.description}
          </Text>
        ) : null}
        {/* Members */}
        <Text
          style={{
            fontWeight: "bold",
            color: themeColors.purple,
            fontSize: 17,
            fontFamily: "CarosSoft",
            marginBottom: 6,
          }}
        >
          Members{" "}
          {("(" + group?.memberUids?.length || members.length || 0) + ")"}
        </Text>
        {members.length === 0 ? (
          <Text
            style={{
              color: themeColors.darkGray,
              fontFamily: "CarosSoft",
              marginBottom: 12,
            }}
          >
            No members.
          </Text>
        ) : null}
      </View>
    </View>
  );

  // --- Compose leaderboard and starred nooks section for FlatList footer ---
  const listFooter = (
    <View style={{ paddingHorizontal: 24 }}>
      {/* Leaderboard (placeholder) */}
      <Text
        style={{
          fontWeight: "bold",
          color: themeColors.purple,
          fontSize: 17,
          fontFamily: "CarosSoft",
          marginTop: 24,
          marginBottom: 6,
        }}
      >
        Leaderboard
      </Text>
      <Text
        style={{
          color: themeColors.darkGray,
          fontFamily: "CarosSoft",
          marginBottom: 12,
        }}
      >
        (Coming soon)
      </Text>
      {/* Starred Nooks */}
      <Text
        style={{
          fontWeight: "bold",
          color: themeColors.purple,
          fontSize: 17,
          fontFamily: "CarosSoft",
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
            fontFamily: "CarosSoft",
            marginBottom: 12,
          }}
        >
          No starred nooks yet.
        </Text>
      ) : (
        <View style={{ width: "100%", position: "relative", minHeight: 80 }}>
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
                {item.photoURL ? (
                  <Image
                    source={{ uri: item.photoURL }}
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
                    <MapPin size={32} color={themeColors.white} weight="bold" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: themeColors.purple,
                      fontWeight: "bold",
                      fontSize: 16,
                      fontFamily: "CarosSoft",
                      flexShrink: 1,
                    }}
                    numberOfLines={2}
                  >
                    {item.buildingName || item.name || "Nook"}
                  </Text>
                </View>
                <Star
                  size={22}
                  color={themeColors.purple}
                  weight="fill"
                  style={{ marginLeft: 12 }}
                />
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );

  // --- Main FlatList for members, with header/footer for group info and starred nooks ---
  return (
    <FlatList
      style={{ flex: 1, backgroundColor: themeColors.white }}
      contentContainerStyle={{ paddingTop: 32 }}
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
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: themeColors.gray,
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
              <UserCheck size={22} color={themeColors.purple} />
            )}
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile", { uid: item.uid })}
            style={{ flex: 1 }}
          >
            <Text
              style={{
                color: themeColors.black,
                fontSize: 16,
                fontFamily: "CarosSoft",
              }}
            >
              {item.firstName} {item.lastName}
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
                }}
              >
                <Text
                  style={{
                    color: themeColors.white,
                    fontWeight: "bold",
                    fontSize: 14,
                    fontFamily: "CarosSoft",
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
                }}
              >
                <Text
                  style={{
                    color: themeColors.white,
                    fontWeight: "bold",
                    fontSize: 14,
                    fontFamily: "CarosSoft",
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
            fontFamily: "CarosSoft",
            marginBottom: 12,
            paddingHorizontal: 24,
          }}
        >
          No members.
        </Text>
      }
    />
  );
}
