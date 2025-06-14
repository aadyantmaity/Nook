import { useState, useCallback, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function useProfileData() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userGradYear, setUserGradYear] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [cachedProfilePicUri, setCachedProfilePicUri] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to cache profile picture locally
  const cacheProfilePic = async (url) => {
    if (!url) {
      setCachedProfilePicUri(null);
      await AsyncStorage.removeItem("profilePicUri");
      await AsyncStorage.removeItem("profilePicUrl");
      return;
    }
    try {
      const cachedUrl = await AsyncStorage.getItem("profilePicUrl");
      const cachedUri = await AsyncStorage.getItem("profilePicUri");
      if (cachedUrl === url && cachedUri) {
        setCachedProfilePicUri(cachedUri);
        return;
      }
      const fileUri = FileSystem.cacheDirectory + "profile_pic.jpg";
      const downloadRes = await FileSystem.downloadAsync(url, fileUri);
      if (downloadRes.status === 200) {
        await AsyncStorage.setItem("profilePicUri", downloadRes.uri);
        await AsyncStorage.setItem("profilePicUrl", url);
        setCachedProfilePicUri(downloadRes.uri);
      } else {
        setCachedProfilePicUri(null);
      }
    } catch (e) {
      setCachedProfilePicUri(null);
    }
  };

  // Fetch user data and cache profile picture
  const fetchUserData = useCallback(async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFirstName(data.firstName || "No First Name");
          setLastName(data.lastName || "No Last Name");
          setUserEmail(data.email || "No Email");
          setUserGradYear(data.gradYear || "No Grad Year");
          setProfilePic(data.profilePic);
          if (data.profilePic) {
            cacheProfilePic(data.profilePic);
          } else {
            setCachedProfilePicUri(null);
            await AsyncStorage.removeItem("profilePicUri");
            await AsyncStorage.removeItem("profilePicUrl");
          }
        }
      } catch (error) {
        // handle error
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    if (profilePic) {
      cacheProfilePic(profilePic);
    } else {
      setCachedProfilePicUri(null);
    }
  }, [profilePic]);

  // Upload image to Firebase Storage and get download URL
  const uploadProfilePicToStorage = async (imageUri, userId) => {
    if (!imageUri || !userId) return null;
    const storage = getStorage();
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const response = await fetch(`data:image/jpeg;base64,${base64}`);
    const blob = await response.blob();
    const storageRef = ref(
      storage,
      `profile_pictures/${userId}_${Date.now()}.jpg`
    );
    await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
    return await getDownloadURL(storageRef);
  };

  // Save profile edits
  const saveProfile = async ({
    editedFirstName,
    editedLastName,
    editedGradYear,
    editedProfilePic,
  }) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const updateData = {
          firstName: editedFirstName || firstName,
          lastName: editedLastName || lastName,
          gradYear: editedGradYear || userGradYear,
          email: userEmail,
        };
        if (editedProfilePic && editedProfilePic !== profilePic) {
          const downloadUrl = await uploadProfilePicToStorage(
            editedProfilePic,
            user.uid
          );
          if (downloadUrl) {
            updateData.profilePic = downloadUrl;
            setProfilePic(downloadUrl);
            await cacheProfilePic(downloadUrl);
          }
        }
        await setDoc(doc(db, "users", user.uid), updateData, { merge: true });
        await updateProfile(user, {
          displayName: `${editedFirstName || firstName} ${
            editedLastName || lastName
          }`,
        });
        setFirstName(editedFirstName || firstName);
        setLastName(editedLastName || lastName);
        setUserGradYear(editedGradYear || userGradYear);
      }
    } catch (error) {
      // handle error
    }
  };

  return {
    firstName,
    lastName,
    userEmail,
    userGradYear,
    profilePic,
    cachedProfilePicUri,
    isLoading,
    setFirstName,
    setLastName,
    setUserGradYear,
    setProfilePic,
    fetchUserData,
    saveProfile,
  };
}
