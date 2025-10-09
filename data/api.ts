import { executeSql, querySql, generateId } from './database';
import {
  createInitialCard,
  reviewCardWithRating,
  convertDBCardToFSRS,
  convertFSRSCardToDB,
  computeCardDifficultyBand,
  DBCard,
  Rating,
  Card as FSRSCard,
  ReviewLog,
  DifficultyBand,
} from './fsrs';

export const USER_STORAGE_KEY = '@ankiapp:userId';

export interface Deck {
  cards: number;
  description: string;
  creator: string;
  id: string;
  title: string;
}

export interface Card {
  answer: string;
  id: string;
  question: string;
  deck: string;
}

export { Rating, DifficultyBand };

export const createDeck = async (deck: Partial<Deck>): Promise<Deck> => {
  const id = generateId();
  const creator = 'local-user';
  const title = deck.title || '';
  const description = deck.description || '';

  await executeSql(
    'INSERT INTO decks (id, title, description, creator, cards) VALUES (?, ?, ?, ?, ?)',
    [id, title, description, creator, 0]
  );

  return {
    id,
    title,
    description,
    creator,
    cards: 0,
  };
};

export const getDecks = async (): Promise<Deck[]> => {
  const rows = await querySql('SELECT * FROM decks ORDER BY created_at DESC');

  return rows.map((row: any) => ({
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    creator: row.creator || 'local-user',
    cards: row.cards || 0,
  }));
};

export const deleteDeck = async (deckId: string) => {
  await executeSql('DELETE FROM cards WHERE deck_id = ?', [deckId]);
  await executeSql('DELETE FROM learnings WHERE deck_id = ?', [deckId]);
  await executeSql('DELETE FROM user_decks WHERE deck_id = ?', [deckId]);
  await executeSql('DELETE FROM decks WHERE id = ?', [deckId]);
  return { success: true };
};

export const getMyDecks = async (): Promise<{ id: string; deck: Deck; canEdit: boolean }[]> => {
  const rows = await querySql(
    `SELECT DISTINCT d.*
     FROM decks d
     INNER JOIN user_decks ud ON d.id = ud.deck_id
     ORDER BY ud.created_at DESC`
  );

  return rows.map((row: any) => ({
    id: generateId(),
    deck: {
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      creator: row.creator || 'local-user',
      cards: row.cards || 0,
    },
    canEdit: true,
  }));
};

export const getDeck = async (id: string): Promise<Deck> => {
  const rows = await querySql('SELECT * FROM decks WHERE id = ?', [id]);

  if (rows.length === 0) {
    throw new Error('Deck not found');
  }

  const row = rows[0];
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    creator: row.creator || 'local-user',
    cards: row.cards || 0,
  };
};

export const addToFavorites = async (deckId: string) => {
  const checkRows = await querySql(
    'SELECT id FROM user_decks WHERE deck_id = ?',
    [deckId]
  );

  if (checkRows.length === 0) {
    const id = generateId();
    await executeSql(
      'INSERT INTO user_decks (id, deck_id) VALUES (?, ?)',
      [id, deckId]
    );
  }

  return { success: true };
};

export const getLearnCards = async (deckId: string, limit: string) => {
  const rows = await querySql(
    'SELECT * FROM cards WHERE deck_id = ? ORDER BY RANDOM() LIMIT ?',
    [deckId, parseInt(limit)]
  );

  return rows.map((row: any) => ({
    id: row.id,
    question: row.question || '',
    answer: row.answer || '',
    deck: row.deck_id,
  }));
};

export const getCardsForDeck = async (deckId: string): Promise<Card[]> => {
  const rows = await querySql(
    'SELECT * FROM cards WHERE deck_id = ? ORDER BY created_at ASC',
    [deckId]
  );

  return rows.map((row: any) => ({
    id: row.id,
    question: row.question || '',
    answer: row.answer || '',
    deck: row.deck_id,
  }));
};

export const createCard = async (card: Partial<Card>): Promise<Card> => {
  const id = generateId();
  const deckId = card.deck || '';
  const question = card.question || '';
  const answer = card.answer || '';

  const initialFSRSCard = createInitialCard(new Date());
  const fsrsData = convertFSRSCardToDB(initialFSRSCard);

  await executeSql(
    `INSERT INTO cards (
      id, deck_id, question, answer,
      due, stability, difficulty, elapsed_days, scheduled_days,
      learning_steps, reps, lapses, state, last_review
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      deckId,
      question,
      answer,
      fsrsData.due!,
      fsrsData.stability!,
      fsrsData.difficulty!,
      fsrsData.elapsed_days!,
      fsrsData.scheduled_days!,
      0,
      fsrsData.reps!,
      fsrsData.lapses!,
      fsrsData.state!,
      fsrsData.last_review ?? null,
    ]
  );

  await executeSql(
    'UPDATE decks SET cards = cards + 1 WHERE id = ?',
    [deckId]
  );

  return {
    id,
    question,
    answer,
    deck: deckId,
  };
};

export const saveLearning = async (
  deckId: string,
  cardsTotal: number,
  correct: number,
  wrong: number,
  againCount: number = 0,
  hardCount: number = 0,
  goodCount: number = 0,
  easyCount: number = 0
) => {
  const id = generateId();
  const score = cardsTotal > 0 ? (correct / cardsTotal) * 100 : 0;
  const totalRatings = againCount + hardCount + goodCount + easyCount;
  const averageRating = totalRatings > 0
    ? (againCount * 1 + hardCount * 2 + goodCount * 3 + easyCount * 4) / totalRatings
    : 0;

  await executeSql(
    `INSERT INTO learnings (
      id, deck_id, score, cards_total, cards_correct, cards_wrong,
      again_count, hard_count, good_count, easy_count, average_rating
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, deckId, score, cardsTotal, correct, wrong, againCount, hardCount, goodCount, easyCount, averageRating]
  );

  return { success: true };
};

export const getUserLearnings = async () => {
  const rows = await querySql(
    `SELECT l.*, d.title, d.description, d.creator, d.cards
     FROM learnings l
     INNER JOIN decks d ON l.deck_id = d.id
     ORDER BY l.created_at DESC`
  );

  return rows.map((row: any) => ({
    id: row.id,
    score: row.score || 0,
    cards_correct: row.cards_correct || 0,
    cards_wrong: row.cards_wrong || 0,
    again_count: row.again_count || 0,
    hard_count: row.hard_count || 0,
    good_count: row.good_count || 0,
    easy_count: row.easy_count || 0,
    average_rating: row.average_rating || 0,
    created_at: row.created_at || '',
    deck: {
      id: row.deck_id,
      title: row.title || '',
      description: row.description || '',
      creator: row.creator || 'local-user',
      cards: row.cards || 0,
    },
  }));
};

export const getCardsDueForReview = async (deckId: string): Promise<DBCard[]> => {
  const now = new Date().toISOString();
  const rows = await querySql(
    'SELECT * FROM cards WHERE deck_id = ? AND due <= ? ORDER BY due ASC',
    [deckId, now]
  );
  return rows as DBCard[];
};

export const getDeckDueCount = async (deckId: string): Promise<number> => {
  const now = new Date().toISOString();
  const rows = await querySql(
    'SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND due <= ?',
    [deckId, now]
  );
  return rows[0]?.count || 0;
};

export const getCardsByDifficultyBand = async (
  deckId: string,
  band: DifficultyBand,
  limit: number
): Promise<DBCard[]> => {
  const allCards = await querySql(
    'SELECT * FROM cards WHERE deck_id = ? ORDER BY RANDOM()',
    [deckId]
  );

  if (band === 'Any') {
    return (allCards as DBCard[]).slice(0, limit);
  }

  const now = new Date();
  const filtered = (allCards as DBCard[]).filter((dbCard) => {
    const fsrsCard = convertDBCardToFSRS(dbCard);
    const cardBand = computeCardDifficultyBand(fsrsCard, now);
    return cardBand === band;
  });

  return filtered.slice(0, limit);
};

export const updateCardAfterReview = async (
  cardId: string,
  deckId: string,
  rating: Rating,
  now: Date = new Date()
): Promise<void> => {
  const cardRows = await querySql('SELECT * FROM cards WHERE id = ?', [cardId]);
  if (cardRows.length === 0) {
    throw new Error('Card not found');
  }

  const dbCard = cardRows[0] as DBCard;
  const fsrsCard = convertDBCardToFSRS(dbCard);
  const { card: updatedCard, log } = reviewCardWithRating(fsrsCard, rating, now);
  const updatedData = convertFSRSCardToDB(updatedCard);

  await executeSql(
    `UPDATE cards SET
      due = ?,
      stability = ?,
      difficulty = ?,
      elapsed_days = ?,
      scheduled_days = ?,
      reps = ?,
      lapses = ?,
      state = ?,
      last_review = ?
    WHERE id = ?`,
    [
      updatedData.due!,
      updatedData.stability!,
      updatedData.difficulty!,
      updatedData.elapsed_days!,
      updatedData.scheduled_days!,
      updatedData.reps!,
      updatedData.lapses!,
      updatedData.state!,
      updatedData.last_review ?? null,
      cardId,
    ]
  );

  const logId = generateId();
  await executeSql(
    `INSERT INTO card_review_logs (
      id, card_id, deck_id, rating, state, due, stability, difficulty,
      elapsed_days, last_elapsed_days, scheduled_days, review
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      logId,
      cardId,
      deckId,
      log.rating,
      log.state,
      log.due.toISOString(),
      log.stability,
      log.difficulty,
      log.elapsed_days,
      log.last_elapsed_days,
      log.scheduled_days,
      log.review.toISOString(),
    ]
  );
};
