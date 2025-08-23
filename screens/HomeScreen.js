import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  TextInput, // <-- Add TextInput for search bar
  Alert,
  Modal,
  Animated,
  Easing,
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  updateDoc,
  addDoc,
  onSnapshot,
  getDoc,
  doc,
} from "firebase/firestore"; // Ensure Timestamp is imported
import { getAuth, sendEmailVerification, reload, signOut } from "firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Plus,
  User,
  ArrowClockwise,
  Star,
  Heart,
  Moon,
  Sun,
  MagnifyingGlass,
  ExclamationMark,
  Rows, // <-- Use Rows icon for list view
  Warning,
  List,
  MapTrifold,
  MapPin,
  UsersThree,
} from "phosphor-react-native"; // Add Heart icon
import { colors } from "../constants/colors";
import { FONTS } from "../constants/fonts"; // Import colors
import { auth, db } from "../firebaseConfig"; // Import Firebase
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system"; // <-- Add this import
import { ThemeContext } from "../App"; // Import ThemeContext
import { TabView, SceneMap } from "react-native-tab-view";
import { Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getLastUpdatedLabel } from "../utils/lastUpdatedLabel";
import { useFonts } from "expo-font"; // <-- Add this import

// components imports
import Filters from "../components/Home/Filters"; // Import Filters component
import StudySpotsList from "../components/Home/StudySpotsList";
import StudySpotsMapView from "../components/Home/StudySpotsMapView"; // <-- new component

import AlertsModal from "../components/Home/AlertsModal"; // Import AlertsModal component
import TabBar from "../components/Home/TabBar";

// hooks imports
import useFriendsCheckIns from "../hooks/useFriendsCheckIns"; // Import TabBar component
import GeneralReportModal from "../components/Home/GeneralReportModal"; // Import GeneralReportModal component
import HomeLoadingScreen from "../components/Home/HomeLoadingScreen"; // <-- Import the new component
import ProfilePicture from "../components/Profile/ProfilePicture";
import EmailVerificationModal from "../components/Auth/EmailVerificationModal"; // <-- Import EmailVerificationModal
import OnboardingModal from "../components/Auth/OnboardingModal"; // <-- Add this import

import { useProfileData } from "../hooks/useProfileData"; // add
import { useHomeView } from "../components/Home/HomeViewContext"; // <-- Import HomeViewContext

//hook imports
import useStudySpots from "../hooks/useStudySpots";
import useFavorites from "../hooks/useFavorites";
import useSearchAndFilters from "../hooks/useSearchAndFilters"; // already imported

let imageCache = {};

const HOME_VIEW_KEY = "nookHomeView";
const COMMUNITY_TAB_KEY = "nookCommunityTab";

export default function HomeScreen({ navigation, route }) {
  const { view } = route.params || {}; // <-- Destructure view from route.params

  // Load CarosSoft font (move this to the top, before any early returns)
  const [fontsLoaded] = useFonts({
    CarosSoft: require("../assets/fonts/CarosSoftBold.otf"),
  });

  // Theme
  const themeCtx = useContext(ThemeContext);
  const isDarkMode = themeCtx?.isDarkMode ?? false;
  const themeColors = themeCtx?.themeColors ?? colors;
  const setIsDarkMode = themeCtx?.setIsDarkMode;

  // Hamburger menu and modals
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGeneralReport, setShowGeneralReport] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [currentAlerts, setCurrentAlerts] = useState([]);

  // Animation for sliding toggle
  const slideAnim = useRef(new Animated.Value(0)).current;

  const {
    showMapView,
    setShowMapView,
    showFriendsView,
    setShowFriendsView,
    tabIndex,
    setTabIndex,
  } = useHomeView(); // <-- Use HomeViewContext
  // Expose a method to set map view from outside
  useEffect(() => {
    navigation.setParams({
      setShowMapView: (val) => setShowMapView(val),
    });
  }, []);

  // Animate toggle when showFriendsView changes
  useEffect(() => {
    // Stop any ongoing animation first
    slideAnim.stopAnimation();

    const animation = Animated.spring(slideAnim, {
      toValue: showFriendsView ? 1 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    });

    animation.start();

    // Cleanup function to stop animation on unmount
    return () => {
      animation.stop();
    };
  }, [showFriendsView]);

  // Social tab selectedTab state
  const [socialSelectedTab, setSocialSelectedTab] = useState("studyGroups");

  // Make storage keys user-specific
  const user = auth.currentUser;
  const userSpecificHomeViewKey = user
    ? `${HOME_VIEW_KEY}_${user.uid}`
    : HOME_VIEW_KEY;
  const userSpecificCommunityTabKey = user
    ? `${COMMUNITY_TAB_KEY}_${user.uid}`
    : COMMUNITY_TAB_KEY;

  // --- Load last selected Community tab on mount ---
  useEffect(() => {
    const fetchCommunityTab = async () => {
      try {
        // 1. Try AsyncStorage first
        const stored = await AsyncStorage.getItem(userSpecificCommunityTabKey);
        if (stored === "studyGroups") {
          setSocialSelectedTab(stored);
          return;
        }
        // 2. Fallback to Firestore
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const pref = userDoc.data().communityTab;
          if (pref === "studyGroups") {
            setSocialSelectedTab(pref);
            return;
          }
        }
        // 3. Default to "studyGroups"
        setSocialSelectedTab("studyGroups");
      } catch {
        setSocialSelectedTab("studyGroups");
      }
    };
    fetchCommunityTab();
  }, [userSpecificCommunityTabKey, user]);

  // --- Save selected Community tab when changed ---
  const handleSetCommunityTab = async (tab) => {
    setSocialSelectedTab(tab);
    try {
      await AsyncStorage.setItem(userSpecificCommunityTabKey, tab);
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { communityTab: tab });
    } catch {}
  };

  // Hooks
  const { favorites, toggleFavorite, favoriteGroups, toggleFavoriteGroup } =
    useFavorites(); // <-- destructure favorites
  const { studySpots, isLoading, fetchStudySpots } = useStudySpots();
  const {
    filters,
    setFilters,
    filteredSpots,
    sortBy,
    setSortBy,
    hasFavoritesFilter,
  } = useSearchAndFilters(studySpots, null, favorites); // <-- pass favorites set here
  const {
    friendsCheckIns,
    isLoading: friendsLoading,
    refetch: refetchFriendsCheckIns,
  } = useFriendsCheckIns(); // Add friends check ins hook
  const { reflectionsEnabled, setReflectionsEnabled } = useProfileData(); // add

  // Add state for profile picture
  const [profilePic, setProfilePic] = useState(null);
  const [isProfilePicLoading, setIsProfilePicLoading] = useState(true); // <-- add loading state

  const [findPeopleModalVisible, setFindPeopleModalVisible] = useState(false);

  // Subscribe to user's profilePic for instant updates
  useEffect(() => {
    if (!user) return;
    setIsProfilePicLoading(true); // set loading true before fetching
    const unsub = onSnapshot(doc(db, "users", user.uid), (userDoc) => {
      if (userDoc.exists()) {
        setProfilePic(userDoc.data().profilePic || null);
      }
      setIsProfilePicLoading(false); // set loading false after fetch
    });
    return () => unsub();
  }, [user]);

  // --- Load user's preferred view on mount or when route changes ---
  React.useEffect(() => {
    const fetchUserView = async () => {
      try {
        // 1. Try AsyncStorage first
        const stored = await AsyncStorage.getItem(userSpecificHomeViewKey);
        if (stored === "map") {
          setShowMapView(true);
          return;
        }
        if (stored === "list") {
          setShowMapView(false);
          return;
        }
        // 2. Fallback to Firestore
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const pref = userDoc.data().homeView;
          if (pref === "map") setShowMapView(true);
          else setShowMapView(false);
        }
      } catch {}
    };
    // If route.params?.view is set, override and persist
    if (route?.params?.view) {
      setShowMapView(route.params.view === "map");
      AsyncStorage.setItem(
        userSpecificHomeViewKey,
        route.params.view === "map" ? "map" : "list"
      );
      // Also update Firestore
      (async () => {
        try {
          if (!user) return;
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            homeView: route.params.view === "map" ? "map" : "list",
          });
        } catch {}
      })();
    } else {
      fetchUserView();
    }
  }, [route?.params?.view, userSpecificHomeViewKey, user]);

  // --- Handle tabIndex parameter from route params ---
  useEffect(() => {
    if (route?.params?.tabIndex !== undefined) {
      setTabIndex(route.params.tabIndex);
      // Clear the param after using it
      if (navigation && navigation.setParams) {
        navigation.setParams({ tabIndex: undefined });
      }
    }
  }, [route?.params?.tabIndex, navigation]);

  // --- Refresh data when initially loading map view ---
  useEffect(() => {
    if (showMapView) {
      fetchStudySpots();
      refetchFriendsCheckIns();
    }
  }, [showMapView]); // Only run when showMapView becomes true

  // --- Save user's preferred view when toggled ---
  const handleSetShowMapView = async (val) => {
    setShowMapView(val);

    // Refresh data when switching to map view
    if (val) {
      fetchStudySpots(); // Refresh study spots
      refetchFriendsCheckIns(); // Refresh friends check-ins
    }

    try {
      await AsyncStorage.setItem(userSpecificHomeViewKey, val ? "map" : "list");
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { homeView: val ? "map" : "list" });
    } catch {}
  };

  // --- Handle friends/nooks mode toggle with data refresh ---
  const handleSetShowFriendsView = (val) => {
    setShowFriendsView(val);

    // Add a small delay to ensure the slider animation completes before refreshing data
    setTimeout(() => {
      // Refresh data when switching modes if on map view
      if (showMapView) {
        if (val) {
          // Switching to friends view - refresh friends data
          refetchFriendsCheckIns();
        } else {
          // Switching to nooks view - refresh study spots
          fetchStudySpots();
        }
      }
    }, 350); // Slightly longer than animation duration
  };

  // --- Reusable Header (toggle only, no filters) ---
  function StudySpotsHeader({
    showMapView,
    setShowMapView,
    showFriendsView,
    setShowFriendsView,
    themeColors,
    filters,
    setFilters,
    sortBy,
    setSortBy,
  }) {
    const [isFiltersPressed, setIsFiltersPressed] = React.useState(false);
    return (
      <View style={{ paddingTop: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
            zIndex: 20,
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          {/* List/Map View Toggle Buttons */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowMapView(false)}
              style={{
                backgroundColor: !showMapView
                  ? themeColors.purple
                  : themeColors.white,
                padding: 10,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                height: 42,
                minWidth: 48,
                marginRight: 0,
              }}
            >
              <Rows
                size={22}
                color={!showMapView ? themeColors.white : themeColors.purple}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowMapView(true)}
              style={{
                backgroundColor: showMapView
                  ? themeColors.purple
                  : themeColors.white,
                padding: 10,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                height: 42,
                minWidth: 48,
                marginRight: 0,
              }}
            >
              <MapTrifold
                size={22}
                color={showMapView ? themeColors.white : themeColors.purple}
              />
            </TouchableOpacity>
          </View>
          {/* Filters Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPressIn={() => setIsFiltersPressed(true)}
            onPressOut={() => setIsFiltersPressed(false)}
            onPress={() => {
              setIsFiltersPressed(false);
              // Open filters modal or whatever Filters does on press
            }}
            style={{
              backgroundColor: isFiltersPressed
                ? themeColors.purple
                : themeColors.white,
              paddingVertical: 10,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 0,
              height: 42,
              marginBottom: 0,
              marginLeft: 10,
            }}
          >
            <Filters
              filters={filters}
              setFilters={setFilters}
              themeColors={themeColors}
              sortBy={sortBy}
              setSortBy={setSortBy}
              buttonStyle={{
                backgroundColor: "transparent",
                borderRadius: 8,
                borderWidth: 0,
                paddingVertical: 0,
                alignItems: "center",
                justifyContent: "center",
                minWidth: 0,
                marginRight: 0,
                height: 22,
                marginBottom: 0,
              }}
              textStyle={{
                color: isFiltersPressed ? themeColors.white : themeColors.black,
                fontWeight: "bold",
                fontSize: 14,
                textAlignVertical: "center",
                fontFamily: "CarosSoft",
              }}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- Add SocialTab ---
  function SocialTab() {
    // Render FindPeopleView as a full page (not a modal)
    const FindPeopleView = require("./FindPeopleView").default;
    return (
      <FindPeopleView
        selectedTab={socialSelectedTab}
        setSelectedTab={handleSetCommunityTab}
      />
    );
  }

  // Home tab content
  const HomeTab = () => {
    // Compute filtered count and total count for the indicator
    const filteredCount = filteredSpots.length;
    const totalCount = studySpots.length;
    const filtersApplied = filters.length > 0;

    return (
      <>
        {showMapView ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Toggle row (List/Map/Filters) */}
            <View style={{ paddingHorizontal: 16 }}>
              <StudySpotsHeader
                showMapView={showMapView}
                setShowMapView={handleSetShowMapView}
                showFriendsView={showFriendsView}
                setShowFriendsView={setShowFriendsView}
                themeColors={themeColors}
                filters={filters}
                setFilters={setFilters}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </View>

            {/* Sliding Toggle - only show when in map view */}
            {showMapView && (
              <View
                style={{
                  alignItems: "center",
                  marginBottom: 16,
                  paddingHorizontal: 16,
                }}
              >
                <View
                  style={{
                    backgroundColor: themeColors.lightGray,
                    borderRadius: 25,
                    padding: 4,
                    flexDirection: "row",
                    width: 200,
                    height: 44,
                    position: "relative",
                  }}
                >
                  {/* Sliding Background */}
                  <Animated.View
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      right: 4,
                      bottom: 4,
                      backgroundColor: themeColors.white,
                      borderRadius: 21,
                      width: 96,
                      transform: [
                        {
                          translateX: slideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 96],
                          }),
                        },
                      ],
                      shadowColor: themeColors.black,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  />

                  {/* Nooks Button */}
                  <TouchableOpacity
                    onPress={() => handleSetShowFriendsView(false)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 6,
                      zIndex: 2,
                    }}
                  >
                    <MapPin
                      size={18}
                      color={
                        !showFriendsView
                          ? themeColors.purple
                          : themeColors.darkGray
                      }
                    />
                    <Text
                      style={{
                        color: !showFriendsView
                          ? themeColors.purple
                          : themeColors.darkGray,
                        fontSize: 14,
                        fontWeight: "bold",
                        fontFamily: "CarosSoft",
                      }}
                    >
                      Nooks
                    </Text>
                  </TouchableOpacity>

                  {/* Friends Button */}
                  <TouchableOpacity
                    onPress={() => handleSetShowFriendsView(true)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 6,
                      zIndex: 2,
                    }}
                  >
                    <UsersThree
                      size={18}
                      color={
                        showFriendsView
                          ? themeColors.orange
                          : themeColors.darkGray
                      }
                    />
                    <Text
                      style={{
                        color: showFriendsView
                          ? themeColors.orange
                          : themeColors.darkGray,
                        fontSize: 14,
                        fontWeight: "bold",
                        fontFamily: "CarosSoft",
                      }}
                    >
                      Friends
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <StudySpotsMapView
              spots={filteredSpots}
              friendsCheckIns={friendsCheckIns}
              showFriendsView={showFriendsView}
              navigation={navigation} // <-- pass navigation object, not a function
              themeColors={themeColors}
              containerStyle={{ marginTop: 0 }}
              isLoadingSpots={isLoading}
              isLoadingFriends={friendsLoading}
            />
          </ScrollView>
        ) : (
          <>
            <View style={{ paddingHorizontal: 16 }}>
              <StudySpotsHeader
                showMapView={showMapView}
                setShowMapView={handleSetShowMapView}
                showFriendsView={showFriendsView}
                setShowFriendsView={setShowFriendsView}
                themeColors={themeColors}
                filters={filters}
                setFilters={setFilters}
                sortBy={sortBy}
                setSortBy={setSortBy}
              />
            </View>
            <StudySpotsList
              filteredSpots={filteredSpots} // use filteredSpots directly, not filteredSpotsWithSearch
              navigation={{
                ...navigation,
                navigate: (screen, params) => {
                  if (screen === "SpotDetail") {
                    navigation.navigate(screen, {
                      ...params,
                      view: showMapView ? "map" : "list",
                    });
                  } else {
                    navigation.navigate(screen, params);
                  }
                },
              }}
              themeColors={themeColors}
              onRefresh={fetchStudySpots}
              refreshing={isLoading}
              filters={filters}
              setFilters={setFilters}
              setCurrentAlerts={setCurrentAlerts}
              setShowAlertsModal={setShowAlertsModal}
              contentContainerStyle={{ paddingBottom: 140 }}
              getLastUpdatedLabel={getLastUpdatedLabel}
              showMapView={showMapView}
              setShowMapView={handleSetShowMapView}
              sortBy={sortBy}
              setSortBy={setSortBy}
              hasFavoritesFilter={hasFavoritesFilter}
              ListHeaderComponent={null}
              totalCount={totalCount} // <-- pass the real total count here
              keyboardShouldPersistTaps="handled" // <-- add this prop
            />
          </>
        )}
        {/* Add Nook button remains outside the scrollable area */}
        <View
          style={{
            position: "absolute",
            bottom: 95, // <-- move up to avoid tab bar overlap (was 25)
            right: 16,
            zIndex: 20,
          }}
        >
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 16,
              backgroundColor: themeColors.purple,
              borderRadius: 50,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={() => navigation.navigate("AddSpot")}
            activeOpacity={0.85}
          >
            <Plus size={24} color={themeColors.white} />
            <Text
              style={{
                color: themeColors.white,
                fontWeight: "bold",
                fontSize: 14,
                marginLeft: 8,
                fontFamily: "CarosSoft",
              }}
            >
              Add Nook
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // TabView
  const layout = Dimensions.get("window");
  const [routes] = useState([
    { key: "focus", title: "Focus" },
    { key: "home", title: "Home" },
    { key: "social", title: "Community" },
  ]);

  // Tab scene
  const renderScene = SceneMap({
    focus: () => {
      const Focus = require("./FocusTimerScreen").default;
      return <Focus navigation={navigation} route={route} />;
    },
    home: HomeTab,
    social: SocialTab,
  });

  // --- Track if this is the initial mount (not after navigation) ---
  const initialMount = useRef(true);
  const [minLoadingElapsed, setMinLoadingElapsed] = useState(false);

  useEffect(() => {
    if (initialMount.current) {
      setMinLoadingElapsed(false);
      const timer = setTimeout(() => {
        setMinLoadingElapsed(true);
        initialMount.current = false;
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // --- Refresh study spots if coming from SpotDetailScreen with refresh param ---
  React.useEffect(() => {
    if (route?.params?.refresh) {
      initialMount.current = false; // <-- Skip first-load screen during pull-to-refresh
      // Clear deleting and creating params before showing anything
      if (navigation && navigation.setParams) {
        navigation.setParams({
          refresh: undefined,
          deleting: undefined,
          creating: undefined,
        });
      }
      fetchStudySpots();
    }
  }, [route?.params?.refresh]);

  // --- Email Verification Modal State ---
  const [showVerifyModal, setShowVerifyModal] = useState(false); // <-- always false initially
  const [verifyError, setVerifyError] = useState("");
  const [checkingVerification, setCheckingVerification] = useState(false);

  // --- Handler for resending verification email ---
  const handleResendEmail = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      Alert.alert(
        "Verification Email Sent",
        "Please check your inbox (and spam folder) for the verification email."
      );
    } catch (e) {
      Alert.alert(
        "Error",
        "Failed to send verification email. Please try again later."
      );
    }
  };

  // Track requireEmailVerification flag from user doc
  const [userRequireEmailVerification, setUserRequireEmailVerification] =
    useState(undefined); // <-- undefined until loaded

  // Subscribe to user's profilePic and requireEmailVerification for instant updates
  useEffect(() => {
    if (!user) return;
    setIsProfilePicLoading(true);
    const unsub = onSnapshot(doc(db, "users", user.uid), (userDoc) => {
      if (userDoc.exists()) {
        setProfilePic(userDoc.data().profilePic || null);
        setUserRequireEmailVerification(
          userDoc.data().requireEmailVerification !== false
        );
      } else {
        setUserRequireEmailVerification(false);
      }
      setIsProfilePicLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Show modal if user is not verified and requireEmailVerification is not false
  useEffect(() => {
    // Only run if userRequireEmailVerification is loaded (not undefined)
    if (!user || userRequireEmailVerification === undefined) return;
    if (user.emailVerified) {
      setShowVerifyModal(false);
      setVerifyError("");
    } else if (
      userRequireEmailVerification // Only show if required
    ) {
      setShowVerifyModal(true);
    } else {
      setShowVerifyModal(false);
    }
  }, [user, userRequireEmailVerification]);

  // --- Modal logic: block all interaction until verified ---
  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    setVerifyError("");
    try {
      await user.reload();
      if (auth.currentUser.emailVerified) {
        setShowVerifyModal(false);
        setVerifyError("");
        // Optionally, clear param so modal doesn't show again
        navigation.setParams &&
          navigation.setParams({ showVerifyModal: undefined });
      } else {
        setVerifyError("Email not verified yet. Please check your inbox.");
      }
    } catch (e) {
      setVerifyError("Error checking verification. Try again.");
    }
    setCheckingVerification(false);
  };

  // Add this handler for back to login
  const handleBackToLogin = async () => {
    try {
      await auth.signOut();
    } catch {}
  };

  // --- Onboarding Modal State ---
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarded, setCheckingOnboarded] = useState(true);

  // Track onboarded flag from user doc
  const [userOnboarded, setUserOnboarded] = useState(undefined);

  // Subscribe to user's onboarded field for instant updates
  useEffect(() => {
    if (!user) return;
    setCheckingOnboarded(true);
    const unsub = onSnapshot(doc(db, "users", user.uid), (userDoc) => {
      if (userDoc.exists()) {
        setUserOnboarded(userDoc.data().onboarded === true);
        setShowOnboarding(userDoc.data().onboarded !== true);
      } else {
        setUserOnboarded(false);
        setShowOnboarding(true);
      }
      setCheckingOnboarded(false);
    });
    return () => unsub();
  }, [user]);

  // Handler to finish onboarding
  const handleFinishOnboarding = async () => {
    if (!user) return;
    setShowOnboarding(false);
    setUserOnboarded(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { onboarded: true });
    } catch {}
  };

  // Wait for font to load before rendering (move this before any other return)
  if (!fontsLoaded) {
    return null;
  }

  // --- Show email verification modal if needed ---
  // Only show if requireEmailVerification !== false
  if (
    user &&
    !user.emailVerified &&
    userRequireEmailVerification && // Only block if required
    userRequireEmailVerification !== undefined && // Only after loaded
    showVerifyModal // Only if modal should be shown
  ) {
    return (
      <>
        <View style={{ flex: 1, backgroundColor: themeColors.white }} />
        <EmailVerificationModal
          isVisible={true}
          onCheckVerification={handleCheckVerification}
          errorMessage={verifyError}
          onBackToLogin={handleBackToLogin} // <-- add this prop
          onResendEmail={handleResendEmail} // <-- add this prop
        />
      </>
    );
  }

  // --- Show onboarding modal if user is not onboarded ---
  // Only check onboarding if user is verified
  if (
    user &&
    user.emailVerified && // <-- Only check onboarding if verified
    (checkingOnboarded || userOnboarded === undefined)
  ) {
    return null;
  }
  if (
    user &&
    user.emailVerified && // <-- Only show onboarding if verified
    !userOnboarded &&
    showOnboarding
  ) {
    return (
      <OnboardingModal
        visible={true}
        onFinish={handleFinishOnboarding}
        themeColors={themeColors}
      />
    );
  }

  // --- Show loading screen only on initial mount and isLoading, for at least 10s ---
  // Determine loading message based on navigation params
  let loadingMessage;
  if (route?.params?.refresh) {
    loadingMessage = "Fetching your Nooks...";
  }

  // Show loading screen immediately if refreshing from home page
  if (route?.params?.refresh) {
    return (
      <HomeLoadingScreen
        themeColors={themeColors}
        loadingMessage={loadingMessage}
      />
    );
  }

  // Helper to determine if loading screen should show
  const shouldShowLoadingScreen = () => {
    // Don't show loading screen when in map view - let the map handle its own loading
    if (showMapView) return false;
    return initialMount.current || isLoading || !minLoadingElapsed;
  };

  if (shouldShowLoadingScreen()) {
    return (
      <HomeLoadingScreen
        themeColors={themeColors}
        loadingMessage={loadingMessage}
      />
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: themeColors.white, paddingTop: 40 }}
    >
      <View style={{ flex: 1 }}>
        {/* Header */}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 16,
            zIndex: 10,
            paddingHorizontal: 16,
          }}
        >
          <Text
            style={{
              fontSize: 40,
              fontWeight: "bold",
              color: themeColors.purple,
              marginRight: 12,
              fontFamily: "CarosSoft", // <-- Use CarosSoft font for header
            }}
          >
            Nook
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Search")} // <-- Change this to navigate to SearchScreen
              style={{
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: themeColors.white,
              }}
              accessibilityLabel="Search"
            >
              <MagnifyingGlass
                size={28}
                color={themeColors.purple}
                weight="light"
              />
            </TouchableOpacity>
            {/* Profile picture button to open hamburger menu */}
            <TouchableOpacity
              onPress={() => navigation.navigate("Profile")}
              style={{
                borderRadius: 20,
                backgroundColor: themeColors.white,
                alignItems: "center",
                justifyContent: "center",
                elevation: 2,
                marginLeft: 4,
                width: 40,
                height: 40,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: themeColors.purple,
              }}
              accessibilityLabel="Go to Profile"
            >
              <ProfilePicture
                profilePic={profilePic}
                themeColors={themeColors}
                size={40}
                isTouchable={false}
                isLoading={isProfilePicLoading}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <View style={{ flex: 1 }}>
          <TabView
            navigationState={{ index: tabIndex, routes }}
            renderScene={renderScene}
            onIndexChange={setTabIndex}
            initialLayout={{ width: layout.width }}
            lazy
            renderLazyPlaceholder={() => (
              <View style={{ flex: 1, backgroundColor: themeColors.white }} />
            )}
            style={{ flex: 1 }}
            renderTabBar={() => null} // Hide default tab bar
          />
          {/* TabBar at the bottom */}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 5,
              zIndex: 100,
              backgroundColor: themeColors.white,
              elevation: 8,
            }}
          >
            <TabBar
              navigationState={{ index: tabIndex, routes }}
              jumpTo={(key) => {
                const idx = routes.findIndex((r) => r.key === key);
                if (idx !== -1) setTabIndex(idx);
              }}
              themeColors={themeColors}
              currentIndex={tabIndex}
              labelStyle={{ fontFamily: FONTS.PRIMARY }}
            />
          </View>
        </View>

        {/* Modals */}
        <GeneralReportModal
          visible={showGeneralReport}
          onClose={() => setShowGeneralReport(false)}
          themeColors={themeColors}
        />
        <AlertsModal
          visible={showAlertsModal}
          onClose={() => setShowAlertsModal(false)}
          alerts={currentAlerts}
          themeColors={themeColors}
        />
      </View>
    </View>
  );
}
