import React from "react";
import { View, FlatList, Text, TouchableOpacity, Image } from "react-native";
import { Heart, Star, Warning } from "phosphor-react-native";
import Filters from "./Filters";

export default function StudySpotsList({
  filteredSpots,
  navigation,
  favorites,
  handleToggleFavorite,
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
}) {
  // Add helper functions:
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
    if (avg < 1.5) return "Busy";
    return "Full";
  }

  return (
    <FlatList
      ListHeaderComponent={
        <View style={{ paddingTop: 16 }}>
          <Filters
            filters={filters}
            setFilters={setFilters}
            themeColors={themeColors}
          />
        </View>
      }
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 0,
        ...(contentContainerStyle || {}),
      }}
      data={filteredSpots}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
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

        return (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("SpotDetail", { spotId: item.id })
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
          >
            {/* Warning Icon */}
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
                onPress={() => {
                  setCurrentAlerts(todaysAlerts);
                  setShowAlertsModal(true);
                }}
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
                    borderWidth: 1,
                    borderColor: themeColors.white,
                    zIndex: 21,
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.white,
                      fontSize: 11,
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    {todaysAlerts.length}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            {/* Image */}
            <View
              style={{
                width: "100%",
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
                weight={favorites.includes(item.id) ? "fill" : "regular"}
              />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.black,
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
                    style={{
                      color: themeColors.darkGray,
                      fontWeight: "normal",
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
                  }}
                >
                  No tags
                </Text>
              )}
            </View>
            {/* Ratings */}
            <>
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
                      star <= (item.averageOverallRating || 0)
                        ? "fill"
                        : "regular"
                    }
                    style={{ marginRight: 2 }}
                  />
                ))}
                <Text
                  style={{
                    marginLeft: 8,
                    color: themeColors.darkGray,
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
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 16, color: themeColors.darkGray }}>
                    Noise Level
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: themeColors.purple,
                    }}
                  >
                    {getNoiseLabel(item.ratings?.noise)}
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
                      color: themeColors.purple,
                    }}
                  >
                    {getCrowdLabel(item.ratings?.crowd)}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: themeColors.darkGray,
                  marginTop: 4,
                  textAlign: "right",
                }}
              >
                {getLastUpdatedLabel && item.ratings
                  ? getLastUpdatedLabel(item.ratings)
                  : ""}
              </Text>
            </>
          </TouchableOpacity>
        );
      }}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
    />
  );
}
