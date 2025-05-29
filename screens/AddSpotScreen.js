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
} from "firebase/firestore"; // Ensure Timestamp is imported
import { db, auth } from "../firebaseConfig"; // Import Firestore instance

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
  "Odegaard Undergraduate Library",
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
        favorite: isFavorite, // Add favorite field
        openHours, // Add open/quiet hours field
      };

      await addDoc(collection(db, "studySpots"), spotDetails);

      // Navigate to Home after successful add
      navigation.navigate("Home", { refresh: true });
      resetForm();
    } catch (error) {
      console.error("Error adding spot:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading)
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: themeColors.white,
        }}
        accessibilityLabel="Loading"
        accessible={true}
      >
        <Text style={{ fontSize: 16, color: themeColors.darkGray }}>
          Loading...
        </Text>
      </SafeAreaView>
    );

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
              color: themeColors.purple,
              marginBottom: 12,
            }}
          >
            Spot Preview
          </Text>
          <Text style={{ fontWeight: "bold" }}>Name:</Text>
          <Text>{isUWBuilding ? selectedBuilding : customBuilding}</Text>
          <Text style={{ fontWeight: "bold", marginTop: 8 }}>
            Floor Number:
          </Text>
          <Text>{roomNumber || "N/A"}</Text>
          <Text style={{ fontWeight: "bold", marginTop: 8 }}>Favorite:</Text>
          <Text>{isFavorite ? "Yes" : "No"}</Text>
          <Text style={{ fontWeight: "bold", marginTop: 8 }}>
            Open/Quiet Hours:
          </Text>
          <Text>{openHours || "N/A"}</Text>
          <Text style={{ fontWeight: "bold", marginTop: 8 }}>Tags:</Text>
          <Text>{selectedTags.length ? selectedTags.join(", ") : "None"}</Text>
          <Text style={{ fontWeight: "bold", marginTop: 8 }}>
            Husky Card Needed:
          </Text>
          <Text>{huskyCardNeeded ? "Yes" : "No"}</Text>
          {huskyCardNeeded && (
            <>
              <Text style={{ fontWeight: "bold", marginTop: 8 }}>
                Department:
              </Text>
              <Text>{department || "N/A"}</Text>
            </>
          )}
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
                backgroundColor: themeColors.purple,
                borderRadius: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              }}
            >
              <ArrowLeft size={20} color={themeColors.white} />
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
              onPress={() => setIsUWBuilding(true)}
              style={{
                flex: 1,
                alignItems: "center",
                padding: 12,
                marginRight: 8,
                backgroundColor: isUWBuilding
                  ? themeColors.purple
                  : themeColors.white,
                borderRadius: 8,
                borderColor: themeColors.purple,
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
              onPress={() => setIsUWBuilding(false)}
              style={{
                flex: 1,
                alignItems: "center",
                padding: 12,
                marginLeft: 8,
                backgroundColor: !isUWBuilding
                  ? themeColors.purple
                  : themeColors.white,
                borderRadius: 8,
                borderColor: themeColors.purple,
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
            style={{ fontSize: 19, marginBottom: 8, color: themeColors.purple }}
          >
            {isUWBuilding ? "Select Building:" : "Enter Location Name:"}
          </Text>
          {isUWBuilding ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: themeColors.gray,
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
                  borderColor: themeColors.purple,
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
            </View>
          ) : (
            <TextInput
              placeholder="Enter location name"
              placeholderTextColor={themeColors.purple}
              value={customBuilding}
              onChangeText={setCustomBuilding}
              style={{
                borderWidth: 0.5,
                borderColor: themeColors.purple,
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                backgroundColor: themeColors.white,
                color: themeColors.purple,
              }}
            />
          )}
          <TextInput
            placeholder="Floor Number (if applicable)"
            placeholderTextColor={themeColors.purple}
            value={roomNumber}
            onChangeText={setRoomNumber}
            style={{
              borderWidth: 1,
              borderColor: themeColors.purple,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: themeColors.white,
              color: themeColors.purple,
            }}
          />
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 19,
                marginBottom: 8,
                color: themeColors.purple,
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
                  borderColor: themeColors.purple,
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
                  borderColor: themeColors.purple,
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
              placeholderTextColor={themeColors.purple}
              value={department}
              onChangeText={setDepartment}
              style={{
                borderWidth: 0.5,
                borderColor: themeColors.purple,
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                backgroundColor: themeColors.white,
                color: themeColors.purple,
              }}
            />
          )}
          <Text
            style={{ fontSize: 19, marginBottom: 8, color: themeColors.purple }}
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
                  borderColor: themeColors.purple,
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
                borderColor: themeColors.purple,
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
            <Text style={{ color: themeColors.purple, fontSize: 13 }}>
              Mark this spot as a favorite
            </Text>
          </View>
          {/* Open/Quiet Hours */}
          <TextInput
            placeholder="Open/Quiet Hours (e.g. 8am-10pm, Quiet after 6pm)"
            placeholderTextColor={themeColors.purple}
            value={openHours}
            onChangeText={setOpenHours}
            style={{
              borderWidth: 0.5,
              borderColor: themeColors.purple,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: themeColors.white,
              color: themeColors.purple,
            }}
            accessibilityLabel="Open or Quiet Hours"
            accessible={true}
          />

          <View
            style={{
              flexDirection: "row",
              marginTop: 24,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TouchableOpacity
              onPress={() => setShowPreview(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: themeColors.purple,
                borderRadius: 25,
                marginRight: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
              accessibilityLabel="Preview Spot"
              accessible={true}
            >
              <Text
                style={{
                  color: themeColors.white,
                  fontWeight: "bold",
                  fontSize: 16,
                  textAlign: "center",
                }}
              >
                Summary
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={resetForm}
              style={{
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
                  fontSize: 16,
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
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: colors.green,
                borderRadius: 25,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                alignSelf: "center",
                elevation: 3,
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
                  fontSize: 16,
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
