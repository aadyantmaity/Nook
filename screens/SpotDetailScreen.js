import React, { useState, useEffect, useContext, useMemo } from "react";
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
  CaretUp,
  CaretDown,
} from "phosphor-react-native";
import { colors } from "../constants/colors";
import { auth } from "../firebaseConfig"; // Import auth
import Slider from "@react-native-community/slider"; // Add this import for Slider
import { ThemeContext } from "../App"; // Import ThemeContext
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { LineChart } from "react-native-gifted-charts"; // Add at top if not present

export default function SpotDetailScreen({ route, navigation }) {
  const themeCtx = useContext(ThemeContext);
  const isDarkMode = themeCtx?.isDarkMode ?? false;
  const themeColors = themeCtx?.themeColors ?? colors;

  const { spotId } = route.params || {};
  const [spot, setSpot] = useState(null);
  const [showLiveUpdate, setShowLiveUpdate] = useState(false);
  const [showAddAlertModal, setShowAddAlertModal] = useState(false); // State for alert modal
  const [locationAlerts, setLocationAlerts] = useState([]); // Store location alerts in array
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
  const [focusStats, setFocusStats] = useState(null); // For private nook stats
  const [privateNote, setPrivateNote] = useState(""); // For private notes
  const [savingNote, setSavingNote] = useState(false);
  const [allNotes, setAllNotes] = useState([]); // Store all notes for this nook

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
      if (typeof onClose === "function") onClose(); // Close modal on success
      // No success notification needed
    } catch (error) {
      console.error("Error adding alert:", error);
      Alert.alert("Error", "Failed to add alert.");
    }
  };

  // Helper for "last updated" display (copied from HomeScreen)
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

        // Unsubscribe previous listener if any
        unsubscribeAll();

        const unsubscribe = onSnapshot(ratingsQuery, (snapshot) => {
          const now = Timestamp.now().toMillis();
          const thirtyMinutesAgo = now - 30 * 60 * 1000;
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayStartMillis = todayStart.getTime();

          // --- NEW LOGIC: Check for recent (last 30 min) ratings first ---
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
            // Use only recent ratings (last 30 min)
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
            // --- Otherwise, use 1-6 hour window as before ---
            let bestWindow = null;
            let bestWindowRatings = [];
            let bestWindowStart = null;
            let bestWindowEnd = null;
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
                bestWindowStart = windowStart;
                bestWindowEnd = now;
                lastRecentTimestamp = windowLastTimestamp;
                found = true;
                break;
              }
            }
            // If no ratings in last 6 hours, fallback to today's ratings
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

          const now = Timestamp.now().toMillis();
          const thirtyMinutesAgo = now - 30 * 60 * 1000;
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayStartMillis = todayStart.getTime();

          // --- NEW LOGIC: Check for recent (last 30 min) ratings first ---
          let recentRatings = [];
          let recentLastTimestamp = null;
          ratingsSnapshot.forEach((ratingDoc) => {
            const ratingData = ratingDoc.data();
            const ts = ratingData.timestamp.toMillis();
            if (ts >= thirtyMinutesAgo) {
              recentRatings.push(ratingData);
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
            // Use only recent ratings (last 30 min)
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
            // --- Otherwise, use 1-6 hour window as before ---
            let bestWindow = null;
            let bestWindowRatings = [];
            let bestWindowStart = null;
            let bestWindowEnd = null;
            let lastRecentTimestamp = null;
            let found = false;
            for (let hours = 1; hours <= 6; hours++) {
              const windowStart = now - hours * 60 * 60 * 1000;
              let windowRatings = [];
              let windowLastTimestamp = null;
              ratingsSnapshot.forEach((ratingDoc) => {
                const ratingData = ratingDoc.data();
                const ts = ratingData.timestamp.toMillis();
                if (ts >= windowStart) {
                  windowRatings.push(ratingData);
                  if (!windowLastTimestamp || ts > windowLastTimestamp)
                    windowLastTimestamp = ts;
                }
              });
              if (windowRatings.length > 0) {
                bestWindow = hours;
                bestWindowRatings = windowRatings;
                bestWindowStart = windowStart;
                bestWindowEnd = now;
                lastRecentTimestamp = windowLastTimestamp;
                found = true;
                break;
              }
            }
            // If no ratings in last 6 hours, fallback to today's ratings
            let todayRatings = [];
            if (!found) {
              ratingsSnapshot.forEach((ratingDoc) => {
                const ratingData = ratingDoc.data();
                const ts = ratingData.timestamp.toMillis();
                if (ts >= todayStartMillis) {
                  todayRatings.push(ratingData);
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

          setSpot((prevSpot) => ({
            ...spotData,
            ratings: {
              noise: noiseRating,
              crowd: crowdRating,
              lastUpdated,
              lastUpdatedType,
              lastWindowHours,
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
      where("spotId", "==", spotId)
    );

    // Unsubscribe previous listener if any
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
        let bestWindowStart = null;
        let bestWindowEnd = null;
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
            bestWindowStart = windowStart;
            bestWindowEnd = now;
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

      setSpot((prevSpot) => ({
        ...prevSpot,
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

    return () => {
      isMounted = false;
      unsubscribe();
      unsubscribeAll();
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
      // Only allow delete if current user is the owner
      if (spot?.ownerUid && auth.currentUser?.uid !== spot.ownerUid) {
        Alert.alert(
          "Insufficient permissions",
          "You are not the owner of this nook."
        );
        return;
      }
      unsubscribeAll(); // Unsubscribe all listeners before deleting
      await deleteDoc(doc(db, "studySpots", spotId));
      console.log("Spot deleted successfully");
      navigation.navigate("Home", { refresh: true });
    } catch (error) {
      console.error("Error deleting spot:", error);
      Alert.alert(
        "Unable to delete the spot.",
        error?.message?.includes("PERMISSION_DENIED")
          ? "You do not have permission to delete this nook. Only the owner can delete it."
          : "Please check your permissions."
      );
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

  // Helper to format time in h m s
  function formatHMS(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}h ${m}m ${s}s`;
  }

  // Save private note for private nook
  const handleSaveNote = async () => {
    if (!spotId || !auth.currentUser) return;
    const trimmedNote = privateNote.trim();
    if (!trimmedNote) return;
    setSavingNote(true);
    try {
      // Add note to subcollection 'notes' under this spot
      await addDoc(collection(db, "studySpots", spotId, "notes"), {
        userId: auth.currentUser.uid,
        note: trimmedNote,
        createdAt: Timestamp.now(),
      });
      setPrivateNote(""); // Reset input after save
      // Refresh notes after saving
      fetchAllNotes();
    } catch (e) {
      Alert.alert("Failed to save note.");
    }
    setSavingNote(false);
  };

  // Fetch all notes for this private nook
  const fetchAllNotes = async () => {
    if (!spotId) return;
    try {
      const notesSnap = await getDocs(
        collection(db, "studySpots", spotId, "notes")
      );
      const notesArr = [];
      notesSnap.forEach((doc) => {
        notesArr.push({ id: doc.id, ...doc.data() });
      });
      // Sort by createdAt descending
      notesArr.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setAllNotes(notesArr);
    } catch (e) {
      setAllNotes([]);
    }
  };

  // Fetch notes when spot loads or after save
  useEffect(() => {
    if (spot?.private && spot.ownerUid === auth.currentUser?.uid) {
      fetchAllNotes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot, auth.currentUser, spotId]);

  // Fetch private note and focus stats for private nooks
  useEffect(() => {
    if (!(spot?.private && spot.ownerUid === auth.currentUser?.uid)) return;

    // --- Listen for focus session changes in real-time ---
    const q = query(
      collection(db, "focusSessions"),
      where("userId", "==", auth.currentUser.uid),
      where("spotId", "==", spotId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = [];
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only count non-break sessions
        if (!data.isBreak && data.start && data.end) {
          const start = data.start.seconds
            ? data.start.seconds * 1000
            : data.start.toMillis?.() ?? 0;
          const end = data.end.seconds
            ? data.end.seconds * 1000
            : data.end.toMillis?.() ?? 0;
          const duration = data.duration || end - start;
          total += duration;
          sessions.push({
            ...data,
            start,
            end,
            duration,
          });
        }
      });
      setFocusStats({ sessions, total });
    });
    unsubscribeRefs.current.push(unsubscribe);

    // --- Listen for notes changes in real-time ---
    const notesRef = collection(db, "studySpots", spotId, "notes");
    const unsubscribeNotes = onSnapshot(notesRef, (notesSnap) => {
      const notesArr = [];
      notesSnap.forEach((doc) => {
        notesArr.push({ id: doc.id, ...doc.data() });
      });
      notesArr.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setAllNotes(notesArr);
    });
    unsubscribeRefs.current.push(unsubscribeNotes);

    // Set private note input to the last note by this user (optional, or keep as is)
    // setPrivateNote(""); // Optionally clear input on mount

    return () => {
      unsubscribe();
      unsubscribeNotes();
      unsubscribeAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot, auth.currentUser, spotId]);

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

  // Add a helper to check if this is a private nook
  const isPrivateNook =
    spot?.private && spot?.ownerUid === auth.currentUser?.uid;

  // Add a helper to check if the current user is the owner (addedBy)
  const isOwner = spot?.addedBy === auth.currentUser?.uid;

  // --- Main render ---
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      {/* Only make the page scrollable for private nooks */}
      {isPrivateNook ? (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 16,
            backgroundColor: themeColors.white,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Home Button Above Image */}
          <View style={{ width: "100%", marginBottom: 8 }}>
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
              fontSize: 24,
              fontWeight: "bold",
              color: themeColors.black, // Use black for spot name
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

          {/* --- TAGS FIRST --- */}
          <View
            style={{
              marginTop: 0,
              marginBottom: 16,
              alignItems: "flex-start",
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
                    <Text style={{ color: themeColors.white, fontSize: 14 }}>
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
          {!isPrivateNook && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 16,
                marginTop: 4,
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
          )}

          {/* --- LAST UPDATED LABEL --- */}
          {!isPrivateNook && (
            <Text
              style={{
                fontSize: 12,
                color: themeColors.darkGray,
                marginBottom: 24,
                textAlign: "right",
                alignSelf: "flex-end",
              }}
            >
              {getLastUpdatedLabel(spot.ratings)}
            </Text>
          )}

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

          {/* --- OVERALL RATING NEXT --- */}
          {!isPrivateNook && (
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
          )}
          {/* --- Private Nook Section --- */}
          {isPrivateNook && (
            <View
              style={{
                marginTop: 24,
                marginBottom: 24,
                backgroundColor: themeColors.gray + "18",
                borderRadius: 12,
                padding: 16,
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
                Focus Stats
              </Text>
              <Text
                style={{
                  color: themeColors.black,
                  fontSize: 15,
                  marginBottom: 4,
                }}
              >
                Total sessions: {focusStats?.sessions?.length || 0}
              </Text>
              <Text
                style={{
                  color: themeColors.black,
                  fontSize: 15,
                  marginBottom: 4,
                }}
              >
                Total focus time:{" "}
                {focusStats?.total ? formatHMS(focusStats.total) : "0h 0m 0s"}
              </Text>
              {/* Private notes */}
              <Text
                style={{
                  fontWeight: "bold",
                  fontSize: 16,
                  color: themeColors.purple,
                  marginTop: 18,
                  marginBottom: 4,
                }}
              >
                Private Notes
              </Text>
              <TextInput
                value={privateNote}
                onChangeText={(text) => {
                  if (text.length <= 200) setPrivateNote(text);
                }}
                placeholder="Add a private note for this nook..."
                placeholderTextColor={themeColors.darkGray}
                multiline
                maxLength={200}
                style={{
                  minHeight: 60,
                  borderWidth: 1,
                  borderColor: themeColors.purple,
                  borderRadius: 8,
                  padding: 10,
                  color: themeColors.black,
                  backgroundColor: themeColors.white,
                  marginBottom: 4,
                }}
                editable={!savingNote}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color:
                      privateNote.length >= 200
                        ? themeColors.red
                        : themeColors.darkGray,
                    fontSize: 12,
                  }}
                >
                  {privateNote.length}/200
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleSaveNote}
                disabled={savingNote || privateNote.trim().length === 0}
                style={{
                  backgroundColor:
                    privateNote.trim().length === 0
                      ? themeColors.gray
                      : themeColors.purple,
                  borderRadius: 8,
                  paddingVertical: 8,
                  alignItems: "center",
                  opacity: savingNote ? 0.7 : 1,
                }}
              >
                <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                  {savingNote ? "Saving..." : "Save Note"}
                </Text>
              </TouchableOpacity>

              {/* Dropdown for all saved notes */}
              <NotesDropdown
                notes={allNotes}
                themeColors={themeColors}
                isPrivateNook={true}
                spotId={spotId}
              />
            </View>
          )}

          {/* Bottom action area */}
          <View
            style={{
              padding: 0,
              backgroundColor: themeColors.white,
              borderTopWidth: 1,
              borderTopColor: themeColors.gray,
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start", // <-- changed from center to flex-start
                width: "100%",
                marginTop: 12,
                gap: 8, // add gap for spacing
              }}
            >
              {/* Only show Update button for non-private nooks */}
              {!isPrivateNook && (
                <TouchableOpacity
                  onPress={() => setShowLiveUpdate(true)}
                  style={{
                    flex: 1, // changed from width: "48%"
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: themeColors.purple,
                    borderRadius: 8,
                    marginLeft: 0,
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
              )}

              {/* Only show Add Alert for non-private nooks */}
              {!isPrivateNook && (
                <TouchableOpacity
                  onPress={() => setShowAddAlertModal(true)}
                  style={{
                    flex: 1, // changed from width: "48%"
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: themeColors.orange,
                    borderRadius: 8,
                    marginLeft: 0,
                    marginTop: 0, // remove marginTop so it's aligned
                    shadowColor: themeColors.black,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    Add Alert
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {/* Only show Report Button for non-private nooks */}
            {!isPrivateNook && (
              <TouchableOpacity
                onPress={() => setShowReportModal(true)}
                style={{
                  marginTop: 12,
                  alignSelf: "center",
                  width: "100%",
                  backgroundColor: themeColors.white,
                  borderColor: themeColors.purple,
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                }}
              >
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  Report Incorrect Information
                </Text>
              </TouchableOpacity>
            )}
            {/* Only show modals for non-private nooks */}
            {!isPrivateNook && (
              <>
                <LiveUpdateModal
                  visible={showLiveUpdate}
                  onClose={() => setShowLiveUpdate(false)}
                  spotId={spotId}
                  initialNoise={spot.ratings?.noise || 0}
                  initialCrowd={spot.ratings?.crowd || 0}
                />
                {/* Add Alert Modal */}
                <AddAlertModal
                  visible={showAddAlertModal}
                  onClose={() => setShowAddAlertModal(false)}
                  onAddAlert={handleAddAlert}
                />
                {/* Report Modal */}
                <ReportModal
                  visible={showReportModal}
                  onClose={() => setShowReportModal(false)}
                  spotId={spotId}
                  spotName={spot?.buildingName || ""}
                />
              </>
            )}
          </View>

          {/* --- Delete Button for Owner (private or public) --- */}
          {isOwner && (
            <View style={{ marginTop: 8, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={handleDeleteSpot}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: themeColors.red,
                  borderRadius: 8,
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
                  Delete Nook
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      ) : (
        // Non-private nooks: NOT scrollable, just a regular View
        <View
          style={{ flex: 1, backgroundColor: themeColors.white, padding: 16 }}
        >
          {/* Home Button Above Image */}
          <View style={{ width: "100%", marginBottom: 8 }}>
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
              fontSize: 24,
              fontWeight: "bold",
              color: themeColors.black, // Use black for spot name
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

          {/* --- TAGS FIRST --- */}
          <View
            style={{
              marginTop: 0,
              marginBottom: 16,
              alignItems: "flex-start",
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
                    <Text style={{ color: themeColors.white, fontSize: 14 }}>
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
          {!isPrivateNook && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 16,
                marginTop: 4,
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
          )}

          {/* --- LAST UPDATED LABEL --- */}
          {!isPrivateNook && (
            <Text
              style={{
                fontSize: 12,
                color: themeColors.darkGray,
                marginBottom: 24,
                textAlign: "right",
                alignSelf: "flex-end",
              }}
            >
              {getLastUpdatedLabel(spot.ratings)}
            </Text>
          )}

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

          {/* --- OVERALL RATING NEXT --- */}
          {!isPrivateNook && (
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
          )}
          {/* --- Private Nook Section --- */}
          {isPrivateNook && (
            <View
              style={{
                marginTop: 24,
                marginBottom: 24,
                backgroundColor: themeColors.gray + "18",
                borderRadius: 12,
                padding: 16,
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
                Focus Stats
              </Text>
              <Text
                style={{
                  color: themeColors.black,
                  fontSize: 15,
                  marginBottom: 4,
                }}
              >
                Total sessions: {focusStats?.sessions?.length || 0}
              </Text>
              <Text
                style={{
                  color: themeColors.black,
                  fontSize: 15,
                  marginBottom: 4,
                }}
              >
                Total focus time:{" "}
                {focusStats?.total ? formatHMS(focusStats.total) : "0h 0m 0s"}
              </Text>
              {/* Private notes */}
              <Text
                style={{
                  fontWeight: "bold",
                  fontSize: 16,
                  color: themeColors.purple,
                  marginTop: 18,
                  marginBottom: 4,
                }}
              >
                Private Notes
              </Text>
              <TextInput
                value={privateNote}
                onChangeText={(text) => {
                  if (text.length <= 200) setPrivateNote(text);
                }}
                placeholder="Add a private note for this nook..."
                placeholderTextColor={themeColors.darkGray}
                multiline
                maxLength={200}
                style={{
                  minHeight: 60,
                  borderWidth: 1,
                  borderColor: themeColors.purple,
                  borderRadius: 8,
                  padding: 10,
                  color: themeColors.black,
                  backgroundColor: themeColors.white,
                  marginBottom: 4,
                }}
                editable={!savingNote}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color:
                      privateNote.length >= 200
                        ? themeColors.red
                        : themeColors.darkGray,
                    fontSize: 12,
                  }}
                >
                  {privateNote.length}/200
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleSaveNote}
                disabled={savingNote || privateNote.trim().length === 0}
                style={{
                  backgroundColor:
                    privateNote.trim().length === 0
                      ? themeColors.gray
                      : themeColors.purple,
                  borderRadius: 8,
                  paddingVertical: 8,
                  alignItems: "center",
                  opacity: savingNote ? 0.7 : 1,
                }}
              >
                <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                  {savingNote ? "Saving..." : "Save Note"}
                </Text>
              </TouchableOpacity>

              {/* Dropdown for all saved notes */}
              <NotesDropdown
                notes={allNotes}
                themeColors={themeColors}
                isPrivateNook={true}
                spotId={spotId}
              />
            </View>
          )}

          {/* Bottom action area */}
          <View
            style={{
              padding: 0,
              backgroundColor: themeColors.white,
              borderTopWidth: 1,
              borderTopColor: themeColors.gray,
              marginTop: 16,
              marginBottom: 0,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start", // <-- changed from center to flex-start
                width: "100%",
                marginTop: 12,
                gap: 8, // add gap for spacing
              }}
            >
              {/* Only show Update button for non-private nooks */}
              {!isPrivateNook && (
                <TouchableOpacity
                  onPress={() => setShowLiveUpdate(true)}
                  style={{
                    flex: 1, // changed from width: "48%"
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: themeColors.purple,
                    borderRadius: 8,
                    marginLeft: 0,
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
              )}

              {/* Only show Add Alert for non-private nooks */}
              {!isPrivateNook && (
                <TouchableOpacity
                  onPress={() => setShowAddAlertModal(true)}
                  style={{
                    flex: 1, // changed from width: "48%"
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: themeColors.orange,
                    borderRadius: 8,
                    marginLeft: 0,
                    marginTop: 0, // remove marginTop so it's aligned
                    shadowColor: themeColors.black,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    Add Alert
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {/* Only show Report Button for non-private nooks */}
            {!isPrivateNook && (
              <TouchableOpacity
                onPress={() => setShowReportModal(true)}
                style={{
                  marginTop: 12,
                  alignSelf: "center",
                  width: "100%",
                  backgroundColor: themeColors.white,
                  borderColor: themeColors.purple,
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                }}
              >
                <Text
                  style={{
                    color: themeColors.purple,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  Report Incorrect Information
                </Text>
              </TouchableOpacity>
            )}
            {/* Only show modals for non-private nooks */}
            {!isPrivateNook && (
              <>
                <LiveUpdateModal
                  visible={showLiveUpdate}
                  onClose={() => setShowLiveUpdate(false)}
                  spotId={spotId}
                  initialNoise={spot.ratings?.noise || 0}
                  initialCrowd={spot.ratings?.crowd || 0}
                />
                {/* Add Alert Modal */}
                <AddAlertModal
                  visible={showAddAlertModal}
                  onClose={() => setShowAddAlertModal(false)}
                  onAddAlert={handleAddAlert}
                />
                {/* Report Modal */}
                <ReportModal
                  visible={showReportModal}
                  onClose={() => setShowReportModal(false)}
                  spotId={spotId}
                  spotName={spot?.buildingName || ""}
                />
              </>
            )}
          </View>

          {/* --- Delete Button for Owner (private or public) --- */}
          {isOwner && (
            <View style={{ marginTop: 8, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={handleDeleteSpot}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: themeColors.red,
                  borderRadius: 8,
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
                  Delete Nook
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function AddAlertModal({ visible, onClose, onAddAlert }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const [alertText, setAlertText] = useState("");

  const handleAddAlertPress = () => {
    if (alertText.trim()) {
      onAddAlert(alertText.trim(), onClose); // Pass onClose to parent handler
      setAlertText(""); // Clear input after adding
      // Modal will be closed by parent handler on success
    }
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
            Add Alert
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
            placeholder="Enter alert text..."
            placeholderTextColor={themeColors.darkGray}
            multiline
            value={alertText}
            onChangeText={setAlertText}
          />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              onPress={handleAddAlertPress}
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: themeColors.green,
                borderRadius: 8,
                alignItems: "center",
                marginRight: 8,
              }}
            >
              <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
                Add
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
      setNoiseLevel(3);
      setCrowdLevel(3);
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

function NotesDropdown({ notes, themeColors, isPrivateNook, spotId }) {
  const [expanded, setExpanded] = useState(false);

  // Add delete handler
  const handleDeleteNote = async (noteId) => {
    try {
      if (!spotId || !noteId) throw new Error("Missing spotId or noteId");
      await deleteDoc(doc(db, "studySpots", spotId, "notes", noteId));
    } catch (e) {
      Alert.alert("Failed to delete note.");
    }
  };

  if (!notes || notes.length === 0) return null;

  // For non-private nooks, render dropdown absolutely at the bottom of the screen
  if (!isPrivateNook) {
    return (
      <View
        style={{
          marginTop: 18,
          marginBottom: 0,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: themeColors.purple,
          backgroundColor: themeColors.purple + "10",
        }}
      >
        <TouchableOpacity
          onPress={() => setExpanded((v) => !v)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 10,
            paddingHorizontal: 12,
          }}
        >
          <Text
            style={{
              color: themeColors.purple,
              fontWeight: "bold",
              fontSize: 15,
            }}
          >
            All Notes ({notes.length})
          </Text>
          {/* Replace ▼/▲ with CaretDown/CaretUp */}
          {expanded ? (
            <CaretUp size={18} color={themeColors.purple} />
          ) : (
            <CaretDown size={18} color={themeColors.purple} />
          )}
        </TouchableOpacity>
        {expanded && (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "100%",
              zIndex: 999,
              backgroundColor: themeColors.white,
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              borderWidth: 1,
              borderColor: themeColors.purple,
              maxHeight: 220,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <ScrollView
              style={{ paddingHorizontal: 8 }}
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {notes.map((note) => (
                <View
                  key={note.id}
                  style={{
                    marginBottom: 8,
                    padding: 8,
                    backgroundColor: themeColors.white,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: themeColors.gray,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: themeColors.black,
                        fontSize: 15,
                        lineHeight: 22,
                      }}
                    >
                      {note.note}
                    </Text>
                    <Text
                      style={{
                        color: themeColors.darkGray,
                        fontSize: 12,
                        marginTop: 4,
                        textAlign: "right",
                      }}
                    >
                      {note.createdAt?.toDate
                        ? note.createdAt.toDate().toLocaleString()
                        : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteNote(note.id)}
                    style={{
                      marginLeft: 8,
                      padding: 2,
                      borderRadius: 4,
                      backgroundColor: themeColors.red + "22",
                    }}
                  >
                    <X size={18} color={themeColors.red} weight="bold" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }

  // For private nooks, expand in place (inside scrollview)
  return (
    <View
      style={{
        marginTop: 18,
        marginBottom: 0,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: themeColors.purple,
        backgroundColor: themeColors.purple + "10",
      }}
    >
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10,
          paddingHorizontal: 12,
        }}
      >
        <Text
          style={{
            color: themeColors.purple,
            fontWeight: "bold",
            fontSize: 15,
          }}
        >
          All Notes ({notes.length})
        </Text>
        {/* Replace ▼/▲ with CaretDown/CaretUp */}
        {expanded ? (
          <CaretUp size={18} color={themeColors.purple} />
        ) : (
          <CaretDown size={18} color={themeColors.purple} />
        )}
      </TouchableOpacity>
      {expanded && (
        <View
          style={{
            maxHeight: 180,
            borderTopWidth: 1,
            borderTopColor: themeColors.purple,
            backgroundColor: themeColors.white,
          }}
        >
          <ScrollView
            style={{ paddingHorizontal: 4 }}
            contentContainerStyle={{ paddingVertical: 6 }}
            showsVerticalScrollIndicator={true}
          >
            {notes.map((note) => (
              <View
                key={note.id}
                style={{
                  marginBottom: 8,
                  padding: 8,
                  backgroundColor: themeColors.white,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: themeColors.gray,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: themeColors.black,
                      fontSize: 15,
                      lineHeight: 22,
                    }}
                  >
                    {note.note}
                  </Text>
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontSize: 12,
                      marginTop: 4,
                      textAlign: "right",
                    }}
                  >
                    {note.createdAt?.toDate
                      ? note.createdAt.toDate().toLocaleString()
                      : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteNote(note.id)}
                  style={{
                    marginLeft: 8,
                    padding: 2,
                    borderRadius: 4,
                    backgroundColor: themeColors.red + "22",
                  }}
                >
                  <X size={18} color={themeColors.red} weight="bold" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
