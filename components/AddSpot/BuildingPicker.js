import React, { useState } from "react";
import { TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { FONTS } from "../../constants/fonts";

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
  // --- Add state for custom room number ---
  const [customRoom, setCustomRoom] = useState("");
  const [pickerValue, setPickerValue] = useState(
    roomNumber && !/^\d+$/.test(roomNumber) ? "other" : roomNumber || ""
  );

  // --- Generate picker items for 1-30 ---
  const numberOptions = Array.from({ length: 30 }, (_, i) =>
    (i + 1).toString()
  );

  // --- Handle picker change ---
  const handleRoomPickerChange = (val) => {
    setPickerValue(val);
    if (val === "other") {
      setRoomNumber(customRoom);
    } else {
      setRoomNumber(val);
    }
  };

  // --- Handle custom room input ---
  const handleCustomRoomChange = (val) => {
    setCustomRoom(val);
    setRoomNumber(val);
  };

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
          shadowColor: themeColors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 4,
          borderRadius: 8,
          fontFamily: FONTS.PRIMARY,
        }}
        itemStyle={{
          fontSize: 18,
          color: themeColors.purple,
          fontFamily: FONTS.PRIMARY,
        }}
      >
        <Picker.Item
          label="Select a building"
          value=""
          style={{
            fontSize: 18,
            color: themeColors.purple,
            fontFamily: FONTS.PRIMARY,
          }}
        />
        {BUILDINGS.map((building) => (
          <Picker.Item
            key={typeof building === "string" ? building : building.name}
            label={typeof building === "string" ? building : building.name}
            value={typeof building === "string" ? building : building.name}
            style={{
              fontSize: 18,
              color: themeColors.purple,
              fontFamily: FONTS.PRIMARY,
            }}
          />
        ))}
      </Picker>
      {/* Floor/Room Number Input */}
      <TextInput
        placeholder="Floor number (if applicable)"
        placeholderTextColor={themeColors.darkGray}
        value={roomNumber}
        onChangeText={(val) => {
          // Only allow numbers
          const numeric = val.replace(/[^0-9]/g, "");
          setRoomNumber(numeric);
        }}
        keyboardType="numeric"
        style={{
          shadowColor: themeColors.black,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 4,
          borderRadius: 8,
          padding: 12,
          marginTop: 16,
          marginBottom: -8,
          backgroundColor: themeColors.white,
          color: themeColors.purple,
          fontFamily: FONTS.PRIMARY,
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
          fontFamily: FONTS.PRIMARY,
        }}
      />
      {/* Floor/Room Number Input for custom locations */}
      <TextInput
        placeholder="Floor/Room Number (if applicable)"
        placeholderTextColor={themeColors.darkGray}
        value={roomNumber}
        onChangeText={(val) => {
          // Only allow numbers
          const numeric = val.replace(/[^0-9]/g, "");
          setRoomNumber(numeric);
        }}
        keyboardType="numeric"
        style={{
          borderWidth: 0.5,
          borderColor: themeColors.black,
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          backgroundColor: themeColors.white,
          color: themeColors.purple,
          fontFamily: FONTS.PRIMARY,
        }}
      />
    </>
  );
}
