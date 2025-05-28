import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Modal,
  TextInput,
} from "react-native";
import { signOut, updateProfile } from "firebase/auth";
import { auth, db } from "../firebaseConfig"; // Ensure db is imported
import { colors } from "../constants/colors";
import {
  ArrowLeft,
  SignOut,
  PencilSimple,
  Envelope,
  GraduationCap,
  Briefcase,
  User,
  Heart,
} from "phosphor-react-native"; // Import icons
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore"; // Import Firestore functions

export default function ProfileScreen({ navigation }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userMajor, setUserMajor] = useState("");
  const [userGradYear, setUserGradYear] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editedFirstName, setEditedFirstName] = useState("");
  const [editedLastName, setEditedLastName] = useState("");
  const [editedMajor, setEditedMajor] = useState("");
  const [editedGradYear, setEditedGradYear] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [favorites, setFavorites] = useState([]);
  const [favoriteSpots, setFavoriteSpots] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFirstName(data.firstName || "No First Name");
            setLastName(data.lastName || "No Last Name");
            setUserEmail(data.email || "No Email");
            setUserMajor(data.major || "No Major");
            setUserGradYear(data.gradYear || "No Grad Year");
            setFavorites(data.favorites || []);
          } else {
            console.error("User document does not exist");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setIsLoading(false); // Set loading to false after fetching data
        }
      }
    };

    fetchUserData();
  }, []);

  // Fetch favorite spots details
  useEffect(() => {
    const fetchFavoriteSpots = async () => {
      if (!favorites.length) {
        setFavoriteSpots([]);
        return;
      }
      try {
        const spotsSnapshot = await getDocs(collection(db, "studySpots"));
        const favSpots = spotsSnapshot.docs
          .filter((doc) => favorites.includes(doc.id))
          .map((doc) => ({ id: doc.id, ...doc.data() }));
        setFavoriteSpots(favSpots);
      } catch (e) {
        setFavoriteSpots([]);
      }
    };
    fetchFavoriteSpots();
  }, [favorites]);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        // navigation.replace("Login"); // REMOVE this line
        // No manual navigation needed; auth state will trigger navigation
      })
      .catch((error) => {
        console.error("Error logging out:", error.message);
      });
  };

  const handleSaveProfile = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            firstName: editedFirstName || firstName,
            lastName: editedLastName || lastName,
            major: editedMajor || userMajor,
            gradYear: editedGradYear || userGradYear,
            email: userEmail,
          },
          { merge: true }
        );

        // Update displayName in Firebase Authentication
        await updateProfile(user, {
          displayName: `${editedFirstName || firstName} ${
            editedLastName || lastName
          }`,
        });

        setFirstName(editedFirstName || firstName);
        setLastName(editedLastName || lastName);
        setUserMajor(editedMajor || userMajor);
        setUserGradYear(editedGradYear || userGradYear);
        setIsModalVisible(false);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
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
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <View style={{ flex: 0.2 }}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Home")}
        >
          <ArrowLeft size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
      {/* Profile Picture */}
      <View style={styles.profilePictureContainer}>
        <User size={80} color="white" weight="bold" />
      </View>

      {/* Profile Details */}
      <View style={styles.profileContainer}>
        <Text style={styles.userName}>
          {firstName} {lastName}
        </Text>
        <View style={styles.detailRow}>
          <Envelope size={20} color={colors.purple} />
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>

        <View style={styles.detailRow}>
          <Briefcase size={20} color={colors.purple} />
          <Text style={styles.userMajor}>{userMajor}</Text>
        </View>
        <View style={styles.detailRow}>
          <GraduationCap size={20} color={colors.purple} />
          <Text style={styles.userGradYear}>{userGradYear}</Text>
        </View>
        <View style={styles.divider} />
        {/* Favorites Section */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "left",
            marginBottom: 8,
          }}
        >
          <Heart size={20} color={colors.purple} weight="fill" />
          <Text
            style={[styles.favoritesTitle, { marginLeft: 8, marginBottom: 0 }]}
          >
            Favorites
          </Text>
        </View>
        {favoriteSpots.length === 0 ? (
          <Text style={styles.noFavoritesText}>No favorites yet.</Text>
        ) : (
          favoriteSpots.map((spot) => (
            <TouchableOpacity
              key={spot.id}
              style={styles.favoriteSpotContainer}
              onPress={() =>
                navigation.navigate("SpotDetail", { spotId: spot.id })
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.favoriteSpotName}>{spot.name}</Text>
              </View>
              <Text style={styles.favoriteSpotTags}>
                {spot.tags && spot.tags.length > 0 ? spot.tags.join(", ") : ""}
              </Text>
            </TouchableOpacity>
          ))
        )}
        <View style={styles.divider} />
      </View>

      {/* Buttons */}
      <View style={styles.optionsContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setEditedFirstName(
                firstName !== "No First Name" ? firstName : ""
              );
              setEditedLastName(lastName !== "No Last Name" ? lastName : "");
              setEditedMajor(userMajor !== "No Major" ? userMajor : "");
              setEditedGradYear(
                userGradYear !== "No Grad Year" ? userGradYear : ""
              );
              setIsModalVisible(true);
            }}
          >
            <PencilSimple size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <SignOut size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal for editing profile */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={editedFirstName}
              onChangeText={setEditedFirstName}
              placeholderTextColor={colors.darkGray}
            />
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={editedLastName}
              onChangeText={setEditedLastName}
              placeholderTextColor={colors.darkGray}
            />
            <TextInput
              style={styles.input}
              placeholder="Major"
              value={editedMajor}
              onChangeText={setEditedMajor}
              placeholderTextColor={colors.darkGray}
            />
            <TextInput
              style={styles.input}
              placeholder="Graduation Year"
              value={editedGradYear}
              onChangeText={setEditedGradYear}
              keyboardType="numeric"
              placeholderTextColor={colors.darkGray}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    padding: 8,
    backgroundColor: colors.purple,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  profilePictureContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 100, // Adjust width for better appearance
    height: 100, // Adjust height for better appearance
    backgroundColor: colors.purple,
    borderRadius: 50, // Make it circular
    marginTop: 32, // Add spacing from the top
    alignSelf: "center", // Center horizontally within the screen
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileContainer: {
    alignItems: "center",
    paddingHorizontal: 16, // Ensure proper spacing
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.purple,
    marginBottom: 8, // Adjust spacing
    paddingTop: 16, // Add padding to the top for better spacing
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    color: colors.darkGray,
    marginLeft: 8, // Add spacing between icon and text
    textAlign: "center",
  },
  userMajor: {
    fontSize: 16,
    color: colors.darkGray,
    marginLeft: 8, // Add spacing between icon and text
    textAlign: "center",
  },
  userGradYear: {
    fontSize: 16,
    color: colors.darkGray,
    marginLeft: 8, // Add spacing between icon and text
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray,
    marginVertical: 16,
    width: "80%",
    alignSelf: "center",
  },
  optionsContainer: {
    flex: 0.1,
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
    paddingTop: 16, // Add vertical padding for spacing
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "60%", // Adjust width for centering
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: colors.purple,
    borderRadius: 8,
    width: "48%", // Take up 48% of the row width
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: colors.red,
    borderRadius: 8,
    width: "48%", // Take up 48% of the row width
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.purple,
    marginBottom: 16,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.darkGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: colors.white,
    color: colors.black,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  saveButton: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.purple,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: "bold",
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: colors.lightPurple,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: colors.purple,
    fontWeight: "bold",
  },
  favoritesTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.purple,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  noFavoritesText: {
    fontSize: 15,
    color: colors.darkGray,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  favoriteSpotContainer: {
    backgroundColor: colors.gray,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    alignSelf: "stretch",
  },
  favoriteSpotName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.purple,
  },
  favoriteSpotTags: {
    fontSize: 13,
    color: colors.darkGray,
    marginTop: 2,
  },
});
