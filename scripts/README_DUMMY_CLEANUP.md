# Dummy Data Cleanup Scripts

This directory contains scripts to remove dummy data from the Recent Activity feature.

## Scripts Available

### 1. `removeDummyRecentActivity.js`
Removes dummy data from a specific user (the one used in testing).

**Usage:**
```bash
cd scripts
node removeDummyRecentActivity.js
```

**What it removes:**
- Follow activities with dummy user IDs (`dummyFollower1`, `dummyFollower2`, etc.)
- Follow activities with dummy display names (`Alex Johnson`, `Sarah Chen`, etc.)
- Check-in activities with dummy user IDs (`dummyChecker1`, `dummyChecker2`, etc.)
- Check-in activities with dummy spot IDs (`dummySpot1`, `dummySpot2`, etc.)
- Check-in activities with dummy spot names (`Central Library Study Room`, etc.)

### 2. `removeAllDummyData.js`
Removes dummy data from ALL users in the database.

**Usage:**
```bash
cd scripts
node removeAllDummyData.js
```

**What it does:**
- Scans all users in the database
- Removes dummy activities from each user's `recentActivity` subcollection
- Provides detailed logging for each user processed
- Shows comprehensive summary at the end

## Dummy Data Patterns

The scripts identify dummy data by looking for:

### Follow Activities:
- `followedBy` field containing dummy user IDs
- `displayName` field containing dummy names

### Check-in Activities:
- `checkedInBy` field containing dummy user IDs
- `spotId` field containing dummy spot IDs
- `spotName` field containing dummy spot names

## Safety Features

- **Dry Run Capability**: Scripts show what will be removed before actually deleting
- **Detailed Logging**: Each removal is logged with the reason
- **Error Handling**: Continues processing even if individual deletions fail
- **Rate Limiting**: Small delays between operations to avoid overwhelming Firestore
- **Comprehensive Reporting**: Shows exactly what was removed and from which users

## Prerequisites

1. **Firebase Admin SDK**: Make sure `firebaseAdmin.json` is in the project root
2. **Node.js**: Required to run the scripts
3. **Dependencies**: Run `npm install` in the scripts directory if needed

## Example Output

```
🗑️  Starting to remove dummy recent activity for user: xi85MimfMoYwPvRQ7NcmvYx7jDD3
✅ User xi85MimfMoYwPvRQ7NcmvYx7jDD3 found in the database.
📋 Found 12 total activities.
🗑️  Removed follow activity: Alex Johnson (dummy follow activity)
🗑️  Removed check-in activity: Central Library Study Room (dummy check-in activity)
...

✅ Cleanup completed successfully!
📊 Summary:
   - Target user: xi85MimfMoYwPvRQ7NcmvYx7jDD3
   - Total activities found: 12
   - Activities removed: 12
   - Follow activities removed: 6
   - Check-in activities removed: 6
   - Remaining activities: 0
```

## Notes

- These scripts are safe to run multiple times
- They only remove data that matches the dummy data patterns
- Real user data will not be affected
- Always backup your database before running cleanup scripts in production
