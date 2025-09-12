const admin = require('firebase-admin');
const serviceAccount = require('../firebaseAdmin.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'nook-9c7bc'
});

const db = admin.firestore();

async function deleteRecentActivityField() {
  try {
    console.log('Starting to delete recentActivity field from users...');
    
    // Get all users from the users collection
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('No users found in the database.');
      return;
    }
    
    console.log(`Found ${usersSnapshot.size} users in the database.`);
    
    let processedCount = 0;
    let deletedCount = 0;
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      // Check if the user has a recentActivity field
      if (userData.hasOwnProperty('recentActivity')) {
        console.log(`User ${doc.id} has recentActivity field, marking for deletion...`);
        
        // Add the field deletion to the batch
        batch.update(doc.ref, {
          recentActivity: admin.firestore.FieldValue.delete()
        });
        
        deletedCount++;
        batchCount++;
        
        // If we've reached the batch limit, commit the batch and start a new one
        if (batchCount >= BATCH_SIZE) {
          console.log(`Committing batch of ${batchCount} updates...`);
          await batch.commit();
          batchCount = 0;
        }
      }
      
      processedCount++;
      
      // Log progress every 100 users
      if (processedCount % 100 === 0) {
        console.log(`Processed ${processedCount} users so far...`);
      }
    }
    
    // Commit any remaining updates in the batch
    if (batchCount > 0) {
      console.log(`Committing final batch of ${batchCount} updates...`);
      await batch.commit();
    }
    
    console.log(`\n✅ Process completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total users processed: ${processedCount}`);
    console.log(`   - Users with recentActivity field: ${deletedCount}`);
    console.log(`   - Fields deleted: ${deletedCount}`);
    
  } catch (error) {
    console.error('❌ Error deleting recentActivity field:', error);
    throw error;
  }
}

// Run the script
deleteRecentActivityField()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
