import React, { useContext, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  FlatList,
  Image,
  Share,
} from "react-native";
import {
  House,
  DotsThreeVertical,
  Warning,
  X,
  Trash,
  ArrowLeft,
  Flag,
  PaperPlaneRight,
  PencilSimple,
  Plus,
  UsersThree,
  ShareNetwork,
} from "phosphor-react-native";
import { colors } from "../constants/colors";
import { ThemeContext } from "../App";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

// Firebase imports
import {
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  addDoc,
  collection,
  serverTimestamp,
  onSnapshot, // <-- add this
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Extracted components
import TagList from "../components/SpotDetail/TagList";
import SpotImage from "../components/SpotDetail/SpotImage";
import RatingsDisplay from "../components/SpotDetail/RatingsDisplay";

import ActionButtons from "../components/SpotDetail/ActionButtons";
import AddAlertModal from "../components/SpotDetail/AddAlertModal";
import ReportModal from "../components/SpotDetail/ReportModal";
import LiveUpdateSliders from "../components/SpotDetail/LiveUpdateSliders";
import SpotFeedback from "../components/SpotDetail/SpotFeedback";
import SpotGallery from "../components/SpotDetail/SpotGallery";
import HomeLoadingScreen from "../components/Home/HomeLoadingScreen"; // Add this import
import PrivateNookShareModal from "../components/SpotDetail/PrivateNookShareModal";

import AddPrivateNookNoteInput from "../components/SpotDetail/AddPrivateNookNoteInput";
import ShareNookToGroupModal from "../components/SpotDetail/ShareNookToGroupModal";
import QRShareModal from "../components/SpotDetail/QRShareModal";
import * as Clipboard from "expo-clipboard";

// Hooks
import useSpotDetails from "../hooks/useSpotDetails";

import QRCode from "react-native-qrcode-svg";
import { FONTS } from "../constants/fonts";


export default function SpotDetailScreen({ route, navigation }) {
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  // Add this line to define user
  const user = auth.currentUser;

  const { spotId } = route.params || {};
  const [showAddAlertModal, setShowAddAlertModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPrivateNotesModal, setShowPrivateNotesModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isSubmittingLive, setIsSubmittingLive] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareNookToGroupModal, setShowShareNookToGroupModal] =
    useState(false); // <-- ADD STATE
  const [showQRShareModal, setShowQRShareModal] = useState(false);

  // Add this missing state:
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [isScrolled, setIsScrolled] = React.useState(false);

  // REMOVE: const [galleryImages, setGalleryImages] = useState([]);
  // REMOVE: const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  // Hooks
  const { spot, addedByName, isLoading, setSpot } = useSpotDetails(spotId);
  const isOwner = !!user && !!spot && spot.addedBy === user.uid;

  // Add state for live update sliders
  const [liveNoise, setLiveNoise] = useState(
    spot?.ratings?.noise === "N/A" || spot?.ratings?.noise === "No rating yet"
      ? 0
      : Number(spot?.ratings?.noise) || -2
  );
  const [liveCrowd, setLiveCrowd] = useState(
    spot?.ratings?.crowd === "N/A" || spot?.ratings?.crowd === "No rating yet"
      ? 0
      : Number(spot?.ratings?.crowd) || -2
  );

  // --- Private Nook Notes State ---
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showNotesArchive, setShowNotesArchive] = useState(false);
  const [notes, setNotes] = useState([]);

  // Fetch notes for private nook (now with onSnapshot)
  React.useEffect(() => {
    if (spot?.privateNook && spotId) {
      // Use onSnapshot for live updates
      const spotRef = doc(db, "studySpots", spotId);
      const unsub = onSnapshot(spotRef, (spotSnap) => {
        if (spotSnap.exists()) {
          setNotes(spotSnap.data().privateNotes || []);
        }
      });
      return () => unsub();
    }
  }, [spot?.privateNook, spotId, showNotesArchive]);

  // Check in cooldown: 1 hour per spot per user
  React.useEffect(() => {
    if (!spotId || !user) return;
    const key = `nook_checkin_${spotId}_${user.uid}`;
    // Use AsyncStorage instead of localStorage
    (async () => {
      try {
        const last = Number((await AsyncStorage.getItem(key)) || 0);
        setLastCheckIn(last);
      } catch {
        setLastCheckIn(0);
      }
    })();
  }, [spotId, user]);

  const canCheckIn = !lastCheckIn || Date.now() - lastCheckIn > 60 * 60 * 1000;

  // --- Live Update Cooldown State ---
  const [lastLiveUpdate, setLastLiveUpdate] = useState(0);

  // Track last live update time (per user, from Firestore)
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, (userDoc) => {
      if (userDoc.exists()) {
        setLastLiveUpdate(userDoc.data().lastLiveUpdate || 0);
      }
    });
    return () => unsub();
  }, [user]);

  // Helper: can submit live update (30 min cooldown)
  function canSubmitLiveUpdate() {
    return !lastLiveUpdate || Date.now() - lastLiveUpdate > 30 * 60 * 1000;
  }

  // Submit handler for live update
  const handleLiveUpdate = async () => {
    if (!canSubmitLiveUpdate()) {
      Alert.alert(
        "Cooldown",
        "You can only submit a live update every 30 minutes."
      );
      return;
    }
    // Disable if no options selected
    if (
      liveNoise === -2 ||
      liveCrowd === -2
      // (isOdegaard && tableAvailability === null) // REMOVE
    ) {
      Alert.alert(
        "Select an option",
        "Please select all required live update options."
      );
      return;
    }
    setIsSubmittingLive(true);
    try {
      const ratingData = {
        spotId,
        noise: liveNoise,
        crowd: liveCrowd,
        timestamp: serverTimestamp(),
      };
      // if (isOdegaard && tableAvailability !== null) {…} // REMOVE
      await addDoc(collection(db, "ratings"), ratingData);
      // Set cooldown in user doc
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { lastLiveUpdate: Date.now() });
      setLastLiveUpdate(Date.now());
    } catch (e) {
      Alert.alert("Error", "Failed to submit live update.");
    }
    setIsSubmittingLive(false);
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
      return "Last updated: Today (day avg)";
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
      const alertObj = {
        text: alertText.trim(),
        createdAt: Date.now(),
      };
      await updateDoc(spotRef, {
        locationAlerts: arrayUnion(alertObj),
      });
      setSpot((prev) => ({
        ...prev,
        locationAlerts: [...(prev.locationAlerts || []), alertObj],
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
      "Are you sure you want to delete this Nook? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "studySpots", spotId));
              // Note: The favoritedBy subcollection will be automatically deleted when the study spot is deleted
              // due to Firestore's cascading delete behavior for subcollections
              navigation.navigate("Home", { deleting: true });
            } catch (e) {
              Alert.alert("Error", "Failed to delete nook.");
            }
          },
        },
      ]
    );
  };

  // --- Minimum loading duration state ---
  const [minLoadingElapsed, setMinLoadingElapsed] = useState(false);
  const initialMount = useRef(true);

  useEffect(() => {
    setMinLoadingElapsed(false);
    initialMount.current = true;
    const timer = setTimeout(() => {
      setMinLoadingElapsed(true);
      initialMount.current = false;
    }, 750); // 1.5 seconds
    return () => clearTimeout(timer);
  }, [
    route?.params?.spotId,
    route?.params?.id,
    route?.params?.view,
    route?.params?.refresh,
    route?.params?.deleting,
    route?.params?.creating,
    route?.params?.homeLoading,
  ]);
  // The dependency array ensures timer resets on navigation

  // --- Show loading screen until both data and timer are ready ---
  if (isLoading || !spot || !minLoadingElapsed) {
    return (
      <HomeLoadingScreen
        themeColors={themeColors}
        loadingMessage="Loading Nook details..."
      />
    );
  }

  const tags = Array.isArray(spot.tags) ? spot.tags : [];
  const isPrivateNook = !!spot.privateNook;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: themeColors.white,
        paddingTop: 48,
      }}
    >
      <View style={{}}>
        {/* Only use ScrollView for public nooks, plain View for private nooks */}
        {!isPrivateNook ? (
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              padding: 16,
              backgroundColor: themeColors.white,
              paddingTop: 0, // already handled by outer View
              paddingBottom: 80, // add extra bottom padding to avoid FAB overlap
            }}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              const offsetY = e.nativeEvent.contentOffset.y;
              setIsScrolled(offsetY > 2);
            }}
            scrollEventThrottle={16}
          >
            {/* Top gradient */}
            {isScrolled && (
              <LinearGradient
                colors={[themeColors.white + "FF", themeColors.white + "00"]}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 24,
                  zIndex: 2,
                  pointerEvents: "none",
                }}
                pointerEvents="none"
              />
            )}
            {/* Top Bar */}
            <View
              style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
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
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 10,
                  shadowColor: themeColors.black,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  marginBottom: 8,
                  marginLeft: -12,
                }}
              >
                <ArrowLeft size={24} color={themeColors.purple} />
              </TouchableOpacity>
              {/* Add Alert button and More Info Dropdown Menu */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                {/* More Info Dropdown Menu */}
                <TouchableOpacity
                  onPress={() => setShowMenu((v) => !v)}
                  style={{
                    padding: 8,
                    borderRadius: 20,
                    backgroundColor: themeColors.white,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: -16,
                    
                  }}
                >
                  <DotsThreeVertical size={27} color={themeColors.purple} />
                </TouchableOpacity>
                {/* Add Alert Button with Text */}

                {showMenu && (
                  <>
                    {/* Overlay to close menu when clicking outside */}
                    <TouchableOpacity
                      style={{
                        position: "absolute",
                        top: 0,
                        left: -1000,
                        right: -1000,
                        bottom: -1000,
                        width: 3000,
                        height: 3000,
                        zIndex: 99,
                      
                      }}
                      activeOpacity={1}
                      onPress={() => setShowMenu(false)}
                    />
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
                      {/* --- SHARE LINK MENU ITEM --- */}
                      <TouchableOpacity
                        onPress={() => {
                          setShowMenu(false);
                          setTimeout(() => setShowQRShareModal(true), 150);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 14,
                          paddingHorizontal: 18,
                        }}
                      >
                        <ShareNetwork
                          size={18}
                          color={themeColors.purple}
                          style={{ marginRight: 10 }}
                        />
                        <Text
                          style={{
                            color: themeColors.purple,
                            fontWeight: "bold",
                            fontSize: 15,
                            fontFamily: FONTS.PRIMARY,
                          }}
                        >
                          Share Link
                        </Text>
                      </TouchableOpacity>
                      <View
                        style={{
                          height: 1,
                          backgroundColor: themeColors.gray,
                          marginHorizontal: 10,
                        }}
                      />
                      {/* --- SHARE TO GROUP MENU ITEM --- */}
                      {!isPrivateNook && (
                        <TouchableOpacity
                          onPress={() => {
                            setShowMenu(false);
                            setTimeout(
                              () => setShowShareNookToGroupModal(true),
                              150
                            );
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 14,
                            paddingHorizontal: 18,
                          }}
                        >
                          <UsersThree
                            size={18}
                            color={themeColors.purple}
                            style={{ marginRight: 10 }}
                          />
                          <Text
                            style={{
                              color: themeColors.purple,
                              fontWeight: "bold",
                              fontSize: 15,
                              fontFamily: FONTS.PRIMARY,
                            }}
                          >
                            Share to Group
                          </Text>
                        </TouchableOpacity>
                      )}
                      <View
                        style={{
                          height: 1,
                          backgroundColor: themeColors.gray,
                          marginHorizontal: 10,
                        }}
                      />
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
                        <Flag
                          size={18}
                          color={themeColors.purple}
                          style={{ marginRight: 10 }}
                        />
                        <Text
                          style={{
                            color: themeColors.purple,
                            fontWeight: "bold",
                            fontSize: 15,
                            fontFamily: FONTS.PRIMARY,
                          }}
                        >
                          Report
                        </Text>
                      </TouchableOpacity>
                      {/* Divider - only show if there's content between Report and Edit Nook */}
                      {isOwner && !isPrivateNook && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: themeColors.gray,
                            marginHorizontal: 10,
                          }}
                        />
                      )}
                      {isOwner && isPrivateNook && (
                        <TouchableOpacity
                          onPress={() => {
                            setShowMenu(false);
                            setTimeout(() => setShowShareModal(true), 150);
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 14,
                            paddingHorizontal: 18,
                          }}
                        >
                          <UsersThree
                            size={18}
                            color={themeColors.purple}
                            style={{ marginRight: 10 }}
                          />
                          <Text
                            style={{
                              color: themeColors.purple,
                              fontWeight: "bold",
                              fontSize: 15,
                              fontFamily: FONTS.PRIMARY,
                            }}
                          >
                            Manage Sharing
                          </Text>
                        </TouchableOpacity>
                      )}
                      {/* Divider - only show if there's content between Report and Edit Nook */}
                      {isOwner && isPrivateNook && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: themeColors.gray,
                            marginHorizontal: 10,
                          }}
                        />
                      )}
                      {/* --- Edit Nook (only for owner, not private nooks) --- */}
                      {isOwner && (
                        <TouchableOpacity
                          onPress={() => {
                            setShowMenu(false);
                            setTimeout(
                              () =>
                                navigation.navigate("EditSpot", {
                                  spotId,
                                  spot,
                                }),
                              150
                            );
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 14,
                            paddingHorizontal: 18,
                          }}
                        >
                          <PencilSimple
                            size={18}
                            color={themeColors.purple}
                            style={{ marginRight: 10 }}
                          />
                          <Text
                            style={{
                              color: themeColors.purple,
                              fontWeight: "bold",
                              fontSize: 15,
                              fontFamily: FONTS.PRIMARY,
                            }}
                          >
                            Edit Nook
                          </Text>
                        </TouchableOpacity>
                      )}
                      {isOwner && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: themeColors.gray,
                            marginHorizontal: 10,
                          }}
                        />
                      )}
                      {/* Delete Nook (only for owner) */}
                      {user && spot.addedBy === user.uid && (
                        <TouchableOpacity
                          onPress={() => {
                            setShowMenu(false);
                            setTimeout(handleDeleteNook, 200);
                          }}
                          style={{
                            // backgroundColor: themeColors.red, // REMOVE red background
                            flexDirection: "row",

                            alignItems: "center",
                            paddingVertical: 14,
                            paddingHorizontal: 18,
                          }}
                          accessibilityLabel="Delete Nook"
                        >
                          <Trash
                            size={18}
                            color={themeColors.red}
                            style={{ marginRight: 10 }}
                          />
                          <Text
                            style={{
                              color: themeColors.red,
                              fontWeight: "bold",
                              fontSize: 15,
                              fontFamily: FONTS.PRIMARY,
                            }}
                          >
                            Delete Nook
                          </Text>
                        </TouchableOpacity>
                      )}
                      {/* --- Add menu option for private nook sharing management --- */}
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Spot Gallery (replaces SpotImage, matches image size) */}
            <SpotGallery
              spotId={spotId}
              galleryImages={spot.galleryImages}
              setSpot={setSpot}
              themeColors={themeColors}
              imageStyle={{
                width: "100%",
                height: 150,
                borderRadius: 8,
              }}
              // Add marginTop: 8 if not private nook
              style={!isPrivateNook ? { marginTop: -4 } : undefined}
            />

            {/* Spot Name and Floor */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: themeColors.black,
                marginBottom: 6,
                marginTop: 8,
                flexDirection: "row",
                alignItems: "center",
                fontFamily: FONTS.PRIMARY,
              }}
            >
              {spot.buildingName}
              {spot.roomNumber && (
                <Text
                  style={{
                    fontSize: 24,
                    color: themeColors.black,
                    fontWeight: "bold",
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {" - Floor "}
                  {spot.roomNumber}
                </Text>
              )}
            </Text>
            {/* Husky Card/Department info */}
            {!isPrivateNook && (spot.huskyCardNeeded || spot.department) && (
              <Text
                style={{
                  fontSize: 15,
                  color: spot.huskyCardNeeded
                    ? themeColors.red
                    : themeColors.darkGray,
                  marginBottom: 8,
                  marginTop: 2,
                  fontWeight: spot.huskyCardNeeded ? "bold" : "normal",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {spot.huskyCardNeeded && "Husky Card Required"}
                {spot.huskyCardNeeded && spot.department && (
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontWeight: "normal",
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    {" "}
                    •{" "}
                  </Text>
                )}
                {spot.department && (
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontWeight: "normal",
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    Department: {spot.department}
                  </Text>
                )}
              </Text>
            )}

            {/* Tags */}
            <TagList tags={tags} themeColors={themeColors} />

            {/* Ratings */}
            {!isPrivateNook && (
              <View style={{ marginTop: 16 }}>
                <RatingsDisplay
                  ratings={spot.ratings}
                  themeColors={themeColors}
                  getLastUpdatedLabel={getLastUpdatedLabel}
                />
                <View style={{ marginTop: 8, alignItems: "flex-end" }}>
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontSize: 13,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    {getLastUpdatedLabel(spot.ratings)}
                  </Text>
                </View>
              </View>
            )}

            {/* Live Update Sliders (compact, extracted component) */}
            {!isPrivateNook && (
              <View style={{ marginTop: 14 }}>
                <LiveUpdateSliders
                  liveNoise={liveNoise}
                  setLiveNoise={setLiveNoise}
                  liveCrowd={liveCrowd}
                  setLiveCrowd={setLiveCrowd}
                  isSubmittingLive={isSubmittingLive}
                  onSubmit={handleLiveUpdate}
                  themeColors={themeColors}
                  // showTableAvailability={isOdegaard}
                  // tableAvailability={tableAvailability}
                  // setTableAvailability={setTableAvailability}
                  spot={spot}
                  canSubmitLiveUpdate={canSubmitLiveUpdate()}
                  lastLiveUpdate={lastLiveUpdate}
                  spotId={spotId}
                />
              </View>
            )}


            {/* Modals */}
            {!isPrivateNook && (
              <>
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
              </>
            )}
          </ScrollView>
        ) : (
          // Wrap private nook details in ScrollView instead of View
          (<ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              padding: 16,
              backgroundColor: themeColors.white,
              paddingTop: 0,
            }}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              const offsetY = e.nativeEvent.contentOffset.y;
              setIsScrolled(offsetY > 2);
            }}
            scrollEventThrottle={16}
          >
            {/* Top gradient */}
            {isScrolled && (
              <LinearGradient
                colors={[themeColors.white + "FF", themeColors.white + "00"]}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 24,
                  zIndex: 2,
                  pointerEvents: "none",
                }}
                pointerEvents="none"
              />
            )}
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
                onPress={() => {
                  // If we can go back, do so. Otherwise, navigate to Home
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate("Home");
                  }
                }}
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
                  marginLeft: -12,
                }}
              >
                <ArrowLeft size={24} color={themeColors.purple} />
              </TouchableOpacity>
              {/* Add Alert button and More Info Dropdown Menu */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                {/* More Info Dropdown Menu */}
                <TouchableOpacity
                  onPress={() => setShowMenu((v) => !v)}
                  style={{
                    padding: 8,
                    borderRadius: 20,
                    backgroundColor: themeColors.white,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: -16,
                  }}
                >
                  <DotsThreeVertical size={27} color={themeColors.purple} />
                </TouchableOpacity>
                {/* Add Alert Button with Text */}

                {showMenu && (
                  <>
                    {/* Overlay to close menu when clicking outside */}
                    <TouchableOpacity
                      style={{
                        position: "absolute",
                        top: 0,
                        left: -1000,
                        right: -1000,
                        bottom: -1000,
                        width: 3000,
                        height: 3000,
                        zIndex: 99,
                      }}
                      activeOpacity={1}
                      onPress={() => setShowMenu(false)}
                    />
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
                        <Flag
                          size={18}
                          color={themeColors.purple}
                          style={{ marginRight: 10 }}
                        />
                        <Text
                          style={{
                            color: themeColors.purple,
                            fontWeight: "bold",
                            fontSize: 15,
                            fontFamily: FONTS.PRIMARY,
                          }}
                        >
                          Report
                        </Text>
                      </TouchableOpacity>
                      {/* Only show divider if user is the owner of the private nook */}
                      {isOwner && isPrivateNook && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: themeColors.gray,
                            marginHorizontal: 10,
                          }}
                        />
                      )}
                      {isOwner && isPrivateNook && (
                        <TouchableOpacity
                          onPress={() => {
                            setShowMenu(false);
                            setTimeout(() => setShowShareModal(true), 150);
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 14,
                            paddingHorizontal: 18,
                          }}
                        >
                          <UsersThree
                            size={18}
                            color={themeColors.purple}
                            style={{ marginRight: 10 }}
                          />
                          <Text
                            style={{
                              color: themeColors.purple,
                              fontWeight: "bold",
                              fontSize: 15,
                              fontFamily: FONTS.PRIMARY,
                            }}
                          >
                            Manage Sharing
                          </Text>
                        </TouchableOpacity>
                      )}
                      {/* Divider */}
                      {isOwner && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: themeColors.gray,
                            marginHorizontal: 10,
                          }}
                        />
                      )}
                      {/* --- Edit Nook (only for owner, not private nooks) --- */}
                      {isOwner && (
                        <TouchableOpacity
                          onPress={() => {
                            setShowMenu(false);
                            setTimeout(
                              () =>
                                navigation.navigate("EditSpot", {
                                  spotId,
                                  spot,
                                }),
                              150
                            );
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 14,
                            paddingHorizontal: 18,
                          }}
                        >
                          <PencilSimple
                            size={18}
                            color={themeColors.purple}
                            style={{ marginRight: 10 }}
                          />
                          <Text
                            style={{
                              color: themeColors.purple,
                              fontWeight: "bold",
                              fontSize: 15,
                              fontFamily: FONTS.PRIMARY,
                            }}
                          >
                            Edit Nook
                          </Text>
                        </TouchableOpacity>
                      )}
                      {isOwner && isPrivateNook && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: themeColors.gray,
                            marginHorizontal: 10,
                          }}
                        />
                      )}
                      {/* Delete Nook (only for owner) */}
                      {user && spot.addedBy === user.uid && (
                        <TouchableOpacity
                          onPress={() => {
                            setShowMenu(false);
                            setTimeout(handleDeleteNook, 200);
                          }}
                          style={{
                            // backgroundColor: themeColors.red, // REMOVE red background
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 14,
                            paddingHorizontal: 18,
                          }}
                          accessibilityLabel="Delete Nook"
                        >
                          <Trash
                            size={18}
                            color={themeColors.red}
                            style={{ marginRight: 10 }}
                          />
                          <Text
                            style={{
                              color: themeColors.red,
                              fontWeight: "bold",
                              fontSize: 15,
                              fontFamily: FONTS.PRIMARY,
                            }}
                          >
                            Delete Nook
                          </Text>
                        </TouchableOpacity>
                      )}
                      {/* --- Add menu option for private nook sharing management --- */}
                    </View>
                  </>
                )}
              </View>
            </View>
            {/* Spot Gallery (replaces SpotImage, matches image size) */}
            <SpotGallery
              spotId={spotId}
              galleryImages={spot.galleryImages}
              setSpot={setSpot}
              themeColors={themeColors}
              imageStyle={{
                width: "100%",
                height: 150,
                borderRadius: 8,
              }}
              // No extra margin for private nook
              style={undefined}
            />
            {/* Spot Name and Floor */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: themeColors.black,
                marginBottom: 6,
                marginTop: 8,
                flexDirection: "row",
                alignItems: "center",
                fontFamily: FONTS.PRIMARY,
              }}
            >
              {spot.buildingName}
              {spot.roomNumber && (
                <Text
                  style={{
                    fontSize: 24,
                    color: themeColors.black,
                    fontWeight: "bold",
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {" - Floor "}
                  {spot.roomNumber}
                </Text>
              )}
            </Text>
            {/* Husky Card/Department info */}
            {!isPrivateNook && (spot.huskyCardNeeded || spot.department) && (
              <Text
                style={{
                  fontSize: 15,
                  color: spot.huskyCardNeeded
                    ? themeColors.red
                    : themeColors.darkGray,
                  marginBottom: 8,
                  marginTop: 2,
                  fontWeight: spot.huskyCardNeeded ? "bold" : "normal",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {spot.huskyCardNeeded && "Husky Card Required"}
                {spot.huskyCardNeeded && spot.department && (
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontWeight: "normal",
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    {" "}
                    •{" "}
                  </Text>
                )}
                {spot.department && (
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontWeight: "normal",
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    Department: {spot.department}
                  </Text>
                )}
              </Text>
            )}
            {/* Tags */}
            <TagList tags={tags} themeColors={themeColors} />
            {/* Ratings */}
            {!isPrivateNook && (
              <View style={{ marginTop: 16 }}>
                <RatingsDisplay
                  ratings={spot.ratings}
                  themeColors={themeColors}
                  getLastUpdatedLabel={getLastUpdatedLabel}
                />
                <View style={{ marginTop: 8, alignItems: "flex-end" }}>
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontSize: 13,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    {getLastUpdatedLabel(spot.ratings)}
                  </Text>
                </View>
              </View>
            )}
            {/* Live Update Sliders (compact, extracted component) */}
            {!isPrivateNook && (
              <View style={{ marginTop: 14 }}>
                <LiveUpdateSliders
                  liveNoise={liveNoise}
                  setLiveNoise={setLiveNoise}
                  liveCrowd={liveCrowd}
                  setLiveCrowd={setLiveCrowd}
                  isSubmittingLive={isSubmittingLive}
                  onSubmit={handleLiveUpdate}
                  themeColors={themeColors}
                  // showTableAvailability={isOdegaard}
                  // tableAvailability={tableAvailability}
                  // setTableAvailability={setTableAvailability}
                  spot={spot}
                  canSubmitLiveUpdate={canSubmitLiveUpdate()}
                  lastLiveUpdate={lastLiveUpdate}
                  spotId={spotId}
                />
              </View>
            )}
            {/* Modals */}
            {!isPrivateNook && (
              <>
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
              </>
            )}
            {/* --- Notes Section ONLY for private nooks --- */}
            {spot?.privateNook && (
              <>
                <View
                  style={{
                    marginTop: 12,
                    borderRadius: 10,
                  }}
                >
                  {/* Add note input directly above notes list */}
                  <AddPrivateNookNoteInput
                    spotId={spotId}
                    themeColors={themeColors}
                    onNoteAdded={setNotes}
                  />
                  {/* Notes List - always show scrollable list below Notes title */}
                  <View
                    style={{
                      minHeight: 40,
                      maxHeight: 320,
                      width: "100%",
                      borderRadius: 8,
                      marginTop: 0,
                      backgroundColor: themeColors.white,
                      position: "relative", // for gradient overlay
                      overflow: "hidden", // clip gradient
                    }}
                  >
                    {/* Top fade gradient */}
                    {notes && notes.length > 0 && notes.length * 60 > 300 && (
                      <LinearGradient
                        colors={[themeColors.white, themeColors.white + "00"]}
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: 0,
                          height: 24,
                          zIndex: 2,
                        }}
                        pointerEvents="none"
                      />
                    )}
                    <ScrollView
                      style={{ width: "100%", flexGrow: 1 }}
                      contentContainerStyle={{ flexGrow: 1 }}
                      showsVerticalScrollIndicator={false}
                    >
                      {notes && notes.length > 0 ? (
                        [...notes]
                          .sort((a, b) => b.createdAt - a.createdAt)
                          .map((item, idx) => (
                            <View
                              key={idx}
                              style={{
                                borderRadius: 10,
                                paddingVertical: 10,
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                }}
                              >
                                <Text
                                  style={{
                                    color: themeColors.black,
                                    fontSize: 13,
                                    marginBottom: 2,
                                    fontFamily: FONTS.PRIMARY,
                                    flex: 1,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {item.text}
                                </Text>
                                <Text
                                  style={{
                                    color: themeColors.darkGray,
                                    fontSize: 12,
                                    marginLeft: 10,
                                    fontFamily: FONTS.PRIMARY,
                                    textAlign: "right",
                                    minWidth: 80,
                                  }}
                                >
                                  {item.createdAt
                                    ? new Date(item.createdAt).toLocaleString(
                                        [],
                                        {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        }
                                      )
                                    : ""}
                                </Text>
                              </View>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: themeColors.darkGray,
                                  fontFamily: FONTS.PRIMARY,
                                  marginTop: 4,
                                }}
                              >
                                {item.author ? `${item.author}` : ""}
                              </Text>
                            </View>
                          ))
                      ) : (
                        <Text
                          style={{
                            color: themeColors.darkGray,
                            fontSize: 15,
                            fontFamily: FONTS.PRIMARY,
                          }}
                        >
                          No notes yet.
                        </Text>
                      )}
                    </ScrollView>
                    {/* Bottom fade gradient */}
                    {notes && notes.length > 0 && notes.length * 60 > 300 && (
                      <LinearGradient
                        colors={[themeColors.white + "00", themeColors.white]}
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: 32,
                          zIndex: 2,
                        }}
                        pointerEvents="none"
                      />
                    )}
                  </View>
                </View>
              </>
            )}
          </ScrollView>)
        )}
      </View>
      {/* Floating Action Button for Add Alert */}
      {!isPrivateNook && (
        <View
          style={{
            position: "absolute",
            bottom: 40,
            right: 16,
            zIndex: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: themeColors.orange, // keep color as orange
              borderRadius: 50,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <TouchableOpacity
              onPress={() => setShowAddAlertModal(true)}
              accessibilityLabel="Add Alert"
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Warning size={19} color={themeColors.white} weight="fill" />
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 14,
                  marginLeft: 8,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Add Alert
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* --- SHARE NOOK TO GROUP MODAL --- */}
      <ShareNookToGroupModal
        visible={showShareNookToGroupModal}
        onClose={() => setShowShareNookToGroupModal(false)}
        spot={spot}
        spotId={spotId}
        themeColors={themeColors}
        navigation={navigation}
      />
      {/* QR Share Modal */}
      <QRShareModal
        visible={showQRShareModal}
        onClose={() => setShowQRShareModal(false)}
        spot={spot}
        spotId={spotId}
        themeColors={themeColors}
      />
    </View>
  );
}
