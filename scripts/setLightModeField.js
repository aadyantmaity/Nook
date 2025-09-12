// Node script to set `lightMode: true` on all user documents using Firebase Admin SDK
// Usage: node scripts/setLightModeField.js

const admin = require('firebase-admin');
const serviceAccount = require('../firebaseAdmin.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'nook-9c7bc',
});

const db = admin.firestore();

async function main() {
  console.log('Fetching users...');
  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users. Updating missing lightMode to true...`);

  let processed = 0;
  let updated = 0;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const docSnap of usersSnap.docs) {
    processed += 1;
    const data = docSnap.data() || {};
    if (typeof data.lightMode === 'boolean') {
      continue; // already set
    }
    batch.update(db.collection('users').doc(docSnap.id), { lightMode: true });
    opsInBatch += 1;
    updated += 1;

    if (opsInBatch >= 400) { // stay below 500 write/commit limit
      await batch.commit();
      console.log(`Committed batch. Total updated so far: ${updated}/${processed}`);
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  console.log(`Done. Updated ${updated} user documents.`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

