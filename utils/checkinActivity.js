import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Adds a check-in activity to the nook owner's recentActivity subcollection
 * @param {string} spotId - The ID of the nook being checked into
 * @param {string} spotName - The name of the nook
 * @param {string} checkedInBy - The UID of the user checking in
 * @param {string} checkedInByName - The display name of the user checking in (optional)
 * @param {string} nookOwnerUid - The UID of the nook owner
 * @returns {Promise<void>}
 */
export const addCheckinActivity = async (spotId, spotName, checkedInBy, checkedInByName = null, nookOwnerUid, spotImage = null) => {
  try {
    if (!spotId || !checkedInBy || !nookOwnerUid) {
      console.warn('addCheckinActivity: Missing required parameters');
      return;
    }

    // Don't add activity if user is checking into their own nook
    if (checkedInBy === nookOwnerUid) {
      return;
    }

    // Batch fetch both user documents in parallel
    const [checkedInUserDoc, nookOwnerDoc] = await Promise.all([
      getDoc(doc(db, 'users', checkedInBy)),
      getDoc(doc(db, 'users', nookOwnerUid))
    ]);

    let displayName = checkedInByName;
    let isFriend = false;

    // Process checked-in user data
    if (checkedInUserDoc.exists()) {
      const userData = checkedInUserDoc.data();
      if (!displayName) {
        displayName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
      }
    }

    // Process nook owner data to check friendship
    if (nookOwnerDoc.exists()) {
      const ownerData = nookOwnerDoc.data();
      isFriend = (ownerData.followers || []).includes(checkedInBy);
    }

    // If not a friend, use generic name
    if (!isFriend) {
      displayName = "Someone";
    }

    const activityData = {
      type: 'checkin',
      checkedInBy: checkedInBy,
      spotId: spotId,
      spotName: spotName,
      timestamp: serverTimestamp(),
      displayName: displayName,
      // Store additional data to reduce future fetches
      spotImage: spotImage,
      isMutualFriend: isFriend, // Store this to avoid re-checking
    };

    // Add the activity to the nook owner's recentActivity subcollection
    await addDoc(
      collection(db, 'users', nookOwnerUid, 'recentActivity'),
      activityData
    );

    console.log(`Check-in activity added for nook owner ${nookOwnerUid} by ${checkedInBy}`);
  } catch (error) {
    console.error('Error adding check-in activity:', error);
    // Don't throw the error to avoid breaking the check-in functionality
  }
};
