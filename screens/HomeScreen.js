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
  deleteDoc,
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
  MagnifyingGlass, // <-- Add this import
  ExclamationMark, // <-- Add this import for the report button
  List, // <-- Add hamburger menu icon
} from "phosphor-react-native"; // Add Heart icon
import { colors } from "../constants/colors"; // Import colors
import { auth, db } from "../firebaseConfig"; // Import Firebase
import { doc, getDoc } from "firebase/firestore"; // Import Firestore functions
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system"; // <-- Add this import
import { ThemeContext } from "../App"; // Import ThemeContext
let imageCache = {};

const TAGS = [
  "All",
  "Favorites",
  "Quiet",
  "Group Friendly",
  "WiFi",
  "Outlets",
  "Natural Light",
  "Food Nearby",
  "Open Space",
  "No Husky Card", // Add this tag for filtering spots where Husky Card is NOT required
];

function Filters({ filters, setFilters, themeColors }) {
  // Distribute tags into two rows with roughly equal total character length,
  // but always put "Favorites" in the first row if present
  function splitTagsEvenly(tags) {
    let row1 = [],
      row2 = [];
    let len1 = 0,
      len2 = 0;
    tags.forEach((tag) => {
      if (tag === "Favorites") {
        row1.push(tag);
        len1 += tag.length;
      } else if (len1 <= len2) {
        row1.push(tag);
        len1 += tag.length;
      } else {
        row2.push(tag);
        len2 += tag.length;
      }
    });
    return [row1, row2];
  }

  const [row1, row2] = splitTagsEvenly(TAGS);

  const handlePress = (label) => {
    if (label === "All") {
      setFilters([]);
      return;
    }

    const normalized =
      label === "Favorites"
        ? "favorites"
        : label === "No Husky Card"
        ? "no-husky-card"
        : label.toLowerCase();

    if (filters.includes(normalized)) {
      setFilters(filters.filter((f) => f !== normalized));
    } else {
      setFilters([...filters, normalized]);
    }
  };

  const isSelected = (label) => {
    if (label === "All") return filters.length === 0;
    const normalized =
      label === "Favorites"
        ? "favorites"
        : label === "No Husky Card"
        ? "no-husky-card"
        : label.toLowerCase();
    return filters.includes(normalized);
  };

  return (
    <View
      style={{
        position: "relative",
        zIndex: 1,
        backgroundColor: themeColors.white,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: "column",
          paddingHorizontal: 16,
        }}
      >
        {[row1, row2].map((row, rowIdx) => (
          <View
            key={rowIdx}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: rowIdx === 0 ? 8 : 0,
            }}
          >
            {row.map((label) => {
              const selected = isSelected(label);
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => handlePress(label)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    backgroundColor: selected
                      ? themeColors.purple
                      : themeColors.white,
                    borderRadius: 25,
                    marginRight: 8,
                    marginBottom: 4,
                    shadowColor: themeColors.purple,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    borderWidth:
                      themeColors.white !== "#fff" &&
                      themeColors.white !== "#ffffff"
                        ? 1
                        : 0,
                    borderColor:
                      themeColors.white !== "#fff" &&
                      themeColors.white !== "#ffffff"
                        ? themeColors.purple
                        : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: selected ? themeColors.white : themeColors.purple,
                      fontWeight: "bold",
                      fontSize: 11,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function StudySpots({
  filteredSpots,
  navigation,
  favorites,
  handleToggleFavorite,
  search,
  setSearch,
  isDarkMode,
  themeColors,
}) {
  return (
    <FlatList
      ListHeaderComponent={
        <View
          style={{
            paddingHorizontal: 0, // Remove horizontal padding here
            paddingTop: 16,
            paddingBottom: 16,
            backgroundColor: themeColors.white,
            alignItems: "center", // Center the search bar container
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: themeColors.white,
              borderRadius: 20,
              borderColor: themeColors.black,
              borderWidth: 0.5,
              paddingHorizontal: 12,
              paddingVertical: 2,
              width: "100%", // Match card width (cards have 16px horizontal padding, so 100%-16*2)
              maxWidth: 600, // Optional: limit max width for large screens
            }}
          >
            <MagnifyingGlass
              size={20}
              color={themeColors.purple}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, tag, or feature"
              placeholderTextColor={themeColors.darkGray}
              style={{
                flex: 1,
                backgroundColor: themeColors.white,
                borderRadius: 20,
                paddingHorizontal: 4,
                paddingVertical: 10,
                fontSize: 16,
                color: themeColors.black, // Use black for search input
              }}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              accessibilityLabel="Search study spots"
              accessible={true}
            />
          </View>
        </View>
      }
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 0,
        paddingBottom: 96,
      }}
      data={filteredSpots}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => navigation.navigate("SpotDetail", { spotId: item.id })}
          style={{
            padding: 16,
            marginBottom: 12,
            backgroundColor: themeColors.white, // changed
            borderRadius: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            position: "relative",

            borderColor: themeColors.black,
            borderWidth: 0.5,
          }}
        >
          {/* Image placeholder or actual image */}
          <View
            style={{
              width: "100%",
              height: 120,
              backgroundColor: themeColors.darkGray || "#EEE", // changed
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            {item.photoUrl ? (
              <Image
                source={{
                  uri:
                    imageCache[item.id] && imageCache[item.id].length > 0
                      ? imageCache[item.id]
                      : item.photoUrl,
                }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ color: themeColors.black }}>No Image</Text>
            )}
          </View>

          {/* Heart icon for favorite */}
          <TouchableOpacity
            onPress={() => handleToggleFavorite(item.id)}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              backgroundColor: themeColors.white, // changed
              borderRadius: 20,
              padding: 4,
              borderWidth: 0.5,
              borderColor: themeColors.black, // changed
            }}
            onPressOut={(e) => e.stopPropagation && e.stopPropagation()}
          >
            <Heart
              size={28}
              color={themeColors.purple}
              weight={favorites.includes(item.id) ? "fill" : "regular"}
            />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.black, // Use black for spot name
              marginBottom: 6,
            }}
          >
            {item.name}
            {item.roomNumber && (
              <Text
                style={{
                  fontSize: 18,
                  color: themeColors.black,
                  fontWeight: "bold",
                }}
              >
                {" - Floor "}
                {item.roomNumber}
              </Text>
            )}
          </Text>
          {/* Husky Card/Department info below */}
          {(item.huskyCardNeeded || item.department) && (
            <Text
              style={{
                fontSize: 13,
                color: item.huskyCardNeeded
                  ? themeColors.red
                  : themeColors.darkGray,
                marginBottom: 8,
                marginTop: 2,
                fontWeight: item.huskyCardNeeded ? "bold" : "normal",
              }}
            >
              {item.huskyCardNeeded && "Husky Card Required"}
              {item.huskyCardNeeded && item.department && (
                <Text
                  style={{ color: themeColors.darkGray, fontWeight: "normal" }}
                >
                  {" "}
                  •{" "}
                </Text>
              )}
              {item.department && (
                <Text
                  style={{ color: themeColors.darkGray, fontWeight: "normal" }}
                >
                  Department: {item.department}
                </Text>
              )}
            </Text>
          )}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={18}
                color={
                  star <= (item.averageOverallRating || 0)
                    ? themeColors.purple
                    : themeColors.darkGray
                }
                weight={
                  star <= (item.averageOverallRating || 0) ? "fill" : "regular"
                }
                style={{ marginRight: 2 }}
              />
            ))}
            <Text
              style={{
                marginLeft: 8,
                color: themeColors.darkGray, // changed
                fontSize: 13,
              }}
            >
              {item.overallRatingsCount > 0
                ? `${item.averageOverallRating.toFixed(1)} (${
                    item.overallRatingsCount
                  })`
                : "No ratings"}
            </Text>
          </View>
          {/* Tags as pills */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginBottom: 8,
              gap: 6,
            }}
          >
            {item.tags && item.tags.length > 0 ? (
              [...item.tags]
                .sort((a, b) => String(a).localeCompare(String(b)))
                .map((tag, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: themeColors.purple, // changed
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      marginRight: 0,
                      marginBottom: 3,
                    }}
                  >
                    <Text
                      style={{
                        color: themeColors.white || "#fff", // changed
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      {tag}
                    </Text>
                  </View>
                ))
            ) : (
              <Text
                style={{ color: themeColors.darkGray || "#AAA", fontSize: 12 }}
              >
                No tags
              </Text>
            )}
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 16, color: themeColors.darkGray }}>
                Noise Level
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  color: themeColors.purple, // changed
                }}
              >
                {typeof item.ratings?.noise === "number"
                  ? item.ratings.noise.toFixed(1)
                  : item.ratings?.noise}
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 16, color: themeColors.darkGray }}>
                Crowd Level
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  color: themeColors.purple, // changed
                }}
              >
                {typeof item.ratings?.crowd === "number"
                  ? item.ratings.crowd.toFixed(1)
                  : item.ratings?.crowd}
              </Text>
            </View>
          </View>
          {/* Add last updated label */}
          <Text
            style={{
              fontSize: 12,
              color: themeColors.darkGray,
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {getLastUpdatedLabel(item.ratings)}
          </Text>
          {/* ...existing code... */}
        </TouchableOpacity>
      )}
    />
  );
}

// Simple fuzzy search function
function fuzzyMatch(str, query) {
  if (!str || !query) return false;
  str = str.toLowerCase();
  query = query.toLowerCase();
  let qi = 0;
  for (let si = 0; si < str.length && qi < query.length; si++) {
    if (str[si] === query[qi]) qi++;
  }
  return qi === query.length;
}

function RecentlyViewed({
  spots,
  navigation,
  favorites,
  handleToggleFavorite,
  themeColors, // <-- add themeColors prop
}) {
  if (!spots.length) return null;
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
          color: themeColors.black, // Use black for recently viewed title
          marginLeft: 16,
          marginBottom: 8,
        }}
      >
        Recently Viewed
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 16 }}
      >
        {spots.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() =>
              navigation.navigate("SpotDetail", { spotId: item.id })
            }
            style={{
              width: 180,
              marginRight: 12,
              backgroundColor: themeColors.white, // changed
              borderRadius: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
              position: "relative",
              paddingBottom: 8,
            }}
          >
            <View
              style={{
                width: "100%",
                height: 80,
                backgroundColor: themeColors.lightGray || "#EEE", // changed
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                marginBottom: 8,
              }}
            >
              {item.photoUrl ? (
                <Image
                  source={{
                    uri:
                      imageCache[item.id] && imageCache[item.id].length > 0
                        ? imageCache[item.id]
                        : item.photoUrl,
                  }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ color: themeColors.black }}>No Image</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => handleToggleFavorite(item.id)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 10,
                backgroundColor: themeColors.white, // changed
                borderRadius: 20,
                padding: 4,
                borderWidth: 0.5,
                borderColor: themeColors.black, // changed
              }}
              onPressOut={(e) => e.stopPropagation && e.stopPropagation()}
            >
              <Heart
                size={18}
                color={
                  favorites.includes(item.id)
                    ? themeColors.purple
                    : themeColors.darkGray
                }
                weight={favorites.includes(item.id) ? "fill" : "regular"}
              />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "bold",
                color: themeColors.black, // Use black for spot name
                marginBottom: 2,
                marginLeft: 8,
              }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: themeColors.darkGray, // changed
                marginLeft: 8,
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {item.roomNumber || ""}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginLeft: 8,
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={12}
                  color={
                    star <= (item.averageOverallRating || 0)
                      ? themeColors.purple // changed
                      : themeColors.darkGray // changed
                  }
                  weight={
                    star <= (item.averageOverallRating || 0)
                      ? "fill"
                      : "regular"
                  }
                  style={{ marginRight: 1 }}
                />
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function TabBar({ activeTab, setActiveTab, themeColors }) {
  // <-- add themeColors prop
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: themeColors.white, // changed
        borderBottomWidth: 1,
        borderBottomColor: themeColors.lightGrayBorder || "#E0E0E0", // changed
        marginBottom: 0,
      }}
    >
      {["Home", "Recently Viewed"].map((tab, idx) => (
        <TouchableOpacity
          key={tab}
          onPress={() => setActiveTab(tab)}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderBottomWidth: 3,
            borderBottomColor:
              activeTab === tab ? themeColors.purple : "transparent", // changed
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color:
                activeTab === tab ? themeColors.black : themeColors.darkGray, // Use black for active tab
              fontWeight: activeTab === tab ? "bold" : "normal",
              fontSize: 16,
              letterSpacing: 0.5,
            }}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function GeneralReportModal({ visible, onClose }) {
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;

  const handleSubmit = async () => {
    if (!reportText.trim()) {
      Alert.alert("Please enter your suggestion or issue.");
      return;
    }
    setSubmitting(true);
    try {
      // Add report to Firestore 'reports' collection
      await addDoc(collection(db, "reports"), {
        spotId: null,
        spotName: null,
        report: reportText,
        user: auth.currentUser?.uid || "Anonymous",
        createdAt: Timestamp.now(),
      });
      Alert.alert("Thank you!", "Your feedback has been submitted.");
      setReportText("");
      onClose();
    } catch (e) {
      Alert.alert("Error", "Failed to submit feedback.");
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
            Suggestion / Report an Issue
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
            placeholder="Describe your suggestion or issue..."
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

export default function HomeScreen({
  navigation,
  route,
  isDarkMode: propDark,
  themeColors: propColors,
}) {
  const themeCtx = useContext(ThemeContext);
  const isDarkMode = propDark ?? themeCtx?.isDarkMode ?? false;
  const themeColors = propColors ?? themeCtx?.themeColors ?? colors;
  const setIsDarkMode = themeCtx?.setIsDarkMode;

  const [filters, setFilters] = useState([]);
  const [studySpots, setStudySpots] = useState([]);
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState(""); // <-- Add search state
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [activeTab, setActiveTab] = useState("Home");
  const [showGeneralReport, setShowGeneralReport] = useState(false); // Add state for modal
  const [menuOpen, setMenuOpen] = useState(false); // <-- Hamburger menu state
  const [imageCache, setImageCache] = useState({}); // spotId -> local file URI

  // Fetch user's favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setFavorites(userDoc.data().favorites || []);
        }
      }
    };
    fetchFavorites();
  }, []);

  // Toggle favorite for a spot
  const handleToggleFavorite = async (spotId) => {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    try {
      if (favorites.includes(spotId)) {
        await updateDoc(userRef, {
          favorites: favorites.filter((f) => f !== spotId),
        });
        setFavorites(favorites.filter((f) => f !== spotId));
      } else {
        await updateDoc(userRef, { favorites: [...favorites, spotId] });
        setFavorites([...favorites, spotId]);
      }
    } catch (e) {
      alert("Failed to update favorites.");
    }
  };

  // Helper to cache spot images
  const cacheSpotImage = async (spotId, photoUrl) => {
    if (!photoUrl) return null;
    try {
      const cacheKey = `spotImageUri_${spotId}`;
      const cachedUri = await AsyncStorage.getItem(cacheKey);
      const cachedUrl = await AsyncStorage.getItem(`${cacheKey}_url`);
      if (cachedUri && cachedUrl === photoUrl) {
        return cachedUri;
      }
      const fileUri = FileSystem.cacheDirectory + `spot_${spotId}.jpg`;
      const downloadRes = await FileSystem.downloadAsync(photoUrl, fileUri);
      if (downloadRes.status === 200) {
        await AsyncStorage.setItem(cacheKey, downloadRes.uri);
        await AsyncStorage.setItem(`${cacheKey}_url`, photoUrl);
        return downloadRes.uri;
      }
    } catch (e) {}
    return null;
  };

  // Fetch study spots and cache images
  const fetchStudySpots = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "studySpots"));
      const spots = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const spotData = docSnap.data();

          // Fetch ratings for the spot
          const ratingsQuery = query(
            collection(db, "ratings"),
            where("spotId", "==", docSnap.id)
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

          let averageNoise,
            averageCrowd,
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
            averageNoise = noiseSum / recentRatings.length;
            averageCrowd = crowdSum / recentRatings.length;
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
              averageNoise = noiseSum / bestWindowRatings.length;
              averageCrowd = crowdSum / bestWindowRatings.length;
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
              averageNoise = noiseSumDay / todayRatings.length;
              averageCrowd = crowdSumDay / todayRatings.length;
              lastUpdated = Math.max(
                ...todayRatings.map((r) => r.timestamp.toMillis())
              );
              lastUpdatedType = "today";
              lastWindowHours = null;
            } else {
              averageNoise = "No rating yet";
              averageCrowd = "No rating yet";
              lastUpdated = null;
              lastUpdatedType = null;
              lastWindowHours = null;
            }
          }

          // Fetch overall ratings for the spot
          const overallRatingsQuery = query(
            collection(db, "overallRatings"),
            where("spotId", "==", docSnap.id)
          );
          const overallRatingsSnapshot = await getDocs(overallRatingsQuery);
          let overallSum = 0;
          let overallCount = 0;
          overallRatingsSnapshot.forEach((r) => {
            overallSum += r.data().rating || 0;
            overallCount++;
          });
          const averageOverallRating =
            overallCount > 0 ? overallSum / overallCount : 0;

          // Cache image if photoUrl exists
          let cachedUri = "";
          if (spotData.photoUrl) {
            cachedUri = await cacheSpotImage(docSnap.id, spotData.photoUrl);
          }
          return {
            id: docSnap.id,
            ...spotData,
            photoUrl: spotData.photoUrl || "",
            cachedPhotoUri: cachedUri || "", // Add cached URI
            ratings: {
              noise: averageNoise,
              crowd: averageCrowd,
              lastUpdated,
              lastUpdatedType,
              lastWindowHours,
            },
            averageOverallRating,
            overallRatingsCount: overallCount,
          };
        })
      );
      // Build imageCache map
      const cacheMap = {};
      spots.forEach((spot) => {
        if (spot.cachedPhotoUri) cacheMap[spot.id] = spot.cachedPhotoUri;
      });
      setImageCache(cacheMap);
      setStudySpots(spots);
    } catch (error) {
      console.error("Error fetching study spots:", error);
      alert("Unable to fetch study spots. Please check your permissions.");
    } finally {
      setIsLoading(false); // Set loading to false after fetching data
    }
  };

  // Load recently viewed from AsyncStorage
  useEffect(() => {
    const loadRecentlyViewed = async () => {
      try {
        const stored = await AsyncStorage.getItem("recentlyViewedSpots");
        if (stored) setRecentlyViewed(JSON.parse(stored));
      } catch {}
    };
    loadRecentlyViewed();
  }, []);

  // Helper to update recently viewed
  const addRecentlyViewed = async (spotId) => {
    let updated = [spotId, ...recentlyViewed.filter((id) => id !== spotId)];
    if (updated.length > 8) updated = updated.slice(0, 8);
    setRecentlyViewed(updated);
    try {
      await AsyncStorage.setItem(
        "recentlyViewedSpots",
        JSON.stringify(updated)
      );
    } catch {}
  };

  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name);
        }
      }
    };

    fetchUserName();
  }, []);

  useEffect(() => {
    fetchStudySpots(); // Fetch spots on initial load
  }, []);

  useEffect(() => {
    if (route.params?.refresh) {
      fetchStudySpots(); // Refresh spots when navigating back with "refresh"
    }
  }, [route.params?.refresh]);

  if (isLoading)
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ fontSize: 16, color: themeColors.black }}>
          Loading...
        </Text>
      </SafeAreaView>
    );

  // Fuzzy search filter
  const searchFilter = (spot) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    // Search in name, buildingName, tags, features (if present)
    const fields = [
      spot.name,
      spot.buildingName,
      spot.roomNumber,
      ...(spot.tags || []),
      ...(spot.features || []),
    ];
    return fields.some((field) =>
      typeof field === "string" ? fuzzyMatch(field, q) : false
    );
  };

  // Filters for Home tab
  const matchFilters = (spot) => {
    if (!filters.length) return true;
    return filters.every((f) => {
      if (f === "favorites") return favorites.includes(spot.id);
      if (f === "no-husky-card") return !spot.huskyCardNeeded;
      return (spot.tags || []).map((t) => String(t).toLowerCase()).includes(f);
    });
  };

  const filteredSpots = studySpots.filter(
    (spot) => matchFilters(spot) && searchFilter(spot)
  );

  const filteredRecentlyViewedSpots = recentlyViewed
    .map((id) => studySpots.find((s) => s.id === id))
    .filter(Boolean)
    .filter((spot) => matchFilters(spot) && searchFilter(spot));

  // Get recently viewed spot objects
  const recentlyViewedSpots = recentlyViewed
    .map((id) => studySpots.find((s) => s.id === id))
    .filter(Boolean);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      <View style={{ flex: 1 }}>
        {/* --- TOP BAR: Title and Hamburger --- */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 16,
            marginBottom: 8,
            zIndex: 10,
          }}
        >
          {/* Left: Title */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                fontSize: 40,
                fontWeight: "bold",
                color: themeColors.purple,
                fontFamily: Platform.OS === "ios" ? "Helvetica" : "sans-serif",
                marginRight: 12,
              }}
            >
              Nook
            </Text>
          </View>
          {/* Hamburger menu button */}
          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            style={{
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              backgroundColor: themeColors.purple,
              borderRadius: 18,
              marginLeft: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 5,
              zIndex: 100,
            }}
          >
            <List size={26} color={themeColors.white} weight="bold" />
          </TouchableOpacity>
        </View>
        {/* --- END TOP BAR --- */}

        {/* Hamburger Menu Modal */}
        {menuOpen && (
          <Modal
            visible={menuOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setMenuOpen(false)}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.35)",
                zIndex: 999,
              }}
              activeOpacity={1}
              onPressOut={() => setMenuOpen(false)}
            >
              <View
                style={{
                  position: "absolute",
                  top: 60,
                  right: 16,
                  backgroundColor: themeColors.white,
                  borderRadius: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 0,
                  minWidth: 180,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 20,
                  zIndex: 1000,
                }}
              >
                {/* Restart */}
                <TouchableOpacity
                  onPress={() => {
                    setMenuOpen(false);
                    setIsLoading(true);
                    fetchStudySpots();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                  }}
                >
                  <ArrowClockwise
                    size={22}
                    color={themeColors.purple}
                    weight="bold"
                  />
                  <Text
                    style={{
                      marginLeft: 12,
                      color: themeColors.purple,
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    Refresh
                  </Text>
                </TouchableOpacity>
                {/* Divider */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: themeColors.lightGrayBorder || "#eee",
                    marginHorizontal: 10,
                  }}
                />
                {/* Report */}
                <TouchableOpacity
                  onPress={() => {
                    setMenuOpen(false);
                    // Delay showing the modal until after the menu closes to avoid flicker
                    setTimeout(() => setShowGeneralReport(true), 250);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                  }}
                >
                  <ExclamationMark
                    size={22}
                    color={themeColors.purple}
                    weight="bold"
                  />
                  <Text
                    style={{
                      marginLeft: 12,
                      color: themeColors.purple,
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    Suggestion / Report
                  </Text>
                </TouchableOpacity>
                {/* Divider */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: themeColors.lightGrayBorder || "#eee",
                    marginHorizontal: 10,
                  }}
                />
                {/* Dark Mode */}
                <TouchableOpacity
                  onPress={() => {
                    setMenuOpen(false);
                    setIsDarkMode && setIsDarkMode(!isDarkMode);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                  }}
                >
                  {isDarkMode ? (
                    <Sun size={22} color={themeColors.purple} weight="bold" />
                  ) : (
                    <Moon size={22} color={themeColors.purple} weight="bold" />
                  )}
                  <Text
                    style={{
                      marginLeft: 12,
                      color: themeColors.purple,
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                  </Text>
                </TouchableOpacity>
                {/* Divider */}
                <View
                  style={{
                    height: 1,
                    backgroundColor: themeColors.lightGrayBorder || "#eee",
                    marginHorizontal: 10,
                  }}
                />
                {/* Profile */}
                <TouchableOpacity
                  onPress={() => {
                    // Always close the report modal before navigating to Profile
                    setShowGeneralReport(false);
                    setMenuOpen(false);
                    setTimeout(() => {
                      navigation.navigate("Profile");
                    }, 250);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                  }}
                >
                  <User size={20} color={themeColors.purple} weight="bold" />
                  <Text
                    style={{
                      marginLeft: 12,
                      color: themeColors.purple,
                      fontWeight: "bold",
                      fontSize: 16,
                    }}
                  >
                    Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        <Filters
          filters={filters}
          setFilters={setFilters}
          themeColors={themeColors}
        />
        {activeTab === "Home" ? (
          <StudySpots
            filteredSpots={filteredSpots}
            navigation={{
              ...navigation,
              navigate: (screen, params) => {
                if (screen === "SpotDetail" && params?.spotId) {
                  addRecentlyViewed(params.spotId);
                }
                navigation.navigate(screen, params);
              },
            }}
            favorites={favorites}
            handleToggleFavorite={handleToggleFavorite}
            search={search}
            setSearch={setSearch}
            isDarkMode={isDarkMode}
            themeColors={themeColors}
          />
        ) : (
          <StudySpots
            filteredSpots={filteredRecentlyViewedSpots}
            navigation={{
              ...navigation,
              navigate: (screen, params) => {
                if (screen === "SpotDetail" && params?.spotId) {
                  addRecentlyViewed(params.spotId);
                }
                navigation.navigate(screen, params);
              },
            }}
            favorites={favorites}
            handleToggleFavorite={handleToggleFavorite}
            search={search}
            setSearch={setSearch}
            isDarkMode={isDarkMode}
            themeColors={themeColors}
          />
        )}
        <TouchableOpacity
          onPress={() => {
            try {
              navigation.navigate("AddSpot");
            } catch (error) {
              console.error("Error adding spot:", error);
              alert("Unable to add a new spot. Please check your permissions.");
            }
          }}
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: themeColors.purple, // changed
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
              color: themeColors.white, // changed
              fontWeight: "bold",
              fontSize: 14,
              marginLeft: 8,
            }}
          >
            Add a Nook
          </Text>
        </TouchableOpacity>
        <GeneralReportModal
          visible={showGeneralReport}
          onClose={() => setShowGeneralReport(false)}
        />
      </View>
    </SafeAreaView>
  );
}

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
