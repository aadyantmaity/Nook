import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Picker } from "@react-native-picker/picker"; // Import Picker for dropdown
import { ArrowLeft, Check } from "phosphor-react-native"; // Import icons
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

export default function AddSpotScreen({ navigation }) {
  const [selectedBuilding, setSelectedBuilding] = useState(""); // State for selected building
  const [roomNumber, setRoomNumber] = useState("");
  const [huskyCardNeeded, setHuskyCardNeeded] = useState(false);
  const [department, setDepartment] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [showAddedBy, setShowAddedBy] = useState(false); // New state for "Added By" option
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const [isUWBuilding, setIsUWBuilding] = useState(true); // New state for UW building toggle
  const [customBuilding, setCustomBuilding] = useState(""); // For custom building name

  const toggleTag = (tag) => {
    setSelectedTags((tags) =>
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    );
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true); // Show loading screen
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
        setIsLoading(false); // Hide loading screen
        return;
      }

      const spotDetails = {
        name: buildingNameToCheck, // Use the selected or custom building as the spot name
        buildingName: buildingNameToCheck,
        roomNumber,
        huskyCardNeeded,
        department: huskyCardNeeded ? department : null,
        tags: selectedTags,
        createdAt: new Date().toISOString(),
        addedBy: user.uid, // Always store user ID
        revealIdentity: showAddedBy, // Add a flag to control identity visibility
        photoUrl: "", // Placeholder for photo URL
      };

      // Save to Firestore
      await addDoc(collection(db, "studySpots"), spotDetails);

      console.log("Spot added successfully:", spotDetails);

      // Navigate back to Home and refresh
      navigation.navigate("Home", { refresh: true });
    } catch (error) {
      console.error("Error adding spot:", error);
    } finally {
      setIsLoading(false); // Hide loading screen
    }
  };

  if (isLoading)
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ fontSize: 16, color: colors.darkGray }}>Loading...</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "colors.white" }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, backgroundColor: "colors.white" }}
      >
        <View style={{ flex: 1, padding: 16, backgroundColor: "colors.white" }}>
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
                backgroundColor: "#4B2E83", // Light button background
                borderRadius: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              }}
            >
              <ArrowLeft size={20} color="white" />
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
                backgroundColor: isUWBuilding ? colors.purple : "#F0F0F0",
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: isUWBuilding ? "white" : "#000000",
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
                backgroundColor: !isUWBuilding ? colors.purple : "#F0F0F0",
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: !isUWBuilding ? "white" : "#000000",
                  fontWeight: "bold",
                }}
              >
                Custom Location
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 19, marginBottom: 8, color: colors.purple }}>
            {isUWBuilding ? "Select Building:" : "Enter Location Name:"}
          </Text>
          {isUWBuilding ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: "#CCCCCC",
                borderRadius: 8,
                marginBottom: 16,
                backgroundColor: "colors.white",
              }}
            >
              <Picker
                selectedValue={selectedBuilding}
                onValueChange={(itemValue) => setSelectedBuilding(itemValue)}
                style={{ color: "#000000", fontSize: 18 }}
                itemStyle={{ fontSize: 18 }}
              >
                <Picker.Item
                  label="Select a building"
                  value=""
                  style={{ fontSize: 18 }}
                />
                {BUILDINGS.map((building) => (
                  <Picker.Item
                    key={building}
                    label={building}
                    value={building}
                    style={{ fontSize: 18 }}
                  />
                ))}
              </Picker>
            </View>
          ) : (
            <TextInput
              placeholder="Enter location name"
              placeholderTextColor="#666666"
              value={customBuilding}
              onChangeText={setCustomBuilding}
              style={{
                borderWidth: 1,
                borderColor: "#CCCCCC",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                backgroundColor: "colors.white",
                color: "#000000",
              }}
            />
          )}
          <TextInput
            placeholder="Room Number (if applicable)"
            placeholderTextColor="#666666"
            value={roomNumber}
            onChangeText={setRoomNumber}
            style={{
              borderWidth: 1,
              borderColor: "#CCCCCC",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: "colors.white",
              color: "#000000",
            }}
          />
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{ fontSize: 19, marginBottom: 8, color: colors.purple }}
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
                  backgroundColor: !huskyCardNeeded ? "#4B2E83" : "#F0F0F0",
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: !huskyCardNeeded ? "white" : "#000000" }}>
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
                  backgroundColor: huskyCardNeeded ? "#4B2E83" : "#F0F0F0",
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: huskyCardNeeded ? "white" : "#000000" }}>
                  Yes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {huskyCardNeeded && (
            <TextInput
              placeholder="Department (if applicable)"
              placeholderTextColor="#666666"
              value={department}
              onChangeText={setDepartment}
              style={{
                borderWidth: 1,
                borderColor: "#CCCCCC",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                backgroundColor: "colors.white",
                color: "#000000",
              }}
            />
          )}
          <Text style={{ fontSize: 19, marginBottom: 8, color: colors.purple }}>
            Tags:
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center", // Center align the tags
              marginBottom: 16,
            }}
          >
            {TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                style={{
                  margin: 6, // Add more spacing between tags
                  paddingHorizontal: 16, // Increase horizontal padding
                  paddingVertical: 10, // Increase vertical padding
                  backgroundColor: selectedTags.includes(tag)
                    ? colors.purple
                    : "#F0F0F0", // Light unselected background
                  borderRadius: 25, // Make the tags more rounded
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2, // Add subtle shadow for depth
                }}
              >
                <Text
                  style={{
                    color: selectedTags.includes(tag) ? "white" : "#000000",
                    fontSize: 14, // Slightly increase font size
                    fontWeight: "bold", // Make the text bold
                  }}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ marginTop: 24, alignItems: "center" }}>
            <TouchableOpacity
              onPress={handleSubmit} // Replace setShowReview with handleSubmit
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center", // Center content horizontally
                paddingVertical: 12, // Increase vertical padding
                paddingHorizontal: 16, // Increase horizontal padding
                backgroundColor: colors.green,
                borderRadius: 25, // Make the button more rounded
                marginTop: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                alignSelf: "center",
                elevation: 3, // Add elevation for a subtle shadow
              }}
            >
              <Check size={20} color="white" />
              <Text
                style={{
                  marginLeft: 8,
                  color: "white",
                  fontWeight: "bold", // Make the text bold
                  fontSize: 16, // Slightly increase font size
                }}
              >
                Add Nook
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
