import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
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
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  ArrowLeft,
  SpeakerHigh,
  Check,
  X,
  UsersThree,
  Clock,
  Star,
} from "phosphor-react-native";
import { colors } from "../constants/colors";
import { auth } from "../firebaseConfig"; // Import auth
import Slider from "@react-native-community/slider"; // Add this import for Slider

export default function SpotDetailScreen({ route, navigation }) {
  const { spotId } = route.params || {};
  const [spot, setSpot] = useState(null);
  const [showLiveUpdate, setShowLiveUpdate] = useState(false);
  const [currentUserName, setCurrentUserName] = useState(""); // State for current user's name
  const [addedByName, setAddedByName] = useState(null); // Set initial state to null
  const [isLoading, setIsLoading] = useState(true); // Add loading state

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
        } else {
          console.error("Spot not found");
          alert("The requested spot could not be found. Please try again.");
        }
      } catch (error) {
        console.error("Error fetching spot details:", error);
        alert("Unable to fetch spot details. Please check your permissions.");
      } finally {
        setIsLoading(false); // Set loading to false after fetching data
      }
    };

    fetchSpotDetails();

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
          noiseSum += data.noise;
          crowdSum += data.crowd;
          count++;
        }
      });

      const noiseRating = count > 0 ? noiseSum / count : "N/A";
      const crowdRating = count > 0 ? crowdSum / count : "N/A";

      setSpot((prevSpot) => ({
        ...prevSpot,
        ratings: {
          noise: noiseRating,
          crowd: crowdRating,
        },
      }));
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [spotId, navigation]);

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

  if (isLoading)
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ fontSize: 16, color: colors.darkGray }}>Loading...</Text>
      </SafeAreaView>
    );

  const tags = spot.tags || [];
  const addedBy = spot.addedBy || "Anonymous";
  const buildingName = spot.buildingName || "Not Available";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        <View style={{ flex: 1, backgroundColor: colors.white }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                backgroundColor: colors.purple,
                borderRadius: 8,
                shadowColor: colors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              }}
            >
              <ArrowLeft size={20} color={colors.white} />
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              marginBottom: 16,
              color: colors.purple,
            }}
          >
            {buildingName}
          </Text>
          {/* Live Ratings */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                alignItems: "center",
                padding: 16,
                backgroundColor: colors.purple,
                borderRadius: 8,
                flex: 1, // Adjust width to align with "Added By" box
                marginRight: 8, // Add spacing between boxes
              }}
            >
              <SpeakerHigh size={24} color={colors.white} />
              <Text
                style={{
                  color: colors.white,
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
                backgroundColor: colors.purple,
                borderRadius: 8,
                flex: 1, // Adjust width to align with "Added By" box
              }}
            >
              <UsersThree size={24} color={colors.white} />
              <Text
                style={{
                  color: colors.white,
                  fontSize: 16,
                  fontWeight: "bold",
                  marginTop: 8,
                }}
              >
                Crowd: {spot.ratings?.crowd || "N/A"}
              </Text>
            </View>
          </View>
          {/* Added By */}
          <View
            style={{
              padding: 16,
              backgroundColor: colors.purple,
              borderRadius: 8,
              marginBottom: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: colors.white,
                fontSize: 16,
                marginBottom: 8, // Add gap between label and value
              }}
            >
              Added By
            </Text>
            <Text
              style={{
                color: colors.white,
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              {addedByName || ""} {/* Display loading state */}
            </Text>
          </View>

          <View
            style={{
              marginBottom: 16,
              marginTop: 8,
              alignItems: "center", // Center the "Tags" text horizontally
            }}
          >
            <Text
              style={{
                fontSize: 16,
                color: colors.purple,
                fontWeight: "bold",
                marginBottom: 8, // Add spacing between "Tags" text and the list
              }}
            >
              Tags
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center", // Center align the tags horizontally
              }}
            >
              {tags.length > 0 ? (
                tags.map((tag, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: colors.purple,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: colors.white, fontSize: 16 }}>
                      {String(tag)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 16, color: colors.darkGray }}>
                  No tags available
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      <View
        style={{
          padding: 16,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.gray,
        }}
      >
        <TouchableOpacity
          onPress={() => setShowLiveUpdate(true)} // Open the modal without accessing undefined states
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: colors.purple,
            borderRadius: 8,
            marginBottom: 16,
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <SpeakerHigh size={20} color={colors.white} />
          <Text
            style={{
              marginLeft: 8,
              color: colors.white,
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Live Update
          </Text>
        </TouchableOpacity>
        <LiveUpdateModal
          visible={showLiveUpdate} // Pass the correct visibility state
          onClose={() => setShowLiveUpdate(false)} // Ensure modal can be closed
          spotId={spotId} // Pass the spotId to the modal
          initialNoise={spot.ratings?.noise || 0} // Pass current noise rating
          initialCrowd={spot.ratings?.crowd || 0} // Pass current crowd rating
        />
        {spot.addedBy === auth.currentUser?.uid && (
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={handleDeleteSpot}
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: colors.red,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.white, fontWeight: "bold" }}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
  const [noiseLevel, setNoiseLevel] = useState(initialNoise); // Use initial noise rating
  const [crowdLevel, setCrowdLevel] = useState(initialCrowd); // Use initial crowd rating

  useEffect(() => {
    if (visible) {
      setNoiseLevel(initialNoise); // Reset noise level when modal opens
      setCrowdLevel(initialCrowd); // Reset crowd level when modal opens
    }
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
      console.log("Live update submitted successfully");
      onClose();
    } catch (error) {
      console.error("Error submitting live update:", error);
      alert("Unable to submit live update. Please check your permissions.");
    }
  };

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
            backgroundColor: colors.white,
            margin: 32,
            padding: 16,
            borderRadius: 8,
          }}
        >
          <Text style={{ marginBottom: 8, fontSize: 16, fontWeight: "bold" }}>
            Noise Level (1 = Very Quiet, 5 = Noisy):
          </Text>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, marginBottom: 4 }}>
              Selected: {noiseLevel}
            </Text>
            <Slider
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={noiseLevel}
              onValueChange={(value) => setNoiseLevel(value)}
              minimumTrackTintColor={colors.purple}
              maximumTrackTintColor={colors.gray}
              thumbTintColor={colors.purple}
            />
          </View>
          <Text style={{ marginBottom: 8, fontSize: 16, fontWeight: "bold" }}>
            Crowd Level (1 = Sparse, 5 = Packed):
          </Text>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, marginBottom: 4 }}>
              Selected: {crowdLevel}
            </Text>
            <Slider
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={crowdLevel}
              onValueChange={(value) => setCrowdLevel(value)}
              minimumTrackTintColor={colors.purple}
              maximumTrackTintColor={colors.gray}
              thumbTintColor={colors.purple}
            />
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              onPress={handleSubmitUpdate}
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: colors.purple,
                borderRadius: 8,
                alignItems: "center",
                marginRight: 8,
              }}
            >
              <Text style={{ color: colors.white, fontWeight: "bold" }}>
                Submit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                padding: 12,
                backgroundColor: colors.gray,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.black, fontWeight: "bold" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
