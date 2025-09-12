# Firebase Admin Scripts

This directory contains Firebase admin scripts for managing the Nook app database.

## Prerequisites

1. Node.js installed on your system
2. Firebase Admin SDK service account key (`firebaseAdmin.json`) in the project root
3. Proper permissions to modify the Firestore database

## Setup

1. Navigate to the scripts directory:
   ```bash
   cd scripts
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Scripts

### Delete Recent Activity Field

This script removes the `recentActivity` field from all users who have it in the Firestore database.

**Usage:**
```bash
npm run delete-recent-activity
```

**What it does:**
- Connects to your Firebase project using the admin SDK
- Queries all users in the `users` collection
- Identifies users who have the `recentActivity` field
- Deletes the field using Firestore batch operations
- Provides progress updates and a summary of the operation

**Safety features:**
- Uses batch operations for efficiency and atomicity
- Processes users in batches of 500 (Firestore limit)
- Provides detailed logging of the operation
- Shows progress updates every 100 users

**Output:**
The script will show:
- Total number of users processed
- Number of users that had the `recentActivity` field
- Confirmation of successful deletion

### Add Recent Activity Subcollection

This script adds an empty `recentActivity` subcollection to all users in the Firestore database.

**Usage:**
```bash
npm run add-recent-activity
```

**What it does:**
- Connects to your Firebase project using the admin SDK
- Queries all users in the `users` collection
- Creates an empty `recentActivity` subcollection for each user
- Skips users who already have the subcollection
- Provides progress updates and a summary of the operation

**How it works:**
- Creates a placeholder document in the subcollection
- Immediately deletes the placeholder to keep the subcollection empty
- This ensures the subcollection exists in Firestore even when empty

**Safety features:**
- Checks if subcollection already exists before creating
- Includes error handling for individual users
- Processes users with small delays to avoid overwhelming Firestore
- Provides detailed logging of the operation
- Shows progress updates every 50 users

**Output:**
The script will show:
- Total number of users processed
- Number of subcollections added
- Number of users that already had the subcollection

## Important Notes

⚠️ **This script permanently deletes data from your database. Make sure you have a backup before running it.**

- The script only deletes the `recentActivity` field, not the entire user document
- It's safe to run multiple times (won't affect users who don't have the field)
- The operation is performed in batches to handle large datasets efficiently
