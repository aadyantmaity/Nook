import { useState, useCallback, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";

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
  const [recentActivity, setRecentActivity] = useState([]); // add

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
        setRecentActivity(data.recentActivity || []);
        // --- Remove recentActivity logic ---
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

  // Upload image to Cloudinary and get download URL
  const uploadProfilePicToCloudinary = async (imageUri, userId) => {
    if (!imageUri || !userId) return null;
    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      type: "image/jpeg",
      name: `profile_${userId}_${Date.now()}.jpg`,
    });
    formData.append("upload_preset", "profilePictures");
    formData.append("folder", "profilePictures");
    const cloudinaryUrl =
      "https://api.cloudinary.com/v1_1/dxnd4aryf/image/upload";
    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    if (data.secure_url) {
      // Optimize URL: resize to 256x256, auto format, quality auto
      const parts = data.secure_url.split("/upload/");
      if (parts.length === 2) {
        return `${parts[0]}/upload/w_256,h_256,c_fill,f_auto,q_auto/${parts[1]}`;
      }
      return data.secure_url;
    }
    return null;
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
          const downloadUrl = await uploadProfilePicToCloudinary(
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
      // --- Add recentActivity for followed user ---
      let meDoc;
      try {
        meDoc = await getDoc(doc(db, "users", user.uid));
      } catch {}
      const meName = meDoc?.exists()
        ? `${meDoc.data().firstName || ""} ${
            meDoc.data().lastName || ""
          }`.trim()
        : "User";
      const meProfilePic = meDoc?.exists()
        ? meDoc.data().profilePic || null
        : null;
      try {
        await updateDoc(doc(db, "users", targetUid), {
          recentActivity: arrayUnion({
            type: "followed_by",
            uid: user.uid,
            name: meName,
            profilePic: meProfilePic,
            createdAt: Date.now(),
          }),
        });
      } catch (error) {
        if (
          error.code === "not-found" ||
          error.message.includes("No document to update")
        ) {
          await setDoc(
            doc(db, "users", targetUid),
            {
              recentActivity: [
                {
                  type: "followed_by",
                  uid: user.uid,
                  name: meName,
                  profilePic: meProfilePic,
                  createdAt: Date.now(),
                },
              ],
            },
            { merge: true }
          );
        }
      }
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
    recentActivity,
    setRecentActivity,
  };
}
