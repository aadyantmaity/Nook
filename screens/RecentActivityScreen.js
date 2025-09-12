import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from "react-native";
import {
  ArrowLeft,
  UserPlus,
  MapPin,
  Clock,
  User,
} from "phosphor-react-native";
import { FONTS } from "../constants/fonts";
import { ThemeContext } from "../App";
import CircleLoader from "../components/common/CircleLoader";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  startAfter,
  limitToLast,
} from "firebase/firestore";

export default function RecentActivityScreen({ navigation }) {
  const themeCtx = useContext(ThemeContext);
  const { themeColors } = themeCtx;
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  
  // Cache for user profiles and spot data to avoid repeated fetches
  const [userCache, setUserCache] = useState(new Map());
  const [spotCache, setSpotCache] = useState(new Map());

  // Function to process activities with caching
  const processActivities = async (snapshot, isLoadMore = false) => {
    const activitiesData = [];
    const newUserCache = new Map(userCache);
    const newSpotCache = new Map(spotCache);
    
    // Collect all unique user IDs and spot IDs that we need to fetch
    const userIdsToFetch = new Set();
    const spotIdsToFetch = new Set();
    
    for (const docSnapshot of snapshot.docs) {
      const activityData = docSnapshot.data();
      
      // Collect user IDs for follow activities
      if (activityData.type === "follow" && activityData.followedBy) {
        if (!newUserCache.has(activityData.followedBy)) {
          userIdsToFetch.add(activityData.followedBy);
        }
      }
      
      // Collect user IDs and spot IDs for check-in activities
      if (activityData.type === "checkin") {
        if (activityData.checkedInBy && !newUserCache.has(activityData.checkedInBy)) {
          userIdsToFetch.add(activityData.checkedInBy);
        }
        if (activityData.spotId && !newSpotCache.has(activityData.spotId)) {
          spotIdsToFetch.add(activityData.spotId);
        }
      }
    }
    
    // Batch fetch all user data
    if (userIdsToFetch.size > 0) {
      try {
        const userPromises = Array.from(userIdsToFetch).map(userId => 
          getDoc(doc(db, "users", userId))
        );
        const userDocs = await Promise.all(userPromises);
        
        userDocs.forEach((userDoc, index) => {
          const userId = Array.from(userIdsToFetch)[index];
          if (userDoc.exists()) {
            const userData = userDoc.data();
            newUserCache.set(userId, {
              firstName: userData.firstName || "",
              lastName: userData.lastName || "",
              profilePic: userData.profilePic,
              followers: userData.followers || []
            });
          }
        });
      } catch (error) {
        console.error("Error batch fetching user data:", error);
      }
    }
    
    // Batch fetch all spot data
    if (spotIdsToFetch.size > 0) {
      try {
        const spotPromises = Array.from(spotIdsToFetch).map(spotId => 
          getDoc(doc(db, "studySpots", spotId))
        );
        const spotDocs = await Promise.all(spotPromises);
        
        spotDocs.forEach((spotDoc, index) => {
          const spotId = Array.from(spotIdsToFetch)[index];
          if (spotDoc.exists()) {
            const spotData = spotDoc.data();
            newSpotCache.set(spotId, {
              images: spotData.images,
              description: spotData.description
            });
          }
        });
      } catch (error) {
        console.error("Error batch fetching spot data:", error);
      }
    }
    
    // Get current user data once
    const currentUser = auth.currentUser;
    const currentUserData = newUserCache.get(currentUser.uid) || { followers: [] };
    
    // Process activities with cached data
    for (const docSnapshot of snapshot.docs) {
      const activityData = docSnapshot.data();
      const activityId = docSnapshot.id;
      
      let enrichedActivity = {
        id: activityId,
        ...activityData,
      };

      // For follow activities, use pre-stored data or cached data
      if (activityData.type === "follow" && activityData.followedBy) {
        // Use pre-stored data if available
        if (activityData.displayName) {
          enrichedActivity.followerName = activityData.displayName;
        }
        if (activityData.followerProfilePic) {
          enrichedActivity.followerProfilePic = activityData.followerProfilePic;
        }
        
        // Fallback to cached data if pre-stored data not available
        if (!enrichedActivity.followerName || !enrichedActivity.followerProfilePic) {
          const followerData = newUserCache.get(activityData.followedBy);
          if (followerData) {
            if (!enrichedActivity.followerName) {
              enrichedActivity.followerName = `${followerData.firstName} ${followerData.lastName}`.trim();
            }
            if (!enrichedActivity.followerProfilePic) {
              enrichedActivity.followerProfilePic = followerData.profilePic;
            }
          }
        }
      }

      // For check-in activities, use pre-stored data or cached data
      if (activityData.type === "checkin" && activityData.spotId) {
        // Use pre-stored spot image if available
        if (activityData.spotImage) {
          enrichedActivity.spotImage = activityData.spotImage;
        } else {
          // Fallback to cached spot data
          const spotData = newSpotCache.get(activityData.spotId);
          if (spotData) {
            enrichedActivity.spotImage = spotData.images?.[0];
            enrichedActivity.spotDescription = spotData.description;
          }
        }

        // Use pre-stored display name and mutual friend status if available
        if (activityData.displayName) {
          enrichedActivity.displayName = activityData.displayName;
        } else if (activityData.checkedInBy) {
          // Fallback to checking mutual following using cached data
          const checkedInUserData = newUserCache.get(activityData.checkedInBy);
          if (checkedInUserData) {
            const isMutualFollowing = 
              checkedInUserData.followers.includes(currentUser.uid) && 
              currentUserData.followers.includes(activityData.checkedInBy);
            
            if (isMutualFollowing) {
              enrichedActivity.displayName = `${checkedInUserData.firstName} ${checkedInUserData.lastName}`.trim();
            } else {
              enrichedActivity.displayName = "Someone";
            }
          } else {
            enrichedActivity.displayName = "Someone";
          }
        }
      }

      activitiesData.push(enrichedActivity);
    }

    // Update caches
    setUserCache(newUserCache);
    setSpotCache(newSpotCache);
    
    if (isLoadMore) {
      setActivities(prev => [...prev, ...activitiesData]);
    } else {
      setActivities(activitiesData);
    }
    
    // Update pagination state
    if (snapshot.docs.length < 10) {
      setHasMore(false);
    } else {
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    }
    
    return activitiesData;
  };

  // Load initial activities
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const activitiesRef = collection(db, "users", user.uid, "recentActivity");
    const q = query(activitiesRef, orderBy("timestamp", "desc"), limit(10));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          await processActivities(snapshot);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error listening to activities:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Load more activities
  const loadMoreActivities = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const user = auth.currentUser;
      const activitiesRef = collection(db, "users", user.uid, "recentActivity");
      const q = query(
        activitiesRef, 
        orderBy("timestamp", "desc"), 
        startAfter(lastVisible), 
        limit(10)
      );
      const snapshot = await getDocs(q);
      
      await processActivities(snapshot, true);
    } catch (error) {
      console.error("Error loading more activities:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setIsManualRefresh(true);
    setHasMore(true);
    setLastVisible(null);
    
    try {
      const user = auth.currentUser;
      const activitiesRef = collection(db, "users", user.uid, "recentActivity");
      const q = query(activitiesRef, orderBy("timestamp", "desc"), limit(10));
      const snapshot = await getDocs(q);
      
      await processActivities(snapshot);
    } catch (error) {
      console.error("Error refreshing activities:", error);
    } finally {
      setRefreshing(false);
      setIsManualRefresh(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Just now";
    
    const now = new Date();
    const activityTime = timestamp.toDate();
    const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return activityTime.toLocaleDateString();
  };

  const renderActivityItem = ({ item }) => {
    if (item.type === "follow") {
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (item.followedBy) {
              navigation.navigate("Profile", { uid: item.followedBy });
            }
          }}
          style={[styles.activityItem, { backgroundColor: themeColors.white, shadowColor: themeColors.black }]}
        >
          <View style={styles.activityIcon}>
            <UserPlus size={24} color={themeColors.purple} weight="fill" />
          </View>
          <View style={styles.activityContent}>
            <Text style={[styles.activityText, { color: themeColors.black }]}>
              <Text style={{ fontWeight: "600" }}>
                {item.followerName || item.displayName || "Someone"}
              </Text>{" "}
              started following you
            </Text>
            <Text style={[styles.activityTime, { color: themeColors.darkGray }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
          {item.followerProfilePic && (
            <Image
              source={{ uri: item.followerProfilePic }}
              style={styles.profileImage}
            />
          )}
        </TouchableOpacity>
      );
    }

    if (item.type === "checkin") {
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (item.spotId) {
              navigation.navigate("SpotDetail", { spotId: item.spotId });
            }
          }}
          style={[styles.activityItem, { backgroundColor: themeColors.white, shadowColor: themeColors.black }]}
        >
          <View style={styles.activityIcon}>
            <MapPin size={24} color={themeColors.green} weight="fill" />
          </View>
          <View style={styles.activityContent}>
            <Text style={[styles.activityText, { color: themeColors.black }]}>
              <Text style={{ fontWeight: "600" }}>
                {item.displayName || "Someone"}
              </Text>{" "}
              checked into your nook{" "}
              <Text style={{ fontWeight: "600" }}>{item.spotName}</Text>
            </Text>
            <Text style={[styles.activityTime, { color: themeColors.darkGray }]}>
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
          {item.spotImage && (
            <Image
              source={{ uri: item.spotImage }}
              style={styles.spotImage}
            />
          )}
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: themeColors.lightGray }]}>
        <Clock size={48} color={themeColors.darkGray} weight="light" />
      </View>
      <Text style={[styles.emptyTitle, { color: themeColors.darkGray }]}>
        No Recent Activity
      </Text>
      <Text style={[styles.emptySubtitle, { color: themeColors.darkGray }]}>
        When people follow you or check into your nooks, you'll see their activity here.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.white, paddingTop: 60 }]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 0,
            paddingBottom: 12,
            paddingHorizontal: 16,
            backgroundColor: themeColors.white,
            borderBottomWidth: 1,
            borderBottomColor: themeColors.darkGray + "50",
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              padding: 8,
              borderRadius: 8,
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={themeColors.purple} />
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: themeColors.black,
              fontFamily: FONTS.PRIMARY,
              flex: 1,
              textAlign: "center",
              marginHorizontal: 16,
            }}
            numberOfLines={1}
          >
            Recent Activity
          </Text>

          {/* Invisible placeholder to maintain centering */}
          <View style={{ width: 40, height: 40 }} />
        </View>
        <View style={styles.centeredLoadingContainer}>
          <CircleLoader
            themeColors={themeColors}
            size={40}
            text="Loading recent activity..."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.white, paddingTop: 60 }]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 0,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: themeColors.white,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.darkGray + "50",
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            padding: 8,
            borderRadius: 8,
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={themeColors.purple} />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: themeColors.black,
            fontFamily: FONTS.PRIMARY,
            flex: 1,
            textAlign: "center",
            marginHorizontal: 16,
          }}
          numberOfLines={1}
        >
          Recent Activity
        </Text>

        {/* Invisible placeholder to maintain centering */}
        <View style={{ width: 40, height: 40 }} />
      </View>

      <TouchableOpacity
        activeOpacity={1}
        style={{ flex: 1 }}
        disabled={true}
      >
        {activities.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            renderItem={renderActivityItem}
            contentContainerStyle={[styles.listContainer, { flexGrow: 1 }]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={themeColors.purple}
              />
            }
            showsVerticalScrollIndicator={false}
            ListFooterComponent={() => {
              if (!hasMore) return null;
              
              return (
                <TouchableOpacity
                  style={styles.loadMoreContainer}
                  onPress={loadMoreActivities}
                  disabled={loadingMore}
                  activeOpacity={0.7}
                >
                  {loadingMore ? (
                    <View style={styles.loadingContainer}>
                      <CircleLoader
                        themeColors={themeColors}
                        size={20}
                      />
                      <Text style={[styles.loadMoreText, { color: themeColors.darkGray, marginLeft: 8 }]}>
                        Loading more...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.loadMoreText, { color: themeColors.purple }]}>
                      Load More
                    </Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centeredLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  listContainer: {
    padding: 16,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 14,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
  },
  spotImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
  },
  loadMoreContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "500",
    fontFamily: FONTS.PRIMARY,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
