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

export interface Set {
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
  set: string;
}

export { Rating, DifficultyBand };

export const createSet = async (set: Partial<Set>): Promise<Set> => {
  const id = generateId();
  const creator = 'local-user';
  const title = set.title || '';
  const description = set.description || '';

  await executeSql(
    'INSERT INTO sets (id, title, description, creator, cards) VALUES (?, ?, ?, ?, ?)',
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

export const getSets = async (): Promise<Set[]> => {
  const rows = await querySql('SELECT * FROM sets ORDER BY created_at DESC');

  return rows.map((row: any) => ({
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    creator: row.creator || 'local-user',
    cards: row.cards || 0,
  }));
};

export const deleteSet = async (setid: string) => {
  await executeSql('DELETE FROM cards WHERE set_id = ?', [setid]);
  await executeSql('DELETE FROM learnings WHERE set_id = ?', [setid]);
  await executeSql('DELETE FROM user_sets WHERE set_id = ?', [setid]);
  await executeSql('DELETE FROM sets WHERE id = ?', [setid]);
  return { success: true };
};

export const getMySets = async (): Promise<{ id: string; set: Set; canEdit: boolean }[]> => {
  const rows = await querySql(
    `SELECT DISTINCT s.*
     FROM sets s
     INNER JOIN user_sets us ON s.id = us.set_id
     ORDER BY us.created_at DESC`
  );

  return rows.map((row: any) => ({
    id: generateId(),
    set: {
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      creator: row.creator || 'local-user',
      cards: row.cards || 0,
    },
    canEdit: true,
  }));
};

export const getSet = async (id: string): Promise<Set> => {
  const rows = await querySql('SELECT * FROM sets WHERE id = ?', [id]);

  if (rows.length === 0) {
    throw new Error('Set not found');
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

export const addToFavorites = async (setId: string) => {
  const checkRows = await querySql(
    'SELECT id FROM user_sets WHERE set_id = ?',
    [setId]
  );

  if (checkRows.length === 0) {
    const id = generateId();
    await executeSql(
      'INSERT INTO user_sets (id, set_id) VALUES (?, ?)',
      [id, setId]
    );
  }

  return { success: true };
};

export const getLearnCards = async (setid: string, limit: string) => {
  const rows = await querySql(
    'SELECT * FROM cards WHERE set_id = ? ORDER BY RANDOM() LIMIT ?',
    [setid, parseInt(limit)]
  );

  return rows.map((row: any) => ({
    id: row.id,
    question: row.question || '',
    answer: row.answer || '',
    set: row.set_id,
  }));
};

export const getCardsForSet = async (setid: string): Promise<Card[]> => {
  const rows = await querySql(
    'SELECT * FROM cards WHERE set_id = ? ORDER BY created_at ASC',
    [setid]
  );

  return rows.map((row: any) => ({
    id: row.id,
    question: row.question || '',
    answer: row.answer || '',
    set: row.set_id,
  }));
};

export const createCard = async (card: Partial<Card>): Promise<Card> => {
  const id = generateId();
  const setId = card.set || '';
  const question = card.question || '';
  const answer = card.answer || '';

  const initialFSRSCard = createInitialCard(new Date());
  const fsrsData = convertFSRSCardToDB(initialFSRSCard);

  await executeSql(
    `INSERT INTO cards (
      id, set_id, question, answer,
      due, stability, difficulty, elapsed_days, scheduled_days,
      learning_steps, reps, lapses, state, last_review
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      setId,
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
    'UPDATE sets SET cards = cards + 1 WHERE id = ?',
    [setId]
  );

  return {
    id,
    question,
    answer,
    set: setId,
  };
};

export const saveLearning = async (
  setid: string,
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
      id, set_id, score, cards_total, cards_correct, cards_wrong,
      again_count, hard_count, good_count, easy_count, average_rating
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, setid, score, cardsTotal, correct, wrong, againCount, hardCount, goodCount, easyCount, averageRating]
  );

  return { success: true };
};

export const getUserLearnings = async () => {
  const rows = await querySql(
    `SELECT l.*, s.title, s.description, s.creator, s.cards
     FROM learnings l
     INNER JOIN sets s ON l.set_id = s.id
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
    set: {
      id: row.set_id,
      title: row.title || '',
      description: row.description || '',
      creator: row.creator || 'local-user',
      cards: row.cards || 0,
    },
  }));
};

export const getCardsDueForReview = async (setId: string): Promise<DBCard[]> => {
  const now = new Date().toISOString();
  const rows = await querySql(
    'SELECT * FROM cards WHERE set_id = ? AND due <= ? ORDER BY due ASC',
    [setId, now]
  );
  return rows as DBCard[];
};

export const getSetDueCount = async (setId: string): Promise<number> => {
  const now = new Date().toISOString();
  const rows = await querySql(
    'SELECT COUNT(*) as count FROM cards WHERE set_id = ? AND due <= ?',
    [setId, now]
  );
  return rows[0]?.count || 0;
};

export const getCardsByDifficultyBand = async (
  setId: string,
  band: DifficultyBand,
  limit: number
): Promise<DBCard[]> => {
  const allCards = await querySql(
    'SELECT * FROM cards WHERE set_id = ? ORDER BY RANDOM()',
    [setId]
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
  setId: string,
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
      id, card_id, set_id, rating, state, due, stability, difficulty,
      elapsed_days, last_elapsed_days, scheduled_days, review
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      logId,
      cardId,
      setId,
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
