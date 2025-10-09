import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

export const initDatabase = async () => {
  if (db) {
    return;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;

  initPromise = (async () => {
    try {
      db = await SQLite.openDatabaseAsync('ankiapp.db');

      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS sets (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          creator TEXT NOT NULL DEFAULT 'local-user',
          cards INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS cards (
          id TEXT PRIMARY KEY NOT NULL,
          set_id TEXT NOT NULL,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          due DATETIME DEFAULT CURRENT_TIMESTAMP,
          stability REAL NOT NULL DEFAULT 0,
          difficulty REAL NOT NULL DEFAULT 0,
          elapsed_days INTEGER NOT NULL DEFAULT 0,
          scheduled_days INTEGER NOT NULL DEFAULT 0,
          learning_steps INTEGER NOT NULL DEFAULT 0,
          reps INTEGER NOT NULL DEFAULT 0,
          lapses INTEGER NOT NULL DEFAULT 0,
          state INTEGER NOT NULL DEFAULT 0,
          last_review DATETIME DEFAULT NULL,
          FOREIGN KEY (set_id) REFERENCES sets (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS card_review_logs (
          id TEXT PRIMARY KEY NOT NULL,
          card_id TEXT NOT NULL,
          set_id TEXT NOT NULL,
          rating INTEGER NOT NULL,
          state INTEGER NOT NULL,
          due DATETIME NOT NULL,
          stability REAL NOT NULL,
          difficulty REAL NOT NULL,
          elapsed_days INTEGER NOT NULL,
          last_elapsed_days INTEGER NOT NULL,
          scheduled_days INTEGER NOT NULL,
          review DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE,
          FOREIGN KEY (set_id) REFERENCES sets (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS learnings (
          id TEXT PRIMARY KEY NOT NULL,
          set_id TEXT NOT NULL,
          score REAL NOT NULL DEFAULT 0,
          cards_total INTEGER NOT NULL DEFAULT 0,
          cards_correct INTEGER NOT NULL DEFAULT 0,
          cards_wrong INTEGER NOT NULL DEFAULT 0,
          again_count INTEGER NOT NULL DEFAULT 0,
          hard_count INTEGER NOT NULL DEFAULT 0,
          good_count INTEGER NOT NULL DEFAULT 0,
          easy_count INTEGER NOT NULL DEFAULT 0,
          average_rating REAL NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (set_id) REFERENCES sets (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_sets (
          id TEXT PRIMARY KEY NOT NULL,
          set_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (set_id) REFERENCES sets (id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due);
        CREATE INDEX IF NOT EXISTS idx_cards_set_due ON cards(set_id, due);
        CREATE INDEX IF NOT EXISTS idx_review_logs_card ON card_review_logs(card_id);
        CREATE INDEX IF NOT EXISTS idx_review_logs_set_review ON card_review_logs(set_id, review);
      `);

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      db = null;
      throw error;
    } finally {
      isInitializing = false;
      initPromise = null;
    }
  })();

  return initPromise;
};

export const isDatabaseReady = (): boolean => {
  return db !== null;
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

export const executeSql = async (
  sql: string,
  params: (string | number | null)[] = []
): Promise<any> => {
  const database = getDatabase();

  try {
    const result = await database.runAsync(sql, params);
    return result;
  } catch (error) {
    console.error('SQL Error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
};

export const querySql = async (
  sql: string,
  params: (string | number | null)[] = []
): Promise<any[]> => {
  const database = getDatabase();

  try {
    const result = await database.getAllAsync(sql, params);
    return result as any[];
  } catch (error) {
    console.error('SQL Query Error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
};

export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
