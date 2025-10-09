import {
  View,
  Text,
  ListRenderItem,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { Deck, getDecks } from '@/data/api';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import Colors from '@/constants/Colors';
import { defaultStyleSheet } from '@/constants/Styles';

const Page = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load available Decks
  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    const data = await getDecks();
    setDecks(data);
  };

  // Render a row for each Deck
  const renderDeckRow: ListRenderItem<Deck> = ({ item }) => {
    return (
      <Link href={`/(modals)/deck/${item.id}`} asChild>
        <TouchableOpacity style={styles.deckRow}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={{ color: Colors.darkGrey }}>{item.cards} Cards</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={24} color="#ccc" />
          </View>
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <View style={defaultStyleSheet.container}>
      <FlatList
        data={decks}
        renderItem={renderDeckRow}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadDecks} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  deckRow: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Page;
