import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Plus } from "phosphor-react-native";
import { getAuth } from "firebase/auth"; // Add this import

export default function SpotGallery({
  spotId,
  galleryImages,
  setSpot,
  themeColors,
  imageStyle, // <-- add imageStyle prop
  style, // <-- add style prop
}) {
  const [isUploading, setIsUploading] = useState(false);
  // Store images as array of objects: { url, author, createdAt }
  const [images, setImages] = useState(
    Array.isArray(galleryImages)
      ? galleryImages.map((img) =>
          typeof img === "string"
            ? { url: img, author: null, createdAt: null }
            : img
        )
      : []
  );
  // Modal state for image details
  const [selectedImage, setSelectedImage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Update images if prop changes
  React.useEffect(() => {
    setImages(
      Array.isArray(galleryImages)
        ? galleryImages.map((img) =>
            typeof img === "string"
              ? { url: img, author: null, createdAt: null }
              : img
          )
        : []
    );
  }, [galleryImages]);

  const handleAddGalleryImage = async () => {
    try {
      // Ensure user is authenticated
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be signed in to upload images.");
        return;
      }
      if (!spotId) {
        Alert.alert("Error", "Invalid spot ID.");
        return;
      }
      setIsUploading(true);
      // Use the correct ImagePicker API for Expo SDK 48+
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [5, 3],
        quality: 0.8,
      });
      if (result.canceled || result.cancelled) {
        setIsUploading(false);
        return;
      }
      const asset = result.assets ? result.assets[0] : result;
      const uri = asset.uri;
      // Upload to Firebase Storage
      const storage = getStorage();
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `gallery_${spotId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `spot_galleries/${spotId}/${filename}`);
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      const downloadUrl = await getDownloadURL(storageRef);
      // Prepare gallery image object
      const galleryImageObj = {
        url: downloadUrl,
        author: {
          uid: user.uid,
          name: user.displayName || user.email || "Unknown",
        },
        createdAt: Date.now(),
      };
      // Update Firestore
      const spotRef = doc(db, "studySpots", spotId);
      await updateDoc(spotRef, {
        galleryImages: arrayUnion(galleryImageObj),
      });
      setImages((prev) => [...prev, galleryImageObj]);
      if (setSpot) {
        setSpot((prev) => ({
          ...prev,
          galleryImages: [...(prev.galleryImages || []), galleryImageObj],
        }));
      }
      setIsUploading(false);
    } catch (e) {
      setIsUploading(false);
      console.error("Gallery image upload error:", e); // Add error logging
      Alert.alert("Error", "Failed to upload image.");
    }
  };

  if (!spotId) return null;

  // Helper to format timestamp
  function formatTimestamp(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <View style={[{ marginTop: -16 }, style]}>
      {/* Modal for image details */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
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
              borderRadius: 12,
              padding: 20,
              alignItems: "center",
              maxWidth: 420, // increased from 320
              width: "90%", // increased from 90%
            }}
          >
            {selectedImage && (
              <>
                <Image
                  source={{ uri: selectedImage.url }}
                  style={{
                    width: 300, // increased from 220
                    height: 180, // increased from 110
                    borderRadius: 8,
                    marginBottom: 16,
                  }}
                  resizeMode="cover"
                />
                <Text
                  style={{
                    color: themeColors.black,
                    fontWeight: "bold",
                    fontSize: 16,
                    fontFamily: "CarosSoft",
                  }}
                >
                  Added by: {selectedImage.author?.name || "Unknown"}
                </Text>
                <Text
                  style={{
                    color: themeColors.darkGray,
                    fontSize: 13,
                    marginTop: 4,
                    fontFamily: "CarosSoft",
                  }}
                >
                  {formatTimestamp(selectedImage.createdAt)}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  style={{
                    marginTop: 18,
                    backgroundColor: themeColors.purple,
                    borderRadius: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 18,
                  }}
                >
                  <Text
                    style={{
                      color: themeColors.white,
                      fontWeight: "bold",
                      fontFamily: "CarosSoft",
                    }}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: "bold",
            color: themeColors.purple,
            fontFamily: "CarosSoft",
            marginRight: 10,
          }}
        >
          Gallery
        </Text>
        <TouchableOpacity
          onPress={handleAddGalleryImage}
          style={{
            backgroundColor: themeColors.purple,
            borderRadius: 8,
            padding: 6,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 2,
            opacity: isUploading ? 0.6 : 1,
          }}
          disabled={isUploading}
        >
          <Plus size={20} color={themeColors.white} weight="bold" />
        </TouchableOpacity>
        {isUploading && (
          <ActivityIndicator
            size="small"
            color={themeColors.purple}
            style={{ marginLeft: 8 }}
          />
        )}
      </View>
      {images && images.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            minHeight: 120, // match preview height
            alignItems: "center",
          }}
          paddingVertical={8}
        >
          {images.map((img, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                setSelectedImage(img);
                setShowModal(true);
              }}
              activeOpacity={0.85}
            >
              <View
                style={{
                  width: 200, // match preview width
                  height: 120, // match preview height
                  borderRadius: 8,
                  overflow: "hidden",
                  marginRight: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 0,
                }}
              >
                <Image
                  source={{ uri: img.url || img }}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 8,
                  }}
                  resizeMode="cover"
                />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={{ marginBottom: 16 }}>
          <Text
            style={{ color: themeColors.darkGray, fontFamily: "CarosSoft" }}
          >
            No gallery images yet.
          </Text>
        </View>
      )}
    </View>
  );
}
