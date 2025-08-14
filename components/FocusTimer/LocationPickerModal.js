import React, { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { X, MapPin, Users, Lock } from "phosphor-react-native";
import { auth, db } from "../../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import CircleLoader from "../common/CircleLoader";
import { FONTS } from "../../constants/fonts";

export default function LocationPickerModal({
  visible,
  onClose,
  onLocationSelect,
  colors,
}) {
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (visible) {
      loadUserLocations();
    }
  }, [visible]);

  const loadUserLocations = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      // Fetch study spots from the studySpots collection
      const studySpotsQuery = collection(db, "studySpots");
      const studySpotsSnapshot = await getDocs(studySpotsQuery);

      const accessibleSpots = [];

      studySpotsSnapshot.forEach((doc) => {
        const spotData = doc.data();

        // Include public spots and private nooks that user has access to
        const canAccess =
          !spotData.privateNook ||
          spotData.addedBy === user.uid ||
          (Array.isArray(spotData.sharedWith) &&
            spotData.sharedWith.includes(user.uid));

        if (canAccess) {
          // Build display name with floor info if available
          let displayName =
            spotData.name || spotData.buildingName || "Unnamed Location";
          if (spotData.floor && spotData.floor.trim() !== "") {
            displayName += ` - ${spotData.floor}`;
          }

          // Build address from available info
          let address = "";
          if (spotData.address) {
            address = spotData.address;
          } else if (
            spotData.buildingName &&
            spotData.buildingName !== displayName
          ) {
            address = spotData.buildingName;
          }

          accessibleSpots.push({
            id: doc.id,
            name: displayName,
            isPrivate: !!spotData.privateNook,
            address: address || "No address available",
            buildingName: spotData.buildingName,
            floor: spotData.floor,
            coordinates: spotData.coordinates,
            ...spotData,
          });
        }
      });

      // Sort spots: private nooks first, then by name
      accessibleSpots.sort((a, b) => {
        if (a.isPrivate && !b.isPrivate) return -1;
        if (!a.isPrivate && b.isPrivate) return 1;
        return a.name.localeCompare(b.name);
      });

      // Add "No Location" option at the beginning
      const allLocations = [
        {
          id: "none",
          name: "No Location",
          isPrivate: false,
          address: "Study without specifying location",
          special: true,
        },
        ...accessibleSpots,
      ];

      setLocations(allLocations);
    } catch (error) {
      console.error("Error loading user locations:", error);
      setLocations([
        {
          id: "none",
          name: "No Location",
          isPrivate: false,
          address: "Study without specifying location",
          special: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location) => {
    onLocationSelect(location);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            backgroundColor: colors.white,
            borderRadius: 16,
            width: "100%",
            maxWidth: 400,
            maxHeight: "70%",
            borderWidth: 1,
            borderColor: colors.black,
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={() => {}} // Prevent tap-through
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.gray || "#E5E7EB",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "bold",
                color: colors.black,
                fontFamily: FONTS.PRIMARY,
              }}
            >
              Select Study Location
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X size={24} color={colors.black} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View
              style={{
                alignItems: "center",
                padding: 40,
              }}
            >
              <CircleLoader themeColors={colors} text="Loading locations..." />
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: 400 }}
              contentContainerStyle={{ padding: 20, paddingTop: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {locations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  onPress={() => handleLocationSelect(location)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    backgroundColor: colors.white,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: colors.gray || "#E5E7EB",
                    shadowColor: colors.black,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                  activeOpacity={0.7}
                >
                  {/* Location Details */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: colors.black,
                        fontFamily: FONTS.PRIMARY,
                        marginBottom: 2,
                      }}
                    >
                      {location.name}
                    </Text>
                    {!location.special && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: location.isPrivate
                            ? colors.orange
                            : colors.purple,
                          fontFamily: FONTS.PRIMARY,
                          marginTop: 2,
                          fontWeight: "500",
                        }}
                      >
                        {location.isPrivate ? "Private Nook" : "Public Nook"}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {locations.length === 1 && locations[0].special && (
                <View
                  style={{
                    alignItems: "center",
                    padding: 10,
                    marginTop: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      color: colors.darkGray || "#6B7280",
                      fontFamily: FONTS.PRIMARY,
                      textAlign: "center",
                    }}
                  >
                    No study spots available.{"\n"}
                    Add some study spots to select study locations!
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
