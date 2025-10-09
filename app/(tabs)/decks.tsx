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
import { Deck, getDeckDueCount } from '@/data/api';
import { Link } from 'expo-router';
import { getMyDecks } from '@/data/api';
import { defaultStyleSheet } from '@/constants/Styles';

interface DeckWithDueCount {
  id: string;
  deck: Deck;
  canEdit: boolean;
  dueCount: number;
}

const Page = () => {
  const [decks, setDecks] = useState<DeckWithDueCount[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    const data = await getMyDecks();
    const decksWithDueCounts = await Promise.all(
      data.map(async (item) => {
        const dueCount = await getDeckDueCount(item.deck.id);
        return { ...item, dueCount };
      })
    );
    setDecks(decksWithDueCounts);
  };

  const renderDeckRow: ListRenderItem<DeckWithDueCount> = ({ item: { deck, canEdit, dueCount } }) => {
    return (
      <Link href={`/(learn)/${deck.id}?mode=fsrs`} asChild>
        <TouchableOpacity style={styles.deckRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.headerRow}>
              <Text style={styles.rowTitle}>{deck.title}</Text>
              {dueCount > 0 && (
                <View style={styles.dueBadge}>
                  <Text style={styles.dueText}>{dueCount} due</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardCount}>{deck.cards} cards</Text>
            {canEdit && (
              <Link href={`/(modals)/(cards)/${deck.id}`} asChild>
                <TouchableOpacity
                  style={[defaultStyleSheet.button, styles.editButton]}
                  onPress={(e) => e.stopPropagation()}
                >
                  <Text style={defaultStyleSheet.buttonText}>Edit Cards</Text>
                </TouchableOpacity>
              </Link>
            )}
          </View>
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <View style={styles.container}>
      {!decks.length && (
        <Link href={'/(tabs)/search'} asChild>
          <TouchableOpacity style={{}}>
            <Text style={{ textAlign: 'center', padding: 20, color: '#3f3f3f' }}>
              Add your first deck!
            </Text>
          </TouchableOpacity>
        </Link>
      )}

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
  container: {
    flex: 1,
  },
  deckRow: {
    margin: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  dueBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dueText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
});

export default Page;
