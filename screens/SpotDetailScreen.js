import React, { useState, useContext } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { House, DotsThreeVertical } from "phosphor-react-native";
import { colors } from "../constants/colors";
import { ThemeContext } from "../App";
import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

// Extracted components
import TagList from "../components/SpotDetail/TagList";
import SpotImage from "../components/SpotDetail/SpotImage";
import RatingsDisplay from "../components/SpotDetail/RatingsDisplay";
import OverallRating from "../components/SpotDetail/OverallRating";
import ActionButtons from "../components/SpotDetail/ActionButtons";
import AddAlertModal from "../components/SpotDetail/AddAlertModal";
import LiveUpdateModal from "../components/SpotDetail/LiveUpdateModal";
import ReportModal from "../components/SpotDetail/ReportModal";

// Hooks
import useSpotDetails from "../hooks/useSpotDetails";
import useSpotImageCache from "../hooks/useSpotImageCache";
import useOverallRatings from "../hooks/useOverallRatings";
import useFavoriteStatus from "../hooks/useFavoriteStatus";

export default function SpotDetailScreen({ route, navigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  const { spotId } = route.params || {};
  const [showLiveUpdate, setShowLiveUpdate] = useState(false);
  const [showAddAlertModal, setShowAddAlertModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Hooks
  const { spot, addedByName, isLoading, setSpot } = useSpotDetails(spotId);
  const cachedPhotoUri = useSpotImageCache(spotId, spot?.photoUrl);
  const {
    userOverallRating,
    averageOverallRating,
    overallRatingsCount,
    pendingOverallRating,
    setPendingOverallRating,
    isSubmittingOverall,
    submitOverallRating,
  } = useOverallRatings(spotId);
  const isFavorite = useFavoriteStatus(spotId);

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
      setSpot((prev) => ({
        ...prev,
        locationAlerts: [...(prev.locationAlerts || []), alertText.trim()],
      }));
      if (typeof onClose === "function") onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to add alert.");
    }
  };

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

  if (isLoading || !spot) {
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
          onSubmit={submitOverallRating}
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
