import React, { useState, useEffect } from "react";
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
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Plus, Trash } from "phosphor-react-native";
import { getAuth } from "firebase/auth";

export default function SpotGallery({
  spotId,
  themeColors,
  imageStyle,
  style,
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const auth = getAuth();
  const user = auth.currentUser;

  // Fetch gallery images from subcollection
  useEffect(() => {
    if (!spotId) return;
    const imagesRef = collection(db, "galleryImages", spotId, "images");
    // Order by createdAt descending
    const q = query(imagesRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((doc) => {
        arr.push({ id: doc.id, ...doc.data() });
      });
      setImages(arr);
    });
    return () => unsub();
  }, [spotId]);

  // Upload image to subcollection
  const handleAddGalleryImage = async () => {
    try {
      if (!user) {
        Alert.alert("Error", "You must be signed in to upload images.");
        return;
      }
      if (!spotId) {
        Alert.alert("Error", "Invalid spot ID.");
        return;
      }
      setIsUploading(true);
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
      // Add to Firestore subcollection
      const imagesRef = collection(db, "galleryImages", spotId, "images");
      await addDoc(imagesRef, {
        url: downloadUrl,
        authorId: user.uid,
        authorName: user.displayName || user.email || "Unknown",
        createdAt: Date.now(),
        storagePath: `spot_galleries/${spotId}/${filename}`,
      });
      setIsUploading(false);
    } catch (e) {
      setIsUploading(false);
      console.error("Gallery image upload error:", e);
      Alert.alert("Error", "Failed to upload image.");
    }
  };

  // Delete image from subcollection and storage
  const handleDeleteGalleryImage = async (imgObj) => {
    if (!user || !imgObj || imgObj.authorId !== user.uid) return;
    Alert.alert("Delete Image", "Are you sure you want to delete this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setIsDeleting(true);
            // Delete Firestore doc
            const imgDocRef = doc(
              db,
              "galleryImages",
              spotId,
              "images",
              imgObj.id
            );
            await deleteDoc(imgDocRef);
            // Delete from Storage
            if (imgObj.storagePath) {
              try {
                const storage = getStorage();
                const fileRef = ref(storage, imgObj.storagePath);
                await deleteObject(fileRef);
              } catch (_) {}
            }
            setShowModal(false);
          } catch (e) {
            console.error("Gallery image delete error:", e);
            Alert.alert("Error", "Failed to delete image.");
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  // Helper to format timestamp
  function formatTimestamp(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!spotId) return null;

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
              paddingHorizontal: 20,
              paddingVertical: 16,
              alignItems: "center",
              maxWidth: 420,
              width: "90%",
              position: "relative",
            }}
          >
            {/* Trash can button with delete logic */}
            {selectedImage && user && selectedImage.authorId === user.uid && (
              <TouchableOpacity
                onPress={() => handleDeleteGalleryImage(selectedImage)}
                style={{
                  marginBottom: 15,
                  alignSelf: "flex-end",
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isDeleting ? 0.5 : 1,
                }}
                accessibilityLabel="Delete image"
                disabled={isDeleting}
              >
                <Trash size={22} color={themeColors.red} weight="bold" />
              </TouchableOpacity>
            )}
            {selectedImage && (
              <>
                <Image
                  source={{ uri: selectedImage.url }}
                  style={{
                    width: 300,
                    height: 180,
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
                  Added by: {selectedImage.authorName || "Unknown"}
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
            minHeight: 120,
            alignItems: "center",
          }}
          paddingVertical={8}
        >
          {images.map((img) => (
            <TouchableOpacity
              key={img.id}
              onPress={() => {
                setSelectedImage(img);
                setShowModal(true);
              }}
              activeOpacity={0.85}
            >
              <View
                style={{
                  width: 200,
                  height: 120,
                  borderRadius: 8,
                  overflow: "hidden",
                  marginRight: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 0,
                }}
              >
                <Image
                  source={{ uri: img.url }}
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
