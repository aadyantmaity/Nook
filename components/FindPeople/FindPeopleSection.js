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
  updateDoc,
  doc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { colors } from "../../constants/colors";
import { ThemeContext } from "../../App";
import { MagnifyingGlass } from "phosphor-react-native";
import ProfilePicture from "../Profile/ProfilePicture";

export default function FindPeopleSection({ navigation, onNavigateToProfile }) {
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [followingIds, setFollowingIds] = React.useState([]);
  const [followLoading, setFollowLoading] = React.useState({});
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

  // Fetch current user's following list for follow button state
  const fetchFollowing = React.useCallback(async () => {
    try {
      const userDoc = await getDocs(query(collection(db, "users")));
      const me = userDoc.docs.find((d) => d.id === auth.currentUser?.uid);
      if (me) {
        setFollowingIds(me.data().following || []);
      }
    } catch {
      setFollowingIds([]);
    }
  }, []);

  React.useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

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

  // Follow logic for search results
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
      // --- Add recentActivity to target user ---
      const userDoc = await getDoc(doc(db, "users", targetUid));
      let arr = [];
      if (userDoc.exists()) {
        arr = userDoc.data().recentActivity || [];
      }
      arr = [
        ...arr,
        {
          type: "followed_by",
          uid: auth.currentUser.uid,
          name:
            auth.currentUser.displayName || auth.currentUser.email || "User",
          profilePic: null,
          createdAt: Date.now(),
        },
      ];
      // Do not slice to 8 here, let Firestore rule accept only growing arrays
      await updateDoc(doc(db, "users", targetUid), { recentActivity: arr });
    } catch {}
    setFollowLoading((prev) => ({ ...prev, [targetUid]: false }));
  };
}
