import React, { useContext } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert, // <-- add Alert import
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  onSnapshot,
  limit,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { colors } from "../../constants/colors";
import { ThemeContext } from "../../App";
import { PaperPlaneRight, Trash } from "phosphor-react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient"; // <-- add this import

export default function SocialFeedSection({ navigation: propNavigation }) {
  const [postText, setPostText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [feed, setFeed] = React.useState([]);
  const [feedLoading, setFeedLoading] = React.useState(true);
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const user = auth.currentUser;
  const navigation = propNavigation || useNavigation();

  React.useEffect(() => {
    setFeedLoading(true);
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const posts = [];
      for (const docSnap of snap.docs) {
        const post = docSnap.data();
        let userName = "Unknown";
        let isOwnPost = false;
        if (post.uid) {
          try {
            const userDoc = await getDocs(query(collection(db, "users")));
            const userDocSnap = userDoc.docs.find((d) => d.id === post.uid);
            if (userDocSnap) {
              const d = userDocSnap.data();
              userName = `${d.firstName || ""} ${d.lastName || ""}`.trim();
              if (auth.currentUser && post.uid === auth.currentUser.uid) {
                userName = "You";
                isOwnPost = true;
              }
            } else if (auth.currentUser && post.uid === auth.currentUser.uid) {
              userName = "You";
              isOwnPost = true;
            }
          } catch {
            if (auth.currentUser && post.uid === auth.currentUser.uid) {
              userName = "You";
              isOwnPost = true;
            }
          }
        }
        // --- New: resolve tagged user names if taggedUids exists ---
        let taggedNames = [];
        let youTaggedIndex = -1;
        if (Array.isArray(post.taggedUids) && post.taggedUids.length > 0) {
          try {
            const userDoc = await getDocs(query(collection(db, "users")));
            for (let i = 0; i < post.taggedUids.length; i++) {
              const uid = post.taggedUids[i];
              if (auth.currentUser && uid === auth.currentUser.uid) {
                taggedNames.push("you");
                youTaggedIndex = taggedNames.length - 1;
              } else {
                const u = userDoc.docs.find((d) => d.id === uid);
                if (u) {
                  const d = u.data();
                  taggedNames.push(
                    `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.email
                  );
                }
              }
            }
          } catch {}
        }
        posts.push({
          id: docSnap.id,
          ...post,
          userName,
          taggedNames,
          isOwnPost,
        });
      }
      setFeed(posts);
      setFeedLoading(false);
    });
    return () => unsub();
  }, []);

  const handlePost = async () => {
    if (!postText.trim() || posting) return;
    setPosting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
      await addDoc(collection(db, "posts"), {
        uid: user.uid,
        message: postText.trim(),
        createdAt: serverTimestamp(),
      });
      setPostText("");
    } catch {}
    setPosting(false);
  };

  const handleDeletePost = async (postId) => {
    try {
      await deleteDoc(doc(db, "posts", postId));
    } catch {}
  };

  // Add confirm wrapper
  const confirmDeletePost = (postId) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeletePost(postId),
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View
      style={{
        backgroundColor: themeColors.white,
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 0, // remove side margin for full width
        width: "100%", // extend to full width
        // maxWidth: 600,     // remove maxWidth
        marginTop: -8,
        alignItems: "center",
        flex: 1,
      }}
    >
      <View
        style={{
          width: "100%",
          marginBottom: 12,
          marginTop: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: themeColors.darkGray,
            borderRadius: 12,
            paddingHorizontal: 12,
            backgroundColor: themeColors.white,
            marginBottom: 8,
          }}
        >
          <TextInput
            placeholder="Share something with Nook..."
            value={postText}
            onChangeText={setPostText}
            style={{
              flex: 1,
              height: 44,
              fontSize: 16,
              color: themeColors.black,
              fontFamily: "CarosSoft",
            }}
            editable={!posting}
            placeholderTextColor={themeColors.darkGray}
            maxLength={100}
            returnKeyType="send"
            onSubmitEditing={handlePost}
            blurOnSubmit={true}
          />
          <TouchableOpacity
            onPress={handlePost}
            disabled={posting || !postText.trim()}
            style={{
              marginLeft: 8,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Submit"
          >
            <PaperPlaneRight size={24} color={themeColors.purple} />
          </TouchableOpacity>
        </View>
      </View>
      {feedLoading ? (
        <ActivityIndicator
          color={themeColors.purple}
          style={{ marginTop: 8 }}
        />
      ) : feed.length === 0 ? (
        <Text
          style={{
            color: themeColors.gray,
            fontSize: 15,
            marginTop: 10,
            fontFamily: "CarosSoft",
          }}
        >
          No posts yet.
        </Text>
      ) : (
        <View style={{ width: "100%", flex: 1 }}>
          {/* Gradient scrollview wrapper */}
          <View style={{ flex: 1, position: "relative" }}>
            {/* Top gradient */}
            {feed.length > 0 && (
              <LinearGradient
                colors={[themeColors.white + "FF", themeColors.white + "00"]}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 24,
                  zIndex: 2,
                  pointerEvents: "none",
                }}
                pointerEvents="none"
              />
            )}
            <FlatList
              data={feed}
              keyExtractor={(item) => item.id}
              style={{ width: "100%", flex: 1 }}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View
                  style={{
                    backgroundColor: themeColors.lightGray,
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 0.5,
                    borderColor: themeColors.gray,
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    {/* Top row: username left, trash right */}
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          if (item.uid) {
                            navigation.navigate("Profile", { uid: item.uid });
                          }
                        }}
                        activeOpacity={0.7}
                        style={{ flex: 1 }}
                      >
                        <Text
                          style={{
                            color: themeColors.purple,
                            fontWeight: "bold",
                            fontSize: 15,
                            fontFamily: "CarosSoft",
                          }}
                        >
                          {item.userName || "Unknown"}
                        </Text>
                      </TouchableOpacity>
                      {/* Only show delete button if the post belongs to the current user */}
                      {user && item.uid === user.uid ? (
                        <TouchableOpacity
                          onPress={() => confirmDeletePost(item.id)}
                          style={{
                            marginLeft: 10,
                            // backgroundColor: themeColors.red, // REMOVE red background
                            borderRadius: 6,
                            padding: 6,
                            alignItems: "center",
                            justifyContent: "center",
                            height: 32,
                            width: 32,
                          }}
                          accessibilityLabel="Delete post"
                        >
                          <Trash
                            size={18}
                            color={themeColors.red}
                            weight="bold"
                          />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <Text
                      style={{
                        color: themeColors.black,
                        fontSize: 15,
                        marginTop: 2,
                        fontFamily: "CarosSoft",
                      }}
                    >
                      {/* --- Message rendering with "you" for check-ins --- */}
                      {(() => {
                        // If this is a check-in post and the author is the current user, remove "you" from taggedNames for display
                        if (
                          item.type === "checkin" &&
                          item.isOwnPost &&
                          item.message &&
                          item.message.startsWith("Checked in at")
                        ) {
                          // Remove any "with ..." from message
                          let baseMsg = item.message.replace(/ with .*!$/, "!");
                          // Only show tagged friends (excluding "you")
                          if (item.taggedNames && item.taggedNames.length > 0) {
                            const others = item.taggedNames.filter(
                              (n) => n !== "you"
                            );
                            let tagString = "";
                            if (others.length === 1) {
                              tagString = " with " + others[0];
                            } else if (others.length === 2) {
                              tagString =
                                " with " + others[0] + " and " + others[1];
                            } else if (others.length > 2) {
                              tagString =
                                " with " +
                                others.slice(0, -1).join(", ") +
                                ", and " +
                                others[others.length - 1];
                            }
                            return (
                              <>
                                {baseMsg.replace(/!$/, "")}
                                {others.length > 0 ? tagString : ""}
                                {"!"}
                              </>
                            );
                          } else {
                            return item.message;
                          }
                        }
                        // If not a check-in or not own post, show message as is, and show tagged friends if present and not already in message
                        return (
                          <>
                            {item.message}
                            {item.taggedNames &&
                              item.taggedNames.length > 0 &&
                              !item.message.includes(
                                "with " + item.taggedNames[0]
                              ) && (
                                <Text
                                  style={{
                                    color: themeColors.black,
                                    fontFamily: "CarosSoft",
                                  }}
                                >
                                  {" with "}
                                  {item.taggedNames.join(", ")}
                                </Text>
                              )}
                          </>
                        );
                      })()}
                    </Text>
                    {/* Bottom row: timestamp right */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: themeColors.darkGray,
                          fontSize: 12,
                          flex: 1,
                          textAlign: "right",
                          fontFamily: "CarosSoft",
                        }}
                      >
                        {item.createdAt && item.createdAt.seconds
                          ? new Date(
                              item.createdAt.seconds * 1000
                            ).toLocaleString()
                          : ""}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            />
            {/* Bottom gradient */}
            {feed.length > 0 && (
              <LinearGradient
                colors={[themeColors.white + "00", themeColors.white + "FF"]}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 24,
                  zIndex: 2,
                  pointerEvents: "none",
                }}
                pointerEvents="none"
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}
