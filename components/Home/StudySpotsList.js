import React from "react";
import { View, FlatList, Text, TouchableOpacity, Image } from "react-native";
import {
  Heart,
  Star,
  Warning,
  Lock,
  CaretDown,
  CaretUp,
  Rows,
  MapTrifold,
  List,
} from "phosphor-react-native";
import Filters from "./Filters";
import HomeLoadingScreen from "./HomeLoadingScreen"; // Import the loading screen

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
  showMapView,
  setShowMapView,
  filtersExpanded,
  setFiltersExpanded,
  hideHeader,
  ListHeaderComponent, // <-- add this prop
  sortBy, // <-- add
  setSortBy, // <-- add
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
    if (avg < 1.5) return "Light";
    return "Busy";
  }

  return (
    <FlatList
      // Remove ListHeaderComponent (header is now only in HomeScreen)
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 0,
        ...(contentContainerStyle || {}),
      }}
      data={filteredSpots}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeaderComponent}
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

        const isPrivateNook = !!item.privateNook;

        // Table availability for Odegaard
        const isOdegaard = (item.buildingName || item.name || "")
          .toLowerCase()
          .includes("odegaard");

        return (
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("SpotDetail", {
                spotId: item.id,
                view: showMapView ? "map" : "list",
              });
            }}
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
            {/* Badge Icon: Lock for private, Warning for alerts */}
            {isPrivateNook ? (
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  zIndex: 20,
                  backgroundColor: themeColors.white,
                  borderRadius: 20,
                  padding: 4,
                  borderWidth: 0.5,
                  borderColor: themeColors.purple,
                  shadowColor: themeColors.purple,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.18,
                  shadowRadius: 4,
                  elevation: 6,
                  width: 38,
                  height: 38,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                pointerEvents="none"
              >
                <Lock size={24} color={themeColors.purple} weight="fill" />
              </View>
            ) : (
              todaysAlerts.length > 0 && (
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
                        fontFamily: "CarosSoft",
                      }}
                    >
                      {todaysAlerts.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
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
                <Text
                  style={{ color: themeColors.black, fontFamily: "CarosSoft" }}
                >
                  No Image
                </Text>
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
                flexDirection: "row",
                alignItems: "center",
                fontFamily: "CarosSoft",
              }}
            >
              {item.name}
              {item.roomNumber && (
                <Text
                  style={{
                    fontSize: 18,
                    color: themeColors.black,
                    fontWeight: "bold",
                    fontFamily: "CarosSoft",
                  }}
                >
                  {" - Floor "}
                  {item.roomNumber}
                </Text>
              )}
            </Text>
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
                  fontFamily: "CarosSoft",
                }}
              >
                {item.huskyCardNeeded && "Husky Card Required"}
                {item.huskyCardNeeded && item.department && (
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontWeight: "normal",
                      fontFamily: "CarosSoft",
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
                      fontFamily: "CarosSoft",
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
                          fontFamily: "CarosSoft",
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
                    fontFamily: "CarosSoft",
                  }}
                >
                  No tags
                </Text>
              )}
            </View>
            {/* Ratings */}
            {!isPrivateNook && (
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
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {item.overallRatingsCount > 0
                      ? `${item.averageOverallRating.toFixed(1)} (${
                          item.overallRatingsCount
                        })`
                      : "No ratings"}
                  </Text>
                </View>
                {/* --- Ratings row: 3 columns for Odegaard, 2 centered columns otherwise --- */}
                {isOdegaard ? (
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
                          fontFamily: "CarosSoft",
                        }}
                      >
                        Noise Level
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          color: themeColors.purple,
                          fontFamily: "CarosSoft",
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
                          fontFamily: "CarosSoft",
                        }}
                      >
                        Crowd Level
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          color: themeColors.purple,
                          fontFamily: "CarosSoft",
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
                              fontFamily: "CarosSoft",
                            }}
                          >
                            Tables Open
                          </Text>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "bold",
                              color: themeColors.purple,
                              fontFamily: "CarosSoft",
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
                              fontFamily: "CarosSoft",
                            }}
                          >
                            {/* Empty label for alignment */}
                          </Text>
                          <Text
                            style={{
                              fontSize: 16,
                              color: "transparent",
                              fontFamily: "CarosSoft",
                            }}
                          >
                            -
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                ) : (
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
                          fontFamily: "CarosSoft",
                        }}
                      >
                        Noise Level
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          color: themeColors.purple,
                          fontFamily: "CarosSoft",
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
                          fontFamily: "CarosSoft",
                        }}
                      >
                        Crowd Level
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          color: themeColors.purple,
                          fontFamily: "CarosSoft",
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
                    fontFamily: "CarosSoft",
                  }}
                >
                  {getLastUpdatedLabel && item.ratings
                    ? getLastUpdatedLabel(item.ratings)
                    : ""}
                </Text>
              </>
            )}
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
