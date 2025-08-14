import React from "react";
import { View, FlatList, Text, TouchableOpacity, Image } from "react-native";
import {
  Heart,
  Star,
  Warning,
  CaretDown,
  CaretUp,
  Rows,
  MapTrifold,
  List,
  LockKey, // <-- add this import
} from "phosphor-react-native";
import Filters from "./Filters";
import HomeLoadingScreen from "./HomeLoadingScreen"; // Import the loading screen
import useFavoriteStatus from "../../hooks/useFavoriteStatus";
import { FONTS } from "../../constants/fonts";
import { auth, db } from "../../firebaseConfig"; // Added for favorite functionality
import { doc, getDoc, deleteDoc, setDoc } from "firebase/firestore"; // Added for favorite functionality

// Separate component for study spot item that can use hooks
const StudySpotItem = React.memo(
  ({
    item,
    navigation,
    themeColors,
    getLastUpdatedLabel,
    sortBy,
    userLocation,
    onWarningPress,
    hideIfNotFavorite = false, // Add this prop
  }) => {
    const isFavorite = useFavoriteStatus(item.id);

    // Toggle favorite function
    const toggleFavorite = async (spotId) => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const favoritedByRef = doc(
          db,
          "studySpots",
          spotId,
          "favoritedBy",
          user.uid
        );
        const favoritedByDoc = await getDoc(favoritedByRef);

        if (favoritedByDoc.exists()) {
          // Remove from favorites
          await deleteDoc(favoritedByRef);
        } else {
          // Add to favorites
          await setDoc(favoritedByRef, {
            favoritedAt: new Date(),
            userId: user.uid,
          });
        }
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
        alert("Failed to update favorites.");
      }
    };

    // Helper functions
    function getNoiseLabel(avg) {
      if (avg === "N/A" || avg === "No rating yet" || avg == null) return "N/A";
      if (typeof avg === "string") avg = parseFloat(avg);
      if (isNaN(avg)) return "N/A";
      if (avg < 0.5) return "Silent";
      if (avg < 1.5) return "Buzz";
      return "Loud";
    }

    function getCrowdLabel(avg) {
      if (avg === "N/A" || avg === "No rating yet" || avg == null) return "N/A";
      if (typeof avg === "string") avg = parseFloat(avg);
      if (isNaN(avg)) return "N/A";
      if (avg < 0.5) return "Empty";
      if (avg < 1.5) return "Light";
      return "Busy";
    }

    function getDistance(lat1, lon1, lat2, lon2) {
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371000;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // --- Filter today's alerts only ---
    const today = new Date();
    const isSameDay = (dateObj) => {
      if (!dateObj) return false;
      const d = new Date(dateObj);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    };
    const parsedAlerts = Array.isArray(item.locationAlerts)
      ? item.locationAlerts.map((a) =>
          typeof a === "string"
            ? { text: a, createdAt: null }
            : { text: a.text, createdAt: a.createdAt ?? null }
        )
      : [];
    const todaysAlerts = parsedAlerts.filter(
      (a) =>
        a.createdAt &&
        isSameDay(
          typeof a.createdAt === "object" && a.createdAt.toDate
            ? a.createdAt.toDate()
            : a.createdAt
        )
    );

    const isPrivateNook = !!item.privateNook;

    // Table availability for Odegaard
    const isOdegaard = (item.buildingName || item.name || "")
      .toLowerCase()
      .includes("odegaard");

    // Calculate distance if needed
    let distanceLabel = "";
    if (
      (sortBy === "distance-asc" || sortBy === "distance-desc") &&
      userLocation &&
      item.coordinates &&
      typeof item.coordinates.latitude === "number" &&
      typeof item.coordinates.longitude === "number"
    ) {
      const dist = getDistance(
        userLocation.latitude,
        userLocation.longitude,
        item.coordinates.latitude,
        item.coordinates.longitude
      );
      if (dist < 1000) distanceLabel = `${Math.round(dist)} m`;
      else distanceLabel = `${(dist / 1000).toFixed(2)} km`;
    }

    // Hide if not favorite if the filter is active
    if (hideIfNotFavorite && !isFavorite) {
      return null;
    }

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("SpotDetail", {
            spotId: item.id,
            spot: item,
          })
        }
        style={{
          padding: 16,
          marginBottom: 12,
          backgroundColor: themeColors.white,
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
        activeOpacity={0.9}
      >
        {/* Badge Icon: Warning for alerts */}
        {todaysAlerts.length > 0 && (
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 20,
              backgroundColor: themeColors.white,
              borderRadius: 20,
              padding: 4,
              borderWidth: 0.5,
              borderColor: themeColors.red,
              shadowColor: themeColors.red,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 4,
              elevation: 6,
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => onWarningPress && onWarningPress(todaysAlerts)}
            activeOpacity={0.8}
          >
            <Warning size={24} color={themeColors.red} weight="fill" />
            <View
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                backgroundColor: themeColors.orange,
                borderRadius: 10,
                paddingHorizontal: 5,
                paddingVertical: 1,
                minWidth: 18,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontSize: 10,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {todaysAlerts.length}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Image */}
        <View style={{ alignItems: "center", width: "100%" }}>
          <View
            style={{
              width: 330,
              height: 140,
              backgroundColor: themeColors.darkGray || "#EEE",
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            {item.cachedPhotoUri || item.photoUrl ? (
              <Image
                source={{
                  uri: item.cachedPhotoUri
                    ? item.cachedPhotoUri
                    : item.photoUrl,
                }}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 8,
                }}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={{
                  color: themeColors.black,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                No Image
              </Text>
            )}
          </View>
        </View>

        {/* Heart icon for favorite */}
        <TouchableOpacity
          onPress={() => toggleFavorite(item.id)}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 20,
            backgroundColor: themeColors.white,
            borderRadius: 20,
            padding: 4,
            borderWidth: 0.5,
            borderColor: themeColors.black,
          }}
          onPressOut={(e) => e.stopPropagation && e.stopPropagation()}
        >
          <Heart
            size={28}
            color={themeColors.purple}
            weight={isFavorite ? "fill" : "regular"}
          />
        </TouchableOpacity>

        {/* Spot name and room */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: themeColors.black,
            marginBottom: 6,
            flexDirection: "row",
            alignItems: "center",
            fontFamily: FONTS.PRIMARY,
          }}
        >
          {item.name}
          {item.roomNumber && (
            <Text
              style={{
                fontSize: 18,
                color: themeColors.black,
                fontWeight: "bold",
                fontFamily: FONTS.PRIMARY,
              }}
            >
              {" - Floor "}
              {item.roomNumber}
            </Text>
          )}
          {isPrivateNook && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                display: "inline-flex",
              }}
            >
              <View style={{ width: 4 }} />
              <LockKey
                size={18}
                color={themeColors.purple}
                weight="fill"
                style={{
                  marginBottom: -2,
                  alignSelf: "center",
                }}
              />
            </View>
          )}
        </Text>

        {/* Husky Card/Department info */}
        {!item.privateNook && (item.huskyCardNeeded || item.department) && (
          <Text
            style={{
              fontSize: 13,
              color: item.huskyCardNeeded
                ? themeColors.red
                : themeColors.darkGray,
              marginBottom: 8,
              marginTop: 2,
              fontWeight: item.huskyCardNeeded ? "bold" : "normal",
              fontFamily: FONTS.PRIMARY,
            }}
          >
            {item.huskyCardNeeded && "Husky Card Required"}
            {item.huskyCardNeeded && item.department && (
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
            {item.department && (
              <Text
                style={{
                  color: themeColors.darkGray,
                  fontWeight: "normal",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Department: {item.department}
              </Text>
            )}
          </Text>
        )}

        {/* Tags */}
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
                    backgroundColor: themeColors.purple,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    marginRight: 0,
                    marginBottom: 3,
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.white || "#fff",
                      fontSize: 12,
                      fontWeight: "bold",
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    {tag}
                  </Text>
                </View>
              ))
          ) : (
            <Text
              style={{
                color: themeColors.darkGray || "#AAA",
                fontSize: 12,
                fontFamily: FONTS.PRIMARY,
              }}
            >
              No tags
            </Text>
          )}
        </View>

        {/* Ratings */}
        {!item.privateNook && (
          <>
            {/* --- Ratings row: 3 columns for Odegaard, 2 columns otherwise --- */}
            {isOdegaard ? (
              // Odegaard: 3 columns
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 2,
                  marginTop: 2,
                }}
              >
                {/* Noise Level */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 15,
                      color: themeColors.darkGray,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    Noise Level
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      color: themeColors.purple,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    {getNoiseLabel(item.ratings?.noise)}
                  </Text>
                </View>
                {/* Crowd Level */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 15,
                      color: themeColors.darkGray,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    Crowd Level
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      color: themeColors.purple,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    {getCrowdLabel(item.ratings?.crowd)}
                  </Text>
                </View>
                {/* Tables Open (Odegaard only) */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  {item.ratings &&
                  typeof item.ratings.tableAvailability !== "undefined" ? (
                    <>
                      <Text
                        style={{
                          fontSize: 15,
                          color: themeColors.darkGray,
                          fontFamily: FONTS.PRIMARY,
                        }}
                      >
                        Tables Open
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          color: themeColors.purple,
                          fontFamily: FONTS.PRIMARY,
                        }}
                      >
                        {(() => {
                          switch (item.ratings.tableAvailability) {
                            case 0:
                              return "0";
                            case 1:
                              return "1-3";
                            case 2:
                              return "4-6";
                            case 3:
                              return "7+";
                            default:
                              return "N/A";
                          }
                        })()}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        style={{
                          fontSize: 15,
                          color: themeColors.darkGray,
                          fontFamily: FONTS.PRIMARY,
                        }}
                      >
                        {/* Empty label for alignment */}
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          color: "transparent",
                          fontFamily: FONTS.PRIMARY,
                        }}
                      >
                        -
                      </Text>
                    </>
                  )}
                </View>
              </View>
            ) : (
              // Non-Odegaard: 2 columns
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginBottom: 2,
                  marginTop: 2,
                }}
              >
                {/* Noise Level */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 15,
                      color: themeColors.darkGray,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    Noise Level
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      color: themeColors.purple,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    {getNoiseLabel(item.ratings?.noise)}
                  </Text>
                </View>
                {/* Crowd Level */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 15,
                      color: themeColors.darkGray,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    Crowd Level
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      color: themeColors.purple,
                      fontFamily: FONTS.PRIMARY,
                    }}
                  >
                    {getCrowdLabel(item.ratings?.crowd)}
                  </Text>
                </View>
              </View>
            )}
            {/* Last updated label */}
            <Text
              style={{
                fontSize: 12,
                color: themeColors.darkGray,
                marginTop: 6,
                textAlign: "right",
                fontFamily: FONTS.PRIMARY,
              }}
            >
              {getLastUpdatedLabel && item.ratings
                ? getLastUpdatedLabel(item.ratings)
                : ""}
            </Text>
          </>
        )}
        {/* Show distance if sorting by distance */}
        {distanceLabel && (
          <Text
            style={{
              fontSize: 13,
              color: "#888",
              marginBottom: 4,
              fontFamily: FONTS.PRIMARY,
              textAlign: "right",
            }}
          >
            Distance: {distanceLabel}
          </Text>
        )}

        {/* Last updated */}
        {getLastUpdatedLabel && (
          <Text
            style={{
              fontSize: 11,
              color: themeColors.darkGray,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            {getLastUpdatedLabel(item)}
          </Text>
        )}
      </TouchableOpacity>
    );
  }
);

export default function StudySpotsList({
  filteredSpots,
  navigation,
  isDarkMode,
  themeColors,
  onRefresh,
  refreshing,
  filters,
  setFilters,
  setCurrentAlerts,
  setShowAlertsModal,
  getLastUpdatedLabel,
  contentContainerStyle,
  showMapView,
  setShowMapView,
  filtersExpanded,
  setFiltersExpanded,
  hideHeader,
  ListHeaderComponent,
  sortBy,
  setSortBy,
  userLocation,
  hasFavoritesFilter = false, // Add this prop
  ...props
}) {
  // Filter spots based on favorites if the favorites filter is active
  const finalFilteredSpots = React.useMemo(() => {
    if (!hasFavoritesFilter) {
      return filteredSpots;
    }

    // If favorites filter is active, we need to filter based on individual favorite status
    // This is a temporary solution - ideally we'd have a more efficient way to do this
    return filteredSpots.filter((spot) => {
      // For now, we'll show all spots and let the individual StudySpotItem components
      // handle the favorite status display. The actual filtering will happen at the UI level
      // by hiding non-favorite spots
      return true;
    });
  }, [filteredSpots, hasFavoritesFilter]);

  return (
    <FlatList
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 0,
        ...(contentContainerStyle || {}),
      }}
      data={finalFilteredSpots}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeaderComponent}
      renderItem={({ item }) => (
        <StudySpotItem
          item={item}
          navigation={navigation}
          themeColors={themeColors}
          getLastUpdatedLabel={getLastUpdatedLabel}
          sortBy={sortBy}
          userLocation={userLocation}
          onWarningPress={(alerts) => {
            setCurrentAlerts(alerts);
            setShowAlertsModal(true);
          }}
          hideIfNotFavorite={hasFavoritesFilter} // Pass this to StudySpotItem
        />
      )}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
      {...props}
    />
  );
}
