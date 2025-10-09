import { View, Text, ListRenderItem, FlatList, StyleSheet, RefreshControl } from 'react-native';
import React, { useEffect, useState } from 'react';
import { getUserLearnings, Deck } from '@/data/api';
import Colors from '@/constants/Colors';
import { defaultStyleSheet } from '@/constants/Styles';

const Page = () => {
  const [decks, setDecks] = useState<
    { deck: Deck; score: number; cards_correct: number; cards_wrong: number; id: string; created_at: string }[]
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    const data = await getUserLearnings();
    setDecks(data);
  };

  const renderDeckRow: ListRenderItem<{
    deck: Deck;
    score: number;
    cards_correct: number;
    cards_wrong: number;
    created_at: string;
  }> = ({ item }) => {
    return (
      <View style={styles.deckRow}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.deck.title}</Text>
            <Text style={{ color: Colors.darkGrey }}>
              Score: {item.score.toFixed(2)}, {item.created_at.substring(0, 10)}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  return (
    <View style={defaultStyleSheet.container}>
      <Text style={defaultStyleSheet.header}>{decks.length} sessions</Text>
      <FlatList
        data={decks}
        renderItem={renderDeckRow}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadProgress} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
