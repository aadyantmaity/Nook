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
import { MagnifyingGlass, User, ArrowLeft } from "phosphor-react-native";
import { FONTS } from "../constants/fonts";

export default function SearchView() {
  const navigation = useNavigation();
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedPeople, setSuggestedPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Fetch current user's following list and all users
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

        // Generate suggested people
        const suggested = generateSuggestedPeople(users, userFollowing);
        setSuggestedPeople(suggested);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Generate suggested people - randomized list of 6 people
  const generateSuggestedPeople = (users, userFollowing) => {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return [];

    // Filter out current user and people already being followed
    const availableUsers = users.filter(
      (user) => !userFollowing.includes(user.uid)
    );

    // Shuffle the array and take first 6
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

    const results = allUsers.filter((user) => {
      const firstName = (user.firstName || "").toLowerCase();
      const lastName = (user.lastName || "").toLowerCase();

      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        `${firstName} ${lastName}`.includes(query)
      );
    });

    setSearchResults(results.slice(0, 5)); // Limit to 5 results
    setLoading(false);
  }, [searchQuery, allUsers]);

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

      // Add recent activity for followed user
      const meDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
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
        margin: isGrid ? 4 : 0,
        borderRadius: isGrid ? 8 : 0,
        borderWidth: isGrid ? 1 : 0,
        borderColor: isGrid ? themeColors.darkGray + "70" : "transparent",
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

  return (
    <View
      style={{ flex: 1, backgroundColor: themeColors.white, paddingTop: 48 }}
    >
      {/* Header */}
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          marginBottom: 24,
          marginTop: 16,
          position: "relative",
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
          placeholder="Search people..."
          placeholderTextColor={themeColors.darkGray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Content */}
      {searchQuery.trim() === "" ? (
        /* Suggested People */
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple,
              marginHorizontal: 16,
              marginBottom: 12,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Suggested for you
          </Text>
          <FlatList
            key="suggested-grid-2-cols"
            data={suggestedPeople}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) =>
              renderUserItem({ item, showMutualCount: true, isGrid: true })
            }
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 90, paddingHorizontal: 12 }}
            columnWrapperStyle={{ justifyContent: "space-between" }}
          />
        </View>
      ) : (
        /* Search Results */
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <ActivityIndicator color={themeColors.purple} />
            </View>
          ) : (
            <>
              <FlatList
                key="search-list"
                data={searchResults}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => renderUserItem({ item })}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}
