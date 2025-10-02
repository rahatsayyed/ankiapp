import { executeSql, generateId } from './database';

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

  await executeSql(
    'INSERT INTO sets (id, title, description, creator, cards) VALUES (?, ?, ?, ?, ?)',
    [id, set.title || '', set.description || '', creator, 0]
  );

  return {
    id,
    title: set.title || '',
    description: set.description || '',
    creator,
    cards: 0,
  };
};

export const getSets = async (): Promise<Set[]> => {
  const result = await executeSql('SELECT * FROM sets ORDER BY created_at DESC');
  const sets: Set[] = [];

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    sets.push({
      id: row.id,
      title: row.title,
      description: row.description,
      creator: row.creator,
      cards: row.cards,
    });
  }

  return sets;
};

export const deleteSet = async (setid: string) => {
  await executeSql('DELETE FROM cards WHERE set_id = ?', [setid]);
  await executeSql('DELETE FROM learnings WHERE set_id = ?', [setid]);
  await executeSql('DELETE FROM user_sets WHERE set_id = ?', [setid]);
  await executeSql('DELETE FROM sets WHERE id = ?', [setid]);
  return { success: true };
};

export const getMySets = async (): Promise<{ id: string; set: Set; canEdit: boolean }[]> => {
  const result = await executeSql(
    `SELECT DISTINCT s.*
     FROM sets s
     INNER JOIN user_sets us ON s.id = us.set_id
     ORDER BY us.created_at DESC`
  );

  const sets: { id: string; set: Set; canEdit: boolean }[] = [];

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    sets.push({
      id: generateId(),
      set: {
        id: row.id,
        title: row.title,
        description: row.description,
        creator: row.creator,
        cards: row.cards,
      },
      canEdit: true,
    });
  }

  return sets;
};

export const getSet = async (id: string): Promise<Set> => {
  const result = await executeSql('SELECT * FROM sets WHERE id = ?', [id]);

  if (result.rows.length === 0) {
    throw new Error('Set not found');
  }

  const row = result.rows.item(0);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    creator: row.creator,
    cards: row.cards,
  };
};

export const addToFavorites = async (setId: string) => {
  const checkResult = await executeSql(
    'SELECT id FROM user_sets WHERE set_id = ?',
    [setId]
  );

  if (checkResult.rows.length === 0) {
    const id = generateId();
    await executeSql(
      'INSERT INTO user_sets (id, set_id) VALUES (?, ?)',
      [id, setId]
    );
  }

  return { success: true };
};

export const getLearnCards = async (setid: string, limit: string) => {
  const result = await executeSql(
    'SELECT * FROM cards WHERE set_id = ? ORDER BY RANDOM() LIMIT ?',
    [setid, parseInt(limit)]
  );

  const cards: Card[] = [];

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    cards.push({
      id: row.id,
      question: row.question,
      answer: row.answer,
      set: row.set_id,
    });
  }

  return cards;
};

export const getCardsForSet = async (setid: string): Promise<Card[]> => {
  const result = await executeSql(
    'SELECT * FROM cards WHERE set_id = ? ORDER BY created_at ASC',
    [setid]
  );

  const cards: Card[] = [];

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    cards.push({
      id: row.id,
      question: row.question,
      answer: row.answer,
      set: row.set_id,
    });
  }

  return cards;
};

export const createCard = async (card: Partial<Card>): Promise<Card> => {
  const id = generateId();

  await executeSql(
    'INSERT INTO cards (id, set_id, question, answer) VALUES (?, ?, ?, ?)',
    [id, card.set || '', card.question || '', card.answer || '']
  );

  await executeSql(
    'UPDATE sets SET cards = cards + 1 WHERE id = ?',
    [card.set]
  );

  return {
    id,
    question: card.question || '',
    answer: card.answer || '',
    set: card.set || '',
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
  const result = await executeSql(
    `SELECT l.*, s.title, s.description, s.creator, s.cards
     FROM learnings l
     INNER JOIN sets s ON l.set_id = s.id
     ORDER BY l.created_at DESC`
  );

  const learnings: any[] = [];

  for (let i = 0; i < result.rows.length; i++) {
    const row = result.rows.item(i);
    learnings.push({
      id: row.id,
      score: row.score,
      cards_correct: row.cards_correct,
      cards_wrong: row.cards_wrong,
      created_at: row.created_at,
      set: {
        id: row.set_id,
        title: row.title,
        description: row.description,
        creator: row.creator,
        cards: row.cards,
      },
    });
  }

  return learnings;
};
