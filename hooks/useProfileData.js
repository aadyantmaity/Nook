import { useState, useCallback, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot, // <-- add this
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export function useProfileData(targetUid = null) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userGradYear, setUserGradYear] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [workTimeSetting, setWorkTimeSetting] = useState(null); // add
  const [breakTimeSetting, setBreakTimeSetting] = useState(null); // add

  // --- Live Firestore subscription for user data ---
  useEffect(() => {
    const user = auth.currentUser;
    const uid = targetUid || user?.uid;
    if (!uid) return;
    setIsLoading(true);
    const unsub = onSnapshot(doc(db, "users", uid), (userDoc) => {
      if (userDoc.exists()) {
        const data = userDoc.data();
        setFirstName(data.firstName || "No First Name");
        setLastName(data.lastName || "No Last Name");
        setUserEmail(data.email || "No Email");
        setUserGradYear(data.gradYear || "No Grad Year");
        setProfilePic(data.profilePic);
        setFollowers(data.followers || []);
        setFollowing(data.following || []);
        setWorkTimeSetting(data.workTimeSetting || null);
        setBreakTimeSetting(data.breakTimeSetting || null);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [targetUid]);

  // --- Keep isFollowing in sync with followers and auth.currentUser ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !targetUid || user.uid === targetUid) {
      setIsFollowing(false);
      return;
    }
    // Fix: isFollowing should be true if *other user's* followers includes *current user's* UID
    setIsFollowing(followers.includes(user.uid));
  }, [followers, targetUid, auth.currentUser]);

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

  // Save profile edits (only for current user)
  const saveProfile = async ({
    editedFirstName,
    editedLastName,
    editedGradYear,
    editedProfilePic,
  }) => {
    try {
      const user = auth.currentUser;
      if (user && (!targetUid || targetUid === user.uid)) {
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

  // --- Follow/Unfollow logic ---
  const followUser = async () => {
    const user = auth.currentUser;
    if (!user || !targetUid || user.uid === targetUid) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        following: arrayUnion(targetUid),
      });
      await updateDoc(doc(db, "users", targetUid), {
        followers: arrayUnion(user.uid),
      });
      // No need to manually update state, onSnapshot will handle it
    } catch {}
  };

  const unfollowUser = async () => {
    const user = auth.currentUser;
    if (!user || !targetUid || user.uid === targetUid) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        following: arrayRemove(targetUid),
      });
      await updateDoc(doc(db, "users", targetUid), {
        followers: arrayRemove(user.uid),
      });
      // No need to manually update state, onSnapshot will handle it
    } catch {}
  };

  // --- Add setters for Pomodoro settings (only for current user) ---
  const setWorkTimeSettingFirestore = async (val) => {
    const user = auth.currentUser;
    if (user && (!targetUid || targetUid === user.uid)) {
      await updateDoc(doc(db, "users", user.uid), { workTimeSetting: val });
    }
  };
  const setBreakTimeSettingFirestore = async (val) => {
    const user = auth.currentUser;
    if (user && (!targetUid || targetUid === user.uid)) {
      await updateDoc(doc(db, "users", user.uid), { breakTimeSetting: val });
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
    fetchUserData: () => {}, // No-op, live updates now
    saveProfile,
    followers,
    following,
    isFollowing,
    followUser,
    unfollowUser,
    workTimeSetting,
    setWorkTimeSetting: setWorkTimeSettingFirestore,
    breakTimeSetting,
    setBreakTimeSetting: setBreakTimeSettingFirestore,
  };
}
