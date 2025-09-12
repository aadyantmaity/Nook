import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";
import { db, auth } from "../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  setDoc,
} from "firebase/firestore";
import { addFollowActivity } from "../utils/followActivity";
import {
  MagnifyingGlass,
  User,
  ArrowLeft,
  ArrowClockwise,
  MapPin,
} from "phosphor-react-native";
import { FONTS } from "../constants/fonts";

export default function SearchView() {
  const navigation = useNavigation();
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  // --- Split search state ---
  const [searchType, setSearchType] = useState("people"); // "people" | "nooks"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedPeople, setSuggestedPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allNooks, setAllNooks] = useState([]);
  const [suggestedNooks, setSuggestedNooks] = useState([]);

  // Fetch current user's following list, all users, and all nooks
  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;

      try {
        // Get current user's following and followers lists
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const userFollowing = userDoc.exists()
          ? userDoc.data().following || []
          : [];
        const userFollowers = userDoc.exists()
          ? userDoc.data().followers || []
          : [];
        setFollowing(userFollowing);
        setFollowers(userFollowers);

        // Get all users
        const usersSnap = await getDocs(collection(db, "users"));
        const users = usersSnap.docs
          .map((doc) => ({ uid: doc.id, ...doc.data() }))
          .filter((user) => user.uid !== auth.currentUser.uid); // Exclude current user

        setAllUsers(users);

        // Get all nooks (study spots)
        const nooksSnap = await getDocs(collection(db, "studySpots"));
        const nooks = nooksSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllNooks(nooks);

        // Generate suggested people
        const suggested = generateSuggestedPeople(users, userFollowing);
        setSuggestedPeople(suggested);

        // Generate suggested nooks (random 6)
        setSuggestedNooks(
          nooks
            .filter((n) => !n.privateNook)
            .sort(() => Math.random() - 0.5)
            .slice(0, 6)
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Generate suggested people - randomized list of 8 people
  const generateSuggestedPeople = (users, userFollowing) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return [];
    const availableUsers = users.filter(
      (user) => !userFollowing.includes(user.uid)
    );
    const shuffled = [...availableUsers].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8);
  };

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const query = searchQuery.toLowerCase();

    if (searchType === "people") {
      const results = allUsers.filter((user) => {
        const firstName = (user.firstName || "").toLowerCase();
        const lastName = (user.lastName || "").toLowerCase();
        return (
          firstName.includes(query) ||
          lastName.includes(query) ||
          `${firstName} ${lastName}`.includes(query)
        );
      });
      setSearchResults(results.slice(0, 5));
    } else {
      // Nooks search
      const results = allNooks.filter((nook) => {
        if (nook.privateNook) return false; // Hide private nooks from global search
        const name = (nook.buildingName || nook.name || "").toLowerCase();
        const address = (nook.address || "").toLowerCase();
        const roomNumber = (nook.roomNumber || "").toLowerCase();
        return (
          name.includes(query) ||
          address.includes(query) ||
          roomNumber.includes(query)
        );
      });
      setSearchResults(results.slice(0, 8));
    }
    setLoading(false);
  }, [searchQuery, allUsers, allNooks, searchType]);

  // Follow/unfollow functionality
  const handleFollow = async (uid) => {
    if (!auth.currentUser || !uid || uid === auth.currentUser.uid) return;

    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        following: arrayUnion(uid),
      });
      await updateDoc(doc(db, "users", uid), {
        followers: arrayUnion(auth.currentUser.uid),
      });

      setFollowing((prev) => [...prev, uid]);

      // Add follow activity to the followed user's recentActivity
      try {
        const currentUserDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (currentUserDoc.exists()) {
          const currentUserData = currentUserDoc.data();
          const followerDisplayName = `${currentUserData.firstName || ""} ${currentUserData.lastName || ""}`.trim();
          await addFollowActivity(uid, auth.currentUser.uid, followerDisplayName);
        }
      } catch (activityError) {
        console.error("Error adding follow activity:", activityError);
        // Don't show error to user, just log it
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

      setFollowing((prev) => prev.filter((id) => id !== uid));
    } catch (e) {
      Alert.alert("Error", "Failed to unfollow user.");
    }
  };

  // Render user item
  const renderUserItem = ({
    item,
    showMutualCount = false,
    isGrid = false,
  }) => (
    <TouchableOpacity
      style={{
        flexDirection: isGrid ? "column" : "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: isGrid ? 8 : 16,
        backgroundColor: themeColors.white,
        flex: isGrid ? 1 : undefined,
        margin: isGrid ? 8 : 0,
        borderRadius: isGrid ? 8 : 0,
        borderWidth: isGrid ? 1 : 0,
        borderColor: isGrid ? themeColors.darkGray + "70" : "transparent",
        ...(isGrid
          ? {
              shadowColor: themeColors.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 3,
              elevation: 3,
              position: "relative",
              borderColor: themeColors.darkGray + "50",
              borderWidth: 0.5,
            }
          : {}),
      }}
      onPress={() => navigation.navigate("Profile", { uid: item.uid })}
    >
      {/* Profile Picture */}
      <View
        style={{
          width: isGrid ? 40 : 30,
          height: isGrid ? 40 : 30,
          borderRadius: isGrid ? 20 : 15,
          backgroundColor: themeColors.purple,
          alignItems: "center",
          justifyContent: "center",
          marginRight: isGrid ? 0 : 12,
          marginBottom: isGrid ? 8 : 0,
          overflow: "hidden",
        }}
      >
        {item.profilePic ? (
          <Image
            source={{ uri: item.profilePic }}
            style={{
              width: isGrid ? 40 : 30,
              height: isGrid ? 40 : 30,
              borderRadius: isGrid ? 20 : 15,
            }}
            resizeMode="cover"
          />
        ) : (
          <User size={isGrid ? 28 : 24} color={themeColors.white} />
        )}
      </View>

      {/* User Info */}
      <View style={{ flex: 1, alignItems: isGrid ? "center" : "flex-start" }}>
        <Text
          style={{
            color: themeColors.black,
            fontSize: isGrid ? 14 : 16,
            fontWeight: "bold",
            fontFamily: FONTS.PRIMARY,
            textAlign: isGrid ? "center" : "left",
            marginBottom: isGrid ? 8 : 0,
          }}
          numberOfLines={isGrid ? 2 : 1}
        >
          {item.firstName} {item.lastName}
        </Text>
      </View>

      {/* Follow/Unfollow Button */}
      <TouchableOpacity
        style={{
          backgroundColor: themeColors.purple,
          borderRadius: 6,
          paddingVertical: isGrid ? 6 : 8,
          paddingHorizontal: isGrid ? 12 : 16,
          alignItems: "center",
          width: isGrid ? "100%" : 100,
        }}
        onPress={() => {
          const isFollowing = following.includes(item.uid);
          const isFriend = followers.includes(item.uid);

          if (isFollowing) {
            // Show confirmation for unfollow
            const alertTitle = isFriend ? "Unfollow Friend" : "Unfollow User";
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
      >
        <Text
          style={{
            color: themeColors.white,
            fontWeight: "bold",
            fontSize: isGrid ? 12 : 14,
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
    </TouchableOpacity>
  );

  // Render nook item
  const renderNookItem = ({ item }) => (
    <TouchableOpacity
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: themeColors.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: themeColors.darkGray + "50",
        marginHorizontal: 8,
        marginVertical: 6,
        shadowColor: themeColors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
      }}
      onPress={() => navigation.navigate("SpotDetail", { spotId: item.id })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          backgroundColor: themeColors.purple,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
          overflow: "hidden",
        }}
      >
        {item.photoUrl ? (
          <Image
            source={{ uri: item.photoUrl }}
            style={{ width: 44, height: 44, borderRadius: 8 }}
            resizeMode="cover"
          />
        ) : (
          <MapPin size={28} color={themeColors.white} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: themeColors.black,
            fontSize: 16,
            fontWeight: "bold",
            fontFamily: FONTS.PRIMARY,
          }}
          numberOfLines={1}
        >
          {item.buildingName || item.name || "Nook"}
        </Text>
        {item.roomNumber && (
          <Text
            style={{
              color: themeColors.purple,
              fontSize: 13,
              fontFamily: FONTS.PRIMARY,
              fontWeight: "600",
            }}
          >
            Floor {item.roomNumber}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: themeColors.white, paddingTop: 48 }}
    >
      {/* Header with Back Arrow and Switcher as Title */}
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 12,
          marginTop: 16,
          position: "relative",
          justifyContent: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => {
            // If we can go back, do so. Otherwise, navigate to Home
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Home");
            }
          }}
          style={{
            position: "absolute",
            left: 4,
            zIndex: 1,
            padding: 10,
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
        >
          <ArrowLeft size={24} color={themeColors.purple} />
        </TouchableOpacity>
        {/* Switcher as Title */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={() => setSearchType("people")}
            style={{
              backgroundColor:
                searchType === "people"
                  ? themeColors.purple
                  : themeColors.lightGray,
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 22,
              marginRight: 2,
            }}
          >
            <Text
              style={{
                color:
                  searchType === "people"
                    ? themeColors.white
                    : themeColors.purple,
                fontWeight: "bold",
                fontFamily: FONTS.PRIMARY,
                fontSize: 15,
              }}
            >
              People
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSearchType("nooks")}
            style={{
              backgroundColor:
                searchType === "nooks"
                  ? themeColors.purple
                  : themeColors.lightGray,
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 22,
              marginLeft: 2,
            }}
          >
            <Text
              style={{
                color:
                  searchType === "nooks"
                    ? themeColors.white
                    : themeColors.purple,
                fontWeight: "bold",
                fontFamily: FONTS.PRIMARY,
                fontSize: 15,
              }}
            >
              Nooks
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: themeColors.white,
          borderRadius: 10,
          margin: 16,
          marginTop: 8,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: themeColors.darkGray,
          height: 44,
        }}
      >
        <MagnifyingGlass
          size={20}
          color={themeColors.darkGray}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={{
            flex: 1,
            fontSize: 16,
            color: themeColors.black,
            height: 44,
            fontFamily: FONTS.PRIMARY,
            paddingVertical: 0,
          }}
          placeholder={
            searchType === "people" ? "Search people..." : "Search nooks..."
          }
          placeholderTextColor={themeColors.darkGray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Content */}
      {searchQuery.trim() === "" ? (
        <View style={{ flex: 1 }}>
          {searchType === "people" ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginHorizontal: 16,
                  marginBottom: 6,
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: themeColors.purple,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Suggested People
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSuggestedPeople(
                      generateSuggestedPeople(allUsers, following)
                    );
                  }}
                  style={{
                    marginLeft: 0,
                    padding: 4,
                    borderRadius: 16,
                    backgroundColor: themeColors.white,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityLabel="Refresh suggestions"
                >
                  <ArrowClockwise size={20} color={themeColors.purple} />
                </TouchableOpacity>
              </View>
              <FlatList
                key="suggested-grid-2-cols"
                data={suggestedPeople}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) =>
                  renderUserItem({ item, showMutualCount: true, isGrid: true })
                }
                numColumns={2}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 90,
                  paddingHorizontal: 12,
                }}
                columnWrapperStyle={{ justifyContent: "space-between" }}
              />
            </>
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginHorizontal: 16,
                  marginBottom: 6,
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: themeColors.purple,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Suggested Nooks
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSuggestedNooks(
                      allNooks
                        .filter((n) => !n.privateNook)
                        .sort(() => Math.random() - 0.5)
                        .slice(0, 6)
                    );
                  }}
                  style={{
                    marginLeft: 0,
                    padding: 4,
                    borderRadius: 16,
                    backgroundColor: themeColors.white,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityLabel="Refresh suggestions"
                >
                  <ArrowClockwise size={20} color={themeColors.purple} />
                </TouchableOpacity>
              </View>
              <FlatList
                key="suggested-nooks"
                data={suggestedNooks}
                keyExtractor={(item) => item.id}
                renderItem={renderNookItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: 90,
                  paddingHorizontal: 8,
                }}
                numColumns={1}
              />
            </>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <ActivityIndicator color={themeColors.purple} />
            </View>
          ) : (
            <>
              {searchType === "people" ? (
                <FlatList
                  key="search-list"
                  data={searchResults}
                  keyExtractor={(item) => item.uid}
                  renderItem={({ item }) => renderUserItem({ item })}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <FlatList
                  key="search-nooks"
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  renderItem={renderNookItem}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}
