import { executeSql, querySql, generateId } from './database';

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

  await executeSql(
    'INSERT INTO cards (id, set_id, question, answer) VALUES (?, ?, ?, ?)',
    [id, setId, question, answer]
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
  wrong: number
) => {
  const id = generateId();
  const score = cardsTotal > 0 ? (correct / cardsTotal) * 100 : 0;

  await executeSql(
    'INSERT INTO learnings (id, set_id, score, cards_total, cards_correct, cards_wrong) VALUES (?, ?, ?, ?, ?, ?)',
    [id, setid, score, cardsTotal, correct, wrong]
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
