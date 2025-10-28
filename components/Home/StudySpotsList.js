import React from "react";
import { View, FlatList, Text, TouchableOpacity, Image, Animated } from "react-native";
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
  SpeakerHigh,
  SpeakerSlash,
  Users,
  UserMinus,
} from "phosphor-react-native";
import Filters from "./Filters";
import HomeLoadingScreen from "./HomeLoadingScreen"; // Import the loading screen
import useFavoriteStatus from "../../hooks/useFavoriteStatus";
import useSpotRatings from "../../hooks/useSpotRatings";
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
    const { ratings } = useSpotRatings(item.id, item.privateNook);
    

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
      if (avg < 0.5) return "Light";
      if (avg < 1.5) return "Moderate";
      return "Busy";
    }

    function getNoiseIcon(avg) {
      if (avg === "N/A" || avg === "No rating yet" || avg == null) return SpeakerSlash;
      if (typeof avg === "string") avg = parseFloat(avg);
      if (isNaN(avg)) return SpeakerSlash;
      if (avg < 0.5) return SpeakerSlash;
      if (avg < 1.5) return SpeakerHigh;
      return SpeakerHigh;
    }

    function getCrowdIcon(avg) {
      if (avg === "N/A" || avg === "No rating yet" || avg == null) return UserMinus;
      if (typeof avg === "string") avg = parseFloat(avg);
      if (isNaN(avg)) return UserMinus;
      if (avg < 0.5) return UserMinus;
      if (avg < 1.5) return Users;
      return Users;
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
          shadowColor: themeColors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 3,
          position: "relative"
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
              backgroundColor: themeColors.darkGray + "60",
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
            shadowColor: themeColors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
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
            fontSize: 20,
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
                fontSize: 20,
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
              color: themeColors.red,
              marginBottom: 8,
              marginTop: 2,
              fontWeight: "bold",
              fontFamily: FONTS.PRIMARY,
            }}
          >
            {item.huskyCardNeeded && "Husky Card Required"}
            {item.huskyCardNeeded && item.department && (
              <Text
                style={{
                  color: themeColors.darkGray,
                  fontWeight: "bold",
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
                  color: themeColors.red,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {item.department}
              </Text>
            )}
          </Text>
        )}
        {/* Ratings */}
        {!item.privateNook && (
          <>
            {/* --- Ratings row: 2 columns --- */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
                marginTop: 6,
              }}
            >
              {/* Noise Level */}
              <View style={{ flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
                {React.createElement(getNoiseIcon(ratings?.noise), {
                  size: 26,
                  color: themeColors.purple,
                  weight: "regular",
                  style: { marginRight: 8 }
                })}
                <Text
                  style={{
                    fontSize: 19,
                    fontWeight: "bold",
                    color: themeColors.purple,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {getNoiseLabel(ratings?.noise)}
                </Text>
              </View>
              {/* Crowd Level */}
              <View style={{ flex: 1, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
                {React.createElement(getCrowdIcon(ratings?.crowd), {
                  size: 26,
                  color: themeColors.purple,
                  weight: "regular",
                  style: { marginRight: 8 }
                })}
                <Text
                  style={{
                    fontSize: 19,
                    fontWeight: "bold",
                    color: themeColors.purple,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  {getCrowdLabel(ratings?.crowd)}
                </Text>
              </View>
            </View>
            {/* Last updated label */}
            {/* <Text
              style={{
                fontSize: 14,
                color: themeColors.darkGray,
                marginTop: 6,
                marginBottom: 2,
                textAlign: "right",
                fontFamily: FONTS.PRIMARY,
              }}
            >
              {getLastUpdatedLabel && ratings
                ? getLastUpdatedLabel(ratings)
                : ""}
            </Text> */}
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
        {/* {getLastUpdatedLabel && (
          <Text
            style={{
              fontSize: 13,
              color: themeColors.darkGray,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            {getLastUpdatedLabel(item)}
          </Text>
        )} */}
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
  hasFavoritesFilter = false,
  totalCount = null, // <-- add this prop
  ...props
}) {
  // Filter spots based on favorites if the favorites filter is active
  const finalFilteredSpots = React.useMemo(() => {
    if (!hasFavoritesFilter) {
      return filteredSpots;
    }

    // If favorites filter is active, sort alphabetically by name
    return [...filteredSpots].sort((a, b) =>
      (a.buildingName || a.name || "").localeCompare(
        b.buildingName || b.name || ""
      )
    );
  }, [filteredSpots, hasFavoritesFilter]);

  // --- Indicator for filtered count ---
  const filtersApplied = filters && filters.length > 0 && totalCount != null;
  const filteredCount = finalFilteredSpots.length;

  const FilterCountIndicator = () =>
    filtersApplied ? (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
          marginTop: 0,
        }}
      >
        <Text
          style={{
            color: themeColors.purple,
            fontWeight: "bold",
            fontSize: 14,
            fontFamily: FONTS.PRIMARY,
            backgroundColor: themeColors.lightGray,
            paddingHorizontal: 14,
            paddingBottom: 6,
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          Showing {filteredCount} out of {totalCount} nooks
        </Text>
      </View>
    ) : null;

  return (
    <FlatList
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 0,
        ...(contentContainerStyle || {}),
      }}
      data={finalFilteredSpots}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <>
          {ListHeaderComponent}
          <FilterCountIndicator />
        </>
      }
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
          hideIfNotFavorite={hasFavoritesFilter}
        />
      )}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
      {...props}
    />
  );
}
