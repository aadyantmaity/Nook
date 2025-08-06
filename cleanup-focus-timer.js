const admin = require("firebase-admin");

// Check for dry-run flag
const isDryRun = process.argv.includes("--dry-run");

// Initialize Firebase Admin SDK
// You'll need to replace this with your actual service account key path
// or set GOOGLE_APPLICATION_CREDENTIALS environment variable
const serviceAccount = require("./firebaseAdmin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Replace with your actual project ID
  projectId: "nook-9c7bc",
});

const db = admin.firestore();

async function cleanupFocusTimerData() {
  console.log(
    `Starting focus timer data cleanup... ${isDryRun ? "(DRY RUN)" : ""}`
  );

  try {
    // Get all users
    const usersSnapshot = await db.collection("users").get();

    if (usersSnapshot.empty) {
      console.log("No users found in the database.");
      return;
    }

    console.log(`Found ${usersSnapshot.size} users. Starting cleanup...`);

    let processedCount = 0;
    let updatedCount = 0;
    let totalFieldsRemoved = 0;

    // Process each user document
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Fields to remove from user documents
      const fieldsToRemove = [
        "timerState",
        "lastTimerStateUpdate",
        "workTimeSetting",
        "breakTimeSetting",
        "focusGoalState",
        "focusGoalArchive",
        "pomodoroSettings",
        "focusPomodoroSettings",
        "reflectionsEnabled",
      ];

      // Check if user has any focus timer related fields
      const hasFocusTimerData = fieldsToRemove.some((field) =>
        userData.hasOwnProperty(field)
      );

      if (hasFocusTimerData) {
        console.log(`Cleaning up focus timer data for user: ${userId}`);

        // Create update object with fieldValue.delete() for each field
        const updateData = {};
        let fieldsFound = 0;

        fieldsToRemove.forEach((field) => {
          if (userData.hasOwnProperty(field)) {
            updateData[field] = admin.firestore.FieldValue.delete();
            console.log(`  - Removing field: ${field}`);
            fieldsFound++;
          }
        });

        if (fieldsFound > 0) {
          if (!isDryRun) {
            // Update the user document
            await db.collection("users").doc(userId).update(updateData);
            console.log(
              `  ✅ Updated user document (removed ${fieldsFound} fields)`
            );
          } else {
            console.log(
              `  🔍 Would update user document (would remove ${fieldsFound} fields)`
            );
          }
          updatedCount++;
          totalFieldsRemoved += fieldsFound;
        }
      }

      processedCount++;

      // Log progress every 10 users
      if (processedCount % 10 === 0) {
        console.log(
          `Processed ${processedCount}/${usersSnapshot.size} users...`
        );
      }
    }

    console.log("\n=== Cleanup Summary ===");
    console.log(`Total users processed: ${processedCount}`);
    console.log(
      `Users ${isDryRun ? "that would be" : ""} updated: ${updatedCount}`
    );
    console.log(
      `Total fields ${
        isDryRun ? "that would be" : ""
      } removed: ${totalFieldsRemoved}`
    );
    console.log(
      `Focus timer data cleanup ${
        isDryRun ? "dry run" : "completed"
      } successfully!`
    );
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  }
}

// Also clean up any focus timer related collections if they exist
async function cleanupFocusTimerCollections() {
  console.log(
    `\nChecking for focus timer related collections... ${
      isDryRun ? "(DRY RUN)" : ""
    }`
  );

  const collectionsToCheck = [
    "focusSessions",
    "timerStates",
    "pomodoroSessions",
    "focusGoals",
  ];

  for (const collectionName of collectionsToCheck) {
    try {
      const snapshot = await db.collection(collectionName).get();

      if (!snapshot.empty) {
        console.log(
          `Found ${snapshot.size} documents in ${collectionName} collection.`
        );

        if (!isDryRun) {
          // Delete all documents in the collection
          const batch = db.batch();
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          await batch.commit();
          console.log(
            `✅ Deleted all documents in ${collectionName} collection.`
          );
        } else {
          console.log(
            `🔍 Would delete all ${snapshot.size} documents in ${collectionName} collection.`
          );
        }
      } else {
        console.log(`No documents found in ${collectionName} collection.`);
      }
    } catch (error) {
      // Collection might not exist, which is fine
      console.log(
        `Collection ${collectionName} does not exist or error accessing it:`,
        error.message
      );
    }
  }
}

// Main execution function
async function main() {
  try {
    if (isDryRun) {
      console.log("🔍 DRY RUN MODE - No actual changes will be made\n");
    }

    await cleanupFocusTimerData();
    await cleanupFocusTimerCollections();

    if (isDryRun) {
      console.log(
        "\n🔍 Dry run completed! Review the output above to see what would be cleaned up."
      );
      console.log("To actually perform the cleanup, run: npm run cleanup");
    } else {
      console.log("\n🎉 All focus timer data cleanup completed!");
    }
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    process.exit(1);
  } finally {
    // Close the Firebase connection
    admin.app().delete();
  }
}

// Run the cleanup
if (require.main === module) {
  main();
}

module.exports = {
  cleanupFocusTimerData,
  cleanupFocusTimerCollections,
};
