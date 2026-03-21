#!/usr/bin/env python3
"""
Replace all public (non-private) studySpots in Firestore with the spots defined
in nooks.json at the repo root, and add dummy subcollections to each:
  - ratings
  - favoritedBy
  - alerts

Usage:
  cd /Users/aadyant/Nook
  python3 scripts/seed_study_spots_from_nooks.py

This script is destructive for public studySpots: it deletes all documents
where privateNook is False or missing, then recreates them from nooks.json.
Private nooks (privateNook == True) are left untouched.
"""

import json
import os
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, firestore


ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVICE_ACCOUNT_PATH = os.path.join(ROOT_DIR, "firebaseAdmin.json")
NOOKS_JSON_PATH = os.path.join(ROOT_DIR, "nooks.json")


def init_firestore():
  """
  Initialize Firebase Admin SDK and return a Firestore client.
  """
  if not os.path.exists(SERVICE_ACCOUNT_PATH):
    raise FileNotFoundError(
      f"firebaseAdmin.json not found at {SERVICE_ACCOUNT_PATH}. "
      "Make sure the service account file exists."
    )

  if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)

  return firestore.client()


def load_nooks():
  """
  Load nooks from nooks.json.
  """
  if not os.path.exists(NOOKS_JSON_PATH):
    raise FileNotFoundError(
      f"nooks.json not found at {NOOKS_JSON_PATH}. "
      "Make sure the file exists at the project root."
    )

  with open(NOOKS_JSON_PATH, "r") as f:
    data = json.load(f)

  if not isinstance(data, list):
    raise ValueError("nooks.json must contain a top-level JSON array.")

  return data


def delete_public_study_spots(db):
  """
  Delete all non-private studySpots (where privateNook is False or missing).
  Private nooks (privateNook == True) are preserved.
  """
  study_spots_ref = db.collection("studySpots")
  docs = list(study_spots_ref.stream())

  print(f"Found {len(docs)} total studySpots documents.")

  deleted_count = 0
  for snap in docs:
    data = snap.to_dict() or {}
    is_private = bool(data.get("privateNook", False))
    if not is_private:
      print(f"Deleting public studySpot: {snap.id} ({data.get('name')})")

      # Delete known subcollections before deleting the main document
      for sub_name in ("ratings", "favoritedBy", "alerts"):
        sub_ref = snap.reference.collection(sub_name)
        sub_docs = list(sub_ref.stream())
        if sub_docs:
          print(f"  - Deleting {len(sub_docs)} docs from subcollection '{sub_name}'")
        for sub_doc in sub_docs:
          sub_doc.reference.delete()

      # Now delete the parent document
      snap.reference.delete()
      deleted_count += 1

  print(f"Deleted {deleted_count} public studySpots.\n")


def create_dummy_subcollections(spot_ref):
  """
  Create dummy documents in the ratings, favoritedBy, and alerts subcollections
  for the given studySpot document reference.
  """
  now_server_ts = firestore.SERVER_TIMESTAMP

  # ratings subcollection: simple rating from a dummy user
  ratings_ref = spot_ref.collection("ratings")
  ratings_ref.add(
    {
      "userId": "dummyUser",
      "rating": 5,
      "comment": "Seed rating for demo",
      "createdAt": now_server_ts,
    }
  )

  # favoritedBy subcollection: mark a dummy user as having favorited this spot
  favorited_by_ref = spot_ref.collection("favoritedBy")
  favorited_by_ref.document("dummyUser").set(
    {
      "userId": "dummyUser",
      "favoritedAt": now_server_ts,
    }
  )

  # alerts subcollection: a single dummy alert
  alerts_ref = spot_ref.collection("alerts")
  alerts_ref.add(
    {
      "type": "info",
      "message": "Dummy alert for seeded nook",
      "createdAt": now_server_ts,
    }
  )


def map_nook_to_study_spot_doc(nook):
  """
  Map a nook entry from nooks.json into the Firestore studySpots schema that the app expects.
  """
  # Coordinates are required for the map, so use the provided values.
  coordinates = {
    "latitude": float(nook["latitude"]),
    "longitude": float(nook["longitude"]),
  }

  # Floors in nooks.json are an array of floor numbers; we store them
  # as a numeric array, and leave roomNumber blank for these seeded docs.
  floors = nook.get("floors") or []

  # Department is only relevant when huskyCardNeeded is true, following AddSpotScreen logic.
  husky_card_needed = bool(nook.get("huskyCardNeeded", False))
  department = nook.get("department") if husky_card_needed else None

  # Use ISO8601 UTC timestamp similar to AddSpotScreen createdAt
  created_at_iso = datetime.now(timezone.utc).isoformat()

  return {
    "name": nook.get("name"),
    "buildingName": nook.get("name"),
    "roomNumber": "",
    "floors": floors,
    "huskyCardNeeded": husky_card_needed,
    "department": department,
    "tags": nook.get("tags", []),
    "description": nook.get("description", ""),
    "createdAt": created_at_iso,
    "addedBy": nook.get("addedBy", "seed-script"),
    "revealIdentity": False,
    "photoUrl": nook.get("image", ""),
    "coordinates": coordinates,
    "privateNook": False,
    "sharedWith": [],
  }


def seed_study_spots():
  db = init_firestore()
  nooks = load_nooks()

  print("Starting replacement of public studySpots with nooks from nooks.json\n")

  # 1. Delete existing public studySpots
  delete_public_study_spots(db)

  # 2. Create new studySpots from nooks.json
  study_spots_ref = db.collection("studySpots")

  created_count = 0
  for nook in nooks:
    doc_data = map_nook_to_study_spot_doc(nook)
    print(f"Creating studySpot: {doc_data['name']}")
    # Create the main document
    spot_ref = study_spots_ref.document()
    spot_ref.set(doc_data)

    # 3. Create subcollections with dummy data
    create_dummy_subcollections(spot_ref)

    created_count += 1

  print(f"\nDone. Created {created_count} studySpots from nooks.json.")


if __name__ == "__main__":
  seed_study_spots()


