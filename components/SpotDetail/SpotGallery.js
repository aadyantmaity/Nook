import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
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
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState(
    Array.isArray(galleryImages) ? galleryImages : []
  );

  // Update images if prop changes
  React.useEffect(() => {
    setImages(Array.isArray(galleryImages) ? galleryImages : []);
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
        mediaTypes: ImagePicker.MediaType.IMAGE,
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
      // Update Firestore
      const spotRef = doc(db, "studySpots", spotId);
      await updateDoc(spotRef, {
        galleryImages: arrayUnion(downloadUrl),
      });
      setImages((prev) => [...prev, downloadUrl]);
      if (setSpot) {
        setSpot((prev) => ({
          ...prev,
          galleryImages: [...(prev.galleryImages || []), downloadUrl],
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

  return (
    <View style={{ marginTop: 8 }}>
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
            minHeight: imageStyle?.height || 120,
            alignItems: "center",
          }}
        >
          {images.map((img, idx) => (
            <View
              key={idx}
              style={{
                width:
                  typeof imageStyle?.width === "number"
                    ? imageStyle.width
                    : 180,
                height:
                  typeof imageStyle?.height === "number"
                    ? imageStyle.height
                    : 120,
                borderRadius:
                  typeof imageStyle?.borderRadius === "number"
                    ? imageStyle.borderRadius
                    : 8,
                overflow: "hidden",
                marginRight: 10,
                borderWidth: 0.5,
                borderColor: themeColors.black,
                backgroundColor: "#EEE",
                alignItems: "center",
                justifyContent: "center",
                marginBottom:
                  typeof imageStyle?.marginBottom === "number"
                    ? imageStyle.marginBottom
                    : 0,
              }}
            >
              <Image
                source={{ uri: img }}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius:
                    typeof imageStyle?.borderRadius === "number"
                      ? imageStyle.borderRadius
                      : 8,
                }}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={{ color: themeColors.darkGray, fontFamily: "CarosSoft" }}>
          No gallery images yet.
        </Text>
      )}
    </View>
  );
}
