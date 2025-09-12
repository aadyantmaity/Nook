import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Adds a follow activity to the followed user's recentActivity subcollection
 * @param {string} followedUserId - The UID of the user being followed
 * @param {string} followerUserId - The UID of the user doing the following
 * @param {string} followerDisplayName - The display name of the follower (optional)
 * @returns {Promise<void>}
 */
export const addFollowActivity = async (followedUserId, followerUserId, followerDisplayName = null, followerProfilePic = null) => {
  try {
    if (!followedUserId || !followerUserId) {
      console.warn('addFollowActivity: Missing required parameters');
      return;
    }

    // Don't add activity if user is following themselves
    if (followedUserId === followerUserId) {
      return;
    }

    // If display name not provided, fetch it
    let displayName = followerDisplayName;
    let profilePic = followerProfilePic;
    
    if (!displayName || !profilePic) {
      try {
        const followerDoc = await getDoc(doc(db, 'users', followerUserId));
        if (followerDoc.exists()) {
          const userData = followerDoc.data();
          if (!displayName) {
            displayName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
          }
          if (!profilePic) {
            profilePic = userData.profilePic;
          }
        }
      } catch (error) {
        console.error('Error fetching follower data:', error);
      }
    }

    const activityData = {
      type: 'follow',
      followedBy: followerUserId,
      timestamp: serverTimestamp(),
      displayName: displayName,
      // Store additional data to reduce future fetches
      followerProfilePic: profilePic,
    };

    // Add the activity to the followed user's recentActivity subcollection
    await addDoc(
      collection(db, 'users', followedUserId, 'recentActivity'),
      activityData
    );

    console.log(`Follow activity added for user ${followedUserId} by ${followerUserId}`);
  } catch (error) {
    console.error('Error adding follow activity:', error);
    // Don't throw the error to avoid breaking the follow functionality
  }
};
