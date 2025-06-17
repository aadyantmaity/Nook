import React, { useState, useEffect, useContext } from "react";
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
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  updateDoc,
  addDoc,
} from "firebase/firestore"; // Ensure Timestamp is imported
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
} from "phosphor-react-native"; // Add Heart icon
import { colors } from "../constants/colors"; // Import colors
import { auth, db } from "../firebaseConfig"; // Import Firebase
import { doc, getDoc } from "firebase/firestore"; // Import Firestore functions
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system"; // <-- Add this import
import { ThemeContext } from "../App"; // Import ThemeContext
import { TabView, SceneMap } from "react-native-tab-view";
import { Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getLastUpdatedLabel } from "../utils/lastUpdatedLabel";

// components imports
import Filters from "../components/Home/Filters"; // Import Filters component
import StudySpotsList from "../components/Home/StudySpotsList";
import StudySpotsMapView from "../components/Home/StudySpotsMapView"; // <-- new component
import { FocusTimerView } from "../components/Home/FocusTimer"; // <-- Use correct import
import HamburgerMenu from "../components/Home/HamburgerMenu"; // Import HamburgerMenu component
import AlertsModal from "../components/Home/AlertsModal"; // Import AlertsModal component
import TabBar from "../components/Home/TabBar"; // Import TabBar component
import GeneralReportModal from "../components/Home/GeneralReportModal"; // Import GeneralReportModal component

//hook imports
import useStudySpots from "../hooks/useStudySpots";
import useFavorites from "../hooks/useFavorites";
import useSearchAndFilters from "../hooks/useSearchAndFilters";

let imageCache = {};

export default function HomeScreen({ navigation, route }) {
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

  // Hooks
  const { studySpots, isLoading, fetchStudySpots } = useStudySpots();
  const { favorites, toggleFavorite } = useFavorites();
  const { filters, setFilters, filteredSpots } = useSearchAndFilters(
    studySpots,
    favorites
  );

  // TabView
  const layout = Dimensions.get("window");
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "home", title: "Home" },
    { key: "focus", title: "Focus Mode" },
  ]);

  // --- Reusable Header (toggle only, no filters) ---
  function StudySpotsHeader({
    showMapView,
    setShowMapView,
    themeColors,
    filters,
    setFilters,
  }) {
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
              onPress={() => setShowMapView(false)}
              style={{
                backgroundColor: !showMapView
                  ? themeColors.purple
                  : themeColors.gray,
                padding: 10,
                borderRadius: 8,
                marginRight: 8,
                minWidth: 48,
                alignItems: "center",
                justifyContent: "center",
                height: 42,
              }}
            >
              <Rows // <-- Changed from List to Rows
                size={22}
                color={!showMapView ? themeColors.white : themeColors.purple}
                weight="bold"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowMapView(true)}
              style={{
                backgroundColor: showMapView
                  ? themeColors.purple
                  : themeColors.gray,
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
          <Filters
            filters={filters}
            setFilters={setFilters}
            themeColors={themeColors}
            buttonStyle={{
              backgroundColor: themeColors.gray,
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: "center",
              justifyContent: "center",
              minWidth: 48,
              marginRight: 0,
              height: 42,
              marginBottom: 0,
            }}
            textStyle={{
              color: themeColors.purple,
              fontWeight: "bold",
              fontSize: 13,
              textAlignVertical: "center",
            }}
          />
        </View>
      </View>
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
        >
          {/* Toggle row (List/Map/Filters) */}
          <View style={{ paddingHorizontal: 16 }}>
            <StudySpotsHeader
              showMapView={showMapView}
              setShowMapView={setShowMapView}
              themeColors={themeColors}
              filters={filters}
              setFilters={setFilters}
            />
          </View>
          <StudySpotsMapView
            spots={filteredSpots}
            navigation={navigation}
            themeColors={themeColors}
            containerStyle={{ marginHorizontal: 16 }}
          />
        </ScrollView>
      ) : (
        <StudySpotsList
          filteredSpots={filteredSpots}
          navigation={navigation}
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
          setShowMapView={setShowMapView}
          ListHeaderComponent={
            // Remove extra padding here to match MapView
            <StudySpotsHeader
              showMapView={showMapView}
              setShowMapView={setShowMapView}
              themeColors={themeColors}
              filters={filters}
              setFilters={setFilters}
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
        <View
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
        >
          <Plus size={24} color={themeColors.white} />
          <Text
            style={{
              color: themeColors.white,
              fontWeight: "bold",
              fontSize: 14,
              marginLeft: 8,
            }}
            onPress={() => navigation.navigate("AddSpot")}
          >
            Add Nook
          </Text>
        </View>
      </View>
    </>
  );

  // Tab scenes
  const renderScene = SceneMap({
    home: HomeTab,
    focus: FocusTimerView,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontSize: 16, color: themeColors.black }}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: themeColors.white, paddingTop: 48 }}
    >
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 16,
            marginBottom: 8,
            zIndex: 10,
          }}
        >
          <Text
            style={{
              fontSize: 40,
              fontWeight: "bold",
              color: themeColors.purple,
              marginRight: 12,
            }}
          >
            Nook
          </Text>
          {/* Hamburger icon button */}
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
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
            accessibilityLabel="Open menu"
            accessible={true}
          >
            <List size={24} color={themeColors.purple} weight="bold" />
          </TouchableOpacity>
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
            <TabBar {...props} themeColors={themeColors} currentIndex={index} />
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
      </View>
    </View>
  );
}
