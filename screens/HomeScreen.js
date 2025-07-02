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
  Timer,
  Warning,
  List,
  MapTrifold,
  MapPin,
} from "phosphor-react-native"; // Add Heart icon
import { colors } from "../constants/colors"; // Import colors
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
import { FocusTimerView } from "../components/Home/FocusTimer"; // <-- Use correct import
import HamburgerMenu from "../components/Home/HamburgerMenu"; // Import HamburgerMenu component
import AlertsModal from "../components/Home/AlertsModal"; // Import AlertsModal component
import TabBar from "../components/Home/TabBar"; // Import TabBar component
import GeneralReportModal from "../components/Home/GeneralReportModal"; // Import GeneralReportModal component
import HomeLoadingScreen from "../components/Home/HomeLoadingScreen"; // <-- Import the new component
import ProfilePicture from "../components/Profile/ProfilePicture";
import FindPeopleSection from "../components/FindPeople/FindPeopleSection"; // <-- import FindPeopleSection
import EmailVerificationModal from "../components/Auth/EmailVerificationModal"; // <-- Import EmailVerificationModal

//hook imports
import useStudySpots from "../hooks/useStudySpots";
import useFavorites from "../hooks/useFavorites";
import useSearchAndFilters from "../hooks/useSearchAndFilters"; // already imported

let imageCache = {};

const HOME_VIEW_KEY = "nookHomeView"; // Add this constant

export default function HomeScreen({ navigation, route }) {
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
  const [showMapView, setShowMapView] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [findPeopleModalVisible, setFindPeopleModalVisible] = useState(false); // <-- add modal state

  // Social tab selectedTab state
  const [socialSelectedTab, setSocialSelectedTab] = useState("socialFeed");

  // Reset socialSelectedTab to "socialFeed" whenever Community tab is focused
  useFocusEffect(
    React.useCallback(() => {
      setSocialSelectedTab("studyGroups");
    }, [])
  );

  // Hooks
  const { studySpots, isLoading, fetchStudySpots } = useStudySpots();
  const { favorites, toggleFavorite } = useFavorites();
  const { filters, setFilters, filteredSpots, sortBy, setSortBy } =
    useSearchAndFilters(studySpots, favorites);

  // Add state for profile picture
  const [profilePic, setProfilePic] = useState(null);
  const [isProfilePicLoading, setIsProfilePicLoading] = useState(true); // <-- add loading state
  const user = auth.currentUser;

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
        const stored = await AsyncStorage.getItem(HOME_VIEW_KEY);
        if (stored === "map") {
          setShowMapView(true);
          return;
        }
        if (stored === "list") {
          setShowMapView(false);
          return;
        }
        // 2. Fallback to Firestore
        const user = auth.currentUser;
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
        HOME_VIEW_KEY,
        route.params.view === "map" ? "map" : "list"
      );
      // Also update Firestore
      (async () => {
        try {
          const user = auth.currentUser;
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
  }, [route?.params?.view]);

  // --- Save user's preferred view when toggled ---
  const handleSetShowMapView = async (val) => {
    setShowMapView(val);
    try {
      await AsyncStorage.setItem(HOME_VIEW_KEY, val ? "map" : "list");
      const user = auth.currentUser;
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { homeView: val ? "map" : "list" });
    } catch {}
  };

  // --- Reusable Header (toggle only, no filters) ---
  function StudySpotsHeader({
    showMapView,
    setShowMapView,
    themeColors,
    filters,
    setFilters,
    sortBy, // <-- add
    setSortBy, // <-- add
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
          }}
        >
          {/* Left: List/Map View Toggle */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => handleSetShowMapView(false)}
              style={{
                backgroundColor: !showMapView
                  ? themeColors.purple
                  : themeColors.white,
                padding: 10,
                borderRadius: 8,
                marginRight: 8,
                minWidth: 48,
                alignItems: "center",
                justifyContent: "center",
                height: 42,
              }}
            >
              <Rows
                size={22}
                color={!showMapView ? themeColors.white : themeColors.purple}
                weight="bold"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSetShowMapView(true)}
              style={{
                backgroundColor: showMapView
                  ? themeColors.purple
                  : themeColors.white,
                padding: 10,
                borderRadius: 8,
                minWidth: 48,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 0,
                height: 42,
              }}
            >
              <MapTrifold
                size={22}
                color={showMapView ? themeColors.white : themeColors.purple}
                weight="bold"
              />
            </TouchableOpacity>
          </View>
          {/* Right: Filters Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPressIn={() => setIsFiltersPressed(true)}
            onPressOut={() => setIsFiltersPressed(false)}
            onPress={() => {
              setIsFiltersPressed(false);
              // Open filters modal or whatever Filters does on press
              // If Filters is a button, you may need to trigger its onPress here
              // Otherwise, just render Filters as before
            }}
            style={{
              backgroundColor: isFiltersPressed
                ? themeColors.purple
                : themeColors.white,
              // borderRadius: 8,
              // borderWidth: 1,
              borderColor: themeColors.purple,
              paddingVertical: 10,
              alignItems: "center",
              justifyContent: "center",
              minWidth: 48,
              marginRight: 0,
              height: 42,
              marginBottom: 0,
            }}
          >
            <Filters
              filters={filters}
              setFilters={setFilters}
              themeColors={themeColors}
              sortBy={sortBy} // <-- pass sortBy
              setSortBy={setSortBy} // <-- pass setSortBy
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
                fontFamily: "CarosSoft", // <-- Add fontFamily here
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
        setSelectedTab={setSocialSelectedTab}
      />
    );
  }

  // Home tab content
  const HomeTab = () => (
    <>
      {showMapView ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 72 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Toggle row (List/Map/Filters) */}
          <View style={{ paddingHorizontal: 16 }}>
            <StudySpotsHeader
              showMapView={showMapView}
              setShowMapView={handleSetShowMapView}
              themeColors={themeColors}
              filters={filters}
              setFilters={setFilters}
              sortBy={sortBy} // <-- pass sortBy
              setSortBy={setSortBy} // <-- pass setSortBy
            />
          </View>
          <StudySpotsMapView
            spots={filteredSpots}
            navigation={(navProps) => {
              // When navigating to SpotDetail, pass the current view
              navigation.navigate("SpotDetail", {
                ...navProps,
                view: showMapView ? "map" : "list",
              });
            }}
            themeColors={themeColors}
            containerStyle={{ marginHorizontal: 16 }}
          />
        </ScrollView>
      ) : (
        <StudySpotsList
          filteredSpots={filteredSpots}
          navigation={{
            ...navigation,
            navigate: (screen, params) => {
              // When navigating to SpotDetail, pass the current view
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
          favorites={favorites}
          handleToggleFavorite={toggleFavorite}
          themeColors={themeColors}
          onRefresh={fetchStudySpots}
          refreshing={isLoading}
          filters={filters}
          setFilters={setFilters}
          setCurrentAlerts={setCurrentAlerts}
          setShowAlertsModal={setShowAlertsModal}
          contentContainerStyle={{ paddingBottom: 72 }}
          getLastUpdatedLabel={getLastUpdatedLabel}
          showMapView={showMapView}
          setShowMapView={handleSetShowMapView}
          sortBy={sortBy} // <-- pass sortBy
          setSortBy={setSortBy} // <-- pass setSortBy
          ListHeaderComponent={
            <StudySpotsHeader
              showMapView={showMapView}
              setShowMapView={handleSetShowMapView}
              themeColors={themeColors}
              filters={filters}
              setFilters={setFilters}
              sortBy={sortBy} // <-- pass sortBy
              setSortBy={setSortBy} // <-- pass setSortBy
            />
          }
        />
      )}
      {/* Add Nook button remains outside the scrollable area */}
      <View
        style={{
          position: "absolute",
          bottom: 25,
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
              fontFamily: "CarosSoft", // <-- Add fontFamily here
            }}
          >
            Add Nook
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // TabView
  const layout = Dimensions.get("window");
  const [index, setIndex] = useState(1);
  const [routes] = useState([
    { key: "focus", title: "Focus" },
    { key: "home", title: "Home" },
    { key: "social", title: "Community" },
  ]);

  // Tab scenes
  const renderScene = SceneMap({
    focus: FocusTimerView,
    home: HomeTab,
    social: SocialTab, // <-- Add LoadingTab
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
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
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
        />
      </>
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
            {/* Hamburger icon button */}
            <TouchableOpacity
              onPress={() => setMenuOpen(true)}
              style={{
                borderRadius: 20,
                backgroundColor: themeColors.white,
                alignItems: "center",
                justifyContent: "center",
                elevation: 2,
                marginLeft: 8,
              }}
              accessibilityLabel="Open menu"
              accessible={true}
            >
              <List size={24} color={themeColors.purple} weight="bold" />
            </TouchableOpacity>
          </View>
          {/* HamburgerMenu modal */}
          <HamburgerMenu
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            onReportPress={() => {
              setMenuOpen(false);
              setTimeout(() => setShowGeneralReport(true), 250);
            }}
            onThemeToggle={() => setIsDarkMode && setIsDarkMode(!isDarkMode)}
            onProfilePress={() => {
              setShowGeneralReport(false);
              setMenuOpen(false);
              setTimeout(() => navigation.navigate("Profile"), 250);
            }}
            isDarkMode={isDarkMode}
            themeColors={themeColors}
            onAddFriend={() => setFindPeopleModalVisible(true)} // <-- pass handler
          />
        </View>

        {/* Main Content */}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          lazy
          renderLazyPlaceholder={() => (
            <View style={{ flex: 1, backgroundColor: themeColors.white }} />
          )}
          style={{ flex: 1 }}
          renderTabBar={(props) => (
            <TabBar
              {...props}
              themeColors={themeColors}
              currentIndex={index}
              labelStyle={{ fontFamily: "CarosSoft" }} // <-- Add fontFamily for tab labels
            />
          )}
        />

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
        {/* Find People Modal */}
        <Modal
          visible={findPeopleModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setFindPeopleModalVisible(false)}
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
                borderRadius: 16,
                padding: 0,
                width: "95%",
                maxHeight: "90%",
                alignItems: "center",
                borderWidth: 1,
                borderColor: themeColors.black,
                shadowColor: themeColors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <FindPeopleSection
                navigation={navigation}
                onNavigateToProfile={() => setFindPeopleModalVisible(false)}
              />
              <TouchableOpacity
                onPress={() => setFindPeopleModalVisible(false)}
                style={{
                  marginTop: 8,
                  backgroundColor: themeColors.purple,
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: "center",
                  width: "90%",
                  alignSelf: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: themeColors.white,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}
