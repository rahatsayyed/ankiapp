import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addToFavorites, getDeck, Deck } from '@/data/api';
import { defaultStyleSheet } from '../../../constants/Styles';

const Page = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deck, setDeck] = useState<Deck>();
  const router = useRouter();

  useEffect(() => {
    if (!id) return;

    const loadDeck = async () => {
      const data = await getDeck(id);
      setDeck(data);
    };
    loadDeck();
  }, [id]);

  // Add as a favorite and go back
  const onAddToFavorites = async () => {
    await addToFavorites(id!);
    router.push('/(tabs)/decks');
  };

  return (
    <View style={styles.container}>
      {deck && (
        <View style={{ alignItems: 'flex-start', padding: 16, gap: 10, flex: 1 }}>
          <Text style={styles.header}>{deck.title}</Text>
          <Text style={{ color: '#666' }}>{deck.cards} Cards</Text>
          <Text>{deck.description}</Text>
          <Text style={{ color: '#666' }}>Created by: {deck.creator}</Text>
        </View>
      )}
      <View style={{ alignItems: 'center' }}>
        <TouchableOpacity style={defaultStyleSheet.bottomButton} onPress={onAddToFavorites}>
          <Text style={defaultStyleSheet.buttonText}>Add to Favorites</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default Page;
