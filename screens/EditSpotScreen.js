import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
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
  "Health Sciences Building",
];

export default function EditSpotScreen({ navigation, route }) {
  const themeCtx = useContext(ThemeContext);
  const isDarkMode = themeCtx?.isDarkMode ?? false;
  const themeColors = themeCtx?.themeColors ?? colors;

  const { spotId, spot } = route.params || {};

  const [selectedBuilding, setSelectedBuilding] = useState(
    spot?.buildingName || ""
  );
  const [roomNumber, setRoomNumber] = useState(spot?.roomNumber || "");
  const [huskyCardNeeded, setHuskyCardNeeded] = useState(
    typeof spot?.huskyCardNeeded === "boolean" ? spot.huskyCardNeeded : false
  );
  const [department, setDepartment] = useState(spot?.department || "");
  const [selectedTags, setSelectedTags] = useState(
    Array.isArray(spot?.tags) ? spot.tags : []
  );
  const [showAddedBy, setShowAddedBy] = useState(
    typeof spot?.revealIdentity === "boolean" ? spot.revealIdentity : false
  );
  const [isUWBuilding, setIsUWBuilding] = useState(
    spot?.buildingName && !spot?.coordinates ? true : false
  );
  const [customBuilding, setCustomBuilding] = useState(
    !spot?.buildingName || spot?.coordinates ? spot?.buildingName || "" : ""
  );
  const [isFavorite, setIsFavorite] = useState(false); // You may want
  const [customImage, setCustomImage] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [customCoords, setCustomCoords] = useState(spot?.coordinates || null);
  const [privateNook, setPrivateNook] = useState(
    typeof spot?.privateNook === "boolean" ? spot.privateNook : false
  );
  const [isLoading, setIsLoading] = useState(false);

  // Determine if we are editing (spotId exists)
  const isEditing = !!spotId;

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
    setPrivateNook(false); // <-- reset
  };

  const isAmaity =
    auth.currentUser && auth.currentUser.email === "amaity@uw.edu";

  const handlePickCustomImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [5, 2],
    });
    if (!result.cancelled) {
      const asset = result.assets ? result.assets[0] : result;
      setCustomImage({
        uri: asset.uri,
        name: asset.fileName || `custom_${Date.now()}.jpg`,
      });
    }
  };

  const uploadImageToStorage = async (imageObj, spotId) => {
    if (!imageObj?.uri) return "";
    const storage = getStorage();
    const base64 = await FileSystem.readAsStringAsync(imageObj.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
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
          ? {}
          : customCoords
          ? { coordinates: customCoords }
          : {}),
        privateNook: !isUWBuilding ? privateNook : false, // <-- set privateNook only for custom
      };
      const docRef = await addDoc(collection(db, "studySpots"), spotDetails);
      if (
        (!isUWBuilding && customImage) ||
        (isUWBuilding && isAmaity && customImage)
      ) {
        photoUrl = await uploadImageToStorage(customImage, docRef.id);
        await updateDoc(docRef, { photoUrl });
      }
      if (isFavorite && user) {
        const userRef = doc(db, "users", user.uid);
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
      navigation.navigate("Home", { refresh: true });
      resetForm();
    } catch (error) {
      console.error("Error adding spot:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (nookId) => {
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        alert("You must be signed in to edit a Nook.");
        setIsLoading(false);
        return;
      }

      const nookRef = doc(db, "studySpots", nookId);
      const nookDoc = await getDoc(nookRef);

      if (!nookDoc.exists()) {
        alert("Nook not found.");
        setIsLoading(false);
        return;
      }

      const currentData = nookDoc.data();

      // Helper to use new value if set, else fallback to current value
      const getValue = (newVal, currentVal) =>
        newVal !== undefined && newVal !== "" ? newVal : currentVal;

      const buildingNameToCheck = isUWBuilding
        ? selectedBuilding
        : customBuilding;

      // Always ensure tags is an array
      let tagsValue =
        Array.isArray(selectedTags) && selectedTags.length > 0
          ? selectedTags
          : Array.isArray(currentData.tags)
          ? currentData.tags
          : [];

      // Defensive: If tagsValue is not an array, make it an empty array
      if (!Array.isArray(tagsValue)) tagsValue = [];

      const updatedDetails = {
        name: getValue(buildingNameToCheck, currentData.name),
        buildingName: getValue(buildingNameToCheck, currentData.buildingName),
        roomNumber: getValue(roomNumber, currentData.roomNumber),
        huskyCardNeeded:
          typeof huskyCardNeeded === "boolean"
            ? huskyCardNeeded
            : currentData.huskyCardNeeded,
        department: (
          typeof huskyCardNeeded === "boolean"
            ? huskyCardNeeded
            : currentData.huskyCardNeeded
        )
          ? getValue(department, currentData.department)
          : null,
        tags: tagsValue,
        revealIdentity:
          typeof showAddedBy === "boolean"
            ? showAddedBy
            : currentData.revealIdentity,
        privateNook: !isUWBuilding
          ? typeof privateNook === "boolean"
            ? privateNook
            : currentData.privateNook
          : false,
        updatedAt: new Date().toISOString(),
      };

      // Only add coordinates for custom locations
      if (!isUWBuilding) {
        updatedDetails.coordinates =
          customCoords !== null && customCoords !== undefined
            ? customCoords
            : currentData.coordinates;
      }

      await updateDoc(nookRef, updatedDetails);

      // Handle image upload if a new image is provided
      if (customImage) {
        const photoUrl = await uploadImageToStorage(customImage, nookId);
        if (currentData.photoUrl !== photoUrl) {
          await updateDoc(nookRef, { photoUrl });
        }
      }

      navigation.navigate("Home", { refresh: true });
      resetForm();
    } catch (error) {
      console.error("Error editing nook:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove handleUWBuildingToggle for editing
  const handleUWBuildingToggle = (isUW) => {
    if (!isEditing) {
      setIsUWBuilding(isUW);
      setCustomImage(null);
    }
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: themeColors.white, paddingTop: 48 }}
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
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              }}
            >
              <ArrowLeft size={20} color={themeColors.purple} />
            </TouchableOpacity>
          </View>

          {/* UW Building Toggle - hide for editing */}
          {!isEditing && (
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
                disabled={isEditing}
              >
                <Text
                  style={{
                    color: isUWBuilding
                      ? themeColors.white
                      : themeColors.purple,
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
                disabled={isEditing}
              >
                <Text
                  style={{
                    color: !isUWBuilding
                      ? themeColors.white
                      : themeColors.purple,
                    fontWeight: "bold",
                  }}
                >
                  Custom Location
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text
            style={{
              fontSize: 20,
              marginBottom: 8,
              color: themeColors.black,
              fontFamily: "CarosSoft",
            }}
          >
            {isUWBuilding ? "Building:" : "Location Name:"}
          </Text>
          {/* Building/Floor/Map Row */}
          {isUWBuilding ? (
            <>
              {isEditing && (
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 13,
                    marginBottom: 4,
                    fontFamily: "CarosSoft",
                  }}
                >
                  Building and floor/room cannot be changed.
                </Text>
              )}
              <BuildingPicker
                isUWBuilding={isUWBuilding}
                selectedBuilding={selectedBuilding}
                setSelectedBuilding={isEditing ? () => {} : setSelectedBuilding}
                customBuilding={customBuilding}
                setCustomBuilding={isEditing ? () => {} : setCustomBuilding}
                roomNumber={roomNumber}
                setRoomNumber={isEditing ? () => {} : setRoomNumber}
                BUILDINGS={BUILDINGS}
                themeColors={themeColors}
                editable={!isEditing}
                disabled={isEditing}
              />
            </>
          ) : (
            <>
              {isEditing && (
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 13,
                    marginBottom: 4,
                    fontFamily: "CarosSoft",
                  }}
                >
                  Location name and floor cannot be changed.
                </Text>
              )}
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
                  onChangeText={isEditing ? () => {} : setCustomBuilding}
                  style={{
                    borderWidth: 0.5,
                    borderColor: themeColors.black,
                    borderRadius: 8,
                    padding: 12,
                    marginRight: 0,
                    backgroundColor: isEditing
                      ? themeColors.gray
                      : themeColors.white,
                    color: isEditing
                      ? themeColors.darkGray
                      : themeColors.purple,
                    width: "100%",
                    fontFamily: "CarosSoft",
                  }}
                  editable={!isEditing}
                />
              </View>
              <TextInput
                placeholder="N/A"
                placeholderTextColor={themeColors.darkGray}
                value={roomNumber}
                onChangeText={isEditing ? () => {} : setRoomNumber}
                style={{
                  borderWidth: 0.5,
                  borderColor: themeColors.black,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  backgroundColor: isEditing
                    ? themeColors.gray
                    : themeColors.white,
                  color: isEditing ? themeColors.darkGray : themeColors.purple,
                  width: "100%",
                  fontFamily: "CarosSoft",
                }}
                editable={!isEditing}
              />
            </>
          )}

          {/* Image Picker */}
          {(isAmaity && isUWBuilding) || !isUWBuilding ? (
            <ImagePickerButton
              onPickImage={handlePickCustomImage}
              customImage={customImage}
              themeColors={themeColors}
            />
          ) : null}

          {/* Map Picker Modal */}
          <MapLocationPicker
            visible={showMapPicker}
            onClose={() => setShowMapPicker(false)}
            onPick={(coords) => {
              setCustomCoords(coords);
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
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 19,
                marginBottom: 8,
                color: themeColors.black,
                fontFamily: "CarosSoft",
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
                    fontFamily: "CarosSoft",
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
                    fontFamily: "CarosSoft",
                    fontSize: 15,
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
                fontFamily: "CarosSoft",
              }}
            />
          )}

          {/* Tags */}
          <Text
            style={{
              fontSize: 19,
              marginBottom: 8,
              color: themeColors.black,
              fontFamily: "CarosSoft",
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

          {/* Favorite Toggle */}
          <FavoriteToggle
            isFavorite={isFavorite}
            setIsFavorite={setIsFavorite}
            themeColors={themeColors}
          />

          {/* Open/Quiet Hours */}
          <TextInput
            placeholder="Open/Quiet Hours (e.g. 8am-10pm, Quiet at 6pm)"
            placeholderTextColor={themeColors.darkGray}
            style={{
              borderWidth: 0.5,
              borderColor: themeColors.black,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: themeColors.white,
              color: themeColors.purple,
              fontFamily: "CarosSoft",
            }}
            accessibilityLabel="Open or Quiet Hours"
            accessible={true}
          />

          {/* Private Nook toggle - hide for editing */}
          {!isUWBuilding && !isEditing && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
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
              <Text style={{ color: themeColors.darkGray, fontSize: 13 }}>
                Only you will see this nook
              </Text>
            </View>
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
                  fontFamily: "CarosSoft",
                  letterSpacing: 0.1,
                }}
              >
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleEdit(spotId)}
              style={{
                flex: 0.25,
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                paddingVertical: 10,
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
              accessibilityLabel="Finish"
              accessible={true}
            >
              <Text
                style={{
                  color: "white",
                  fontWeight: "bold",
                  fontSize: 16,
                  textAlign: "center",
                  fontFamily: "CarosSoft",
                  letterSpacing: 0.1,
                }}
              >
                Finish
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
