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

async function removeAllDummyData() {
  try {
    console.log('🗑️  Starting to remove ALL dummy recent activity data...');
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('ℹ️  No users found in the database.');
      return;
    }
    
    console.log(`👥 Found ${usersSnapshot.size} users in the database.`);
    
    let totalRemovedCount = 0;
    let totalFollowRemoved = 0;
    let totalCheckinRemoved = 0;
    let usersProcessed = 0;
    let usersWithDummyData = 0;
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      usersProcessed++;
      
      console.log(`\n👤 Processing user ${usersProcessed}/${usersSnapshot.size}: ${userId}`);
      
      // Get all activities for this user
      const activitiesSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('recentActivity')
        .get();
      
      if (activitiesSnapshot.empty) {
        console.log(`   ℹ️  No activities found for user ${userId}`);
        continue;
      }
      
      console.log(`   📋 Found ${activitiesSnapshot.size} activities for user ${userId}`);
      
      let userRemovedCount = 0;
      let userFollowRemoved = 0;
      let userCheckinRemoved = 0;
      
      // Process each activity for this user
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
              dummySpotNames.includes(activityData.spotName)) {
            shouldRemove = true;
            removalReason = 'dummy check-in activity';
          }
        }
        
        // Remove the activity if it matches dummy data patterns
        if (shouldRemove) {
          try {
            await docSnapshot.ref.delete();
            userRemovedCount++;
            
            if (activityData.type === 'follow') {
              userFollowRemoved++;
            } else if (activityData.type === 'checkin') {
              userCheckinRemoved++;
            }
            
            console.log(`   🗑️  Removed ${activityData.type} activity: ${activityData.displayName || activityData.spotName}`);
            
            // Add a small delay to avoid overwhelming Firestore
            await new Promise(resolve => setTimeout(resolve, 25));
            
          } catch (deleteError) {
            console.error(`   ❌ Error removing activity:`, deleteError);
          }
        }
      }
      
      // Update totals
      totalRemovedCount += userRemovedCount;
      totalFollowRemoved += userFollowRemoved;
      totalCheckinRemoved += userCheckinRemoved;
      
      if (userRemovedCount > 0) {
        usersWithDummyData++;
        console.log(`   ✅ Removed ${userRemovedCount} dummy activities from user ${userId}`);
        console.log(`      - Follow activities: ${userFollowRemoved}`);
        console.log(`      - Check-in activities: ${userCheckinRemoved}`);
      } else {
        console.log(`   ✅ No dummy data found for user ${userId}`);
      }
    }
    
    console.log(`\n🎉 Cleanup completed successfully!`);
    console.log(`📊 Final Summary:`);
    console.log(`   - Users processed: ${usersProcessed}`);
    console.log(`   - Users with dummy data: ${usersWithDummyData}`);
    console.log(`   - Total activities removed: ${totalRemovedCount}`);
    console.log(`   - Follow activities removed: ${totalFollowRemoved}`);
    console.log(`   - Check-in activities removed: ${totalCheckinRemoved}`);
    
  } catch (error) {
    console.error('❌ Error removing dummy data:', error);
    throw error;
  }
}

// Run the script
removeAllDummyData()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
