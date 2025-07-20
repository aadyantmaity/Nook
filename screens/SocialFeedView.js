import React, { useContext } from "react";
import { View, ActivityIndicator, Text, Alert } from "react-native";
import { db, auth } from "../firebaseConfig";
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
  updateDoc,
  arrayUnion,
  setDoc,
} from "firebase/firestore";
import { colors } from "../constants/colors";
import { ThemeContext } from "../App";
import { useNavigation } from "@react-navigation/native";
import ReplyPreview from "../components/FindPeople/SocialFeedSection/ReplyPreview";
import InputBar from "../components/FindPeople/SocialFeedSection/InputBar";
import MentionPicker from "../components/FindPeople/SocialFeedSection/MentionPicker";
import FeedList from "../components/FindPeople/SocialFeedSection/FeedList";
import RecentActivityList from "../components/FindPeople/SocialFeedSection/RecentActivityList";

export default function SocialFeedView({ navigation: propNavigation }) {
  const [postText, setPostText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [feed, setFeed] = React.useState([]);
  const [feedLoading, setFeedLoading] = React.useState(true);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const user = auth.currentUser;
  const navigation = propNavigation || useNavigation();

  const [replyToPost, setReplyToPost] = React.useState(null);
  const [mentionPickerVisible, setMentionPickerVisible] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState("");
  const [mentionUsers, setMentionUsers] = React.useState([]);
  const [mentionedUsers, setMentionedUsers] = React.useState([]);
  const [recentActivity, setRecentActivity] = React.useState([]);
  const [recentExpanded, setRecentExpanded] = React.useState(false);
  const feedListRef = React.useRef(null);
  const [highlightedPostId, setHighlightedPostId] = React.useState(null);
  const [myFollowing, setMyFollowing] = React.useState([]);

  // Subscribe to user's following list
  React.useEffect(() => {
    let unsubUser = null;
    if (auth.currentUser) {
      const usersCol = collection(db, "users");
      unsubUser = onSnapshot(query(usersCol), (snap) => {
        const me = snap.docs.find((d) => d.id === auth.currentUser.uid);
        setMyFollowing(me?.data()?.following || []);
      });
    }
    return () => {
      if (unsubUser) unsubUser();
    };
  }, [auth.currentUser]);

  // Fetch mutual friends for mention suggestions
  React.useEffect(() => {
    if (!user) return;
    (async () => {
      const usersSnap = await getDocs(query(collection(db, "users")));
      const me = usersSnap.docs.find((d) => d.id === user.uid);
      if (!me) return setMentionUsers([]);
      const followers = me.data().followers || [];
      const following = me.data().following || [];
      const mutualUids = followers.filter((uid) => following.includes(uid));
      const users = usersSnap.docs
        .filter((d) => mutualUids.includes(d.id))
        .map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            name:
              (data.firstName && data.lastName
                ? `${data.firstName} ${data.lastName.charAt(0)}`
                : data.firstName) || "User",
            email: data.email || "",
            profilePic: data.profilePic || null,
          };
        });
      setMentionUsers(users);
    })();
  }, [user]);

  // Fetch feed posts
  React.useEffect(() => {
    setFeedLoading(true);
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const posts = [];
      const usersSnap = await getDocs(query(collection(db, "users")));
      for (const docSnap of snap.docs) {
        const post = docSnap.data();
        let userName = "Unknown";
        let isOwnPost = false;
        let authorFollowers = [];
        let authorFollowing = [];
        let canSee = true;
        if (post.uid) {
          const userDocSnap = usersSnap.docs.find((d) => d.id === post.uid);
          if (userDocSnap) {
            const d = userDocSnap.data();
            userName = `${d.firstName || ""} ${d.lastName || ""}`.trim();
            authorFollowers = d.followers || [];
            authorFollowing = d.following || [];
            if (auth.currentUser && post.uid === auth.currentUser.uid) {
              userName = "You";
              isOwnPost = true;
            }
          } else if (auth.currentUser && post.uid === auth.currentUser.uid) {
            userName = "You";
            isOwnPost = true;
          }
        }
        if (!auth.currentUser) {
          canSee = false;
        } else if (post.uid !== auth.currentUser.uid) {
          const isMutual =
            myFollowing.includes(post.uid) &&
            authorFollowers.includes(auth.currentUser.uid) &&
            authorFollowing.includes(auth.currentUser.uid) &&
            Array.isArray(authorFollowers) &&
            authorFollowers.includes(auth.currentUser.uid);
          if (!isMutual) {
            canSee = false;
          }
        }
        let taggedNames = [];
        let youTaggedIndex = -1;
        if (Array.isArray(post.taggedUids) && post.taggedUids.length > 0) {
          for (let i = 0; i < post.taggedUids.length; i++) {
            const uid = post.taggedUids[i];
            if (auth.currentUser && uid === auth.currentUser.uid) {
              taggedNames.push("you");
              youTaggedIndex = taggedNames.length - 1;
            } else {
              const u = usersSnap.docs.find((d) => d.id === uid);
              if (u) {
                const d = u.data();
                taggedNames.push(
                  `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.email
                );
              }
            }
          }
        }
        const userMentioned =
          Array.isArray(post.mentions) &&
          auth.currentUser &&
          post.mentions.includes(auth.currentUser.uid);

        if (canSee) {
          posts.push({
            id: docSnap.id,
            ...post,
            userName,
            taggedNames,
            isOwnPost,
            userMentioned,
          });
        }
      }
      setFeed(posts);
      setFeedLoading(false);
    });
    return () => unsub();
  }, [myFollowing]);

  // Fetch recent activity for current user
  React.useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setRecentActivity(docSnap.data().recentActivity || []);
      } else {
        setRecentActivity([]);
      }
    });
    return () => unsub();
  }, [user?.uid]);

  const handlePost = async () => {
    if (!postText.trim() || posting) return;
    setPosting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
      const postRef = await addDoc(collection(db, "posts"), {
        uid: user.uid,
        message: postText.trim(),
        createdAt: serverTimestamp(),
        mentions: mentionedUsers,
        replyTo: replyToPost
          ? {
              id: replyToPost.id,
              text: replyToPost.message,
              senderName: replyToPost.userName,
            }
          : null,
      });
      const postId = postRef.id;
      setPostText("");
      setReplyToPost(null);
      setMentionedUsers([]);
      if (Array.isArray(mentionedUsers) && mentionedUsers.length > 0) {
        let meDoc;
        try {
          const snap = await getDocs(query(collection(db, "users")));
          meDoc = snap.docs.find((d) => d.id === user.uid);
        } catch {}
        const meName = meDoc
          ? `${meDoc.data().firstName || ""} ${
              meDoc.data().lastName || ""
            }`.trim()
          : "User";
        for (const uid of mentionedUsers) {
          const userDocRef = doc(db, "users", uid);
          try {
            await updateDoc(userDocRef, {
              recentActivity: arrayUnion({
                type: "mention",
                uid: user.uid,
                name: meName,
                profilePic: meDoc?.data().profilePic || null,
                createdAt: Date.now(),
                postText: postText.trim(),
                feedMessageId: postId,
              }),
            });
          } catch (error) {
            if (
              error.code === "not-found" ||
              error.message.includes("No document to update")
            ) {
              await setDoc(
                doc(db, "users", uid),
                {
                  recentActivity: [
                    {
                      type: "mention",
                      uid: user.uid,
                      name: meName,
                      profilePic: meDoc?.data().profilePic || null,
                      createdAt: Date.now(),
                      postText: postText.trim(),
                      feedMessageId: postId,
                    },
                  ],
                },
                { merge: true }
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Error posting:", error);
    }
    setPosting(false);
  };

  function renderMessageWithMentions(item) {
    if (!item.mentions || !Array.isArray(item.mentions) || !mentionUsers.length)
      return item.message;
    let msg = item.message;
    let parts = [];
    let lastIdx = 0;
    const uidToName = {};
    mentionUsers.forEach((u) => {
      uidToName[u.uid] = u.name;
    });
    const regex = /@([A-Za-z0-9_ ]+)/g;
    let match;
    let mentionedUids = item.mentions;
    while ((match = regex.exec(msg))) {
      const name = match[1].trim();
      const uid = mentionUsers.find((u) => u.name === name)?.uid;
      if (uid && mentionedUids.includes(uid)) {
        if (match.index > lastIdx) {
          parts.push(msg.slice(lastIdx, match.index));
        }
        parts.push(
          <Text
            key={match.index}
            style={{
              color: themeColors.black,
              fontWeight: "bold",
              borderRadius: 4,
              paddingHorizontal: 2,
              fontFamily: "CarosSoft",
            }}
          >
            @{name}
          </Text>
        );
        lastIdx = match.index + match[0].length;
      }
    }
    if (lastIdx < msg.length) {
      parts.push(msg.slice(lastIdx));
    }
    return parts.length > 0 ? parts : msg;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: themeColors.white,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 0,
        width: "100%",
        marginTop: -8,
        alignItems: "center",
      }}
    >
      <ReplyPreview
        replyToPost={replyToPost}
        setReplyToPost={setReplyToPost}
        themeColors={themeColors}
      />
      <InputBar
        postText={postText}
        setPostText={setPostText}
        posting={posting}
        handleInputChange={(text) => {
          setPostText(text);
          const match = text.match(/@(\w*)$/);
          if (match) {
            setMentionQuery(match[1]);
            setMentionPickerVisible(true);
          } else {
            setMentionPickerVisible(false);
          }
        }}
        handlePost={handlePost}
        themeColors={themeColors}
      />
      <MentionPicker
        visible={mentionPickerVisible}
        mentionUsers={mentionUsers}
        mentionQuery={mentionQuery}
        handleMentionSelect={(userObj) => {
          const atIdx = postText.lastIndexOf("@");
          if (atIdx !== -1) {
            const before = postText.slice(0, atIdx);
            const after = postText.slice(atIdx).replace(/@\w*$/, "");
            setPostText(before + "@" + userObj.name + " " + after);
          }
          setMentionPickerVisible(false);
          setMentionedUsers((prev) =>
            prev.includes(userObj.uid) ? prev : [...prev, userObj.uid]
          );
        }}
        themeColors={themeColors}
      />
      <RecentActivityList
        recentActivity={[...recentActivity].reverse()}
        navigation={navigation}
        themeColors={themeColors}
        expanded={recentExpanded}
        setExpanded={setRecentExpanded}
        onGoToMessage={(activityItem) => {
          if (!activityItem?.feedMessageId) return;
          const idx = feed.findIndex(
            (post) => post.id === activityItem.feedMessageId
          );
          if (idx !== -1 && feedListRef.current) {
            feedListRef.current.scrollToIndex({ index: idx, animated: true });
            setHighlightedPostId(feed[idx].id);
            setTimeout(() => setHighlightedPostId(null), 2500);
          }
        }}
      />
      {feedLoading ? (
        <ActivityIndicator
          color={themeColors.purple}
          style={{ marginTop: 8 }}
        />
      ) : feed.length === 0 ? (
        <Text
          style={{
            color: themeColors.darkGray,
            fontSize: 15,
            marginTop: 10,
            fontFamily: "CarosSoft",
          }}
        >
          Your friends haven't posted yet.
        </Text>
      ) : (
        <FeedList
          ref={feedListRef}
          feed={feed}
          isScrolled={isScrolled}
          setIsScrolled={setIsScrolled}
          navigation={navigation}
          user={user}
          themeColors={themeColors}
          setReplyToPost={setReplyToPost}
          confirmDeletePost={(postId) => {
            Alert.alert(
              "Delete Post",
              "Are you sure you want to delete this post?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteDoc(doc(db, "posts", postId));
                    } catch {}
                  },
                },
              ],
              { cancelable: true }
            );
          }}
          mutualFriends={mentionUsers}
          renderMessageWithMentions={renderMessageWithMentions}
          highlightedPostId={highlightedPostId}
        />
      )}
    </View>
  );
}
