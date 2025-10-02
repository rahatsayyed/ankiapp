import * as SQLite from 'expo-sqlite';

const DB_NAME = 'ankiapp.db';

let db: SQLite.WebSQLDatabase;

export const initDatabase = async () => {
  db = SQLite.openDatabase(DB_NAME);

  return new Promise<void>((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS sets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            creator TEXT,
            cards INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );`
        );

        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS cards (
            id TEXT PRIMARY KEY,
            set_id TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (set_id) REFERENCES sets (id) ON DELETE CASCADE
          );`
        );

        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS learnings (
            id TEXT PRIMARY KEY,
            set_id TEXT NOT NULL,
            score REAL,
            cards_total INTEGER,
            cards_correct INTEGER,
            cards_wrong INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (set_id) REFERENCES sets (id) ON DELETE CASCADE
          );`
        );

        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS user_sets (
            id TEXT PRIMARY KEY,
            set_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (set_id) REFERENCES sets (id) ON DELETE CASCADE
          );`
        );
      },
      (error) => {
        console.error('Database initialization error:', error);
        reject(error);
      },
      () => {
        console.log('Database initialized successfully');
        resolve();
      }
    );
  });
};

export const getDatabase = () => {
  if (!db) {
    db = SQLite.openDatabase(DB_NAME);
  }
  return db;
};

export const executeSql = (
  sql: string,
  params: any[] = []
): Promise<SQLite.SQLResultSet> => {
  const database = getDatabase();
  return new Promise((resolve, reject) => {
    database.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, error) => {
          console.error('SQL Error:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
