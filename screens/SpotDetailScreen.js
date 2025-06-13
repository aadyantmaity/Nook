import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
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
  House,
  DotsThreeVertical,
  SpeakerHigh,
  UsersThree,
  Star,
} from "phosphor-react-native";
import { colors } from "../constants/colors";
import { auth } from "../firebaseConfig";
import { ThemeContext } from "../App";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

// Extracted components
import TagList from "../components/SpotDetail/TagList";
import SpotImage from "../components/SpotDetail/SpotImage";
import RatingsDisplay from "../components/SpotDetail/RatingsDisplay";
import OverallRating from "../components/SpotDetail/OverallRating";
import ActionButtons from "../components/SpotDetail/ActionButtons";
import AddAlertModal from "../components/SpotDetail/AddAlertModal";
import LiveUpdateModal from "../components/SpotDetail/LiveUpdateModal";
import ReportModal from "../components/SpotDetail/ReportModal";

export default function SpotDetailScreen({ route, navigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  const { spotId } = route.params || {};
  const [spot, setSpot] = useState(null);
  const [showLiveUpdate, setShowLiveUpdate] = useState(false);
  const [showAddAlertModal, setShowAddAlertModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [locationAlerts, setLocationAlerts] = useState([]);
  const [currentUserName, setCurrentUserName] = useState("");
  const [addedByName, setAddedByName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userOverallRating, setUserOverallRating] = useState(0);
  const [averageOverallRating, setAverageOverallRating] = useState(0);
  const [overallRatingsCount, setOverallRatingsCount] = useState(0);
  const [pendingOverallRating, setPendingOverallRating] = useState(0);
  const [isSubmittingOverall, setIsSubmittingOverall] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [cachedPhotoUri, setCachedPhotoUri] = useState(null);

  const unsubscribeRefs = React.useRef([]);

  // Helper to unsubscribe all listeners
  const unsubscribeAll = () => {
    unsubscribeRefs.current.forEach((unsub) => {
      try {
        if (typeof unsub === "function" && unsub) unsub();
      } catch {}
    });
    unsubscribeRefs.current = [];
  };

  // Function to handle adding alerts
  const handleAddAlert = async (alertText, onClose) => {
    if (!alertText.trim()) {
      Alert.alert("Error", "Alert text cannot be empty.");
      return;
    }
    try {
      const spotRef = doc(db, "studySpots", spotId);
      await updateDoc(spotRef, {
        locationAlerts: arrayUnion(alertText.trim()),
      });
      setLocationAlerts((prev) => [...(prev || []), alertText.trim()]);
      if (typeof onClose === "function") onClose();
    } catch (error) {
      console.error("Error adding alert:", error);
      Alert.alert("Error", "Failed to add alert.");
    }
  };

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
        return `Last updated: ${diffMin} min ago`;
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

  // Fetch spot details and ratings
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
            const revealIdentity = spotData.revealIdentity;
            setAddedByName(
              revealIdentity
                ? `${userDoc.data().firstName} ${userDoc.data().lastName}`
                : "Anonymous"
            );
          } else {
            setAddedByName("Anonymous");
          }
        } else {
          setAddedByName("Anonymous");
        }

        // Fetch ratings for the spot
        const ratingsQuery = query(
          collection(db, "ratings"),
          where("spotId", "==", spotId)
        );
        unsubscribeAll();
        const unsubscribe = onSnapshot(ratingsQuery, (snapshot) => {
          const now = Timestamp.now().toMillis();
          const thirtyMinutesAgo = now - 30 * 60 * 1000;
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayStartMillis = todayStart.getTime();

          let recentRatings = [];
          let recentLastTimestamp = null;
          snapshot.forEach((doc) => {
            const data = doc.data();
            const ts = data.timestamp.toMillis();
            if (ts >= thirtyMinutesAgo) {
              recentRatings.push(data);
              if (!recentLastTimestamp || ts > recentLastTimestamp)
                recentLastTimestamp = ts;
            }
          });

          let noiseRating,
            crowdRating,
            lastUpdated,
            lastUpdatedType,
            lastWindowHours;

          if (recentRatings.length > 0) {
            let noiseSum = 0,
              crowdSum = 0;
            recentRatings.forEach((r) => {
              noiseSum += r.noise;
              crowdSum += r.crowd;
            });
            noiseRating = (noiseSum / recentRatings.length).toFixed(1);
            crowdRating = (crowdSum / recentRatings.length).toFixed(1);
            lastUpdated = recentLastTimestamp;
            lastUpdatedType = "recent";
            lastWindowHours = null;
          } else {
            let bestWindow = null;
            let bestWindowRatings = [];
            let lastRecentTimestamp = null;
            let found = false;
            for (let hours = 1; hours <= 6; hours++) {
              const windowStart = now - hours * 60 * 60 * 1000;
              let windowRatings = [];
              let windowLastTimestamp = null;
              snapshot.forEach((doc) => {
                const data = doc.data();
                const ts = data.timestamp.toMillis();
                if (ts >= windowStart) {
                  windowRatings.push(data);
                  if (!windowLastTimestamp || ts > windowLastTimestamp)
                    windowLastTimestamp = ts;
                }
              });
              if (windowRatings.length > 0) {
                bestWindow = hours;
                bestWindowRatings = windowRatings;
                lastRecentTimestamp = windowLastTimestamp;
                found = true;
                break;
              }
            }
            let todayRatings = [];
            if (!found) {
              snapshot.forEach((doc) => {
                const data = doc.data();
                const ts = data.timestamp.toMillis();
                if (ts >= todayStartMillis) {
                  todayRatings.push(data);
                }
              });
            }

            if (found && bestWindowRatings.length > 0) {
              let noiseSum = 0,
                crowdSum = 0;
              bestWindowRatings.forEach((r) => {
                noiseSum += r.noise;
                crowdSum += r.crowd;
              });
              noiseRating = (noiseSum / bestWindowRatings.length).toFixed(1);
              crowdRating = (crowdSum / bestWindowRatings.length).toFixed(1);
              lastUpdated = lastRecentTimestamp;
              lastUpdatedType = "window";
              lastWindowHours = bestWindow;
            } else if (todayRatings.length > 0) {
              let noiseSumDay = 0,
                crowdSumDay = 0;
              todayRatings.forEach((r) => {
                noiseSumDay += r.noise;
                crowdSumDay += r.crowd;
              });
              noiseRating = (noiseSumDay / todayRatings.length).toFixed(1);
              crowdRating = (crowdSumDay / todayRatings.length).toFixed(1);
              lastUpdated = Math.max(
                ...todayRatings.map((r) => r.timestamp.toMillis())
              );
              lastUpdatedType = "today";
              lastWindowHours = null;
            } else {
              noiseRating = "N/A";
              crowdRating = "N/A";
              lastUpdated = null;
              lastUpdatedType = null;
              lastWindowHours = null;
            }
          }

          setSpot((prev) => ({
            ...prev,
            ratings: {
              noise: noiseRating,
              crowd: crowdRating,
              lastUpdated,
              lastUpdatedType,
              lastWindowHours,
            },
          }));
        });
        unsubscribeRefs.current.push(unsubscribe);
      } else {
        alert("The requested spot could not be found. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching spot details:", error);
      alert("Unable to fetch spot details. Please check your permissions.");
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    if (spot && spot.photoUrl) {
      cacheSpotImage(spotId, spot.photoUrl);
    } else {
      setCachedPhotoUri(null);
    }
  }, [spotId, spot?.photoUrl]);

  useEffect(() => {
    if (!spotId) {
      navigation.goBack();
      return;
    }
    fetchSpotDetails();
    // eslint-disable-next-line
  }, [spotId]);

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
      setPendingOverallRating(userRating);
    };
    fetchOverallRatings();
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

  const handleStarTap = (rating) => {
    setPendingOverallRating(rating);
  };

  const handleSubmitOverallRating = async () => {
    if (
      pendingOverallRating === 0 ||
      pendingOverallRating === userOverallRating
    )
      return;
    setIsSubmittingOverall(true);
    try {
      const ratingsQuery = query(
        collection(db, "overallRatings"),
        where("spotId", "==", spotId),
        where("userId", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(ratingsQuery);
      if (!snapshot.empty) {
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
        await addDoc(collection(db, "overallRatings"), {
          spotId,
          userId: auth.currentUser.uid,
          rating: pendingOverallRating,
          timestamp: Timestamp.now(),
        });
      }
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

  const handleDeleteNook = async () => {
    if (!spotId) return;
    Alert.alert(
      "Delete Nook",
      "Are you sure you want to delete this nook? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "studySpots", spotId));
              const user = auth.currentUser;
              if (user) {
                const userRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                  const favs = userDoc.data().favorites || [];
                  if (favs.includes(spotId)) {
                    await updateDoc(userRef, {
                      favorites: favs.filter((f) => f !== spotId),
                    });
                  }
                }
              }
              navigation.navigate("Home", { refresh: true });
            } catch (e) {
              Alert.alert("Error", "Failed to delete nook.");
            }
          },
        },
      ]
    );
  };

  if (!spot) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: themeColors.white,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: themeColors.darkGray, fontSize: 16 }}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  const tags = Array.isArray(spot.tags) ? spot.tags : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          backgroundColor: themeColors.white,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View
          style={{
            width: "100%",
            marginBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.navigate("Home")}
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              padding: 10,
              shadowColor: themeColors.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              marginBottom: 8,
            }}
          >
            <House size={20} color={themeColors.purple} />
          </TouchableOpacity>
          {/* More Info Dropdown Menu */}
          <View style={{ position: "relative" }}>
            <TouchableOpacity
              onPress={() => setShowMenu((v) => !v)}
              style={{
                padding: 8,
                borderRadius: 20,
                backgroundColor: themeColors.white,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <DotsThreeVertical
                size={26}
                color={themeColors.purple}
                weight="bold"
              />
            </TouchableOpacity>
            {showMenu && (
              <View
                style={{
                  position: "absolute",
                  top: 36,
                  right: 0,
                  backgroundColor: themeColors.white,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: themeColors.gray,
                  minWidth: 180,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.18,
                  shadowRadius: 8,
                  elevation: 10,
                  zIndex: 100,
                }}
              >
                {/* Report Incorrect Info */}
                <TouchableOpacity
                  onPress={() => {
                    setShowMenu(false);
                    setTimeout(() => setShowReportModal(true), 200);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.purple,
                      fontWeight: "bold",
                      fontSize: 15,
                    }}
                  >
                    Report Incorrect Information
                  </Text>
                </TouchableOpacity>
                {/* Divider */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: themeColors.gray,
                    marginHorizontal: 10,
                  }}
                />
                {/* Delete Nook (only for owner) */}
                <TouchableOpacity
                  onPress={() => {
                    setShowMenu(false);
                    setTimeout(handleDeleteNook, 200);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.red,
                      fontWeight: "bold",
                      fontSize: 15,
                    }}
                  >
                    Delete Nook
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Spot Image */}
        <SpotImage
          photoUrl={spot.photoUrl}
          cachedPhotoUri={cachedPhotoUri}
          themeColors={themeColors}
        />

        {/* Spot Name and Floor */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: themeColors.black,
            marginBottom: 6,
          }}
        >
          {spot.buildingName}
          {spot.roomNumber && (
            <Text
              style={{
                fontSize: 24,
                color: themeColors.black,
                fontWeight: "bold",
              }}
            >
              {" - Floor "}
              {spot.roomNumber}
            </Text>
          )}
        </Text>

        {/* Tags */}
        <TagList tags={tags} themeColors={themeColors} />

        {/* Ratings */}
        <RatingsDisplay
          ratings={spot.ratings}
          themeColors={themeColors}
          getLastUpdatedLabel={getLastUpdatedLabel}
        />

        {/* Open/Quiet Hours */}
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

        {/* Overall Rating */}
        <OverallRating
          userOverallRating={userOverallRating}
          averageOverallRating={averageOverallRating}
          overallRatingsCount={overallRatingsCount}
          pendingOverallRating={pendingOverallRating}
          setPendingOverallRating={setPendingOverallRating}
          isSubmittingOverall={isSubmittingOverall}
          onSubmit={handleSubmitOverallRating}
          themeColors={themeColors}
        />

        {/* Action Buttons */}
        <ActionButtons
          onLiveUpdate={() => setShowLiveUpdate(true)}
          onAddAlert={() => setShowAddAlertModal(true)}
          themeColors={themeColors}
        />

        {/* Modals */}
        <LiveUpdateModal
          visible={showLiveUpdate}
          onClose={() => setShowLiveUpdate(false)}
          spotId={spotId}
          initialNoise={spot.ratings?.noise || 0}
          initialCrowd={spot.ratings?.crowd || 0}
          themeColors={themeColors}
        />
        <AddAlertModal
          visible={showAddAlertModal}
          onClose={() => setShowAddAlertModal(false)}
          onAddAlert={handleAddAlert}
          themeColors={themeColors}
        />
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          spotId={spotId}
          spotName={spot?.buildingName || ""}
          themeColors={themeColors}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
