import React, { useContext } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
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

export default function SocialFeedSection() {
  const [postText, setPostText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [feed, setFeed] = React.useState([]);
  const [feedLoading, setFeedLoading] = React.useState(true);
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const user = auth.currentUser;

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
        if (post.uid) {
          try {
            const userDoc = await getDocs(query(collection(db, "users")));
            const user = userDoc.docs.find((d) => d.id === post.uid);
            if (user) {
              const d = user.data();
              userName = `${d.firstName || ""} ${d.lastName || ""}`.trim();
            }
          } catch {}
        }
        posts.push({
          id: docSnap.id,
          ...post,
          userName,
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

  return (
    <View
      style={{
        backgroundColor: themeColors.white,
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 16,
        width: "92%",
        maxWidth: 600,
        marginTop: -8,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: "bold",
          color: themeColors.purple,
          marginBottom: 10,
          textAlign: "center",
          fontFamily: "CarosSoft",
        }}
      >
        Social Feed
      </Text>
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
        <View style={{ width: "100%", maxHeight: 400 }}>
          <FlatList
            data={feed}
            keyExtractor={(item) => item.id}
            style={{ width: "100%" }}
            contentContainerStyle={{ paddingBottom: 8 }}
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
                  <Text
                    style={{
                      color: themeColors.black,
                      fontSize: 15,
                      marginTop: 2,
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {item.message}
                  </Text>
                  <Text
                    style={{
                      color: themeColors.darkGray,
                      fontSize: 12,
                      marginTop: 6,
                      textAlign: "right",
                      fontFamily: "CarosSoft",
                    }}
                  >
                    {item.createdAt && item.createdAt.seconds
                      ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                      : ""}
                  </Text>
                </View>
                {/* Only show delete button if the post belongs to the current user */}
                {user && item.uid === user.uid ? (
                  <TouchableOpacity
                    onPress={() => handleDeletePost(item.id)}
                    style={{
                      marginLeft: 10,
                      marginTop: 2,
                      backgroundColor: themeColors.red,
                      borderRadius: 6,
                      padding: 6,
                      alignItems: "center",
                      justifyContent: "center",
                      height: 32,
                      width: 32,
                    }}
                    accessibilityLabel="Delete post"
                  >
                    <Trash size={18} color={themeColors.white} weight="bold" />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}
