import React, { useState, useContext } from "react";
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
import { ArrowLeft, Check } from "phosphor-react-native";
import { ThemeContext } from "../App";
import { colors } from "../constants/colors";
import {
  collection,
  addDoc,
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
    name: "Paul G. Allen Center",
    latitude: 47.6532,
    longitude: -122.306,
  },
  {
    name: "Bill‑Melinda Gates Center",
    latitude: 47.6532,
    longitude: -122.3042,
  },
  { name: "Paccar Hall", latitude: 47.6591, longitude: -122.3087 },
  { name: "Health Sciences Building", latitude: 47.6499, longitude: -122.3077 },
  { name: "Population Health Building", latitude: 47.654483, longitude: -122.311726 },
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [customImage, setCustomImage] = useState(null);

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
    setIsFavorite(false);
    setCustomImage(null);
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
      const isDuplicate = existingSpots.some(
        (spot) =>
          spot.buildingName.toLowerCase() ===
            selectedBuilding.toLowerCase() &&
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
      const b = BUILDINGS.find(
        (b) => (b.name || b) === selectedBuilding || b === selectedBuilding
      );
      if (b && b.latitude && b.longitude) {
        coordinates = { latitude: b.latitude, longitude: b.longitude };
      }
      const spotDetails = {
        name: selectedBuilding,
        buildingName: selectedBuilding,
        roomNumber,
        huskyCardNeeded,
        department: huskyCardNeeded ? department : null,
        tags: selectedTags,
        createdAt: new Date().toISOString(),
        addedBy: user.uid,
        revealIdentity: showAddedBy,
        photoUrl: "",
        ...(coordinates ? { coordinates } : {}),
        privateNook: false,
        sharedWith: [],
      };
      const docRef = await addDoc(collection(db, "studySpots"), spotDetails);

      // --- Cloudinary upload for main spot image ---
      if (isAmaity && customImage) {
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
                shadowColor: themeColors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4
              }}
            >
              <ArrowLeft size={24} color={themeColors.purple} />
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
            Select Building:
          </Text>

          {/* Building/Floor */}
          <BuildingPicker
            isUWBuilding={true}
            selectedBuilding={selectedBuilding}
            setSelectedBuilding={setSelectedBuilding}
            customBuilding=""
            setCustomBuilding={() => {}}
            roomNumber={roomNumber}
            setRoomNumber={setRoomNumber}
            BUILDINGS={BUILDINGS}
            themeColors={themeColors}
          />

          {/* Image Picker */}
          <View style={{ marginTop: 12 }}>
            <ImagePickerButton
              onPickImage={handlePickCustomImage}
              onTakePhoto={handleTakePhoto}
              customImage={customImage}
              themeColors={themeColors}
            />
          </View>

          {/* Husky Card Needed */}
          {(
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
                    shadowColor: !huskyCardNeeded ? themeColors.purple : themeColors.black,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
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
                    shadowColor: huskyCardNeeded ? themeColors.purple : themeColors.black,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
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
          {huskyCardNeeded && (
            <TextInput
              placeholder="Department (if applicable)"
              placeholderTextColor={themeColors.darkGray}
              value={department}
              onChangeText={setDepartment}
              style={{
                shadowColor: themeColors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
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
                shadowColor: themeColors.black,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 24,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
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
                shadowColor: themeColors.black,
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
