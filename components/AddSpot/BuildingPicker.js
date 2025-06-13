import React from "react";
import { Picker } from "@react-native-picker/picker";
import { TextInput, View } from "react-native";

export default function BuildingPicker({
  isUWBuilding,
  selectedBuilding,
  setSelectedBuilding,
  customBuilding,
  setCustomBuilding,
  roomNumber,
  setRoomNumber,
  BUILDINGS,
  themeColors,
}) {
  return isUWBuilding ? (
    <View
      style={{
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: themeColors.white,
      }}
    >
      <Picker
        selectedValue={selectedBuilding}
        onValueChange={setSelectedBuilding}
        style={{
          color: themeColors.purple,
          fontSize: 18,
          backgroundColor: themeColors.white,
          borderColor: themeColors.black,
          borderWidth: 0.5,
          borderRadius: 8,
        }}
        itemStyle={{
          fontSize: 18,
          color: themeColors.purple,
        }}
      >
        <Picker.Item
          label="Select a building"
          value=""
          style={{
            fontSize: 18,
            color: themeColors.purple,
          }}
        />
        {BUILDINGS.map((building) => (
          <Picker.Item
            key={building}
            label={building}
            value={building}
            style={{
              fontSize: 18,
              color: themeColors.purple,
            }}
          />
        ))}
      </Picker>
      <TextInput
        placeholder="Floor Number (if applicable)"
        placeholderTextColor={themeColors.darkGray}
        value={roomNumber}
        onChangeText={setRoomNumber}
        style={{
          borderWidth: 0.5,
          borderColor: themeColors.black,
          borderRadius: 8,
          padding: 12,
          marginTop: 16,
          marginBottom: 16,
          backgroundColor: themeColors.white,
          color: themeColors.purple,
        }}
      />
    </View>
  ) : (
    <>
      <TextInput
        placeholder="Enter location name (e.g. Bookstore or Starbucks)"
        placeholderTextColor={themeColors.darkGray}
        value={customBuilding}
        onChangeText={setCustomBuilding}
        style={{
          borderWidth: 0.5,
          borderColor: themeColors.black,
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          backgroundColor: themeColors.white,
          color: themeColors.purple,
        }}
      />
      <TextInput
        placeholder="Floor Number (if applicable)"
        placeholderTextColor={themeColors.darkGray}
        value={roomNumber}
        onChangeText={setRoomNumber}
        style={{
          borderWidth: 0.5,
          borderColor: themeColors.black,
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          backgroundColor: themeColors.white,
          color: themeColors.purple,
        }}
      />
    </>
  );
}
