import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
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
        FOREIGN KEY (set_id) REFERENCES sets (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS learnings (
        id TEXT PRIMARY KEY NOT NULL,
        set_id TEXT NOT NULL,
        score REAL NOT NULL DEFAULT 0,
        cards_total INTEGER NOT NULL DEFAULT 0,
        cards_correct INTEGER NOT NULL DEFAULT 0,
        cards_wrong INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (set_id) REFERENCES sets (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_sets (
        id TEXT PRIMARY KEY NOT NULL,
        set_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (set_id) REFERENCES sets (id) ON DELETE CASCADE
      );
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
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
