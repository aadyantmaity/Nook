import { useState, useCallback, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function useProfileData() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userGradYear, setUserGradYear] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data
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

  // Upload image to Firebase Storage and get download URL
  const uploadProfilePicToStorage = async (imageUri, userId) => {
    if (!imageUri || !userId) return null;
    const storage = getStorage();
    const response = await fetch(imageUri);
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
    isLoading,
    setFirstName,
    setLastName,
    setUserGradYear,
    setProfilePic,
    fetchUserData,
    saveProfile,
  };
}
