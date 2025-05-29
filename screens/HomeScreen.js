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
} from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  deleteDoc,
  updateDoc,
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
} from "phosphor-react-native"; // Add Heart icon
import { colors } from "../constants/colors"; // Import colors
import { auth, db } from "../firebaseConfig"; // Import Firebase
import { doc, getDoc } from "firebase/firestore"; // Import Firestore functions
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "../App"; // Import ThemeContext

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
      label === "Favorites" ? "favorites" : label.toLowerCase();

    if (filters.includes(normalized)) {
      setFilters(filters.filter((f) => f !== normalized));
    } else {
      setFilters([...filters, normalized]);
    }
  };

  const isSelected = (label) => {
    if (label === "All") return filters.length === 0;
    const normalized =
      label === "Favorites" ? "favorites" : label.toLowerCase();
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
      <View
        style={{
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 40,
            fontWeight: "bold",
            textAlign: "center",
            color: themeColors.purple,
            fontFamily: Platform.OS === "ios" ? "Helvetica" : "sans-serif",
            marginTop: 16,
          }}
        >
          Nook
        </Text>
      </View>
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
                      color: selected
                        ? themeColors.white
                        : themeColors.purple,
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
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 16,
            backgroundColor: themeColors.white,
          }}
        >
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, tag, or feature"
            placeholderTextColor={themeColors.purple}
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 16,
              color: themeColors.purple,
              borderColor: themeColors.purple, // outline color
              borderWidth: 0.5, // outline thickness
            }}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            accessibilityLabel="Search study spots"
            accessible={true}
          />
        </View>
      }
      data={filteredSpots}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 0, // Remove extra top padding since search bar is now header
        paddingBottom: 96,
      }}
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

            borderColor: themeColors.purple,
            borderWidth: 0.5,
          }}
        >
          {/* Image placeholder or actual image */}
          <View
            style={{
              width: "100%",
              height: 120,
              backgroundColor: themeColors.lightGray || "#EEE", // changed
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
                source={{ uri: item.photoUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ color: "#AAA" }}>No Image</Text>
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
              borderColor: themeColors.purple, // changed
            }}
            onPressOut={(e) => e.stopPropagation && e.stopPropagation()}
          >
            <Heart
              size={22}
              color={themeColors.purple}
              weight={favorites.includes(item.id) ? "fill" : "regular"}
            />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.purple, // changed
              marginBottom: 8,
            }}
          >
            {item.name}
          </Text>
          {item.roomNumber && (
            <Text
              style={{
                fontSize: 14,
                color: themeColors.purple, // changed
                marginBottom: 4,
              }}
            >
              Floor: {item.roomNumber}
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
              <Text style={{ fontSize: 14, color: themeColors.darkGray }}>
                Noise Level
              </Text>
              <Text
                style={{
                  fontSize: 12,
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
              <Text style={{ fontSize: 14, color: themeColors.darkGray }}>
                Crowd Level
              </Text>
              <Text
                style={{
                  fontSize: 12,
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
          color: themeColors.purple, // changed
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
                  source={{ uri: item.photoUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ color: "#AAA" }}>No Image</Text>
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
                borderColor: themeColors.purple, // changed
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
                color: themeColors.purple, // changed
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
                activeTab === tab ? themeColors.purple : themeColors.darkGray, // changed
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

          let noiseSum = 0;
          let crowdSum = 0;
          let count = 0;
          const thirtyMinutesAgo = Timestamp.now().toMillis() - 30 * 60 * 1000;

          ratingsSnapshot.forEach(async (ratingDoc) => {
            const ratingData = ratingDoc.data();
            if (ratingData.timestamp.toMillis() >= thirtyMinutesAgo) {
              noiseSum += ratingData.noise;
              crowdSum += ratingData.crowd;
              count++;
            } else {
              // Delete ratings older than 30 minutes
              await deleteDoc(doc(db, "ratings", ratingDoc.id));
            }
          });

          const averageNoise = count > 0 ? noiseSum / count : "No rating yet";
          const averageCrowd = count > 0 ? crowdSum / count : "No rating yet";

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

          return {
            id: docSnap.id,
            ...spotData,
            photoUrl: spotData.photoUrl || "", // Add photoUrl field (empty if not present)
            ratings: {
              noise: averageNoise,
              crowd: averageCrowd,
            },
            averageOverallRating,
            overallRatingsCount: overallCount,
          };
        })
      );

      setStudySpots(spots); // Store fetched spots with updated ratings in state
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
        <Text style={{ fontSize: 16, color: themeColors.darkGray }}>
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
      return (spot.tags || [])
        .map((t) => String(t).toLowerCase())
        .includes(f);
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
        <Filters
          filters={filters}
          setFilters={setFilters}
          themeColors={themeColors}
        />
        <TabBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
        <TouchableOpacity
          onPress={() => navigation.navigate("Profile")}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            backgroundColor: themeColors.purple, // changed
            borderRadius: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
            zIndex: 5,
          }}
        >
          <User size={24} color={themeColors.white} weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setIsLoading(true); // Show loading state
            fetchStudySpots(); // Fetch updated study spots
          }}
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            backgroundColor: themeColors.purple, // changed
            borderRadius: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
            zIndex: 5,
          }}
        >
          <ArrowClockwise size={24} color={themeColors.white} weight="bold" />
        </TouchableOpacity>
        {/* Add dark mode toggle button */}
        <TouchableOpacity
          onPress={() => setIsDarkMode && setIsDarkMode(!isDarkMode)}
          style={{
            position: "absolute",
            top: 16,
            left: 64,
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            backgroundColor: themeColors.purple, // changed
            borderRadius: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
            zIndex: 5,
          }}
        >
          {isDarkMode ? (
            <Sun size={24} color={themeColors.white} weight="bold" />
          ) : (
            <Moon size={24} color={themeColors.white} weight="bold" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
