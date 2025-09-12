const admin = require('firebase-admin');
const serviceAccount = require('../firebaseAdmin.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'nook-9c7bc'
});

const db = admin.firestore();

async function addRecentActivitySubcollection() {
  try {
    console.log('Starting to add recentActivity subcollection to all users...');
    
    // Get all users from the users collection
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('No users found in the database.');
      return;
    }
    
    console.log(`Found ${usersSnapshot.size} users in the database.`);
    
    let processedCount = 0;
    let addedCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      
      try {
        // Check if recentActivity subcollection already exists
        const recentActivitySnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('recentActivity')
          .limit(1)
          .get();
        
        if (recentActivitySnapshot.empty) {
          // Create an empty document in the recentActivity subcollection
          // This ensures the subcollection exists even if it's empty
          await db
            .collection('users')
            .doc(userId)
            .collection('recentActivity')
            .doc('_placeholder')
            .set({
              _created: admin.firestore.FieldValue.serverTimestamp(),
              _placeholder: true
            });
          
          // Delete the placeholder document to keep the subcollection truly empty
          await db
            .collection('users')
            .doc(userId)
            .collection('recentActivity')
            .doc('_placeholder')
            .delete();
          
          addedCount++;
          console.log(`✅ Added recentActivity subcollection to user ${userId}`);
        } else {
          console.log(`ℹ️  User ${userId} already has recentActivity subcollection`);
        }
        
        processedCount++;
        
        // Log progress every 50 users
        if (processedCount % 50 === 0) {
          console.log(`Processed ${processedCount} users so far...`);
        }
        
        // Add a small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (userError) {
        console.error(`❌ Error processing user ${userId}:`, userError);
        // Continue with the next user instead of stopping the entire process
      }
    }
    
    console.log(`\n✅ Process completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total users processed: ${processedCount}`);
    console.log(`   - RecentActivity subcollections added: ${addedCount}`);
    console.log(`   - Users that already had subcollection: ${processedCount - addedCount}`);
    
  } catch (error) {
    console.error('❌ Error adding recentActivity subcollection:', error);
    throw error;
  }
}

// Run the script
addRecentActivitySubcollection()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
