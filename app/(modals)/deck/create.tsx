import { View, Text, TouchableOpacity, TextInput } from "react-native";
import React, { useState } from "react";
import { defaultStyleSheet } from "@/constants/Styles";
import { addToFavorites, createDeck } from "@/data/api";
import { useRouter } from "expo-router";

const Page = () => {
  const router = useRouter();
  const [information, setInformation] = useState({
    title: "",
    description: "",
  });

  // Create deck, add new favorite and go back
  const onCreateDeck = async () => {
    const newDeck = await createDeck(information);
    await addToFavorites(newDeck.id!);
    router.back();
  };

  return (
    <>
      <View
        style={[
          defaultStyleSheet.container,
          { marginTop: 20, marginHorizontal: 16 },
        ]}
      >
        <TextInput
          style={defaultStyleSheet.input}
          placeholder="Title"
          value={information.title}
          onChangeText={(text) =>
            setInformation({ ...information, title: text })
          }
        />
        <TextInput
          style={defaultStyleSheet.input}
          placeholder="Description"
          value={information.description}
          onChangeText={(text) =>
            setInformation({ ...information, description: text })
          }
        />
      </View>
      <View style={{ alignItems: "center" }}>
        <TouchableOpacity
          style={defaultStyleSheet.bottomButton}
          onPress={onCreateDeck}
        >
          <Text style={defaultStyleSheet.buttonText}>Create Deck</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default Page;
