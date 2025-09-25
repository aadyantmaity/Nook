import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Platform,
  Modal,
  ScrollView,
  Linking,
  Image,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { auth } from "../../firebaseConfig";
import { Info, MapPinLine, User, LockKey } from "phosphor-react-native";
import CircleLoader from "../common/CircleLoader";
import { FONTS } from "../../constants/fonts";

// Helper: Haversine distance in meters
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

// Group spots within 30 meters
function clusterSpots(spots, threshold = 30) {
  const clusters = [];
  const used = new Set();
  for (let i = 0; i < spots.length; i++) {
    if (used.has(i)) continue;
    const cluster = [spots[i]];
    used.add(i);
    for (let j = i + 1; j < spots.length; j++) {
      if (used.has(j)) continue;
      const d = getDistance(
        spots[i].coordinates.latitude,
        spots[i].coordinates.longitude,
        spots[j].coordinates.latitude,
        spots[j].coordinates.longitude
      );
      if (d < threshold) {
        cluster.push(spots[j]);
        used.add(j);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

export default function StudySpotsMapView({
  spots,
  friendsCheckIns = [],
  showFriendsView = false,
  navigation,
  themeColors,
  containerStyle,
  isLoadingSpots = false,
  isLoadingFriends = false,
}) {
  const mapRef = useRef();
  const [mapType, setMapType] = useState("hybrid");
  const [selectedPin, setSelectedPin] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);

  // Calculate square size (full width minus 32px)
  const screenWidth = Dimensions.get("window").width;
  const mapSize = Math.floor(screenWidth - 32);

  // UW campus region (centered on Red Square)
  const UW_REGION = {
    latitude: 47.654548,
    longitude: -122.3085,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };

  // Filter spots with coordinates
  const spotsWithCoords = Array.isArray(spots)
    ? spots.filter(
        (s) =>
          s.coordinates &&
          typeof s.coordinates.latitude === "number" &&
          typeof s.coordinates.longitude === "number"
      )
    : [];

  // --- Nook summary stats ---
  // Exclude private nooks from total count unless accessible to current user
  const totalNooks = spotsWithCoords.filter((spot) => {
    // Include public nooks
    if (!spot.privateNook) return true;
    // Include private nooks only if user has access
    return (
      spot.addedBy === auth.currentUser?.uid ||
      (Array.isArray(spot.sharedWith) &&
        spot.sharedWith.includes(auth.currentUser?.uid))
    );
  }).length;

  // Count nooks with alerts today
  const today = new Date();
  function isSameDay(dateObj) {
    if (!dateObj) return false;
    const d = new Date(dateObj);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }
  const nooksWithAlertsToday = spotsWithCoords.filter((s) => {
    if (!Array.isArray(s.locationAlerts)) return false;
    return s.locationAlerts.some((a) => {
      const createdAt =
        typeof a === "string"
          ? null
          : a.createdAt?.toDate
          ? a.createdAt.toDate()
          : a.createdAt;
      return createdAt && isSameDay(createdAt);
    });
  }).length;

  // --- Group spots by building name ---
  const buildingGroups = {};
  spotsWithCoords.forEach((spot) => {
    const buildingKey = (spot.buildingName || spot.name || "Unknown").trim();
    if (!buildingGroups[buildingKey]) buildingGroups[buildingKey] = [];
    buildingGroups[buildingKey].push(spot);
  });

  // --- Compute representative pin for each building (average coordinates) ---
  const buildingPins = Object.entries(buildingGroups).map(
    ([buildingName, spots]) => {
      // Average coordinates for the building pin
      const lat =
        spots.reduce((sum, s) => sum + s.coordinates.latitude, 0) /
        spots.length;
      const lon =
        spots.reduce((sum, s) => sum + s.coordinates.longitude, 0) /
        spots.length;

      // Check if any spots in this building are private nooks accessible to current user
      const hasPrivateNook = spots.some(
        (s) =>
          s.privateNook &&
          (s.addedBy === auth.currentUser?.uid ||
            (Array.isArray(s.sharedWith) &&
              s.sharedWith.includes(auth.currentUser?.uid)))
      );

      return {
        buildingName,
        spots,
        latitude: lat,
        longitude: lon,
        hasPrivateNook,
      };
    }
  );

  // --- Modal state for showing floors/spots in a building ---
  const [buildingModal, setBuildingModal] = useState({
    visible: false,
    buildingName: "",
    spots: [],
  });

  // --- Helper to open building modal or single-spot modal ---
  const handlePinPress = (pin) => {
    if (pin.spots.length === 1) {
      setSelectedPin(pin);
    } else {
      setBuildingModal({
        visible: true,
        buildingName: pin.buildingName,
        spots: pin.spots,
      });
    }
  };

  // Helper to get all friends at a given spot
  function getFriendsAtSpot(spotId) {
    return friendsCheckIns.filter((f) => f.spotId === spotId);
  }

  const friendsAtSpot = selectedFriend
    ? friendsCheckIns.filter((f) => f.spotId === selectedFriend.spotId)
    : [];

  return (
    <>
      <View
        style={[
          {
            alignSelf: "center",
            width: mapSize,
            height: mapSize + 45,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: themeColors.gray,
            marginTop: 0,
          },
          containerStyle,
        ]}
      >
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={UW_REGION}
          showsUserLocation={true}
          {...(Platform.OS === "android" ? { provider: PROVIDER_GOOGLE } : {})}
          mapType={mapType}
          showsCompass={true}
          rotateEnabled={true}
        >
          {/* --- Render markers based on view mode --- */}
          {showFriendsView
            ? // Friends view - show friend check ins
              friendsCheckIns
                .filter(
                  (friend) =>
                    friend.coordinates &&
                    typeof friend.coordinates.latitude === "number" &&
                    typeof friend.coordinates.longitude === "number"
                )
                .map((friend) => (
                  <Marker
                    key={`friend-${friend.friendId}`}
                    coordinate={{
                      latitude: friend.coordinates.latitude,
                      longitude: friend.coordinates.longitude,
                    }}
                    pinColor={themeColors.green}
                    onPress={() => setSelectedFriend({ spotId: friend.spotId })}
                  ></Marker>
                ))
            : // Nooks view - show study spots
              buildingPins.map((pin) => (
                <Marker
                  key={pin.buildingName}
                  coordinate={{
                    latitude: pin.latitude,
                    longitude: pin.longitude,
                  }}
                  pinColor={
                    pin.hasPrivateNook ? themeColors.purple : themeColors.orange
                  }
                  onPress={() => handlePinPress(pin)}
                />
              ))}
        </MapView>

        {showFriendsView
          ? friendsCheckIns.length === 0 &&
            !isLoadingFriends && (
              <View
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  alignItems: "center",
                }}
              ></View>
            )
          : spotsWithCoords.length === 0 &&
            !isLoadingSpots && (
              <View
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: themeColors.darkGray }}>
                  No Nooks with map locations yet.
                </Text>
              </View>
            )}

        {/* Loading overlay */}
        {(showFriendsView ? isLoadingFriends : isLoadingSpots) && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255, 255, 255, 1)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircleLoader
              themeColors={themeColors}
              text={showFriendsView ? "Loading friends..." : "Loading spots..."}
            />
          </View>
        )}
      </View>
      {/* --- Summary panel below the map --- */}
      <View
        style={{
          marginBottom: 8,
          alignSelf: "center",
          width: mapSize,
          backgroundColor: themeColors.white,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        {showFriendsView ? (
          // Friends view summary
          (<>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontSize: 16,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {friendsCheckIns.length}
              </Text>
              <Text
                style={{
                  color: themeColors.darkGray,
                  fontSize: 13,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Active Friends
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontSize: 16,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {new Set(friendsCheckIns.map((f) => f.spotId)).size}
              </Text>
              <Text
                style={{
                  color: themeColors.darkGray,
                  fontSize: 13,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Nooks
              </Text>
            </View>
          </>)
        ) : (
          // Nooks view summary
          (<>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontSize: 16,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {totalNooks}
              </Text>
              <Text
                style={{
                  color: themeColors.darkGray,
                  fontSize: 13,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Nooks
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontSize: 16,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {nooksWithAlertsToday}
              </Text>
              <Text
                style={{
                  color: themeColors.darkGray,
                  fontSize: 13,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Alerts Today
              </Text>
            </View>
          </>)
        )}
      </View>
      {/* --- Building Modal: List all floors/spots for selected building --- */}
      <Modal
        visible={buildingModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setBuildingModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",

            shadowOffset: {
              width: 0,
              height: 2
            },

            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4
          }}
          activeOpacity={1}
          onPressOut={() =>
            setBuildingModal((prev) => ({ ...prev, visible: false }))
          }
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              padding: 24,
              width: "85%",
              alignItems: "center",
              maxHeight: "70%",
              borderWidth: 1,
              borderColor: themeColors.black,
              shadowColor: themeColors.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
            onStartShouldSetResponder={() => true}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 10,
                textAlign: "center",
                fontFamily: FONTS.PRIMARY,
              }}
            >
              {buildingModal.buildingName}
            </Text>
            <ScrollView style={{ width: "100%" }}>
              {buildingModal.spots
                .sort((a, b) =>
                  String(a.roomNumber || "").localeCompare(
                    String(b.roomNumber || "")
                  )
                )
                .map((spot) => (
                  <View
                    key={spot.id}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: themeColors.gray,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    {/* Floor/name text with key icon for private nooks */}
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: themeColors.purple,
                          fontWeight: "bold",
                          fontFamily: FONTS.PRIMARY,
                          fontSize: 16,
                        }}
                      >
                        {spot.roomNumber
                          ? `Floor ${spot.roomNumber}`
                          : spot.name || "Nook"}
                      </Text>
                      {spot.privateNook && (
                        <LockKey
                          size={16}
                          color={themeColors.purple}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    </View>
                    {/* Button group to the right, horizontally aligned with labels below icons */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginLeft: 8,
                        gap: 18,
                      }}
                    >
                      <View style={{ alignItems: "center" }}>
                        <TouchableOpacity
                          style={{
                            backgroundColor: themeColors.purple,
                            borderRadius: 50,
                            padding: 10,
                            alignItems: "center",
                            justifyContent: "center",
                            shadowColor: "#000",

                            shadowOffset: {
                              width: 0,
                              height: 2
                            },

                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 4
                          }}
                          onPress={() => {
                            setBuildingModal((prev) => ({
                              ...prev,
                              visible: false,
                            }));
                            navigation.navigate("SpotDetail", {
                              spotId: spot.id,
                              view: "map",
                            });
                          }}
                          accessibilityLabel="View Details"
                        >
                          <Info size={22} color={themeColors.white} />
                        </TouchableOpacity>
                        <Text
                          style={{
                            color: themeColors.purple,
                            fontSize: 11,
                            fontFamily: FONTS.PRIMARY,
                            marginTop: 2,
                          }}
                        >
                          Details
                        </Text>
                      </View>
                      <View style={{ alignItems: "center" }}>
                        <TouchableOpacity
                          style={{
                            backgroundColor: themeColors.orange,
                            borderRadius: 50,
                            padding: 10,
                            alignItems: "center",
                            justifyContent: "center",
                            shadowColor: "#000",

                            shadowOffset: {
                              width: 0,
                              height: 2
                            },

                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 4
                          }}
                          onPress={() => {
                            setBuildingModal((prev) => ({
                              ...prev,
                              visible: false,
                            }));
                            const coords = spot.coordinates;
                            const url = Platform.select({
                              ios: `http://maps.apple.com/?daddr=${coords.latitude},${coords.longitude}`,
                              android: `http://maps.google.com/?daddr=${coords.latitude},${coords.longitude}`,
                            });
                            Linking.openURL(url);
                          }}
                          accessibilityLabel="Get Directions"
                        >
                          <MapPinLine size={22} color={themeColors.white} />
                        </TouchableOpacity>
                        <Text
                          style={{
                            color: themeColors.orange,
                            fontSize: 11,
                            fontFamily: FONTS.PRIMARY,
                            marginTop: 2,
                          }}
                        >
                          Directions
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() =>
                setBuildingModal((prev) => ({ ...prev, visible: false }))
              }
              style={{
                marginTop: 14,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
                alignItems: "center",
                shadowColor: "#000",

                shadowOffset: {
                  width: 0,
                  height: 2
                },

                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 16,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* --- Single Pin Modal (for single spot in a building) --- */}
      <Modal
        visible={!!selectedPin}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPin(null)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",

            shadowOffset: {
              width: 0,
              height: 2
            },

            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4
          }}
          activeOpacity={1}
          onPressOut={() => setSelectedPin(null)}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              padding: 24,
              width: "85%",
              alignItems: "center",
              borderWidth: 1,
              borderColor: themeColors.black,
              shadowColor: themeColors.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: themeColors.purple,
                  textAlign: "center",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                {selectedPin?.buildingName}
              </Text>
              {selectedPin?.spots[0]?.privateNook && (
                <LockKey
                  size={18}
                  color={themeColors.purple}
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 70, marginVertical: 10 }}>
              <View style={{ alignItems: "center" }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: themeColors.purple,
                    borderRadius: 50,
                    padding: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",

                    shadowOffset: {
                      width: 0,
                      height: 2
                    },

                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4
                  }}
                  onPress={() => {
                    setSelectedPin(null);
                    setBuildingModal((prev) => ({ ...prev, visible: false }));
                    setTimeout(() => {
                      navigation.navigate("SpotDetail", {
                        spotId: selectedPin.spots[0].id,
                        view: "map",
                      });
                    }, 250);
                  }}
                  accessibilityLabel="View Details"
                >
                  <Info size={26} color={themeColors.white} />
                </TouchableOpacity>
                <Text
                  style={{
                    color: themeColors.purple,
                    fontSize: 12,
                    fontFamily: FONTS.PRIMARY,
                    marginTop: 2,
                  }}
                >
                  Details
                </Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: themeColors.orange,
                    borderRadius: 50,
                    padding: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",

                    shadowOffset: {
                      width: 0,
                      height: 2
                    },

                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4
                  }}
                  onPress={() => {
                    setSelectedPin(null);
                    setBuildingModal((prev) => ({ ...prev, visible: false }));
                    const coords = selectedPin.spots[0].coordinates;
                    const url = Platform.select({
                      ios: `http://maps.apple.com/?daddr=${coords.latitude},${coords.longitude}`,
                      android: `http://maps.google.com/?daddr=${coords.latitude},${coords.longitude}`,
                    });
                    Linking.openURL(url);
                  }}
                  accessibilityLabel="Get Directions"
                >
                  <MapPinLine size={26} color={themeColors.white} />
                </TouchableOpacity>
                <Text
                  style={{
                    color: themeColors.orange,
                    fontSize: 12,
                    fontFamily: FONTS.PRIMARY,
                    marginTop: 2,
                  }}
                >
                  Directions
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSelectedPin(null);
              }}
              style={{
                marginTop: 14,
                backgroundColor: themeColors.darkGray,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
                alignItems: "center",
                shadowColor: "#000",

                shadowOffset: {
                  width: 0,
                  height: 2
                },

                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 16,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* --- Friend Modal: Show friend info and options --- */}
      <Modal
        visible={!!selectedFriend}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedFriend(null)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",

            shadowOffset: {
              width: 0,
              height: 2
            },

            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4
          }}
          activeOpacity={1}
          onPressOut={() => setSelectedFriend(null)}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              padding: 24,
              width: "90%",
              alignItems: "center",
              borderWidth: 1,
              borderColor: themeColors.black,
              shadowColor: themeColors.black,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
              maxHeight: 420,
            }}
            onStartShouldSetResponder={() => true}
          >
            {/* Top row: spot name (left), details button (right) */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                width: "100%",
                marginBottom: 12,
                // Remove justifyContent: "space-between"
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: themeColors.purple,
                  textAlign: "left",
                  fontFamily: FONTS.PRIMARY,
                  // Remove flex: 1 to allow button to be right next to name
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {friendsAtSpot[0]?.spotName || "Location"}
              </Text>
              <View style={{ alignItems: "center", marginLeft: 4 }}>
                <TouchableOpacity
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",

                    shadowOffset: {
                      width: 0,
                      height: 2
                    },

                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4
                  }}
                  onPress={() => {
                    setSelectedFriend(null);
                    setTimeout(() => {
                      navigation.navigate("SpotDetail", {
                        spotId: selectedFriend?.spotId,
                        view: "map",
                      });
                    }, 250);
                  }}
                  accessibilityLabel="View Spot Details"
                >
                  <Info size={22} color={themeColors.purple} />
                </TouchableOpacity>
              </View>
            </View>
            {friendsAtSpot.length > 3 ? (
              <ScrollView
                style={{ width: "100%", maxHeight: 260 }}
                showsVerticalScrollIndicator={false}
              >
                {friendsAtSpot.map((friend) => (
                  <TouchableOpacity
                    key={friend.friendId}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 0,
                      backgroundColor: themeColors.lightGray,
                      borderRadius: 12,
                      padding: 10,
                      shadowColor: "#000",

                      shadowOffset: {
                        width: 0,
                        height: 2
                      },

                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 4
                    }}
                    onPress={() => {
                      setSelectedFriend(null);
                      setTimeout(() => {
                        navigation.navigate("Profile", {
                          uid: friend.friendId,
                          view: "map",
                        });
                      }, 250);
                    }}
                    accessibilityLabel={`View ${friend.friendName}'s Profile`}
                  >
                    {friend.profilePic ? (
                      <Image
                        source={{ uri: friend.profilePic }}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          marginRight: 20,
                          borderWidth: 1,
                          borderColor: themeColors.purple,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: themeColors.green,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 20,
                          borderWidth: 1,
                          borderColor: themeColors.purple,
                        }}
                      >
                        <User size={28} color={themeColors.white} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          color: themeColors.black,
                          fontFamily: FONTS.PRIMARY,
                        }}
                      >
                        {friend.friendName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: themeColors.darkGray,
                          fontFamily: FONTS.PRIMARY,
                          marginTop: 2,
                        }}
                      >
                        Checked in{" "}
                        {Math.floor(
                          (Date.now() - (friend.checkedInAt || 0)) / 60000
                        )}
                        m ago
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={{ width: "100%" }}>
                {friendsAtSpot.map((friend) => (
                  <TouchableOpacity
                    key={friend.friendId}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 0,
                      backgroundColor: themeColors.lightGray,
                      borderRadius: 12,
                      padding: 10,
                      shadowColor: "#000",

                      shadowOffset: {
                        width: 0,
                        height: 2
                      },

                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 4
                    }}
                    onPress={() => {
                      setSelectedFriend(null);
                      setTimeout(() => {
                        navigation.navigate("Profile", {
                          uid: friend.friendId,
                          view: "map",
                        });
                      }, 250);
                    }}
                    accessibilityLabel={`View ${friend.friendName}'s Profile`}
                  >
                    {friend.profilePic ? (
                      <Image
                        source={{ uri: friend.profilePic }}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          marginRight: 20,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: themeColors.green,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 20,
                        }}
                      >
                        <User size={28} color={themeColors.white} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          color: themeColors.black,
                          fontFamily: FONTS.PRIMARY,
                        }}
                      >
                        {friend.friendName}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          color: themeColors.darkGray,
                          fontFamily: FONTS.PRIMARY,
                          marginTop: 2,
                        }}
                      >
                        Checked in{" "}
                        {Math.floor(
                          (Date.now() - (friend.checkedInAt || 0)) / 60000
                        )}
                        m ago
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setSelectedFriend(null);
              }}
              style={{
                marginTop: 10,
                backgroundColor: themeColors.darkGray,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
                alignItems: "center",
                shadowColor: "#000",

                shadowOffset: {
                  width: 0,
                  height: 2
                },

                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 16,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
