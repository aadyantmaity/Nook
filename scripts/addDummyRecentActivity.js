const admin = require('firebase-admin');
const serviceAccount = require('../firebaseAdmin.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'nook-9c7bc'
});

const db = admin.firestore();

// Dummy data for recent activities
const dummyActivities = [
  // Follow activities
  {
    type: 'follow',
    followedBy: 'dummyFollower1',
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000)), // 5 minutes ago
    displayName: 'Alex Johnson'
  },
  {
    type: 'follow',
    followedBy: 'dummyFollower2',
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 15 * 60 * 1000)), // 15 minutes ago
    displayName: 'Sarah Chen'
  },
  {
    type: 'follow',
    followedBy: 'dummyFollower3',
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 30 * 60 * 1000)), // 30 minutes ago
    displayName: 'Mike Rodriguez'
  },
  {
    type: 'follow',
    followedBy: 'dummyFollower4',
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)), // 2 hours ago
    displayName: 'Emma Wilson'
  },
  {
    type: 'follow',
    followedBy: 'dummyFollower5',
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 4 * 60 * 60 * 1000)), // 4 hours ago
    displayName: 'David Kim'
  },
  {
    type: 'follow',
    followedBy: 'dummyFollower6',
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 6 * 60 * 60 * 1000)), // 6 hours ago
    displayName: 'Lisa Thompson'
  },
  
  // Check-in activities
  {
    type: 'checkin',
    checkedInBy: 'dummyChecker1',
    spotId: 'dummySpot1',
    spotName: 'Central Library Study Room',
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 10 * 60 * 1000)), // 10 minutes ago
    displayName: 'Someone'
  },
  {
    type: 'checkin',
    checkedInBy: 'dummyChecker2',
    spotId: 'dummySpot2',
    spotName: 'Coffee Corner Cafe',
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 45 * 60 * 1000)), // 45 minutes ago
    displayName: 'Someone'
  },
  {
    type: 'checkin',
    checkedInBy: 'dummyChecker3',
    spotId: 'dummySpot3',
    spotName: 'Quiet Reading Nook',
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1.5 * 60 * 60 * 1000)), // 1.5 hours ago
    displayName: 'Someone'
  },
  {
    type: 'checkin',
    checkedInBy: 'dummyChecker4',
    spotId: 'dummySpot4',
    spotName: 'Student Union Study Area',
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 60 * 60 * 1000)), // 3 hours ago
    displayName: 'Someone'
  },
  {
    type: 'checkin',
    checkedInBy: 'dummyChecker5',
    spotId: 'dummySpot5',
    spotName: 'Campus Garden Study Spot',
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 60 * 1000)), // 5 hours ago
    displayName: 'Someone'
  },
  {
    type: 'checkin',
    checkedInBy: 'dummyChecker6',
    spotId: 'dummySpot6',
    spotName: 'Tech Lab Study Room',
    timestamp: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 8 * 60 * 60 * 1000)), // 8 hours ago
    displayName: 'Someone'
  }
];

async function addDummyRecentActivity() {
  try {
    const targetUserId = 'xi85MimfMoYwPvRQ7NcmvYx7jDD3';
    
    console.log(`Starting to add dummy recent activity for user: ${targetUserId}`);
    
    // Check if user exists
    const userDoc = await db.collection('users').doc(targetUserId).get();
    if (!userDoc.exists) {
      console.error(`❌ User ${targetUserId} does not exist in the database.`);
      return;
    }
    
    console.log(`✅ User ${targetUserId} found in the database.`);
    
    // Add each dummy activity
    let addedCount = 0;
    
    for (let i = 0; i < dummyActivities.length; i++) {
      const activity = dummyActivities[i];
      
      try {
        await db
          .collection('users')
          .doc(targetUserId)
          .collection('recentActivity')
          .add(activity);
        
        addedCount++;
        console.log(`✅ Added activity ${i + 1}/${dummyActivities.length}: ${activity.type} - ${activity.displayName || activity.spotName}`);
        
        // Add a small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (activityError) {
        console.error(`❌ Error adding activity ${i + 1}:`, activityError);
      }
    }
    
    console.log(`\n✅ Process completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Target user: ${targetUserId}`);
    console.log(`   - Activities added: ${addedCount}/${dummyActivities.length}`);
    console.log(`   - Follow activities: ${dummyActivities.filter(a => a.type === 'follow').length}`);
    console.log(`   - Check-in activities: ${dummyActivities.filter(a => a.type === 'checkin').length}`);
    
  } catch (error) {
    console.error('❌ Error adding dummy recent activity:', error);
    throw error;
  }
}

// Run the script
addDummyRecentActivity()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
