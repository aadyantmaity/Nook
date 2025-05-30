import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  addDoc,
  onSnapshot,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  ArrowLeft,
  SpeakerHigh,
  X,
  UsersThree,
  Star,
  Heart,
  House,
  Broadcast, // Add this import for the update/edit icon
} from "phosphor-react-native";
import { colors } from "../constants/colors";
import { auth } from "../firebaseConfig"; // Import auth
import Slider from "@react-native-community/slider"; // Add this import for Slider
import { ThemeContext } from "../App"; // Import ThemeContext
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

export default function SpotDetailScreen({ route, navigation }) {
  const themeCtx = useContext(ThemeContext);
  const isDarkMode = themeCtx?.isDarkMode ?? false;
  const themeColors = themeCtx?.themeColors ?? colors;

  const { spotId } = route.params || {};
  const [spot, setSpot] = useState(null);
  const [showLiveUpdate, setShowLiveUpdate] = useState(false);
  const [currentUserName, setCurrentUserName] = useState(""); // State for current user's name
  const [addedByName, setAddedByName] = useState(null); // Set initial state to null
  const [isLoading, setIsLoading] = useState(true); // Add loading stat
  const [userOverallRating, setUserOverallRating] = useState(0);
  const [averageOverallRating, setAverageOverallRating] = useState(0);
  const [overallRatingsCount, setOverallRatingsCount] = useState(0);
  const [pendingOverallRating, setPendingOverallRating] = useState(0);
  const [isSubmittingOverall, setIsSubmittingOverall] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false); // Add state for report modal
  const [cachedPhotoUri, setCachedPhotoUri] = useState(null);

  // Helper for "last updated" display
  function getLastUpdatedLabel(ratings) {
    if (!ratings || !ratings.lastUpdated) return "";
    const now = Date.now();
    const last =
      typeof ratings.lastUpdated === "number"
        ? ratings.lastUpdated
        : ratings.lastUpdated?.toMillis?.() ?? null;
    if (!last) return "";

    const diffMs = now - last;
    const diffMin = Math.floor(diffMs / 60000);

    if (ratings.lastUpdatedType === "window" && ratings.lastWindowHours) {
      if (diffMin < 60) {
        if (diffMin === 0) return "Last updated: just now";
        return `Last updated: ${diffMin} min ago (${ratings.lastWindowHours}h avg)`;
      }
      if (ratings.lastWindowHours === 1) {
        return "Last updated: 1 hour ago (1h avg)";
      }
      return `Last updated: ${ratings.lastWindowHours} hours ago (${ratings.lastWindowHours}h avg)`;
    }
    if (ratings.lastUpdatedType === "today") {
      return "Last updated: Today (daily avg)";
    }
    if (diffMin < 30 && diffMin >= 0) {
      if (diffMin === 0) return "Last updated: just now";
      return `Last updated: ${diffMin} min ago`;
    }
    return "";
  }

  // Move fetchSpotDetails to top-level scope so it can be called from anywhere
  const fetchSpotDetails = async () => {
    try {
      const docRef = doc(db, "studySpots", spotId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const spotData = docSnap.data();
        setSpot(spotData);

        // Fetch username using addedBy user ID
        if (spotData.addedBy) {
          const userDoc = await getDoc(doc(db, "users", spotData.addedBy));
          if (userDoc.exists()) {
            const revealIdentity = spotData.revealIdentity; // Check revealIdentity flag
            setAddedByName(
              revealIdentity
                ? `${userDoc.data().firstName} ${userDoc.data().lastName}`
                : "Anonymous"
            );
          } else {
            setAddedByName("Anonymous"); // Fallback if userDoc doesn't exist
          }
        } else {
          setAddedByName("Anonymous"); // Fallback if addedBy is null
        }

        // Fetch ratings for the spot
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
        const now = Timestamp.now().toMillis();
        const thirtyMinutesAgo = now - 30 * 60 * 1000;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayStartMillis = todayStart.getTime();

        ratingsSnapshot.forEach((ratingDoc) => {
          const ratingData = ratingDoc.data();
          const ts = ratingData.timestamp.toMillis();
          if (ts >= thirtyMinutesAgo) {
            noiseSum += ratingData.noise || 0; // Ensure noise is a valid number
            crowdSum += ratingData.crowd || 0; // Ensure crowd is a valid number
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
          lastUpdated = Math.max(
            ...todayRatings.map((r) => r.timestamp.toMillis())
          );
          lastUpdatedType = "today";
        } else {
          noiseRating = "N/A";
          crowdRating = "N/A";
          lastUpdated = null;
          lastUpdatedType = null;
        }

        setSpot((prevSpot) => ({
          ...spotData,
          ratings: {
            noise: noiseRating,
            crowd: crowdRating,
            lastUpdated,
            lastUpdatedType,
          },
        }));
      } else {
        alert("The requested spot could not be found. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching spot details:", error);
      alert("Unable to fetch spot details. Please check your permissions.");
    } finally {
      setIsLoading(false); // Set loading to false after fetching data
    }
  };

  // Helper to cache spot image
  const cacheSpotImage = async (spotId, photoUrl) => {
    if (!photoUrl) {
      setCachedPhotoUri(null);
      return;
    }
    try {
      const cacheKey = `spotImageUri_${spotId}`;
      const cachedUri = await AsyncStorage.getItem(cacheKey);
      const cachedUrl = await AsyncStorage.getItem(`${cacheKey}_url`);
      if (cachedUri && cachedUrl === photoUrl) {
        setCachedPhotoUri(cachedUri);
        return;
      }
      const fileUri = FileSystem.cacheDirectory + `spot_${spotId}.jpg`;
      const downloadRes = await FileSystem.downloadAsync(photoUrl, fileUri);
      if (downloadRes.status === 200) {
        await AsyncStorage.setItem(cacheKey, downloadRes.uri);
        await AsyncStorage.setItem(`${cacheKey}_url`, photoUrl);
        setCachedPhotoUri(downloadRes.uri);
      } else {
        setCachedPhotoUri(null);
      }
    } catch (e) {
      setCachedPhotoUri(null);
    }
  };

  // When spot is loaded or photoUrl changes, cache the image
  useEffect(() => {
    if (spot && spot.photoUrl) {
      cacheSpotImage(spotId, spot.photoUrl);
    } else {
      setCachedPhotoUri(null);
    }
  }, [spotId, spot?.photoUrl]);

  useEffect(() => {
    const fetchCurrentUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setCurrentUserName(
            `${userDoc.data().firstName} ${userDoc.data().lastName}`
          );
        }
      }
    };

    fetchCurrentUserName(); // Fetch the current user's name
  }, []);

  useEffect(() => {
    if (!spotId) {
      console.error("No spotId provided");
      navigation.goBack();
      return;
    }

    let isMounted = true; // Prevent state update if unmounted

    const fetchAndSetSpot = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, "studySpots", spotId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && isMounted) {
          const spotData = docSnap.data();
          setSpot(spotData);

          // Fetch username using addedBy user ID
          if (spotData.addedBy) {
            const userDoc = await getDoc(doc(db, "users", spotData.addedBy));
            if (userDoc.exists()) {
              const revealIdentity = spotData.revealIdentity; // Check revealIdentity flag
              setAddedByName(
                revealIdentity
                  ? `${userDoc.data().firstName} ${userDoc.data().lastName}`
                  : "Anonymous"
              );
            } else {
              setAddedByName("Anonymous"); // Fallback if userDoc doesn't exist
            }
          } else {
            setAddedByName("Anonymous"); // Fallback if addedBy is null
          }

          // Fetch ratings for the spot
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
          const now = Timestamp.now().toMillis();
          const thirtyMinutesAgo = now - 30 * 60 * 1000;
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayStartMillis = todayStart.getTime();

          ratingsSnapshot.forEach((ratingDoc) => {
            const ratingData = ratingDoc.data();
            const ts = ratingData.timestamp.toMillis();
            if (ts >= thirtyMinutesAgo) {
              noiseSum += ratingData.noise || 0; // Ensure noise is a valid number
              crowdSum += ratingData.crowd || 0; // Ensure crowd is a valid number
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
            lastUpdated = Math.max(
              ...todayRatings.map((r) => r.timestamp.toMillis())
            );
            lastUpdatedType = "today";
          } else {
            noiseRating = "N/A";
            crowdRating = "N/A";
            lastUpdated = null;
            lastUpdatedType = null;
          }

          setSpot((prevSpot) => ({
            ...spotData,
            ratings: {
              noise: noiseRating,
              crowd: crowdRating,
              lastUpdated,
              lastUpdatedType,
            },
          }));
        } else if (isMounted) {
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error fetching spot details:", error);
          alert("Unable to fetch spot details. Please check your permissions.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAndSetSpot();

    // Real-time updates for ratings
    const ratingsQuery = query(
      collection(db, "ratings"),
      where("spotId", "==", spotId) // Fetch all ratings for the spot
    );

    const unsubscribe = onSnapshot(ratingsQuery, (snapshot) => {
      let noiseSum = 0;
      let crowdSum = 0;
      let count = 0;
      const thirtyMinutesAgo = Timestamp.now().toMillis() - 30 * 60 * 1000;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.timestamp.toMillis() >= thirtyMinutesAgo) {
          noiseSum += data.noise || 0; // Ensure noise is a valid number
          crowdSum += data.crowd || 0; // Ensure crowd is a valid number
          count++;
        }
      });

      const noiseRating = count > 0 ? (noiseSum / count).toFixed(1) : "N/A";
      const crowdRating = count > 0 ? (crowdSum / count).toFixed(1) : "N/A";

      setSpot((prevSpot) => ({
        ...prevSpot,
        ratings: {
          noise: noiseRating,
          crowd: crowdRating,
        },
      }));
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [spotId, navigation]);

  // Fetch overall ratings and user's rating
  useEffect(() => {
    if (!spotId || !auth.currentUser) return;
    const fetchOverallRatings = async () => {
      const ratingsQuery = query(
        collection(db, "overallRatings"),
        where("spotId", "==", spotId)
      );
      const snapshot = await getDocs(ratingsQuery);
      let sum = 0;
      let count = 0;
      let userRating = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        sum += data.rating || 0;
        count++;
        if (data.userId === auth.currentUser.uid) {
          userRating = data.rating;
        }
      });
      setAverageOverallRating(count > 0 ? sum / count : 0);
      setOverallRatingsCount(count);
      setUserOverallRating(userRating);
      setPendingOverallRating(userRating); // Set pending to user's rating
    };
    fetchOverallRatings();
    // Listen for real-time updates
    const unsubscribe = onSnapshot(
      query(collection(db, "overallRatings"), where("spotId", "==", spotId)),
      (snapshot) => {
        let sum = 0;
        let count = 0;
        let userRating = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          sum += data.rating || 0;
          count++;
          if (data.userId === auth.currentUser.uid) {
            userRating = data.rating;
          }
        });
        setAverageOverallRating(count > 0 ? sum / count : 0);
        setOverallRatingsCount(count);
        setUserOverallRating(userRating);
        setPendingOverallRating(userRating);
      }
    );
    return () => unsubscribe();
  }, [spotId]);

  const handleRefresh = () => {
    fetchSpotDetails(); // Refresh spot details
  };

  const handleDeleteSpot = async () => {
    try {
      await deleteDoc(doc(db, "studySpots", spotId)); // Use deleteDoc to delete the spot
      console.log("Spot deleted successfully");
      navigation.navigate("Home", { refresh: true }); // Refresh Home screen
    } catch (error) {
      console.error("Error deleting spot:", error);
      alert("Unable to delete the spot. Please check your permissions.");
    }
  };
  const handleEditSpot = () => {
    navigation.navigate("Home");
  };

  // Only update pending rating on star tap
  const handleStarTap = (rating) => {
    setPendingOverallRating(rating);
  };

  // Submit button handler
  const handleSubmitOverallRating = async () => {
    if (
      pendingOverallRating === 0 ||
      pendingOverallRating === userOverallRating
    )
      return;
    setIsSubmittingOverall(true);
    try {
      // Upsert user's rating for this spot
      const ratingsQuery = query(
        collection(db, "overallRatings"),
        where("spotId", "==", spotId),
        where("userId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(ratingsQuery);
      if (!snapshot.empty) {
        // Update existing
        const docId = snapshot.docs[0].id;
        await setDoc(
          doc(db, "overallRatings", docId),
          {
            spotId,
            userId: auth.currentUser.uid,
            rating: pendingOverallRating,
            timestamp: Timestamp.now(),
          },
          { merge: true }
        );
      } else {
        // Add new
        await addDoc(collection(db, "overallRatings"), {
          spotId,
          userId: auth.currentUser.uid,
          rating: pendingOverallRating,
          timestamp: Timestamp.now(),
        });
      }
      // Refresh the page after successful submit
      await fetchSpotDetails();
    } catch (e) {
      alert("Failed to submit rating.");
    }
    setIsSubmittingOverall(false);
  };

  // Check if spot is favorited by current user
  useEffect(() => {
    const checkFavorite = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const favs = userDoc.data().favorites || [];
          setIsFavorite(favs.includes(spotId));
        }
      }
    };
    if (spotId && auth.currentUser) checkFavorite();
  }, [spotId, auth.currentUser]);

  const handleToggleFavorite = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    try {
      if (isFavorite) {
        await updateDoc(userRef, { favorites: arrayRemove(spotId) });
        setIsFavorite(false);
      } else {
        await updateDoc(userRef, { favorites: arrayUnion(spotId) });
        setIsFavorite(true);
      }
    } catch (e) {
      alert("Failed to update favorites.");
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
        <Text style={{ fontSize: 16, color: themeColors.black }}>
          Loading...
        </Text>
      </SafeAreaView>
    );

  const tags = spot.tags || [];
  const addedBy = spot.addedBy || "Anonymous";
  const buildingName = spot.buildingName || "Not Available";
  const generalRating = spot.generalRating || 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        <View style={{ flex: 1, backgroundColor: themeColors.white }}>
          {/* Home Button Above Image */}
          <View style={{ width: "100%", marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                shadowColor: themeColors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                marginBottom: 8,
              }}
            >
              <House size={20} color={themeColors.white} />
            </TouchableOpacity>
          </View>
          {/* Spot Image */}
          <View style={{ position: "relative", width: "100%" }}>
            {spot.photoUrl ? (
              <View
                style={{
                  width: "100%",
                  height: 150,
                  backgroundColor: "#EEE",
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginBottom: 16,
                }}
              >
                <Image
                  source={{
                    uri:
                      cachedPhotoUri && cachedPhotoUri.length > 0
                        ? cachedPhotoUri
                        : spot.photoUrl,
                  }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View
                style={{
                  width: "100%",
                  height: 150,
                  backgroundColor: themeColors.darkGray,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: themeColors.black }}>No Image</Text>
              </View>
            )}
          </View>

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

          {/* --- TAGS FIRST --- */}
          <View
            style={{
              marginTop: 0,
              marginBottom: 16, // Add this if not already
              alignItems: "left",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              {tags.length > 0 ? (
                tags.map((tag, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: themeColors.purple,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: themeColors.white, fontSize: 16 }}>
                      {String(tag)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 16, color: themeColors.black }}>
                  No tags available
                </Text>
              )}
            </View>
          </View>

          {/* --- NOISE & CROWD LEVELS LAST --- */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 16,
              marginTop: 4, // Keep only one value
            }}
          >
            <View
              style={{
                alignItems: "center",
                padding: 16,
                backgroundColor: themeColors.white,
                borderRadius: 8,
                flex: 1,
                marginRight: 8,
                borderColor: themeColors.black,
                borderWidth: 0.5,
              }}
            >
              <SpeakerHigh size={24} color={themeColors.purple} />
              <Text
                style={{
                  color: themeColors.purple,
                  fontSize: 16,
                  fontWeight: "bold",
                  marginTop: 8,
                }}
              >
                Noise: {spot.ratings?.noise || "N/A"}
              </Text>
            </View>
            <View
              style={{
                alignItems: "center",
                padding: 16,
                backgroundColor: themeColors.white,
                borderRadius: 8,
                flex: 1,
                borderColor: themeColors.black,
                borderWidth: 0.5,
              }}
            >
              <UsersThree size={24} color={themeColors.purple} />
              <Text
                style={{
                  color: themeColors.purple,
                  fontSize: 16,
                  fontWeight: "bold",
                  marginTop: 8,
                }}
              >
                Crowd: {spot.ratings?.crowd || "N/A"}
              </Text>
            </View>
          </View>

          {/* --- LAST UPDATED LABEL --- */}
          <Text
            style={{
              fontSize: 12,
              color: themeColors.darkGray,
              marginBottom: 34,
              textAlign: "right",
            }}
          >
            {getLastUpdatedLabel(spot.ratings)}
          </Text>

          {/* --- OVERALL RATING NEXT --- */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 16,
                color: themeColors.black,
                fontWeight: "bold",
                marginBottom: 4,
              }}
            >
              Overall Rating
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarTap(star)}
                  activeOpacity={0.7}
                >
                  <Star
                    size={28}
                    color={
                      star <= pendingOverallRating
                        ? themeColors.purple
                        : themeColors.darkGray
                    }
                    weight={star <= pendingOverallRating ? "fill" : "regular"}
                    style={{ marginRight: 2 }}
                  />
                </TouchableOpacity>
              ))}
              <Text
                style={{
                  marginLeft: 8,
                  color: themeColors.black,
                  fontSize: 15,
                }}
              >
                {overallRatingsCount > 0
                  ? `${averageOverallRating.toFixed(
                      1
                    )} (${overallRatingsCount})`
                  : "No rating"}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: themeColors.darkGray,
                marginTop: 2,
              }}
            >
              {userOverallRating
                ? `Your rating: ${userOverallRating}`
                : "Tap a star to rate"}
            </Text>
            <TouchableOpacity
              onPress={handleSubmitOverallRating}
              disabled={
                isSubmittingOverall ||
                pendingOverallRating === 0 ||
                pendingOverallRating === userOverallRating
              }
              style={{
                marginTop: 8,
                backgroundColor:
                  pendingOverallRating !== 0 &&
                  pendingOverallRating !== userOverallRating
                    ? themeColors.purple
                    : themeColors.darkGray,
                paddingVertical: 8,
                paddingHorizontal: 24,
                borderRadius: 8,
                alignItems: "center",
                opacity:
                  pendingOverallRating !== 0 &&
                  pendingOverallRating !== userOverallRating
                    ? 1
                    : 0.6,
              }}
            >
              <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                {isSubmittingOverall ? "Submitting..." : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* --- OPEN/QUIET HOURS --- */}
          {spot.openHours ? (
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <Text
                style={{
                  fontSize: 15,
                  color: themeColors.black,
                  fontWeight: "bold",
                  marginBottom: 2,
                }}
              >
                Open/Quiet Hours
              </Text>
              <Text style={{ color: themeColors.darkGray, fontSize: 15 }}>
                {spot.openHours}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <View
        style={{
          padding: 16,
          backgroundColor: themeColors.white,
          borderTopWidth: 1,
          borderTopColor: themeColors.gray,
        }}
      >
        <View
          style={{ flexDirection: "row", width: "75%", alignSelf: "center" }}
        >
          <TouchableOpacity
            onPress={() => setShowLiveUpdate(true)}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              marginRight: 8,
              shadowColor: themeColors.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Broadcast size={20} color={themeColors.white} />
            <Text
              style={{
                marginLeft: 8,
                color: themeColors.white,
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              Update
            </Text>
          </TouchableOpacity>
          {spot.addedBy === auth.currentUser?.uid && (
            <TouchableOpacity
              onPress={handleDeleteSpot}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: themeColors.red,
                borderRadius: 8,
                marginLeft: 8,
              }}
            >
              <X size={20} color={themeColors.white} weight="bold" />
              <Text
                style={{
                  marginLeft: 8,
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                Delete
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Add Report Button */}
        <TouchableOpacity
          onPress={() => setShowReportModal(true)}
          style={{
            marginTop: 12,
            alignSelf: "center",
            backgroundColor: themeColors.white,
            borderColor: themeColors.purple,
            borderWidth: 1,
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 24,
          }}
        >
          <Text style={{ color: themeColors.purple, fontWeight: "bold" }}>
            Report Incorrect Info / Suggestion
          </Text>
        </TouchableOpacity>
        <LiveUpdateModal
          visible={showLiveUpdate}
          onClose={() => setShowLiveUpdate(false)}
          spotId={spotId}
          initialNoise={spot.ratings?.noise || 0}
          initialCrowd={spot.ratings?.crowd || 0}
        />
        {/* Report Modal */}
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          spotId={spotId}
          spotName={spot?.buildingName || ""}
        />
      </View>
    </SafeAreaView>
  );
}

function LiveUpdateModal({
  visible,
  onClose,
  spotId,
  initialNoise,
  initialCrowd,
}) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  // Always use a number between 1 and 5 for slider values
  const safeNoise =
    Number(initialNoise) >= 1 && Number(initialNoise) <= 5
      ? Number(initialNoise)
      : 3;
  const safeCrowd =
    Number(initialCrowd) >= 1 && Number(initialCrowd) <= 5
      ? Number(initialCrowd)
      : 3;

  const [noiseLevel, setNoiseLevel] = useState(safeNoise);
  const [crowdLevel, setCrowdLevel] = useState(safeCrowd);

  useEffect(() => {
    if (visible) {
      setNoiseLevel(safeNoise);
      setCrowdLevel(safeCrowd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialNoise, initialCrowd]);

  const handleSubmitUpdate = async () => {
    try {
      const ratingsRef = collection(db, "ratings");
      await addDoc(ratingsRef, {
        spotId,
        noise: noiseLevel,
        crowd: crowdLevel,
        timestamp: Timestamp.now(),
      });
      onClose();
    } catch (error) {
      alert("Unable to submit live update. Please check your permissions.");
    }
  };

  // Number line labels for slider
  const renderSliderLabels = () => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: 2,
      }}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Text
          key={value}
          style={{
            fontSize: 12,
            color: themeColors.black,
            width: 20,
            textAlign: "center",
          }}
        >
          {value}
        </Text>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            backgroundColor: themeColors.white,
            margin: 32,
            padding: 16,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              marginBottom: 8,
              fontSize: 16,
              fontWeight: "bold",
              color: themeColors.black,
            }}
          >
            Noise (1 = Quiet, 5 = Noisy)
          </Text>
          <View style={{ marginBottom: 16 }}>
            <Slider
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={noiseLevel}
              onValueChange={setNoiseLevel}
              minimumTrackTintColor={themeColors.purple}
              maximumTrackTintColor={themeColors.gray}
              thumbTintColor={themeColors.purple}
            />
            {renderSliderLabels()}
          </View>
          <Text
            style={{
              marginBottom: 8,
              fontSize: 16,
              fontWeight: "bold",
              color: themeColors.black,
            }}
          >
            Crowd (1 = Sparse, 5 = Packed)
          </Text>
          <View style={{ marginBottom: 16 }}>
            <Slider
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={crowdLevel}
              onValueChange={setCrowdLevel}
              minimumTrackTintColor={themeColors.purple}
              maximumTrackTintColor={themeColors.gray}
              thumbTintColor={themeColors.purple}
            />
            {renderSliderLabels()}
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              onPress={handleSubmitUpdate}
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                alignItems: "center",
                marginRight: 8,
              }}
            >
              <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                Submit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: themeColors.white,
                borderRadius: 8,
                alignItems: "center",
                borderColor: themeColors.black,
                borderWidth: 0.5,
              }}
            >
              <Text style={{ color: themeColors.purple, fontWeight: "bold" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ReportModal({ visible, onClose, spotId, spotName }) {
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  const handleSubmit = async () => {
    if (!reportText.trim()) {
      Alert.alert("Please enter your report or suggestion.");
      return;
    }
    setSubmitting(true);
    try {
      // Add report to Firestore 'reports' collection
      await addDoc(collection(db, "reports"), {
        spotId: spotId || null,
        spotName: spotName || null,
        report: reportText,
        user: auth.currentUser?.uid || "Anonymous",
        createdAt: Timestamp.now(),
      });
      Alert.alert("Thank you!", "Your report has been submitted.");
      setReportText("");
      onClose();
    } catch (e) {
      Alert.alert("Error", "Failed to submit report.");
    }
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
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
            margin: 32,
            padding: 16,
            borderRadius: 8,
            width: "90%",
            maxWidth: 400,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.black,
              marginBottom: 8,
            }}
          >
            Report Incorrect Info / Suggestion
          </Text>
          <TextInput
            style={{
              borderWidth: 0.5,
              borderColor: themeColors.purple,
              borderRadius: 8,
              padding: 12,
              minHeight: 80,
              color: themeColors.black,
              backgroundColor: themeColors.white,
              marginBottom: 12,
              textAlignVertical: "top",
            }}
            placeholder="Describe the issue or suggestion..."
            placeholderTextColor={themeColors.darkGray}
            multiline
            value={reportText}
            onChangeText={setReportText}
            editable={!submitting}
          />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                alignItems: "center",
                marginRight: 8,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                {submitting ? "Submitting..." : "Submit"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: themeColors.white,
                borderRadius: 8,
                alignItems: "center",
                borderColor: themeColors.black,
                borderWidth: 0.5,
              }}
            >
              <Text style={{ color: themeColors.purple, fontWeight: "bold" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
