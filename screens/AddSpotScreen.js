import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  Image,
  Switch, // <-- Add Switch for toggling private nook
} from "react-native";
import { Picker } from "@react-native-picker/picker"; // Import Picker for dropdown
import { ArrowLeft, Check, Heart } from "phosphor-react-native"; // Add Heart icon
import { ThemeContext } from "../App";
import { colors } from "../constants/colors"; // Correctly import colors
import {
  collection,
  addDoc,
  getDoc,
  doc,
  getDocs,
  Timestamp,
  updateDoc, // <-- Add this import
} from "firebase/firestore"; // Ensure Timestamp is imported
import { db, auth } from "../firebaseConfig"; // Import Firestore instance
import * as ImagePicker from "expo-image-picker"; // Add this import
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // <-- Add this import
import * as FileSystem from "expo-file-system"; // <-- Add this import

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
  // Academic and Administrative Buildings
  "Suzallo Library",
  "Allen Library",
  "Odegaard Library",
  "Mary Gates Hall",
  "Husky Union Building (HUB)",
  "Paul G. Allen Center (CSE)",
  "Bill-Melinda Gates Center (CSE)",
  "Paccar Hall",
  "Denny Hall",
  "Bagley Hall",
  "Smith Hall",
  "Thomson Hall",
  "Physics-Astronomy Building",
  "Mechanical Engineering Building",
  "Electrical Engineering Building",
  "Art Building",
  "Music Building",
  "William H. Gates Hall",
  "Savery Hall",
  "Sieg Hall",
  "Raitt Hall",
  "Roberts Hall",
  "Loew Hall",
  "More Hall",
  "Guggenheim Hall",
  "Benson Hall",
  "Anderson Hall",
  "Architecture Hall",
  "Communications Building",
  "Clark Hall",
  "Parrington Hall",
  "Schmitz Hall",
  "South Campus Center",

  // Health and Research Facilities
  "Health Sciences Building",
];

export default function AddSpotScreen({
  navigation,
  // Remove isDarkMode: propDark,
  // Remove themeColors: propColors,
}) {
  const themeCtx = useContext(ThemeContext);
  const isDarkMode = themeCtx?.isDarkMode ?? false;
  const themeColors = themeCtx?.themeColors ?? colors;

  const [selectedBuilding, setSelectedBuilding] = useState(""); // State for selected building
  const [roomNumber, setRoomNumber] = useState("");
  const [huskyCardNeeded, setHuskyCardNeeded] = useState(false);
  const [department, setDepartment] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [showAddedBy, setShowAddedBy] = useState(false); // New state for "Added By" option
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const [isUWBuilding, setIsUWBuilding] = useState(true); // New state for UW building toggle
  const [customBuilding, setCustomBuilding] = useState(""); // For custom building name
  const [isFavorite, setIsFavorite] = useState(false); // Favorite toggle
  const [openHours, setOpenHours] = useState(""); // Open/quiet hours field
  const [showPreview, setShowPreview] = useState(false); // Preview modal
  const [customImage, setCustomImage] = useState(null); // { uri, name }
  const [isPrivate, setIsPrivate] = useState(false); // <-- Add state for private nooks

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
    setOpenHours("");
    setCustomImage(null); // Reset image
    setIsPrivate(false); // Reset private toggle
  };

  // Helper: check if user is amaity@uw.edu
  const isAmaity =
    auth.currentUser && auth.currentUser.email === "amaity@uw.edu";

  // Image picker handler
  const MAX_IMAGE_SIZE_BYTES = 700 * 1024; // 700KB for safety

  const handlePickCustomImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [5, 2], // Match HomeScreen aspect ratio: width:height = 10:14 (same as 100:140)
    });
    if (!result.cancelled) {
      // Use the file URI and filename
      const asset = result.assets ? result.assets[0] : result;
      setCustomImage({
        uri: asset.uri,
        name: asset.fileName || `custom_${Date.now()}.jpg`,
      });
    }
  };

  // Helper to upload image to Firebase Storage and get download URL
  const uploadImageToStorage = async (imageObj, spotId) => {
    if (!imageObj?.uri) return "";
    const storage = getStorage();
    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(imageObj.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // Convert base64 to Blob using fetch and a data URL
    const response = await fetch(`data:image/jpeg;base64,${base64}`);
    const blob = await response.blob();
    const storageRef = ref(
      storage,
      `custom_spot_images/${spotId || Date.now()}_${imageObj.name}`
    );
    await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const user = auth.currentUser;

      // Fetch existing spots to check for duplicates
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
      // Add the spot to Firestore first to get the spotId
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
        photoUrl: "", // Placeholder, will update after upload
        openHours,
        private: !isUWBuilding && isPrivate, // Only allow private for custom buildings
      };
      const docRef = await addDoc(collection(db, "studySpots"), spotDetails);

      // If custom image, upload to storage and update Firestore with download URL
      if (
        (!isUWBuilding && customImage) ||
        (isUWBuilding && isAmaity && customImage)
      ) {
        photoUrl = await uploadImageToStorage(customImage, docRef.id);
        await updateDoc(docRef, { photoUrl });
      }

      // If marked as favorite, update user's favorites array
      if (isFavorite && user) {
        const userRef = doc(db, "users", user.uid);
        // Fetch current favorites to avoid duplicates
        const userDoc = await getDoc(userRef);
        let currentFavorites = [];
        if (userDoc.exists()) {
          currentFavorites = userDoc.data().favorites || [];
        }
        if (!currentFavorites.includes(docRef.id)) {
          await updateDoc(userRef, {
            favorites: [...currentFavorites, docRef.id],
          });
        }
      }

      // Navigate to Home after successful add
      navigation.navigate("Home", { refresh: true });
      resetForm();
    } catch (error) {
      console.error("Error adding spot:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Spot preview modal
  const renderPreview = () => (
    <Modal visible={showPreview} transparent animationType="slide">
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
            borderRadius: 16,
            padding: 24,
            width: "85%",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "bold",
              color: themeColors.black, // Use black for preview title
              marginBottom: 12,
            }}
          >
            Spot Preview
          </Text>
          <Text style={{ fontWeight: "bold", color: themeColors.black }}>
            Name:
          </Text>
          <Text style={{ color: themeColors.black }}>
            {isUWBuilding ? selectedBuilding : customBuilding}
          </Text>
          <Text
            style={{
              fontWeight: "bold",
              marginTop: 8,
              color: themeColors.black,
            }}
          >
            Floor Number:
          </Text>
          <Text style={{ color: themeColors.black }}>
            {roomNumber || "N/A"}
          </Text>
          <Text
            style={{
              fontWeight: "bold",
              marginTop: 8,
              color: themeColors.black,
            }}
          >
            Favorite:
          </Text>
          <Text style={{ color: themeColors.black }}>
            {isFavorite ? "Yes" : "No"}
          </Text>
          <Text
            style={{
              fontWeight: "bold",
              marginTop: 8,
              color: themeColors.black,
            }}
          >
            Open/Quiet Hours:
          </Text>
          <Text style={{ color: themeColors.black }}>{openHours || "N/A"}</Text>
          <Text
            style={{
              fontWeight: "bold",
              marginTop: 8,
              color: themeColors.black,
            }}
          >
            Tags:
          </Text>
          <Text style={{ color: themeColors.black }}>
            {selectedTags.length ? selectedTags.join(", ") : "None"}
          </Text>
          <Text
            style={{
              fontWeight: "bold",
              marginTop: 8,
              color: themeColors.black,
            }}
          >
            Husky Card Needed:
          </Text>
          <Text style={{ color: themeColors.black }}>
            {huskyCardNeeded ? "Yes" : "No"}
          </Text>
          {huskyCardNeeded && (
            <>
              <Text
                style={{
                  fontWeight: "bold",
                  marginTop: 8,
                  color: themeColors.black,
                }}
              >
                Department:
              </Text>
              <Text style={{ color: themeColors.black }}>
                {department || "N/A"}
              </Text>
            </>
          )}
          <Text
            style={{
              fontWeight: "bold",
              marginTop: 8,
              color: themeColors.black,
            }}
          >
            Private Nook:
          </Text>
          <Text style={{ color: themeColors.black }}>
            {isPrivate ? "Yes" : "No"}
          </Text>
          <TouchableOpacity
            onPress={() => setShowPreview(false)}
            style={{
              marginTop: 18,
              backgroundColor: themeColors.purple,
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 18,
              alignItems: "center",
            }}
            accessibilityLabel="Close Preview"
            accessible={true}
          >
            <Text style={{ color: themeColors.white, fontWeight: "bold" }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Add this helper to handle toggle and reset image
  const handleUWBuildingToggle = (isUW) => {
    setIsUWBuilding(isUW);
    setCustomImage(null); // Reset image on toggle
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.white }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: themeColors.white,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{ flex: 1, padding: 16, backgroundColor: themeColors.white }}
        >
          {/* Light background */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
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
              <ArrowLeft size={20} color={themeColors.purple} />
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
            }}
          >
            {isUWBuilding ? "Select Building:" : "Enter Location Name:"}
          </Text>
          {isUWBuilding ? (
            <>
              <View
                style={{
                  borderRadius: 8,
                  marginBottom: 16,
                  backgroundColor: themeColors.white,
                }}
              >
                <Picker
                  selectedValue={selectedBuilding}
                  onValueChange={(itemValue) => setSelectedBuilding(itemValue)}
                  style={{
                    color: themeColors.purple,
                    fontSize: 18,
                    backgroundColor: themeColors.white,
                    borderColor: themeColors.black,
                    borderWidth: 0.5,
                    borderRadius: 8,
                  }}
                  itemStyle={{
                    fontSize: 18,
                    color: themeColors.purple,
                  }}
                >
                  <Picker.Item
                    label="Select a building"
                    value=""
                    style={{
                      fontSize: 18,
                      color: themeColors.purple,
                    }}
                  />
                  {BUILDINGS.map((building) => (
                    <Picker.Item
                      key={building}
                      label={building}
                      value={building}
                      style={{
                        fontSize: 18,
                        color: themeColors.purple,
                      }}
                    />
                  ))}
                </Picker>

                <TextInput
                  placeholder="Floor Number (if applicable)"
                  placeholderTextColor={themeColors.darkGray}
                  value={roomNumber}
                  onChangeText={setRoomNumber}
                  style={{
                    borderWidth: 0.5,
                    borderColor: themeColors.black,
                    borderRadius: 8,
                    padding: 12,
                    marginTop: 16,
                    marginBottom: 16,
                    backgroundColor: themeColors.white,
                    color: themeColors.purple,
                  }}
                />
              </View>
              {/* Move upload image button and preview just outside the picker view */}
              {isAmaity && (
                <View style={{ marginBottom: 16, alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={handlePickCustomImage}
                    style={{
                      backgroundColor: themeColors.purple,
                      borderRadius: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 18,
                      alignItems: "center",
                      marginTop: 0,
                    }}
                    accessibilityLabel="Pick an image for this location"
                    accessible={true}
                  >
                    <Text
                      style={{ color: themeColors.white, fontWeight: "bold" }}
                    >
                      {customImage ? "Change Image" : "Upload Image"}
                    </Text>
                  </TouchableOpacity>
                  {customImage && (
                    <View
                      style={{
                        width: 350,
                        height: 140,
                        borderRadius: 8,
                        overflow: "hidden",
                        borderWidth: 0.5,
                        borderColor: themeColors.black,
                        marginTop: 12,
                      }}
                    >
                      <Image
                        source={{ uri: customImage.uri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              <TextInput
                placeholder="Enter location name (e.g. Bookstore or Starbucks)"
                placeholderTextColor={themeColors.darkGray}
                value={customBuilding}
                onChangeText={setCustomBuilding}
                style={{
                  borderWidth: 0.5,
                  borderColor: themeColors.black,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  backgroundColor: themeColors.white,
                  color: themeColors.purple,
                }}
              />

              <TextInput
                placeholder="Floor Number (if applicable)"
                placeholderTextColor={themeColors.darkGray}
                value={roomNumber}
                onChangeText={setRoomNumber}
                style={{
                  borderWidth: 0.5,
                  borderColor: themeColors.black,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  backgroundColor: themeColors.white,
                  color: themeColors.purple,
                }}
              />
              {/* Image picker for custom location (always shown for custom) */}
              <View style={{ marginBottom: 16, alignItems: "center" }}>
                <TouchableOpacity
                  onPress={handlePickCustomImage}
                  style={{
                    backgroundColor: themeColors.purple,
                    borderRadius: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 18,
                    alignItems: "center",
                  }}
                  accessibilityLabel="Pick an image for this location"
                  accessible={true}
                >
                  <Text
                    style={{ color: themeColors.white, fontWeight: "bold" }}
                  >
                    {customImage ? "Change Image" : "Upload Image"}
                  </Text>
                </TouchableOpacity>
                {customImage && (
                  <View
                    style={{
                      width: 350,
                      height: 140,
                      borderRadius: 8,
                      overflow: "hidden",
                      borderWidth: 0.5,
                      borderColor: themeColors.black,
                      marginTop: 12, // <-- Add marginTop for gap
                    }}
                  >
                    <Image
                      source={{ uri: customImage.uri }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </View>
                )}
              </View>
            </>
          )}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 19,
                marginBottom: 8,
                color: themeColors.black,
              }}
            >
              Husky Card Needed:
            </Text>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                onPress={() => setHuskyCardNeeded(false)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  padding: 12,
                  marginRight: 8,
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
                  padding: 12,
                  marginLeft: 8,
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
                  }}
                >
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {huskyCardNeeded && (
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
              }}
            />
          )}
          <Text
            style={{ fontSize: 19, marginBottom: 8, color: themeColors.black }}
          >
            Tags:
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            {TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                style={{
                  margin: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: selectedTags.includes(tag)
                    ? themeColors.purple
                    : themeColors.white,
                  borderRadius: 25,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: themeColors.black,
                }}
              >
                <Text
                  style={{
                    color: selectedTags.includes(tag)
                      ? themeColors.white
                      : themeColors.purple,
                    fontSize: 14,
                    fontWeight: "bold",
                  }}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Favorite toggle */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
              marginTop: 8,
            }}
          >
            <TouchableOpacity
              onPress={() => setIsFavorite((f) => !f)}
              style={{
                backgroundColor: themeColors.white,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: themeColors.black,
                padding: 8,
                marginRight: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel="Toggle favorite"
              accessible={true}
            >
              <Heart
                size={22}
                color={themeColors.purple}
                weight={isFavorite ? "fill" : "regular"}
              />
            </TouchableOpacity>
            <Text style={{ color: themeColors.black, fontSize: 14.5 }}>
              Mark this spot as a favorite
            </Text>
          </View>
          {/* Open/Quiet Hours */}
          <TextInput
            placeholder="Open/Quiet Hours (e.g. 8am-10pm, Quiet at 6pm)"
            placeholderTextColor={themeColors.darkGray}
            value={openHours}
            onChangeText={setOpenHours}
            style={{
              borderWidth: 0.5,
              borderColor: themeColors.black,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: themeColors.white,
              color: themeColors.purple,
            }}
            accessibilityLabel="Open or Quiet Hours"
            accessible={true}
          />

          {/* Private nook toggle (only for custom buildings) */}
          {!isUWBuilding && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <Text style={{ color: themeColors.black, marginRight: 8 }}>
                Private Nook
              </Text>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                thumbColor={isPrivate ? themeColors.purple : themeColors.gray}
                trackColor={{
                  false: themeColors.gray,
                  true: themeColors.purple + "88",
                }}
                accessibilityLabel="Private Nook"
              />
              <Text
                style={{
                  color: themeColors.darkGray,
                  marginLeft: 8,
                  fontSize: 12,
                }}
              >
                (Only you can see this nook)
              </Text>
            </View>
          )}

          <View
            style={{
              flexDirection: "row",
              marginTop: 16,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Reset (negative) on left, Add Nook (positive) on right */}
            <TouchableOpacity
              onPress={resetForm}
              style={{
                flex: 1,
                maxWidth: "35%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: colors.red,
                borderRadius: 25,
                marginRight: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
                minWidth: 90,
              }}
              accessibilityLabel="Reset Form"
              accessible={true}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "bold",
                  fontSize: 13,
                  textAlign: "center",
                  flex: 1,
                }}
              >
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={{
                flex: 1,
                maxWidth: "35%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: colors.green,
                borderRadius: 25,
                marginLeft: 12, // Add marginLeft to separate from Reset button
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                alignSelf: "center",
                elevation: 3,
                minWidth: 90, // Add minWidth for consistency
              }}
              accessibilityLabel="Add Nook"
              accessible={true}
            >
              <Check size={20} color="white" />
              <Text
                style={{
                  marginLeft: 8,
                  color: "white",
                  fontWeight: "bold",
                  fontSize: 13,
                  textAlign: "center",
                  flex: 1,
                }}
              >
                Add Nook
              </Text>
            </TouchableOpacity>
          </View>
          {renderPreview()}
        </View>
      </ScrollView>
      {/* Ensure the preview modal is rendered outside the ScrollView for visibility */}
      {showPreview && renderPreview()}
    </SafeAreaView>
  );
}
