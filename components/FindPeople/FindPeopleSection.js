import React, { useContext } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  getDocs,
  query,
  updateDoc,
  doc,
  arrayUnion,
} from "firebase/firestore";
import { colors } from "../../constants/colors";
import { ThemeContext } from "../../App";
import { MagnifyingGlass, Plus, Minus } from "phosphor-react-native";
import ProfilePicture from "../Profile/ProfilePicture";

export default function FindPeopleSection({ navigation }) {
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [suggested, setSuggested] = React.useState([]);
  const [suggestedLoading, setSuggestedLoading] = React.useState(true);
  const [followingIds, setFollowingIds] = React.useState([]);
  const [followLoading, setFollowLoading] = React.useState({});
  const [suggestedExpanded, setSuggestedExpanded] = React.useState(false);
  const [suggestedPicsLoading, setSuggestedPicsLoading] = React.useState(true);
  const [suggestedWithPics, setSuggestedWithPics] = React.useState([]);
  const themeCtx = useContext(ThemeContext);
  const themeColors = themeCtx?.themeColors ?? colors;
  const debounceTimer = React.useRef(null);

  React.useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!search.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceTimer.current = setTimeout(() => {
      handleSearch();
    }, 2000);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line
  }, [search]);

  // Extracted function to fetch suggested users
  const refreshSuggested = React.useCallback(async () => {
    setSuggestedLoading(true);
    setSuggestedPicsLoading(true);
    try {
      const q = query(collection(db, "users"));
      const snap = await getDocs(q);
      // Exclude current user and users already followed
      const users = snap.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter(
          (u) =>
            u.uid !== auth.currentUser?.uid &&
            !(Array.isArray(followingIds) && followingIds.includes(u.uid))
        );
      // Shuffle and pick up to 8 users
      for (let i = users.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [users[i], users[j]] = [users[j], users[i]];
      }
      const picked = users.slice(0, 8);
      // --- Preload profile pictures ---
      const withPics = await Promise.all(
        picked.map(async (u) => {
          if (!u.profilePic) return { ...u, _profilePicLoaded: true };
          try {
            await Image.prefetch(u.profilePic);
            return { ...u, _profilePicLoaded: true };
          } catch {
            return { ...u, _profilePicLoaded: false };
          }
        })
      );
      setSuggestedWithPics(withPics);
      setSuggested(picked);
      setSuggestedPicsLoading(false);
    } catch {
      setSuggested([]);
      setSuggestedWithPics([]);
      setSuggestedPicsLoading(false);
    }
    setSuggestedLoading(false);
  }, [followingIds]);

  React.useEffect(() => {
    let isMounted = true;
    async function fetchSuggested() {
      setSuggestedLoading(true);
      setSuggestedPicsLoading(true);
      try {
        const q = query(collection(db, "users"));
        const snap = await getDocs(q);
        // Exclude current user and users already followed
        const users = snap.docs
          .map((doc) => ({ uid: doc.id, ...doc.data() }))
          .filter(
            (u) =>
              u.uid !== auth.currentUser?.uid &&
              !(Array.isArray(followingIds) && followingIds.includes(u.uid))
          );
        // Shuffle and pick up to 8 users
        for (let i = users.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [users[i], users[j]] = [users[j], users[i]];
        }
        const picked = users.slice(0, 8);
        // --- Preload profile pictures ---
        const withPics = await Promise.all(
          picked.map(async (u) => {
            // If no profilePic, just return as is
            if (!u.profilePic) return { ...u, _profilePicLoaded: true };
            // Try to prefetch the image
            try {
              await Image.prefetch(u.profilePic);
              return { ...u, _profilePicLoaded: true };
            } catch {
              return { ...u, _profilePicLoaded: false };
            }
          })
        );
        if (isMounted) {
          setSuggestedWithPics(withPics);
          setSuggested(picked);
          setSuggestedPicsLoading(false);
        }
      } catch {
        if (isMounted) {
          setSuggested([]);
          setSuggestedWithPics([]);
          setSuggestedPicsLoading(false);
        }
      }
      if (isMounted) setSuggestedLoading(false);
    }
    fetchSuggested();
    return () => {
      isMounted = false;
    };
  }, [followingIds]);

  // Fetch current user's following list for suggested users
  React.useEffect(() => {
    async function fetchFollowing() {
      try {
        const userDoc = await getDocs(query(collection(db, "users")));
        const me = userDoc.docs.find((d) => d.id === auth.currentUser?.uid);
        if (me) {
          setFollowingIds(me.data().following || []);
        }
      } catch {
        setFollowingIds([]);
      }
    }
    fetchFollowing();
  }, []);

  const handleSearch = async () => {
    const s = search.trim().toLowerCase();
    if (!s) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, "users"));
      const snap = await getDocs(q);
      const filtered = snap.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter(
          (u) =>
            (u.email && u.email.toLowerCase().includes(s)) ||
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(s)
        )
        .filter((u) => u.uid !== auth.currentUser?.uid);
      setResults(filtered);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Follow logic for suggested users
  const handleFollow = async (targetUid) => {
    if (!auth.currentUser?.uid || !targetUid) return;
    setFollowLoading((prev) => ({ ...prev, [targetUid]: true }));
    try {
      // Add targetUid to current user's following
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        following: arrayUnion(targetUid),
      });
      // Add current user to target user's followers
      await updateDoc(doc(db, "users", targetUid), {
        followers: arrayUnion(auth.currentUser.uid),
      });
      setFollowingIds((prev) => [...prev, targetUid]);
    } catch {}
    setFollowLoading((prev) => ({ ...prev, [targetUid]: false }));
  };

  return (
    <View
      style={{
        backgroundColor: themeColors.white,
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 0,
        width: "100%",
        marginTop: -8,
        alignItems: "center",
      }}
    >
      {/* Suggested Users Dropdown */}
      <View style={{ width: "100%", marginBottom: 8 }}>
        <TouchableOpacity
          onPress={() => {
            if (!suggestedExpanded) {
              setSuggestedExpanded(true);
              refreshSuggested();
            } else {
              setSuggestedExpanded(false);
            }
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 8,
            paddingHorizontal: 4,
            borderRadius: 8,
            backgroundColor: themeColors.lightGray,
            marginBottom: suggestedExpanded ? 8 : 0,
          }}
          accessibilityLabel={
            suggestedExpanded
              ? "Collapse suggested users"
              : "Expand suggested users"
          }
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "bold",
              color: themeColors.purple,
              fontFamily: "CarosSoft",
              flex: 1,
            }}
          >
            Suggested
          </Text>
          {suggestedExpanded ? (
            <Minus size={22} color={themeColors.purple} weight="bold" />
          ) : (
            <Plus size={22} color={themeColors.purple} weight="bold" />
          )}
        </TouchableOpacity>
        {suggestedExpanded && (
          <View style={{ marginTop: 0 }}>
            {/* Only show ActivityIndicator if either loading or profile pics loading */}
            {suggestedLoading || suggestedPicsLoading ? (
              <ActivityIndicator color={themeColors.purple} />
            ) : suggestedWithPics.length === 0 ? (
              <Text
                style={{
                  color: themeColors.darkGray,
                  fontSize: 15,
                  fontFamily: "CarosSoft",
                }}
              >
                No suggestions available.
              </Text>
            ) : (
              <FlatList
                data={suggestedWithPics}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("Profile", { uid: item.uid })
                    }
                    style={{
                      backgroundColor: themeColors.lightGray,
                      borderRadius: 10,
                      padding: 12,
                      marginRight: 10,
                      alignItems: "center",
                      minWidth: 140,
                      maxWidth: 180,
                    }}
                    activeOpacity={0.8}
                  >
                    {/* --- Show profile picture above name --- */}
                    <ProfilePicture
                      profilePic={item.profilePic}
                      themeColors={themeColors}
                      size={48}
                      isLoading={!item._profilePicLoaded}
                    />
                    <Text
                      style={{
                        color: themeColors.black,
                        fontWeight: "bold",
                        fontSize: 15,
                        fontFamily: "CarosSoft",
                        textAlign: "center",
                        marginTop: 8,
                      }}
                      numberOfLines={1}
                    >
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text
                      style={{
                        color: themeColors.darkGray,
                        fontSize: 13,
                        fontFamily: "CarosSoft",
                        textAlign: "center",
                      }}
                    >
                      {item.email}
                    </Text>
                    <TouchableOpacity
                      style={{
                        marginTop: 8,
                        backgroundColor: followingIds.includes(item.uid)
                          ? themeColors.gray
                          : themeColors.purple,
                        borderRadius: 6,
                        paddingVertical: 6,
                        paddingHorizontal: 16,
                      }}
                      onPress={() => handleFollow(item.uid)}
                      disabled={
                        followingIds.includes(item.uid) ||
                        followLoading[item.uid]
                      }
                    >
                      <Text
                        style={{
                          color: themeColors.white,
                          fontWeight: "bold",
                          fontSize: 14,
                          fontFamily: "CarosSoft",
                        }}
                      >
                        {followLoading[item.uid]
                          ? "Following..."
                          : followingIds.includes(item.uid)
                          ? "Following"
                          : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
                style={{ minHeight: 60 }}
              />
            )}
          </View>
        )}
      </View>
      {/* Search Bar */}
      <View style={{ width: "100%", marginBottom: 12, marginTop: 8 }}>
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
            placeholder="Search by name or email"
            value={search}
            onChangeText={setSearch}
            style={{
              flex: 1,
              height: 44,
              fontSize: 16,
              color: themeColors.black,
              fontFamily: "CarosSoft",
            }}
            returnKeyType="search"
            placeholderTextColor={themeColors.darkGray}
          />
          <TouchableOpacity
            onPress={() => {
              if (debounceTimer.current) clearTimeout(debounceTimer.current);
              handleSearch();
            }}
          >
            <MagnifyingGlass size={24} color={themeColors.purple} />
          </TouchableOpacity>
        </View>
      </View>
      {loading && (
        <ActivityIndicator
          size="large"
          color={themeColors.purple}
          style={{ marginTop: 8 }}
        />
      )}
      {!loading && results.length === 0 && search.length > 0 && (
        <Text
          style={{
            textAlign: "center",
            marginTop: 12,
            fontSize: 16,
            color: themeColors.gray,
            fontFamily: "CarosSoft",
          }}
        >
          No users found.
        </Text>
      )}
      <FlatList
        data={results}
        contentContainerStyle={{ paddingBottom: 8 }}
        keyExtractor={(item) => item.uid}
        style={{ width: "100%" }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              navigation.navigate("Profile", { uid: item.uid });
            }}
            style={{
              backgroundColor: themeColors.white,
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 1,
              borderWidth: 0.5,
              borderColor: themeColors.darkGray,
            }}
          >
            <Text
              style={{
                color: themeColors.black,
                fontSize: 17,
                fontWeight: "600",
                fontFamily: "CarosSoft",
              }}
            >
              {item.firstName} {item.lastName}
            </Text>
            <Text
              style={{
                color: themeColors.darkGray,
                marginTop: 4,
                fontFamily: "CarosSoft",
              }}
            >
              {item.email}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={null}
        scrollEnabled={false}
      />
    </View>
  );
}
