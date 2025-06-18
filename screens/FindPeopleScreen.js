import React, { useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { db, auth } from "../firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { colors } from "../constants/colors";
import { useNavigation } from "@react-navigation/native";

export default function FindPeopleScreen() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleSearch = async () => {
    setLoading(true);
    try {
      // Simple search by email or name (case-insensitive)
      const q = query(collection(db, "users"));
      const snap = await getDocs(q);
      const s = search.trim().toLowerCase();
      const filtered = snap.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter(
          (u) =>
            (u.email && u.email.toLowerCase().includes(s)) ||
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(s)
        )
        .filter((u) => u.uid !== auth.currentUser?.uid);
      setResults(filtered);
    } catch {}
    setLoading(false);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.white,
        paddingTop: 48,
        paddingHorizontal: 16,
      }}
    >
      <TextInput
        placeholder="Search by name or email"
        value={search}
        onChangeText={setSearch}
        style={{
          borderWidth: 1,
          borderColor: colors.purple,
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          color: colors.black,
        }}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
      />
      <TouchableOpacity
        onPress={handleSearch}
        style={{
          backgroundColor: colors.purple,
          borderRadius: 8,
          paddingVertical: 10,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text style={{ color: colors.white, fontWeight: "bold" }}>Search</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator color={colors.purple} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate("Profile", { uid: item.uid })}
              style={{
                padding: 14,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.gray,
              }}
            >
              <Text
                style={{
                  color: colors.black,
                  fontSize: 16,
                  fontWeight: "bold",
                }}
              >
                {item.firstName} {item.lastName}
              </Text>
              <Text style={{ color: colors.darkGray }}>{item.email}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
