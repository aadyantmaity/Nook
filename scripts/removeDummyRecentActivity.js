const admin = require('firebase-admin');
const serviceAccount = require('../firebaseAdmin.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'nook-9c7bc'
});

const db = admin.firestore();

// Dummy user IDs and spot IDs that were used in the dummy data
const dummyUserIds = [
  'dummyFollower1',
  'dummyFollower2', 
  'dummyFollower3',
  'dummyFollower4',
  'dummyFollower5',
  'dummyFollower6',
  'dummyChecker1',
  'dummyChecker2',
  'dummyChecker3',
  'dummyChecker4',
  'dummyChecker5',
  'dummyChecker6'
];

const dummySpotIds = [
  'dummySpot1',
  'dummySpot2',
  'dummySpot3',
  'dummySpot4',
  'dummySpot5',
  'dummySpot6'
];

const dummySpotNames = [
  'Central Library Study Room',
  'Coffee Corner Cafe',
  'Quiet Reading Nook',
  'Student Union Study Area',
  'Campus Garden Study Spot',
  'Tech Lab Study Room'
];

const dummyDisplayNames = [
  'Alex Johnson',
  'Sarah Chen',
  'Mike Rodriguez',
  'Emma Wilson',
  'David Kim',
  'Lisa Thompson'
];

async function removeDummyRecentActivity() {
  try {
    const targetUserId = 'xi85MimfMoYwPvRQ7NcmvYx7jDD3';
    
    console.log(`🗑️  Starting to remove dummy recent activity for user: ${targetUserId}`);
    
    // Check if user exists
    const userDoc = await db.collection('users').doc(targetUserId).get();
    if (!userDoc.exists) {
      console.error(`❌ User ${targetUserId} does not exist in the database.`);
      return;
    }
    
    console.log(`✅ User ${targetUserId} found in the database.`);
    
    // Get all activities for the user
    const activitiesSnapshot = await db
      .collection('users')
      .doc(targetUserId)
      .collection('recentActivity')
      .get();
    
    if (activitiesSnapshot.empty) {
      console.log('ℹ️  No activities found for this user.');
      return;
    }
    
    console.log(`📋 Found ${activitiesSnapshot.size} total activities.`);
    
    let removedCount = 0;
    let followRemoved = 0;
    let checkinRemoved = 0;
    
    // Process each activity
    for (const docSnapshot of activitiesSnapshot.docs) {
      const activityData = docSnapshot.data();
      let shouldRemove = false;
      let removalReason = '';
      
      // Check if it's a dummy follow activity
      if (activityData.type === 'follow') {
        if (dummyUserIds.includes(activityData.followedBy) || 
            dummyDisplayNames.includes(activityData.displayName)) {
          shouldRemove = true;
          removalReason = 'dummy follow activity';
        }
      }
      
      // Check if it's a dummy check-in activity
      if (activityData.type === 'checkin') {
        if (dummyUserIds.includes(activityData.checkedInBy) ||
            dummySpotIds.includes(activityData.spotId) ||
            dummySpotNames.includes(activityData.spotName) ||
            activityData.displayName === 'Someone') {
          shouldRemove = true;
          removalReason = 'dummy check-in activity';
        }
      }
      
      // Remove the activity if it matches dummy data patterns
      if (shouldRemove) {
        try {
          await docSnapshot.ref.delete();
          removedCount++;
          
          if (activityData.type === 'follow') {
            followRemoved++;
          } else if (activityData.type === 'checkin') {
            checkinRemoved++;
          }
          
          console.log(`🗑️  Removed ${activityData.type} activity: ${activityData.displayName || activityData.spotName} (${removalReason})`);
          
          // Add a small delay to avoid overwhelming Firestore
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (deleteError) {
          console.error(`❌ Error removing activity:`, deleteError);
        }
      }
    }
    
    console.log(`\n✅ Cleanup completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Target user: ${targetUserId}`);
    console.log(`   - Total activities found: ${activitiesSnapshot.size}`);
    console.log(`   - Activities removed: ${removedCount}`);
    console.log(`   - Follow activities removed: ${followRemoved}`);
    console.log(`   - Check-in activities removed: ${checkinRemoved}`);
    console.log(`   - Remaining activities: ${activitiesSnapshot.size - removedCount}`);
    
  } catch (error) {
    console.error('❌ Error removing dummy recent activity:', error);
    throw error;
  }
}

// Run the script
removeDummyRecentActivity()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
