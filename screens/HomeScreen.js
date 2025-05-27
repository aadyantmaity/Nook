import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ImageBackground,
  Platform,
} from "react-native";
import { collection, getDocs } from "firebase/firestore"; // Import Firestore functions
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, User } from "phosphor-react-native"; // Import icons
import { colors } from "../constants/colors"; // Import colors
import { auth, db } from "../firebaseConfig"; // Import Firebase
import { doc, getDoc } from "firebase/firestore"; // Import Firestore functions

function Filters({ filter, setFilter }) {
  return (
    <View
      style={{
        position: "relative",
        zIndex: 1,
        backgroundColor: "#FFFFFF",
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
      }}
    >
      <View
        style={{
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 40,
            fontWeight: "bold",
            textAlign: "center",
            color: colors.purple,
            fontFamily: Platform.OS === "ios" ? "Helvetica" : "sans-serif",
            marginTop: 16,
          }}
        >
          Nook
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          paddingHorizontal: 16,
        }}
      >
        {["All", "Quiet", "Outlets", "Group-Friendly"].map((label, index) => (
          <TouchableOpacity
            key={index}
            onPress={() =>
              setFilter(
                label.toLowerCase() === "all" ? null : label.toLowerCase()
              )
            }
            style={{
              paddingVertical: 10,
              paddingHorizontal: 10,
              backgroundColor:
                filter ===
                (label.toLowerCase() === "all" ? null : label.toLowerCase())
                  ? colors.purple
                  : "#F0F0F0",
              borderRadius: 25,
              margin: 6,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Text
              style={{
                color:
                  filter ===
                  (label.toLowerCase() === "all" ? null : label.toLowerCase())
                    ? "#FFFFFF"
                    : colors.purple,
                fontWeight: "bold",
                fontSize: 13,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function StudySpots({ filteredSpots, navigation }) {
  return (
    <FlatList
      data={filteredSpots} // Display the filtered study spots
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => navigation.navigate("SpotDetail", { spotId: item.id })}
          style={{
            padding: 16,
            marginBottom: 12,
            backgroundColor: "#FFFFFF",
            borderRadius: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: colors.purple,
              marginBottom: 8,
            }}
          >
            {item.name} {/* Display the building name */}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#666666",
              fontStyle: "italic",
            }}
          >
            {item.tags.join(", ")} {/* Display the tags */}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

export default function HomeScreen({ navigation, route }) {
  const [filter, setFilter] = useState(null);
  const [studySpots, setStudySpots] = useState([]); // Fetch spots from Firestore
  const [userName, setUserName] = useState(""); // Add state for user's name
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  const fetchStudySpots = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "studySpots"));
      const spots = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudySpots(spots); // Store fetched spots in state
    } catch (error) {
      console.error("Error fetching study spots:", error);
      alert("Unable to fetch study spots. Please check your permissions.");
    } finally {
      setIsLoading(false); // Set loading to false after fetching data
    }
  };

  useEffect(() => {
    const fetchUserName = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name);
        }
      }
    };

    fetchUserName();
  }, []);

  useEffect(() => {
    fetchStudySpots(); // Fetch spots on initial load
  }, []);

  useEffect(() => {
    if (route.params?.refresh) {
      fetchStudySpots(); // Refresh spots when navigating back with "refresh"
    }
  }, [route.params?.refresh]);

  if (isLoading)
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ fontSize: 16, color: colors.darkGray }}>Loading...</Text>
      </SafeAreaView>
    );

  const filteredSpots = filter
    ? studySpots.filter((spot) => spot.tags.includes(filter)) // Apply filter
    : studySpots;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <View style={{ flex: 1 }}>
        <Filters filter={filter} setFilter={setFilter} />
        <StudySpots filteredSpots={filteredSpots} navigation={navigation} />
        <TouchableOpacity
          onPress={() => {
            try {
              navigation.navigate("AddSpot");
            } catch (error) {
              console.error("Error adding spot:", error);
              alert("Unable to add a new spot. Please check your permissions.");
            }
          }}
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: colors.purple,
            borderRadius: 50,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Plus size={24} color="white" />
          <Text
            style={{
              color: "white",
              fontWeight: "bold",
              fontSize: 14,
              marginLeft: 8,
            }}
          >
            Add a Nook
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("Profile")}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            alignItems: "center",
            justifyContent: "center",
            width: 40, // Match the size of the container
            height: 40, // Match the size of the container
            backgroundColor: colors.purple,
            borderRadius: 20, // Make it circular
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
            zIndex: 5,
          }}
        >
          <User size={24} color="white" weight="bold" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
