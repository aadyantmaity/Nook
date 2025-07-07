import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from "react-native-maps";
import { auth, db } from "../../firebaseConfig";
import * as Location from "expo-location";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
// Remove MaterialCommunityIcons import and use Phosphor instead:
import { PencilSimple, Info, MapPinLine } from "phosphor-react-native";

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
  navigation,
  themeColors,
  containerStyle,
}) {
  const mapRef = useRef();
  const [region, setRegion] = useState(null);
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);
  const [userHasPickedRegion, setUserHasPickedRegion] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapType, setMapType] = useState("satellite");
  const [mapTypeLoading, setMapTypeLoading] = useState(false);

  // --- NEW: Temporary state for modal edits ---
  const [modalRegion, setModalRegion] = useState(null);
  const [modalMapType, setModalMapType] = useState(mapType);

  // Add this state for the selected spot/building
  const [selectedPin, setSelectedPin] = useState(null);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

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

  // --- Load persisted region and mapType from Firestore on mount ---
  useEffect(() => {
    let unsub = false;
    async function loadRegion() {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const mapRegion = userDoc.exists() && userDoc.data().mapRegion;
        const userMapType = userDoc.exists() && userDoc.data().mapType;
        if (mapRegion && !unsub) {
          setRegion(mapRegion);
        }
        if (userMapType && !unsub) {
          setMapType(userMapType);
        }
      } catch {}
    }
    loadRegion();
    return () => {
      unsub = true;
    };
  }, []);

  // --- Sync modal state with main state when modal opens ---
  useEffect(() => {
    if (regionPickerVisible) {
      setModalRegion(region || UW_REGION);
      setModalMapType(mapType);
    }
    // eslint-disable-next-line
  }, [regionPickerVisible]);

  // --- Persist region and mapType to Firestore whenever they change ---
  useEffect(() => {
    if (!auth.currentUser || !region) return;
    const saveRegion = async () => {
      try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await setDoc(userRef, { mapRegion: region, mapType }, { merge: true });
      } catch {}
    };
    saveRegion();
  }, [region, mapType]);

  // --- Map type options and preview images ---
  const MAP_TYPE_OPTIONS = [
    {
      key: "standard",
      label: "Regular",
    },
    {
      key: "hybrid",
      label: "Satellite",
    },
  ];

  // Filter spots with coordinates
  const spotsWithCoords = Array.isArray(spots)
    ? spots.filter(
        (s) =>
          s.coordinates &&
          typeof s.coordinates.latitude === "number" &&
          typeof s.coordinates.longitude === "number"
      )
    : [];

  // --- Default region logic: only set to UW if not set and not picked ---
  useEffect(() => {
    if (!region && !userHasPickedRegion) {
      setRegion(UW_REGION);
    }
    // eslint-disable-next-line
  }, []);

  // --- Favorite spot IDs ---
  const favoriteIds = Array.isArray(spots)
    ? spots.filter((s) => s.isFavorite).map((s) => s.id)
    : [];

  // --- Nook summary stats ---
  const totalNooks = spotsWithCoords.length;
  // Only count private nooks owned by the current user or shared with them
  const privateNooks = spotsWithCoords.filter(
    (s) =>
      s.privateNook &&
      (s.addedBy === auth.currentUser?.uid ||
        (Array.isArray(s.sharedWith) &&
          s.sharedWith.includes(auth.currentUser?.uid)))
  ).length;
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

  // Helper to zoom to cluster
  const zoomToCluster = (cluster) => {
    if (!mapRef.current || cluster.length === 0) return;
    if (cluster.length === 1) return;
    const lats = cluster.map((s) => s.coordinates.latitude);
    const lons = cluster.map((s) => s.coordinates.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    mapRef.current.animateToRegion({
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(0.002, (maxLat - minLat) * 2.5),
      longitudeDelta: Math.max(0.002, (maxLon - minLon) * 2.5),
    });
  };

  // --- Helper to get user's current location and set modalRegion ---
  const goToUserLocation = async () => {
    setGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGettingLocation(false);
        alert("Permission to access location was denied.");
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      const userRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setModalRegion(userRegion);
      setUserHasPickedRegion(true);
      // Don't animate map here, only after submit
      setRegionPickerVisible(true); // keep modal open
    } catch (e) {
      alert("Could not get your location.");
    }
    setGettingLocation(false);
  };

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
      return {
        buildingName,
        spots,
        latitude: lat,
        longitude: lon,
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

  return (
    <>
      {/* Region Picker Modal */}
      <Modal
        visible={regionPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRegionPickerVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.25)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPressOut={() => setRegionPickerVisible(false)}
        >
          <View
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 16,
              paddingVertical: 28,
              paddingHorizontal: 28,
              width: 340,
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
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 24,
                marginBottom: 16,
                color: themeColors.purple,
                fontFamily: "CarosSoft",
                letterSpacing: 0.2,
              }}
            >
              Edit Map
            </Text>
            {/* --- Map Type Picker --- */}
            <Text
              style={{
                color: themeColors.black,
                fontWeight: "bold",
                fontSize: 15,
                marginBottom: 8,
                fontFamily: "CarosSoft",
                alignSelf: "flex-start",
                marginLeft: 2,
                marginTop: 12,
              }}
            >
              Map View Style
            </Text>
            <View
              style={{
                flexDirection: "row",
                marginBottom: 18,
                alignSelf: "stretch",
                justifyContent: "space-between",
                borderRadius: 8,
                padding: 6,
                gap: 8,
              }}
            >
              {MAP_TYPE_OPTIONS.map((opt, idx) => (
                <View key={opt.key} style={{ flex: 1, marginHorizontal: 2 }}>
                  <TouchableOpacity
                    onPress={() => setModalMapType(opt.key)}
                    style={{
                      alignItems: "center",
                      paddingVertical: 10,
                      backgroundColor:
                        modalMapType === opt.key
                          ? themeColors.purple
                          : themeColors.white,
                      borderRadius: 6,
                    }}
                    accessibilityLabel={`Select ${opt.label} map type`}
                  >
                    <Text
                      style={{
                        color:
                          modalMapType === opt.key
                            ? themeColors.white
                            : themeColors.purple,
                        fontWeight: "bold",
                        fontSize: 13,
                        fontFamily: "CarosSoft",
                        letterSpacing: 0.1,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            {/* --- End Map Type Picker --- */}
            <Text
              style={{
                color: themeColors.black,
                fontWeight: "bold",
                fontSize: 15,
                marginBottom: 8,
                fontFamily: "CarosSoft",
                alignSelf: "flex-start",
                marginLeft: 2,
                marginTop: 12,
              }}
            >
              Map Region
            </Text>
            <View
              style={{
                flexDirection: "row",
                marginBottom: 16,
                alignSelf: "stretch",
                justifyContent: "space-between",
                borderRadius: 8,
                padding: 6,
                gap: 8,
              }}
            >
              <View style={{ flex: 1, marginHorizontal: 2 }}>
                <TouchableOpacity
                  onPress={() => {
                    setModalRegion(UW_REGION);
                    setUserHasPickedRegion(true);
                  }}
                  style={{
                    alignItems: "center",
                    paddingVertical: 10,
                    backgroundColor:
                      modalRegion &&
                      Math.abs(modalRegion.latitude - UW_REGION.latitude) <
                        0.0001 &&
                      Math.abs(modalRegion.longitude - UW_REGION.longitude) <
                        0.0001
                        ? themeColors.purple
                        : themeColors.white,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      color:
                        modalRegion &&
                        Math.abs(modalRegion.latitude - UW_REGION.latitude) <
                          0.0001 &&
                        Math.abs(modalRegion.longitude - UW_REGION.longitude) <
                          0.0001
                          ? themeColors.white
                          : themeColors.purple,
                      fontWeight: "bold",
                      fontFamily: "CarosSoft",
                      fontSize: 13,
                    }}
                  >
                    UW Campus
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1, marginHorizontal: 2 }}>
                <TouchableOpacity
                  onPress={goToUserLocation}
                  disabled={gettingLocation}
                  style={{
                    alignItems: "center",
                    paddingVertical: 10,
                    backgroundColor:
                      modalRegion &&
                      modalRegion.latitude &&
                      modalRegion.longitude &&
                      (Math.abs(modalRegion.latitude - UW_REGION.latitude) >=
                        0.0001 ||
                        Math.abs(modalRegion.longitude - UW_REGION.longitude) >=
                          0.0001)
                        ? themeColors.purple
                        : themeColors.white,
                    borderRadius: 6,
                    opacity: gettingLocation ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color:
                        modalRegion &&
                        modalRegion.latitude &&
                        modalRegion.longitude &&
                        (Math.abs(modalRegion.latitude - UW_REGION.latitude) >=
                          0.0001 ||
                          Math.abs(
                            modalRegion.longitude - UW_REGION.longitude
                          ) >= 0.0001)
                          ? themeColors.white
                          : themeColors.purple,
                      fontWeight: "bold",
                      fontFamily: "CarosSoft",
                      fontSize: 13,
                    }}
                  >
                    Your Location
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* --- End Map Region Picker --- */}
            <TouchableOpacity
              style={{
                marginTop: 16,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
                alignItems: "center",
                width: "100%",
              }}
              activeOpacity={0.8}
              onPress={() => {
                // Only commit changes on submit
                setRegion(modalRegion);
                setMapType(modalMapType);
                setRegionPickerVisible(false);
                if (mapRef.current && modalRegion) {
                  mapRef.current.animateToRegion(modalRegion);
                }
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontFamily: "CarosSoft",
                  fontSize: 16,
                  fontWeight: "bold",
                  letterSpacing: 0.1,
                }}
              >
                Submit
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <View
        style={[
          {
            alignSelf: "center",
            width: mapSize,
            height: mapSize + 90,
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: themeColors.gray,
          },
          containerStyle,
        ]}
      >
        {/* Map Region Button overlayed in top right */}
        <View
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 10,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: themeColors.purple,
              padding: 8,
              borderRadius: 8,
              alignItems: "center",
              flexDirection: "row",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.12,
              shadowRadius: 2,
              elevation: 2,
            }}
            onPress={() => setRegionPickerVisible(true)}
          >
            <PencilSimple size={18} color={themeColors.white} weight="bold" />
          </TouchableOpacity>
        </View>
        <MapView
          key={mapRefreshKey}
          ref={mapRef}
          style={{ flex: 1 }}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={true}
          {...(Platform.OS === "android" ? { provider: PROVIDER_GOOGLE } : {})}
          mapType={mapType}
          showsCompass={true}
          rotateEnabled={true}
        >
          {/* --- Render one marker per building --- */}
          {buildingPins.map((pin) => (
            <Marker
              key={pin.buildingName}
              coordinate={{
                latitude: pin.latitude,
                longitude: pin.longitude,
              }}
              pinColor={themeColors.orange}
              onPress={() => handlePinPress(pin)}
            />
          ))}
        </MapView>
        {spotsWithCoords.length === 0 && (
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
        {/* Legend removed */}
      </View>
      {/* --- Nook summary panel below the map --- */}
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
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text
            style={{
              color: themeColors.purple,
              fontWeight: "bold",
              fontSize: 16,
              fontFamily: "CarosSoft",
            }}
          >
            {totalNooks}
          </Text>
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 13,
              fontFamily: "CarosSoft",
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
              fontFamily: "CarosSoft",
            }}
          >
            {privateNooks}
          </Text>
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 13,
              fontFamily: "CarosSoft",
            }}
          >
            Private
          </Text>
        </View>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text
            style={{
              color: themeColors.purple,
              fontWeight: "bold",
              fontSize: 16,
              fontFamily: "CarosSoft",
            }}
          >
            {nooksWithAlertsToday}
          </Text>
          <Text
            style={{
              color: themeColors.darkGray,
              fontSize: 13,
              fontFamily: "CarosSoft",
            }}
          >
            Alerts Today
          </Text>
        </View>
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
                fontFamily: "CarosSoft",
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
                    {/* Floor/name text and private label */}
                    <View style={{ flex: 1, flexDirection: "column" }}>
                      <Text
                        style={{
                          color: themeColors.purple,
                          fontWeight: "bold",
                          fontFamily: "CarosSoft",
                          fontSize: 16,
                        }}
                      >
                        {spot.roomNumber
                          ? `Floor ${spot.roomNumber}`
                          : spot.name || "Nook"}
                      </Text>
                      <Text
                        style={{
                          color: themeColors.darkGray,
                          fontSize: 13,
                          fontFamily: "CarosSoft",
                        }}
                      >
                        {spot.privateNook ? "Private" : ""}
                      </Text>
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
                          <Info
                            size={22}
                            color={themeColors.white}
                            weight="bold"
                          />
                        </TouchableOpacity>
                        <Text
                          style={{
                            color: themeColors.purple,
                            fontSize: 11,
                            fontFamily: "CarosSoft",
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
                          <MapPinLine
                            size={22}
                            color={themeColors.white}
                            weight="bold"
                          />
                        </TouchableOpacity>
                        <Text
                          style={{
                            color: themeColors.orange,
                            fontSize: 11,
                            fontFamily: "CarosSoft",
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
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 16,
                  fontFamily: "CarosSoft",
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
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: themeColors.purple,
                marginBottom: 10,
                textAlign: "center",
                fontFamily: "CarosSoft",
              }}
            >
              {selectedPin?.buildingName}
            </Text>
            <View style={{ flexDirection: "row", gap: 70, marginVertical: 10 }}>
              <View style={{ alignItems: "center" }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: themeColors.purple,
                    borderRadius: 50,
                    padding: 14,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => {
                    setSelectedPin(null);
                    setBuildingModal((prev) => ({ ...prev, visible: false }));
                    setMapRefreshKey((k) => k + 1);
                    setTimeout(() => {
                      navigation.navigate("SpotDetail", {
                        spotId: selectedPin.spots[0].id,
                        view: "map",
                      });
                    }, 250);
                  }}
                  accessibilityLabel="View Details"
                >
                  <Info size={26} color={themeColors.white} weight="bold" />
                </TouchableOpacity>
                <Text
                  style={{
                    color: themeColors.purple,
                    fontSize: 12,
                    fontFamily: "CarosSoft",
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
                  <MapPinLine
                    size={26}
                    color={themeColors.white}
                    weight="bold"
                  />
                </TouchableOpacity>
                <Text
                  style={{
                    color: themeColors.orange,
                    fontSize: 12,
                    fontFamily: "CarosSoft",
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
                setMapRefreshKey((k) => k + 1);
              }}
              style={{
                marginTop: 14,
                backgroundColor: themeColors.darkGray,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 16,
                  fontFamily: "CarosSoft",
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
