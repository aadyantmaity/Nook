import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { signOut } from "firebase/auth";
import { colors } from "../constants/colors";
import {
  ArrowLeft,
  SignOut,
  PencilSimple,
  Envelope,
  GraduationCap,
  Heart,
  CaretDown,
  CaretRight,
  User,
} from "phosphor-react-native";
import { ThemeContext } from "../App";
import * as ImagePicker from "expo-image-picker";
import { getLastUpdatedLabel } from "../utils/lastUpdatedLabel";

// Hooks and components
import { useProfileData } from "../hooks/useProfileData";
import useFavoriteSpots from "../hooks/useFavoriteSpots";
import useStudyStats from "../hooks/useStudyStats";
import ProfilePicture from "../components/Profile/ProfilePicture";
import FavoriteSpotCard from "../components/Profile/FavoriteSpotCard";
import LogoutModal from "../components/Profile/LogoutModal";
import EditProfileModal from "../components/Profile/EditProfileModal";
import FollowersModal from "../components/Profile/FollowersModal";
import FollowingModal from "../components/Profile/FollowingModal";
import UnfollowConfirmModal from "../components/Profile/UnfollowConfirmModal";
import { auth } from "../firebaseConfig";
import { FlatList } from "react-native-gesture-handler";

export default function ProfileScreen({ navigation, route }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  // --- Use uid from route.params if present ---
  const targetUid = route?.params?.uid || null;
  const currentUserUid = auth.currentUser?.uid;

  // Add this line to fix the error
  const isOwnProfile = !targetUid || targetUid === currentUserUid;

  // Profile data
  const {
    firstName,
    lastName,
    userEmail,
    userGradYear,
    profilePic,
    isLoading,
    followers,
    following,
    isFollowing,
    setFirstName,
    setLastName,
    setUserGradYear,
    setProfilePic,
    fetchUserData,
    saveProfile,
    followUser,
    unfollowUser,
  } = useProfileData(targetUid);

  // Favorites: pass targetUid to useFavoriteSpots
  const {
    favoriteSpots,
    favoriteSpotsLoading,
    cachedFavoriteSpotImages,
    fetchFavoriteSpots,
  } = useFavoriteSpots(targetUid);

  // Study stats
  const { studyStats, fetchStudyStats } = useStudyStats(targetUid);

  // UI state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [editedGradYear, setEditedGradYear] = useState("");
  const [editedProfilePic, setEditedProfilePic] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [favoritesExpanded, setFavoritesExpanded] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [userList, setUserList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [unfollowingUid, setUnfollowingUid] = useState(null);
  const [unfollowConfirmVisible, setUnfollowConfirmVisible] = useState(false);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    await fetchFavoriteSpots();
    await fetchStudyStats();
    setRefreshing(false);
  };

  // Logout
  const handleLogout = () => setLogoutModalVisible(true);
  const confirmLogout = () => {
    setLogoutModalVisible(false);
    signOut(auth).catch((error) => {});
  };

  // Save profile
  const handleSaveProfile = async () => {
    await saveProfile({
      editedFirstName,
      editedLastName,
      editedGradYear,
      editedProfilePic,
    });
    setIsModalVisible(false);
  };

  // Pick profile pic
  const handlePickProfilePic = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.cancelled) {
      const asset = result.assets ? result.assets[0] : result;
      setEditedProfilePic(asset.uri);
    }
  };

  // Fetch user list for followers/following
  const fetchUserList = async (userIds) => {
    setListLoading(true);
    try {
      const { db } = await import("../firebaseConfig");
      const { getDoc, doc } = await import("firebase/firestore");
      const users = [];
      for (const id of userIds) {
        const userDoc = await getDoc(doc(db, "users", id));
        if (userDoc.exists()) {
          const d = userDoc.data();
          users.push({ uid: id, name: `${d.firstName} ${d.lastName}` });
        }
      }
      setUserList(users);
    } catch {}
    setListLoading(false);
  };

  const openFollowers = async () => {
    await fetchUserList(followers);
    setShowFollowersModal(true);
  };
  const openFollowing = async () => {
    await fetchUserList(following);
    setShowFollowingModal(true);
  };

  // Unfollow handler for modal
  const handleUnfollowFromModal = async (uid) => {
    setUnfollowingUid(uid);
    try {
      const { db, auth } = await import("../firebaseConfig");
      const { updateDoc, arrayRemove, doc, getDoc } = await import(
        "firebase/firestore"
      );
      const user = auth.currentUser;
      if (!user || !uid || user.uid === uid) return;
      await updateDoc(doc(db, "users", user.uid), {
        following: arrayRemove(uid),
      });
      await updateDoc(doc(db, "users", uid), {
        followers: arrayRemove(user.uid),
      });
      setUserList((prev) => prev.filter((u) => u.uid !== uid));
      // No need to call fetchUserData, live updates now
      // --- Refresh the userList from Firestore to ensure up-to-date ---
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const updatedFollowing = userDoc.data().following || [];
        await fetchUserList(updatedFollowing);
      }
    } catch {}
    setUnfollowingUid(null);
  };

  // --- New: Unfollow confirmation for main profile button ---
  const handleUnfollowButton = () => {
    setUnfollowConfirmVisible(true);
  };
  const confirmUnfollow = async () => {
    setUnfollowConfirmVisible(false);
    await unfollowUser();
    // No need to call fetchUserData, live updates now
  };

  if (isLoading) return null;

  return (
    <View
      style={{ flex: 1, backgroundColor: themeColors.white, paddingTop: 48 }}
    >
      {/* Logout Modal */}
      <LogoutModal
        visible={logoutModalVisible}
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={confirmLogout}
        themeColors={themeColors}
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <View style={{ flex: 0.2, marginTop: -8 }}>
          <TouchableOpacity
            style={[styles.backButton, { top: 8 }]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color={themeColors.purple} />
          </TouchableOpacity>
        </View>
        {/* Profile Picture */}
        <View
          style={[
            styles.profilePictureContainer,
            { backgroundColor: themeColors.purple },
          ]}
        >
          <ProfilePicture
            profilePic={profilePic}
            onPick={handlePickProfilePic}
            themeColors={themeColors}
          />
        </View>
        {/* Profile Details */}
        <View style={styles.profileContainer}>
          <Text
            style={[
              styles.userName,
              { color: themeColors.black, fontFamily: "CarosSoft" },
            ]}
          >
            {firstName} {lastName}
          </Text>
          <View style={styles.detailRow}>
            <Envelope size={20} color={themeColors.purple} />
            <Text
              style={[
                styles.userEmail,
                { color: themeColors.black, fontFamily: "CarosSoft" },
              ]}
            >
              {userEmail}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <GraduationCap size={20} color={themeColors.purple} />
            <Text
              style={[
                styles.userGradYear,
                { color: themeColors.black, fontFamily: "CarosSoft" },
              ]}
            >
              {userGradYear}
            </Text>
          </View>
          {/* Followers/Following Row */}
          <View style={styles.followRow}>
            <TouchableOpacity
              style={styles.followColumn}
              onPress={openFollowers}
              disabled={followers.length === 0}
            >
              <Text
                style={[
                  styles.followLabel,
                  { color: themeColors.darkGray, fontFamily: "CarosSoft" },
                ]}
              >
                Followers
              </Text>
              <Text
                style={[
                  styles.followCount,
                  { color: themeColors.black, fontFamily: "CarosSoft" },
                ]}
              >
                {followers.length}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.followColumn}
              onPress={openFollowing}
              disabled={following.length === 0}
            >
              <Text
                style={[
                  styles.followLabel,
                  { color: themeColors.darkGray, fontFamily: "CarosSoft" },
                ]}
              >
                Following
              </Text>
              <Text
                style={[
                  styles.followCount,
                  { color: themeColors.black, fontFamily: "CarosSoft" },
                ]}
              >
                {following.length}
              </Text>
            </TouchableOpacity>
          </View>
          {/* Study Stats */}
          <View
            style={{
              width: "100%",
              borderRadius: 12,
              padding: 14,
              marginTop: 18,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 16,
                color: themeColors.purple,
                marginBottom: 6,
                fontFamily: "CarosSoft",
              }}
            >
              Lifetime Focus Mode Summary
            </Text>
            <Text
              style={{
                color: themeColors.black,
                fontSize: 15,
                marginBottom: 2,
                fontFamily: "CarosSoft",
              }}
            >
              Sessions logged:{" "}
              <Text
                style={{
                  fontWeight: "bold",
                  color: themeColors.purple,
                  fontFamily: "CarosSoft",
                }}
              >
                {studyStats.totalSessions}
              </Text>
            </Text>
            <Text
              style={{
                color: themeColors.black,
                fontSize: 15,
                marginBottom: 2,
                fontFamily: "CarosSoft",
              }}
            >
              Time focused:{" "}
              <Text
                style={{
                  fontWeight: "bold",
                  color: themeColors.purple,
                  fontFamily: "CarosSoft",
                }}
              >
                {(() => {
                  const ms = studyStats.totalTimeStudied || 0;
                  const totalSeconds = Math.floor(ms / 1000);
                  const hours = Math.floor(totalSeconds / 3600);
                  const minutes = Math.floor((totalSeconds % 3600) / 60);
                  const seconds = totalSeconds % 60;
                  let out = [];
                  if (hours > 0) out.push(`${hours}h`);
                  if (minutes > 0 || hours > 0) out.push(`${minutes}m`);
                  out.push(`${seconds}s`);
                  return out.join(" ");
                })()}
              </Text>
            </Text>
          </View>
          <View
            style={[styles.divider, { backgroundColor: themeColors.gray }]}
          />
          {/* Favorites Section as Dropdown */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Heart size={20} color={themeColors.purple} weight="fill" />
              <Text
                style={[
                  styles.favoritesTitle,
                  {
                    marginLeft: 8,
                    color: themeColors.black,
                    fontFamily: "CarosSoft",
                  },
                ]}
              >
                Favorites
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setFavoritesExpanded((v) => !v)}
              style={{
                padding: 0,
                borderRadius: 20,
                backgroundColor: "transparent",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 8,
              }}
              accessibilityLabel={
                favoritesExpanded ? "Collapse favorites" : "Expand favorites"
              }
            >
              {favoritesExpanded ? (
                <CaretDown size={22} color={themeColors.purple} weight="bold" />
              ) : (
                <CaretRight
                  size={22}
                  color={themeColors.purple}
                  weight="bold"
                />
              )}
            </TouchableOpacity>
          </View>
          {favoritesExpanded && (
            <View
              style={{
                width: "100%",
                backgroundColor: themeColors.white,
                marginBottom: 16,
                elevation: 2,
                padding: 0,
              }}
            >
              {favoriteSpotsLoading ? (
                <View style={{ width: "100%", marginBottom: 12 }}>
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: themeColors.gray,
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 10,
                        opacity: 0.5,
                        width: 200,
                        marginRight: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 75,
                          height: 75,
                          borderRadius: 8,
                          backgroundColor: themeColors.lightGray || "#EEE",
                          marginRight: 14,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            height: 18,
                            backgroundColor: themeColors.lightGray || "#EEE",
                            borderRadius: 4,
                            marginBottom: 8,
                            width: "60%",
                          }}
                        />
                        <View
                          style={{
                            height: 12,
                            backgroundColor: themeColors.lightGray || "#EEE",
                            borderRadius: 4,
                            marginBottom: 6,
                            width: "40%",
                          }}
                        />
                        <View
                          style={{
                            height: 12,
                            backgroundColor: themeColors.lightGray || "#EEE",
                            borderRadius: 4,
                            width: "30%",
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ) : favoriteSpots.length === 0 ? (
                <Text
                  style={[
                    styles.noFavoritesText,
                    {
                      color: themeColors.darkGray,
                      padding: 16,
                      fontFamily: "CarosSoft",
                    },
                  ]}
                >
                  No favorites yet.
                </Text>
              ) : (
                <FlatList
                  data={favoriteSpots}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 8 }}
                  renderItem={({ item }) => (
                    <FavoriteSpotCard
                      spot={item}
                      cachedImage={cachedFavoriteSpotImages[item.id]}
                      themeColors={themeColors}
                      getLastUpdatedLabel={getLastUpdatedLabel}
                      onPress={() =>
                        navigation.navigate("SpotDetail", {spotId: item.id,})
                      }
                      style={{ marginRight: 12, width: 200 }}
                    />
              )}
              />
              )}
            </View>
          )}
        </View>
        {/* Buttons */}
        {isOwnProfile && !isLoading && (
          <View style={styles.optionsContainer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.logoutButton,
                  { backgroundColor: themeColors.red },
                ]}
                onPress={handleLogout}
              >
                <SignOut size={20} color={themeColors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.editButton,
                  { backgroundColor: themeColors.purple },
                ]}
                onPress={() => {
                  setEditedFirstName(
                    firstName !== "No First Name" ? firstName : ""
                  );
                  setEditedLastName(
                    lastName !== "No Last Name" ? lastName : ""
                  );
                  setEditedGradYear(
                    userGradYear !== "No Grad Year" ? userGradYear : ""
                  );
                  setIsModalVisible(true);
                  setTimeout(() => setEditedProfilePic(null), 0);
                }}
              >
                <PencilSimple size={20} color={themeColors.white} />
              </TouchableOpacity>
            </View>
            {/* --- Remove "Following" button for own profile --- */}
          </View>
        )}
        {/* --- Add Follow/Unfollow button for other users --- */}
        {!isOwnProfile && !isLoading && (
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.editButton,
                {
                  backgroundColor: themeColors.purple,
                  marginTop: 8,
                  width: 160,
                  alignSelf: "center",
                },
              ]}
              onPress={
                isFollowing
                  ? handleUnfollowButton // show confirmation before unfollow
                  : followUser
              }
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      {/* Modal for editing profile */}
      <EditProfileModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSave={handleSaveProfile}
        editedFirstName={editedFirstName}
        setEditedFirstName={setEditedFirstName}
        editedLastName={editedLastName}
        setEditedLastName={setEditedLastName}
        editedGradYear={editedGradYear}
        setEditedGradYear={setEditedGradYear}
        editedProfilePic={editedProfilePic}
        setEditedProfilePic={setEditedProfilePic}
        profilePic={profilePic}
        themeColors={themeColors}
        handlePickProfilePic={handlePickProfilePic}
      />
      {/* Followers Modal */}
      <FollowersModal
        visible={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        userList={userList}
        listLoading={listLoading}
        navigation={navigation}
        themeColors={themeColors}
      />
      {/* Following Modal */}
      <FollowingModal
        visible={showFollowingModal}
        onClose={() => setShowFollowingModal(false)}
        userList={userList}
        listLoading={listLoading}
        navigation={navigation}
        themeColors={themeColors}
        isOwnProfile={isOwnProfile}
        handleUnfollowFromModal={handleUnfollowFromModal}
        unfollowingUid={unfollowingUid}
      />
      {/* Unfollow Confirmation Modal */}
      <UnfollowConfirmModal
        visible={unfollowConfirmVisible}
        onClose={() => setUnfollowConfirmVisible(false)}
        onConfirm={confirmUnfollow}
        themeColors={themeColors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: colors.white, // Remove, handled by themeColors
    padding: 16,
    fontFamily: "CarosSoft",
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    padding: 8,
    // backgroundColor: themeColors.purple, // Remove this line
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  profilePictureContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 125,
    height: 125,
    // backgroundColor: colors.purple, // Remove, handled inline
    borderRadius: 75,
    marginTop: 32,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileContainer: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    // color: colors.purple, // Remove, handled inline
    marginBottom: 8,
    paddingTop: 16,
    fontFamily: "CarosSoft",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    // color: themeColors.darkGray, // Remove, handled inline
    marginLeft: 8,
    textAlign: "center",
    fontFamily: "CarosSoft",
  },
  userGradYear: {
    fontSize: 16,
    // color: themeColors.darkGray, // Remove, handled inline
    marginLeft: 8,
    textAlign: "center",
    fontFamily: "CarosSoft",
  },
  divider: {
    height: 1,
    // backgroundColor: themeColors.gray, // Remove, handled inline
    marginVertical: 16,
    width: "80%",
    alignSelf: "center",
  },
  optionsContainer: {
    flex: 0.1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "60%",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    // backgroundColor: colors.purple, // Remove, handled inline
    borderRadius: 8,
    width: "48%",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    // backgroundColor: colors.red, // Remove, handled inline
    borderRadius: 8,
    width: "48%",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    // backgroundColor: colors.white, // Remove, handled inline
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    // color: colors.purple, // Remove, handled inline
    marginBottom: 16,
  },
  input: {
    width: "100%",
    borderWidth: 0.5,
    // borderColor={themeColors.darkGray} // Remove, handled inline
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    // backgroundColor: colors.white, // Remove, handled inline
    // color: colors.black, // Remove, handled inline
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  saveButton: {
    flex: 1,
    padding: 12,
    // backgroundColor: colors.purple, // Remove, handled inline
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  saveButtonText: {
    // color: colors.white, // Remove, handled inline
    fontWeight: "bold",
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    // backgroundColor: colors.lightPurple, // Remove, handled inline
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    // color: colors.purple, // Remove, handled inline
    fontWeight: "bold",
  },
  favoritesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    // color: colors.purple, // Remove, handled inline
    alignSelf: "flex-start",
    fontFamily: "CarosSoft",
  },
  noFavoritesText: {
    fontSize: 15,
    // color: colors.darkGray, // Remove, handled inline
    marginBottom: 8,
    alignSelf: "flex-start",
    fontFamily: "CarosSoft",
  },
  favoriteSpotContainer: {
    backgroundColor: colors.gray,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    alignSelf: "stretch",
  },
  favoriteSpotTags: {
    fontSize: 13,
    // color: colors.darkGray, // Remove, handled inline
    marginTop: 2,
    fontFamily: "CarosSoft",
  },
  followRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 12,
    marginBottom: 18,
  },
  followColumn: {
    flex: 1,
    alignItems: "center",
  },
  followLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    fontFamily: "CarosSoft",
  },
  followCount: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "CarosSoft",
  },
});
