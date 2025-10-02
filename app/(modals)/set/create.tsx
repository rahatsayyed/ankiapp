import { View, Text, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { defaultStyleSheet } from '@/constants/Styles';
import { TextInput } from 'react-native-gesture-handler';
import { addToFavorites, createSet } from '@/data/api';
import { useRouter } from 'expo-router';

const Page = () => {
  const router = useRouter();
  const [information, setInformation] = useState({
    title: '',
    description: '',
  });

  // Create set, add new favorite and go back
  const onCreateSet = async () => {
    const newSet = await createSet(information);
    await addToFavorites(newSet.id!);
    router.back();
  };

  return (
    <>
      <View style={[defaultStyleSheet.container, { marginTop: 20, marginHorizontal: 16 }]}>
        <TextInput
          style={defaultStyleSheet.input}
          placeholder="Title"
          value={information.title}
          onChangeText={(text) => setInformation({ ...information, title: text })}
        />
        <TextInput
          style={defaultStyleSheet.input}
          placeholder="Description"
          value={information.description}
          onChangeText={(text) => setInformation({ ...information, description: text })}
        />
      </View>
      <View style={{ alignItems: 'center' }}>
        <TouchableOpacity style={defaultStyleSheet.bottomButton} onPress={onCreateSet}>
          <Text style={defaultStyleSheet.buttonText}>Create Set</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

export default Page;
