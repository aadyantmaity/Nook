import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  RefreshControl,
  ScrollView,
  Image,
  FlatList,
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
  X,
  CaretDown,
  CaretRight,
  User,
} from "phosphor-react-native";
import { ThemeContext } from "../App";
import * as ImagePicker from "expo-image-picker";
import { getLastUpdatedLabel } from "../utils/lastUpdatedLabel";

// Hooks and components
import useProfileData from "../hooks/useProfileData";
import useFavoriteSpots from "../hooks/useFavoriteSpots";
import useStudyStats from "../hooks/useStudyStats";
import ProfilePicture from "../components/Profile/ProfilePicture";
import FavoriteSpotCard from "../components/Profile/FavoriteSpotCard";
import { auth } from "../firebaseConfig";

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
    signOut().catch((error) => {});
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

  if (isLoading)
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: themeColors.white,
        }}
      >
        <Text style={{ fontSize: 16, color: themeColors.darkGray }}>
          Loading...
        </Text>
      </SafeAreaView>
    );

  return (
    <View
      style={{ flex: 1, backgroundColor: themeColors.white, paddingTop: 48 }}
    >
      {/* Logout Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setLogoutModalVisible(false)}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 12,
              padding: 24,
              alignItems: "center",
              minWidth: 240,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 12,
                color: themeColors.black,
              }}
            >
              Confirm Logout
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: themeColors.purple,
                marginBottom: 20,
              }}
            >
              Are you sure you want to log out?
            </Text>
            <View
              style={{
                flexDirection: "row",
                width: "100%",
                justifyContent: "space-between",
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: themeColors.red,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                  marginRight: 8,
                }}
                onPress={confirmLogout}
              >
                <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                  Log Out
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor:
                    themeColors.lightPurple || themeColors.purple,
                  borderRadius: 8,
                  padding: 12,
                  alignItems: "center",
                }}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

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
            style={[styles.backButton, { top: 8 }]} // reduce top gap
            onPress={() =>
              navigation.navigate(
                "Home",
                route?.params?.view ? { view: route.params.view } : undefined
              )
            }
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
          <Text style={[styles.userName, { color: themeColors.black }]}>
            {firstName} {lastName}
          </Text>
          <View style={styles.detailRow}>
            <Envelope size={20} color={themeColors.purple} />
            <Text style={[styles.userEmail, { color: themeColors.black }]}>
              {userEmail}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <GraduationCap size={20} color={themeColors.purple} />
            <Text style={[styles.userGradYear, { color: themeColors.black }]}>
              {userGradYear}
            </Text>
          </View>
          {/* Study Stats */}
          <View
            style={{
              width: "100%",
              backgroundColor: themeColors.gray + "22",
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
              }}
            >
              Lifetime Focus Mode Summary
            </Text>
            <Text
              style={{
                color: themeColors.black,
                fontSize: 15,
                marginBottom: 2,
              }}
            >
              Sessions logged:{" "}
              <Text style={{ fontWeight: "bold", color: themeColors.purple }}>
                {studyStats.totalSessions}
              </Text>
            </Text>
            <Text
              style={{
                color: themeColors.black,
                fontSize: 15,
                marginBottom: 2,
              }}
            >
              Time focused:{" "}
              <Text style={{ fontWeight: "bold", color: themeColors.purple }}>
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
                  { marginLeft: 8, color: themeColors.black },
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
                    { color: themeColors.darkGray, padding: 16 },
                  ]}
                >
                  No favorites yet.
                </Text>
              ) : (
                <View style={{ width: "100%" }}>
                  {favoriteSpots.map((spot) => (
                    <FavoriteSpotCard
                      key={spot.id}
                      spot={spot}
                      cachedImage={cachedFavoriteSpotImages[spot.id]}
                      themeColors={themeColors}
                      getLastUpdatedLabel={getLastUpdatedLabel}
                      onPress={() =>
                        navigation.navigate("SpotDetail", { spotId: spot.id })
                      }
                    />
                  ))}
                </View>
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
          </View>
        )}
      </ScrollView>
      {/* Modal for editing profile */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setIsModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { width: "80%", backgroundColor: themeColors.white },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close (X) button */}
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10,
                padding: 6,
              }}
              onPress={() => setIsModalVisible(false)}
              hitSlop={10}
            >
              <X size={22} color={themeColors.purple} weight="bold" />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeColors.black }]}>
              Edit Profile
            </Text>
            {/* Profile picture preview and picker */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              {/* Current profile picture */}
              <View style={{ alignItems: "center", marginRight: 12 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: themeColors.darkGray,
                    marginBottom: 4,
                  }}
                >
                  Current
                </Text>
                {profilePic ? (
                  <Image
                    source={{ uri: profilePic }}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      borderWidth: 0.5,
                      borderColor: themeColors.black,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: themeColors.purple,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 0.5,
                      borderColor: themeColors.gray,
                    }}
                  >
                    <User size={32} color={themeColors.white} weight="bold" />
                  </View>
                )}
              </View>
              {/* New profile picture */}
              <View style={{ alignItems: "center", marginRight: 12 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: themeColors.darkGray,
                    marginBottom: 4,
                  }}
                >
                  New
                </Text>
                {editedProfilePic ? (
                  <Image
                    source={{ uri: editedProfilePic }}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      borderWidth: 0.5,
                      borderColor: themeColors.black,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: "#f0eafd",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 0.5,
                      borderColor: themeColors.black,
                    }}
                  >
                    <User size={32} color={themeColors.purple} weight="bold" />
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: themeColors.purple,
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 18,
                }}
                onPress={handlePickProfilePic}
              >
                <Text
                  style={{
                    color: themeColors.white,
                    fontWeight: "bold",
                    fontSize: 13,
                  }}
                >
                  Change Picture
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={editedFirstName}
              onChangeText={setEditedFirstName}
              placeholderTextColor={themeColors.darkGray}
              color={themeColors.black}
              borderColor={themeColors.purple}
              borderWidth={0.5}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={editedLastName}
              onChangeText={setEditedLastName}
              placeholderTextColor={themeColors.darkGray}
              color={themeColors.black}
              borderColor={themeColors.purple}
              borderWidth={0.5}
            />
            <TextInput
              style={styles.input}
              placeholder="Graduation Year"
              value={editedGradYear}
              onChangeText={setEditedGradYear}
              keyboardType="numeric"
              placeholderTextColor={themeColors.darkGray}
              color={themeColors.black}
              borderColor={themeColors.purple}
              borderWidth={0.5}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: themeColors.white,
                    borderColor: themeColors.black,
                    borderWidth: 0.5,
                    marginRight: 8,
                  },
                ]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: themeColors.purple },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: themeColors.purple },
                ]}
                onPress={handleSaveProfile}
              >
                <Text
                  style={[styles.saveButtonText, { color: themeColors.white }]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {/* Followers Modal */}
      <Modal
        visible={showFollowersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFollowersModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 12,
              padding: 18,
              width: "85%",
              maxHeight: "70%",
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 18,
                color: themeColors.purple,
                marginBottom: 8,
              }}
            >
              Followers
            </Text>
            {listLoading ? (
              <ActivityIndicator color={themeColors.purple} />
            ) : (
              <FlatList
                data={userList}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setShowFollowersModal(false);
                      navigation.navigate("Profile", { uid: item.uid });
                    }}
                    style={{ paddingVertical: 10 }}
                  >
                    <Text style={{ color: themeColors.black, fontSize: 16 }}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              onPress={() => setShowFollowersModal(false)}
              style={{
                marginTop: 12,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Following Modal */}
      <Modal
        visible={showFollowingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFollowingModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 12,
              padding: 18,
              width: "85%",
              maxHeight: "70%",
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 18,
                color: themeColors.purple,
                marginBottom: 8,
              }}
            >
              Following
            </Text>
            {listLoading ? (
              <ActivityIndicator color={themeColors.purple} />
            ) : (
              <FlatList
                data={userList}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setShowFollowingModal(false);
                      navigation.navigate("Profile", { uid: item.uid });
                    }}
                    style={{ paddingVertical: 10 }}
                  >
                    <Text style={{ color: themeColors.black, fontSize: 16 }}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              onPress={() => setShowFollowingModal(false)}
              style={{
                marginTop: 12,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                alignItems: "center",
              }}
            >
              <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: colors.white, // Remove, handled by themeColors
    padding: 16,
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
  },
  userGradYear: {
    fontSize: 16,
    // color: themeColors.darkGray, // Remove, handled inline
    marginLeft: 8,
    textAlign: "center",
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
    // borderColor: themeColors.darkGray, // Remove, handled inline
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
  },
  noFavoritesText: {
    fontSize: 15,
    // color: colors.darkGray, // Remove, handled inline
    marginBottom: 8,
    alignSelf: "flex-start",
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
  },
});
