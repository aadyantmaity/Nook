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
import { collection, getDocs, query } from "firebase/firestore";
import { colors } from "../../constants/colors";
import { ThemeContext } from "../../App";
import { MagnifyingGlass } from "phosphor-react-native";

export default function FindPeopleSection({ navigation }) {
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
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
        Find People
      </Text>
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
