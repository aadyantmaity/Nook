import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Modal,
  TextInput,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
} from "react-native";
import { signOut, updateProfile } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { colors } from "../constants/colors";
import {
  ArrowLeft,
  SignOut,
  PencilSimple,
  Envelope,
  GraduationCap,
  Briefcase,
  User,
  MapPin,
  Heart,
  X,
} from "phosphor-react-native";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as FileSystem from "expo-file-system";
import { ThemeContext } from "../App";

export default function ProfileScreen({
  navigation,
  // Remove isDarkMode: propDark,
  // Remove themeColors: propColors,
}) {
  const themeCtx = useContext(ThemeContext);
  const isDarkMode = themeCtx?.isDarkMode ?? false;
  const themeColors = themeCtx?.themeColors ?? colors;
  const setIsDarkMode = themeCtx?.setIsDarkMode;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userGradYear, setUserGradYear] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [editedGradYear, setEditedGradYear] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [profilePic, setProfilePic] = useState(null);
  const [editedProfilePic, setEditedProfilePic] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFirstName(data.firstName || "No First Name");
          setLastName(data.lastName || "No Last Name");
          setUserEmail(data.email || "No Email");
          setUserGradYear(data.gradYear || "No Grad Year");
          setFavorites(data.favorites || []);
          setProfilePic(data.profilePic);
        } else {
          console.error("User document does not exist");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    if (isModalVisible) {
      setEditedProfilePic(profilePic);
    } else {
      setEditedProfilePic(null); // Reset preview to icon when modal closes
    }
  }, [isModalVisible, profilePic]);

  // Helper for "last updated" display
  function getLastUpdatedLabel(ratings) {
    if (!ratings || !ratings.lastUpdated) return "";
    if (ratings.lastUpdatedType === "recent") {
      const mins = Math.round((Date.now() - ratings.lastUpdated) / 60000);
      return mins <= 1
        ? "Last updated: just now"
        : `Last updated: ${mins} min ago`;
    }
    if (ratings.lastUpdatedType === "today") {
      return "Last updated: Today (today's avg)";
    }
    return "";
  }

  // Helper to compute noise/crowd averages and recency for a spot
  async function computeSpotRatings(spotId) {
    const { Timestamp, collection, query, where, getDocs } = await import("firebase/firestore");
    const ratingsQuery = query(
      collection(db, "ratings"),
      where("spotId", "==", spotId)
    );
    const ratingsSnapshot = await getDocs(ratingsQuery);

    let noiseSum = 0,
      crowdSum = 0,
      count = 0;
    let lastRecentTimestamp = null;
    let recentRatings = [];
    let todayRatings = [];
    const now = Date.now();
    const thirtyMinutesAgo = now - 30 * 60 * 1000;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMillis = todayStart.getTime();

    ratingsSnapshot.forEach((ratingDoc) => {
      const ratingData = ratingDoc.data();
      const ts = ratingData.timestamp.toMillis();
      if (ts >= thirtyMinutesAgo) {
        noiseSum += ratingData.noise || 0;
        crowdSum += ratingData.crowd || 0;
        count++;
        recentRatings.push(ratingData);
        if (!lastRecentTimestamp || ts > lastRecentTimestamp)
          lastRecentTimestamp = ts;
      }
      if (ts >= todayStartMillis) {
        todayRatings.push(ratingData);
      }
    });

    let noiseRating, crowdRating, lastUpdated, lastUpdatedType;
    if (count > 0) {
      noiseRating = (noiseSum / count).toFixed(1);
      crowdRating = (crowdSum / count).toFixed(1);
      lastUpdated = lastRecentTimestamp;
      lastUpdatedType = "recent";
    } else if (todayRatings.length > 0) {
      let noiseSumDay = 0,
        crowdSumDay = 0;
      todayRatings.forEach((r) => {
        noiseSumDay += r.noise || 0;
        crowdSumDay += r.crowd || 0;
      });
      noiseRating = (noiseSumDay / todayRatings.length).toFixed(1);
      crowdRating = (crowdSumDay / todayRatings.length).toFixed(1);
      lastUpdated = Math.max(...todayRatings.map((r) => r.timestamp.toMillis()));
      lastUpdatedType = "today";
    } else {
      noiseRating = "N/A";
      crowdRating = "N/A";
      lastUpdated = null;
      lastUpdatedType = null;
    }

    return {
      noise: noiseRating,
      crowd: crowdRating,
      lastUpdated,
      lastUpdatedType,
    };
  }

  // Fetch favorite spots details
  const fetchFavoriteSpots = useCallback(async () => {
    if (!favorites.length) {
      setFavoriteSpots([]);
      return;
    }
    try {
      const spotsSnapshot = await getDocs(collection(db, "studySpots"));
      const favSpots = await Promise.all(
        spotsSnapshot.docs
          .filter((doc) => favorites.includes(doc.id))
          .map(async (doc) => {
            const spotData = doc.data();
            // Compute ratings for this spot
            const ratings = await computeSpotRatings(doc.id);
            return { id: doc.id, ...spotData, ratings };
          })
      );
      setFavoriteSpots(favSpots);
    } catch (e) {
      setFavoriteSpots([]);
    }
  }, [favorites]);

  useEffect(() => {
    fetchFavoriteSpots();
  }, [favorites, fetchFavoriteSpots]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserData();
    await fetchFavoriteSpots();
    setRefreshing(false);
  }, [fetchUserData, fetchFavoriteSpots]);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    signOut(auth).catch((error) => {
      console.error("Error logging out:", error.message);
    });
  };

  // Helper to upload image to Firebase Storage and get download URL
  const uploadProfilePicToStorage = async (imageUri, userId) => {
    if (!imageUri || !userId) return null;
    const storage = getStorage();
    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // Convert base64 to Blob using fetch and a data URL
    const response = await fetch(`data:image/jpeg;base64,${base64}`);
    const blob = await response.blob();
    const storageRef = ref(storage, `profile_pictures/${userId}_${Date.now()}.jpg`);
    await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
    return await getDownloadURL(storageRef);
  };

  const handleSaveProfile = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const updateData = {
          firstName: editedFirstName || firstName,
          lastName: editedLastName || lastName,
          gradYear: editedGradYear || userGradYear,
          email: userEmail,
        };
        // If a new profile picture is selected, upload and save URL
        if (editedProfilePic && editedProfilePic !== profilePic) {
          const downloadUrl = await uploadProfilePicToStorage(editedProfilePic, user.uid);
          if (downloadUrl) {
            updateData.profilePic = downloadUrl;
            setProfilePic(downloadUrl);
          }
        }
        await setDoc(doc(db, "users", user.uid), updateData, { merge: true });

        await updateProfile(user, {
          displayName: `${editedFirstName || firstName} ${
            editedLastName || lastName
          }`,
        });

        setFirstName(editedFirstName || firstName);
        setLastName(editedLastName || lastName);
        setUserGradYear(editedGradYear || userGradYear);
        setIsModalVisible(false);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handlePickProfilePic = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.cancelled) {
      try {
        const asset = result.assets ? result.assets[0] : result;
        const user = auth.currentUser;
        if (!user) return;
        const downloadUrl = await uploadProfilePicToStorage(asset.uri, user.uid);
        if (downloadUrl) {
          setProfilePic(downloadUrl);
          await setDoc(
            doc(db, "users", user.uid),
            { profilePic: downloadUrl },
            { merge: true }
          );
        }
      } catch (e) {
        console.log("Failed to save profile picture.");
      }
    }
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.white }]}
    >
      {/* Logout Confirmation Modal */}
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
                color: themeColors.black, // keep as black for contrast
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
        <View style={{ flex: 0.2 }}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: themeColors.purple }]}
            onPress={() => navigation.navigate("Home")}
          >
            <ArrowLeft size={24} color={themeColors.white} />
          </TouchableOpacity>
        </View>
        {/* Profile Picture */}
        <View
          style={[
            styles.profilePictureContainer,
            { backgroundColor: themeColors.purple },
          ]}
        >
          <TouchableOpacity
            onPress={handlePickProfilePic}
            style={{ alignItems: "center" }}
          >
            {profilePic ? (
              <Image
                source={{ uri: profilePic }}
                style={{ width: 125, height: 125, borderRadius: 75 }}
              />
            ) : (
              <View>
                <User size={100} color={themeColors.white} weight="bold" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Profile Details */}
        <View style={styles.profileContainer}>
          <Text style={[styles.userName, { color: themeColors.black }]}>
            {/* Use black for name */}
            {firstName} {lastName}
          </Text>
          <View style={styles.detailRow}>
            <Envelope size={20} color={themeColors.purple} />
            <Text style={[styles.userEmail, { color: themeColors.black }]}>
              {/* Use black for email */}
              {userEmail}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <GraduationCap size={20} color={themeColors.purple} />
            <Text style={[styles.userGradYear, { color: themeColors.black }]}>
              {/* Use black for grad year */}
              {userGradYear}
            </Text>
          </View>
          <View
            style={[styles.divider, { backgroundColor: themeColors.gray }]}
          />
          {/* Favorites Section */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Heart size={20} color={themeColors.purple} weight="fill" />
            <Text
              style={[
                styles.favoritesTitle,
                { marginLeft: 8, color: themeColors.black },
              ]}
            >
              {/* Use black for section title */}
              Favorites
            </Text>
          </View>
          {favoriteSpots.length === 0 ? (
            <Text
              style={[styles.noFavoritesText, { color: themeColors.darkGray }]}
            >
              No favorites yet.
            </Text>
          ) : (
            <View style={{ width: "100%" }}>
              {favoriteSpots.map((spot) => (
                <TouchableOpacity
                  key={spot.id}
                  style={{
                    backgroundColor: themeColors.white,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 3,
                    elevation: 2,
                    borderColor: themeColors.purple,
                    borderWidth: 0.5,
                  }}
                  onPress={() =>
                    navigation.navigate("SpotDetail", { spotId: spot.id })
                  }
                  activeOpacity={0.85}
                >
                  {/* Image preview */}
                  {spot.photoUrl ? (
                    <View
                      style={{
                        width: 75,
                        height: 75,
                        borderRadius: 8,
                        overflow: "hidden",
                        marginRight: 14,
                        backgroundColor: "#EEE",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Image
                        source={{ uri: spot.photoUrl }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </View>
                  ) : (
                    <View
                      style={{
                        backgroundColor: themeColors.purple,
                        borderRadius: 8,
                        width: 75,
                        height: 75,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                      }}
                    >
                      <MapPin
                        size={45}
                        color={themeColors.white}
                        weight="bold"
                      />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        color: themeColors.black, // Use black for spot name
                        marginBottom: 6,
                      }}
                    >
                      {spot.buildingName}
                      {spot.roomNumber && (
                        <Text
                          style={{
                            fontSize: 18,
                            color: themeColors.black,
                            fontWeight: "bold",
                          }}
                        >
                          {" - Floor "}
                          {spot.roomNumber}
                        </Text>
                      )}
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                      {spot.tags && spot.tags.length > 0
                        ? [...spot.tags]
                            .sort((a, b) => String(a).localeCompare(String(b)))
                            .slice(0, 3)
                            .map((tag, idx) => (
                              <View
                                key={idx}
                                style={{
                                  backgroundColor: themeColors.purple,
                                  borderRadius: 12,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  marginRight: 6,
                                  marginTop: 2,
                                }}
                              >
                                <Text
                                  style={{
                                    color: themeColors.white,
                                    fontSize: 11,
                                    fontWeight: "bold",
                                  }}
                                >
                                  {tag}
                                </Text>
                              </View>
                            ))
                        : null}
                      {spot.tags && spot.tags.length > 3 && (
                        <Text
                          style={{
                            color: themeColors.purple,
                            fontSize: 11,
                            fontWeight: "bold",
                            marginTop: 2,
                          }}
                        >
                          +{spot.tags.length - 3} more
                        </Text>
                      )}
                    </View>
                    {/* Noise and Crowd Level Row */}
                    <View style={{ flexDirection: "row", marginTop: 6 }}>
                      <Text
                        style={{
                          color: themeColors.purple,
                          fontSize: 13,
                          fontWeight: "bold",
                          marginRight: 12,
                        }}
                      >
                        Noise:{" "}
                        {typeof spot.ratings?.noise === "number"
                          ? spot.ratings.noise.toFixed(1)
                          : spot.ratings?.noise || "N/A"}
                      </Text>
                      <Text
                        style={{
                          color: themeColors.purple,
                          fontSize: 13,
                          fontWeight: "bold",
                        }}
                      >
                        Crowd:{" "}
                        {typeof spot.ratings?.crowd === "number"
                          ? spot.ratings.crowd.toFixed(1)
                          : spot.ratings?.crowd || "N/A"}
                      </Text>
                    </View>
                    {/* Add last updated label */}
                    <Text
                      style={{
                        fontSize: 11,
                        color: themeColors.darkGray,
                        marginTop: 2,
                        textAlign: "right",
                      }}
                    >
                      {getLastUpdatedLabel(spot.ratings)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View
            style={[styles.divider, { backgroundColor: themeColors.gray }]}
          />
        </View>

        {/* Buttons */}
        <View style={styles.optionsContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.editButton,
                { backgroundColor: themeColors.purple },
              ]}
              onPress={() => {
                setEditedFirstName(
                  firstName !== "No First Name" ? firstName : ""
                );
                setEditedLastName(lastName !== "No Last Name" ? lastName : "");
                setEditedGradYear(
                  userGradYear !== "No Grad Year" ? userGradYear : ""
                );
                setIsModalVisible(true);
                setTimeout(() => setEditedProfilePic(null), 0); // Ensure state updates after modal opens
              }}
            >
              <PencilSimple size={20} color={themeColors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.logoutButton,
                { backgroundColor: themeColors.red },
              ]}
              onPress={handleLogout}
            >
              <SignOut size={20} color={themeColors.white} />
            </TouchableOpacity>
          </View>
        </View>
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
              {/* Use black for modal title */}
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
                      borderColor: themeColors.purple,
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
                      borderColor: themeColors.purple,
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
                      borderColor: themeColors.purple,
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
                onPress={async () => {
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
                }}
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
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: themeColors.white,
                    borderColor: themeColors.purple,
                    borderWidth: 0.5,
                  },
                ]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    {
                      color: themeColors.purple,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
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
    borderRadius: 8,
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
  favoriteSpotName: {
    fontSize: 16,
    fontWeight: "bold",
    // color: colors.purple, // Remove, handled inline
  },
  favoriteSpotTags: {
    fontSize: 13,
    // color: colors.darkGray, // Remove, handled inline
    marginTop: 2,
  },
});
