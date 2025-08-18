import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Modal,
} from "react-native";
import { ArrowLeft, Check, MapPin } from "phosphor-react-native";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";
import {
  collection,
  addDoc,
  getDoc,
  doc,
  getDocs,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as FileSystem from "expo-file-system";

// Import extracted components
import TagSelector from "../components/AddSpot/TagSelector";
import BuildingPicker from "../components/AddSpot/BuildingPicker";
import ImagePickerButton from "../components/AddSpot/ImagePickerButton";
import FavoriteToggle from "../components/AddSpot/FavoriteToggle";
import MapLocationPicker from "../components/AddSpot/MapLocationPicker";
// --- Add import for ShareWithModal ---
import ShareWithModal from "../components/AddSpot/ShareWithModal";
import { FONTS } from "../constants/fonts";

const TAGS = [
  "Quiet",
  "Group Friendly",
  "WiFi",
  "Outlets",
  "Natural Light",
  "Food Nearby",
  "Open Space",
];

const BUILDINGS = [
  { name: "Suzzallo Library", latitude: 47.6557, longitude: -122.3084 },
  { name: "Allen Library", latitude: 47.6557, longitude: -122.3094 },
  { name: "Odegaard Library", latitude: 47.656667, longitude: -122.310278 },
  { name: "Mary Gates Hall", latitude: 47.6564, longitude: -122.307 },
  {
    name: "Husky Union Building (HUB)",
    latitude: 47.6553,
    longitude: -122.3057,
  },
  {
    name: "Paul G. Allen Center (CSE)",
    latitude: 47.6532,
    longitude: -122.306,
  },
  {
    name: "Bill‑Melinda Gates Center (CSE)",
    latitude: 47.6532,
    longitude: -122.3042,
  },
  { name: "Paccar Hall", latitude: 47.6591, longitude: -122.3087 },
  { name: "Denny Hall", latitude: 47.6577, longitude: -122.3122 },
  { name: "Bagley Hall", latitude: 47.6539, longitude: -122.3087 },
  { name: "Smith Hall", latitude: 47.6569, longitude: -122.3108 },
  { name: "Thomson Hall", latitude: 47.6567, longitude: -122.3118 },
  {
    name: "Physics‑Astronomy Building",
    latitude: 47.6532,
    longitude: -122.3042,
  },
  {
    name: "Mechanical Engineering Building",
    latitude: 47.6535,
    longitude: -122.3049,
  },
  {
    name: "Electrical Engineering Building",
    latitude: 47.6536,
    longitude: -122.3056,
  },
  { name: "Art Building", latitude: 47.6552, longitude: -122.3089 },
  { name: "Music Building", latitude: 47.6555, longitude: -122.3084 },
  { name: "William H. Gates Hall", latitude: 47.6582, longitude: -122.3126 },
  { name: "Savery Hall", latitude: 47.6562, longitude: -122.3102 },
  { name: "Sieg Hall", latitude: 47.6538, longitude: -122.3062 },
  { name: "Raitt Hall", latitude: 47.6563, longitude: -122.3112 },
  { name: "Roberts Hall", latitude: 47.6537, longitude: -122.3072 },
  { name: "Loew Hall", latitude: 47.6536, longitude: -122.3078 },
  { name: "More Hall", latitude: 47.6535, longitude: -122.3083 },
  { name: "Guggenheim Hall", latitude: 47.6534, longitude: -122.3088 },
  { name: "Benson Hall", latitude: 47.6533, longitude: -122.3093 },
  { name: "Anderson Hall", latitude: 47.6558, longitude: -122.3097 },
  { name: "Architecture Hall", latitude: 47.6556, longitude: -122.3092 },
  { name: "Communications Building", latitude: 47.656, longitude: -122.3076 },
  { name: "Clark Hall", latitude: 47.6559, longitude: -122.3081 },
  { name: "Parrington Hall", latitude: 47.6571, longitude: -122.3097 },
  { name: "Schmitz Hall", latitude: 47.6547, longitude: -122.3072 },
  { name: "South Campus Center", latitude: 47.6507, longitude: -122.3082 },
  { name: "Health Sciences Building", latitude: 47.6499, longitude: -122.3077 },
];

export default function AddSpotScreen({ navigation, route }) {
  const themeCtx = useContext(ThemeContext);
  const isDarkMode = themeCtx?.isDarkMode ?? false;
  const themeColors = themeCtx?.themeColors ?? colors;

  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [huskyCardNeeded, setHuskyCardNeeded] = useState(false);
  const [department, setDepartment] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [showAddedBy, setShowAddedBy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUWBuilding, setIsUWBuilding] = useState(true);
  const [customBuilding, setCustomBuilding] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [customImage, setCustomImage] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [customCoords, setCustomCoords] = useState(null);
  const [privateNook, setPrivateNook] = useState(false);
  // --- Add state for sharing ---
  const [sharedWith, setSharedWith] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(false); // <-- add loading state

  // Fetch following list for sharing
  useEffect(() => {
    const fetchFollowing = async () => {
      setFollowingLoading(true); // <-- set loading true
      const user = auth.currentUser;
      if (!user) {
        setFollowingList([]);
        setFollowingLoading(false);
        return;
      }
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const following = userDoc.data().following || [];
        // Fetch user info for display
        const users = [];
        for (let uid of following) {
          const uDoc = await getDoc(doc(db, "users", uid));
          if (uDoc.exists()) {
            users.push({
              uid,
              name:
                `${uDoc.data().firstName || ""} ${
                  uDoc.data().lastName || ""
                }`.trim() || uDoc.data().email,
              email: uDoc.data().email,
            });
          }
        }
        setFollowingList(users);
      } else {
        setFollowingList([]);
      }
      setFollowingLoading(false); // <-- set loading false
    };
    if (privateNook && !isUWBuilding) fetchFollowing();
  }, [privateNook, isUWBuilding]);

  const toggleTag = (tag) => {
    setSelectedTags((tags) =>
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    );
  };

  const resetForm = () => {
    setSelectedBuilding("");
    setRoomNumber("");
    setHuskyCardNeeded(false);
    setDepartment("");
    setSelectedTags([]);
    setShowAddedBy(false);
    setIsUWBuilding(true);
    setCustomBuilding("");
    setIsFavorite(false);
    setCustomImage(null);
    setCustomCoords(null);
    setPrivateNook(false);
    setSharedWith([]); // <-- reset
  };

  const isAmaity =
    auth.currentUser && auth.currentUser.email === "amaity@uw.edu";

  const handleTakePhoto = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPermission.status !== "granted") {
      alert("Camera permission is required to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [5, 2],
      quality: 0.9,
    });
    if (result.canceled || result.cancelled) return;
    const asset = result.assets ? result.assets[0] : result;
    setCustomImage({
      uri: asset.uri,
      name: asset.fileName || `custom_${Date.now()}.jpg`,
    });
  };

  const handlePickCustomImage = async () => {
    const mediaLibraryPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaLibraryPermission.status !== "granted") {
      alert("Media library permission is required to select a photo.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [5, 2],
    });
    if (!result.canceled && !result.cancelled) {
      const asset = result.assets ? result.assets[0] : result;
      setCustomImage({
        uri: asset.uri,
        name: asset.fileName || `custom_${Date.now()}.jpg`,
      });
    }
  };

  // Replace uploadImageToStorage with Cloudinary upload
  const uploadImageToCloudinary = async (imageObj) => {
    if (!imageObj?.uri) return "";
    const formData = new FormData();
    formData.append("file", {
      uri: imageObj.uri,
      type: "image/jpeg",
      name: imageObj.name || `spot_${Date.now()}.jpg`,
    });
    formData.append("upload_preset", "spotImages");
    formData.append("folder", "spotImages");
    const cloudinaryUrl =
      "https://api.cloudinary.com/v1_1/dxnd4aryf/image/upload";
    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (data.secure_url) {
      // Optimize URL: resize to 512x256, auto format, quality auto
      const parts = data.secure_url.split("/upload/");
      if (parts.length === 2) {
        return `${parts[0]}/upload/w_512,h_256,c_fill,f_auto,q_auto/${parts[1]}`;
      }
      return data.secure_url;
    }
    return "";
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        alert("You must be signed in to add a spot.");
        setIsLoading(false);
        return;
      }
      const querySnapshot = await getDocs(collection(db, "studySpots"));
      const existingSpots = querySnapshot.docs.map((doc) => doc.data());
      const buildingNameToCheck = isUWBuilding
        ? selectedBuilding
        : customBuilding;
      const isDuplicate = existingSpots.some(
        (spot) =>
          spot.buildingName.toLowerCase() ===
            buildingNameToCheck.toLowerCase() &&
          spot.roomNumber.toLowerCase() === roomNumber.toLowerCase()
      );
      if (isDuplicate) {
        alert("This building and room combination already exists.");
        setIsLoading(false);
        return;
      }
      let photoUrl = "";
      // --- Add coordinates for UW buildings ---
      let coordinates = undefined;
      if (isUWBuilding) {
        const b = BUILDINGS.find(
          (b) => (b.name || b) === selectedBuilding || b === selectedBuilding
        );
        if (b && b.latitude && b.longitude) {
          coordinates = { latitude: b.latitude, longitude: b.longitude };
        }
      }
      const spotDetails = {
        name: buildingNameToCheck,
        buildingName: buildingNameToCheck,
        roomNumber,
        huskyCardNeeded,
        department: huskyCardNeeded ? department : null,
        tags: selectedTags,
        createdAt: new Date().toISOString(),
        addedBy: user.uid,
        revealIdentity: showAddedBy,
        photoUrl: "",
        ...(isUWBuilding
          ? coordinates
            ? { coordinates }
            : {}
          : customCoords
          ? { coordinates: customCoords }
          : {}),
        privateNook: !isUWBuilding ? privateNook : false,
        sharedWith: !isUWBuilding && privateNook ? sharedWith : [], // <-- add this
      };
      const docRef = await addDoc(collection(db, "studySpots"), spotDetails);

      // --- Cloudinary upload for main spot image ---
      if (
        (!isUWBuilding && customImage) ||
        (isUWBuilding && isAmaity && customImage)
      ) {
        photoUrl = await uploadImageToCloudinary(customImage);
        await updateDoc(docRef, { photoUrl });
      }

      if (isFavorite && user) {
        // Add to favoritedBy subcollection
        await setDoc(
          doc(db, "studySpots", docRef.id, "favoritedBy", user.uid),
          {
            favoritedAt: new Date(),
            userId: user.uid,
          }
        );
      }
      navigation.navigate(
        "Home",
        route?.params?.view
          ? { view: route.params.view, creating: true }
          : { creating: true }
      );
      resetForm();
    } catch (error) {
      console.error("Error adding spot:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUWBuildingToggle = (isUW) => {
    setIsUWBuilding(isUW);
    setCustomImage(null);
  };

  // --- Show share modal after toggling private nook ---
  useEffect(() => {
    if (privateNook && !isUWBuilding) {
      setShowShareModal(true);
    } else {
      setShowShareModal(false);
      setSharedWith([]);
    }
  }, [privateNook, isUWBuilding]);

  return (
    <View
      style={{ flex: 1, backgroundColor: themeColors.white, paddingTop: 36 }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: themeColors.white,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{ flex: 1, padding: 16, backgroundColor: themeColors.white }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
              marginLeft: -8,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                // If we can go back, do so. Otherwise, navigate to Home
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("Home");
                }
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              }}
            >
              <ArrowLeft size={24} color={themeColors.purple} />
            </TouchableOpacity>
          </View>

          {/* UW Building Toggle */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => handleUWBuildingToggle(true)}
              style={{
                flex: 1,
                alignItems: "center",
                padding: 12,
                marginRight: 8,
                backgroundColor: isUWBuilding
                  ? themeColors.purple
                  : themeColors.white,
                borderRadius: 8,
                borderColor: themeColors.black,
                borderWidth: 0.5,
              }}
            >
              <Text
                style={{
                  color: isUWBuilding ? themeColors.white : themeColors.purple,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                UW Building
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleUWBuildingToggle(false)}
              style={{
                flex: 1,
                alignItems: "center",
                padding: 12,
                marginLeft: 8,
                backgroundColor: !isUWBuilding
                  ? themeColors.purple
                  : themeColors.white,
                borderRadius: 8,
                borderColor: themeColors.black,
                borderWidth: 0.5,
              }}
            >
              <Text
                style={{
                  color: !isUWBuilding ? themeColors.white : themeColors.purple,
                  fontWeight: "bold",
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Custom Location
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={{
              fontSize: 20,
              marginBottom: 8,
              color: themeColors.black,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            {isUWBuilding ? "Select Building:" : "Enter Location Name:"}
          </Text>

          {/* Building/Floor/Map Row */}
          {isUWBuilding ? (
            <BuildingPicker
              isUWBuilding={isUWBuilding}
              selectedBuilding={selectedBuilding}
              setSelectedBuilding={setSelectedBuilding}
              customBuilding={customBuilding}
              setCustomBuilding={setCustomBuilding}
              roomNumber={roomNumber}
              setRoomNumber={setRoomNumber}
              BUILDINGS={BUILDINGS}
              themeColors={themeColors}
            />
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <TextInput
                  placeholder="Location Name"
                  placeholderTextColor={themeColors.darkGray}
                  value={customBuilding}
                  onChangeText={setCustomBuilding}
                  style={{
                    flex: 1,
                    borderWidth: 0.5,
                    borderColor: themeColors.black,
                    borderRadius: 8,
                    padding: 12,
                    marginRight: 8,
                    backgroundColor: themeColors.white,
                    color: themeColors.purple,
                    fontFamily: FONTS.PRIMARY,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowMapPicker(true)}
                  style={{
                    backgroundColor: themeColors.purple,
                    borderRadius: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 44,
                    minHeight: 44,
                    flexDirection: "row",
                  }}
                  accessibilityLabel={
                    customCoords
                      ? "Change Location on Map"
                      : "Pick Location on Map"
                  }
                  accessible={true}
                >
                  <MapPin size={20} color={themeColors.white} />
                  <Text
                    style={{
                      color: themeColors.white,
                      marginLeft: 6,
                      fontSize: 13,
                      fontFamily: FONTS.PRIMARY,
                      fontWeight: "bold",
                    }}
                  >
                    Search
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                placeholder="Floor number (if applicable)"
                placeholderTextColor={themeColors.darkGray}
                value={roomNumber}
                onChangeText={setRoomNumber}
                style={{
                  // Make width match the name input above
                  borderWidth: 0.5,
                  borderColor: themeColors.black,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  backgroundColor: themeColors.white,
                  color: themeColors.purple,
                  // Match width to name input
                  width: "100%",
                  fontFamily: FONTS.PRIMARY,
                }}
              />
            </>
          )}

          {/* Image Picker */}
          <ImagePickerButton
            onPickImage={handlePickCustomImage}
            onTakePhoto={handleTakePhoto}
            customImage={customImage}
            themeColors={themeColors}
          />

          {/* Map Picker Modal */}
          <MapLocationPicker
            visible={showMapPicker}
            onClose={() => setShowMapPicker(false)}
            onPick={(coords) => {
              setCustomCoords(coords);
              // Autofill custom building name if available
              if (coords.name) {
                setCustomBuilding(coords.name);
              } else if (coords.display_name) {
                setCustomBuilding(coords.display_name.split(",")[0]);
              }
              setShowMapPicker(false);
            }}
            themeColors={themeColors}
            initialCoords={customCoords}
          />

          {/* Husky Card Needed */}
          {isUWBuilding && (
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 19,
                  marginBottom: 8,
                  color: themeColors.black,
                  fontFamily: FONTS.PRIMARY,
                }}
              >
                Husky Card Needed:
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <TouchableOpacity
                  onPress={() => setHuskyCardNeeded(false)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 8,
                    paddingHorizontal: 0,
                    marginRight: 4,
                    backgroundColor: !huskyCardNeeded
                      ? themeColors.purple
                      : themeColors.white,
                    borderRadius: 8,
                    borderColor: themeColors.black,
                    borderWidth: 0.5,
                  }}
                >
                  <Text
                    style={{
                      color: !huskyCardNeeded
                        ? themeColors.white
                        : themeColors.purple,
                      fontFamily: FONTS.PRIMARY,
                      fontSize: 15,
                    }}
                  >
                    No
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setHuskyCardNeeded(true)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 10,
                    paddingHorizontal: 0,
                    marginLeft: 4,
                    backgroundColor: huskyCardNeeded
                      ? themeColors.purple
                      : themeColors.white,
                    borderRadius: 8,
                    borderColor: themeColors.black,
                    borderWidth: 0.5,
                  }}
                >
                  <Text
                    style={{
                      color: huskyCardNeeded
                        ? themeColors.white
                        : themeColors.purple,
                      fontFamily: FONTS.PRIMARY,
                      fontSize: 15,
                    }}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {isUWBuilding && huskyCardNeeded && (
            <TextInput
              placeholder="Department (if applicable)"
              placeholderTextColor={themeColors.darkGray}
              value={department}
              onChangeText={setDepartment}
              style={{
                borderWidth: 0.5,
                borderColor: themeColors.black,
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                backgroundColor: themeColors.white,
                color: themeColors.purple,
                fontFamily: FONTS.PRIMARY,
              }}
            />
          )}

          {/* Tags */}
          <Text
            style={{
              fontSize: 20,
              marginBottom: 8,
              color: themeColors.black,
              fontFamily: FONTS.PRIMARY,
            }}
          >
            Tags:
          </Text>
          <TagSelector
            tags={TAGS}
            selectedTags={selectedTags}
            onToggle={toggleTag}
            themeColors={themeColors}
          />

          {/* Only show private toggle for custom locations */}
          {!isUWBuilding && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 36,
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                onPress={() => setPrivateNook((v) => !v)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 10,
                  backgroundColor: privateNook
                    ? themeColors.purple
                    : themeColors.white,
                  borderRadius: 8,
                  borderWidth: 0.5,
                  borderColor: themeColors.black,
                  marginRight: 8,
                }}
                accessibilityLabel="Toggle Private Nook"
                accessible={true}
              >
                <Text
                  style={{
                    color: privateNook ? themeColors.white : themeColors.purple,
                    fontWeight: "bold",
                    marginRight: 6,
                    fontFamily: FONTS.PRIMARY,
                  }}
                >
                  Private Nook
                </Text>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: privateNook
                      ? themeColors.green
                      : themeColors.gray,
                    borderWidth: 1,
                    borderColor: themeColors.black,
                  }}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* --- Share Modal --- */}
          {showShareModal && (
            <ShareWithModal
              visible={showShareModal}
              onClose={() => setShowShareModal(false)}
              sharedWith={sharedWith}
              setSharedWith={setSharedWith}
              themeColors={themeColors}
              followingList={followingList}
              loading={followingLoading} // <-- pass loading prop
            />
          )}

          {/* Buttons */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 16,
              marginBottom: 16,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TouchableOpacity
              onPress={resetForm}
              style={{
                flex: 0.25,
                backgroundColor: themeColors.white,
                borderColor: themeColors.purple,
                borderWidth: 1,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
                minWidth: 90,
              }}
              accessibilityLabel="Reset Form"
              accessible={true}
            >
              <Text
                style={{
                  color: themeColors.purple,
                  fontWeight: "bold",
                  fontSize: 16,
                  textAlign: "center",
                  fontFamily: FONTS.PRIMARY,
                  letterSpacing: 0.1,
                }}
              >
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={{
                flex: 0.25,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
                minWidth: 90,
              }}
              accessibilityLabel="Add Nook"
              accessible={true}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 16,
                  textAlign: "center",
                  fontFamily: FONTS.PRIMARY,
                  letterSpacing: 0.1,
                }}
              >
                Add Nook
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
