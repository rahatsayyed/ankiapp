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
import { Set, getSetDueCount } from '@/data/api';
import { Link } from 'expo-router';
import { getMySets } from '@/data/api';
import { defaultStyleSheet } from '@/constants/Styles';

interface SetWithDueCount {
  id: string;
  set: Set;
  canEdit: boolean;
  dueCount: number;
}

const Page = () => {
  const [sets, setSets] = useState<SetWithDueCount[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadSets();
  }, []);

  const loadSets = async () => {
    const data = await getMySets();
    const setsWithDueCounts = await Promise.all(
      data.map(async (item) => {
        const dueCount = await getSetDueCount(item.set.id);
        return { ...item, dueCount };
      })
    );
    setSets(setsWithDueCounts);
  };

  const renderSetRow: ListRenderItem<SetWithDueCount> = ({ item: { set, canEdit, dueCount } }) => {
    return (
      <Link href={`/(learn)/${set.id}?mode=fsrs`} asChild>
        <TouchableOpacity style={styles.setRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.headerRow}>
              <Text style={styles.rowTitle}>{set.title}</Text>
              {dueCount > 0 && (
                <View style={styles.dueBadge}>
                  <Text style={styles.dueText}>{dueCount} due</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardCount}>{set.cards} cards</Text>
            {canEdit && (
              <Link href={`/(modals)/(cards)/${set.id}`} asChild>
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
      {!sets.length && (
        <Link href={'/(tabs)/search'} asChild>
          <TouchableOpacity style={{}}>
            <Text style={{ textAlign: 'center', padding: 20, color: '#3f3f3f' }}>
              Add your first set!
            </Text>
          </TouchableOpacity>
        </Link>
      )}

      <FlatList
        data={sets}
        renderItem={renderSetRow}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={loadSets} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  setRow: {
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
