import AsyncStorage from '@react-native-async-storage/async-storage';
import { USER_STORAGE_KEY, THEME_STORAGE_KEY, SETTINGS_STORAGE_KEY } from '@/constants/Storage';

export interface AppSettings {
  notificationsEnabled?: boolean;
  soundEnabled?: boolean;
  [key: string]: any;
}

export class UserStorageService {
  static async getUserId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  static async setUserId(userId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, userId);
    } catch (error) {
      console.error('Error setting user ID:', error);
      throw error;
    }
  }

  static generateUserId(): string {
    return Math.random().toString(36);
  }

  static async initializeUserId(): Promise<string> {
    try {
      let userId = await this.getUserId();
      if (!userId) {
        userId = this.generateUserId();
        await this.setUserId(userId);
      }
      return userId;
    } catch (error) {
      console.error('Error initializing user ID:', error);
      throw error;
    }
  }

  static async getTheme(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(THEME_STORAGE_KEY);
    } catch (error) {
      console.error('Error getting theme:', error);
      return null;
    }
  }

  static async setTheme(theme: string): Promise<void> {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Error setting theme:', error);
      throw error;
    }
  }

  static async getSettings(): Promise<AppSettings | null> {
    try {
      const settings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  }

  static async setSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error setting settings:', error);
      throw error;
    }
  }

  static async updateSettings(partialSettings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings() || {};
      const updatedSettings = { ...currentSettings, ...partialSettings };
      await this.setSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  static async clearUserData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        USER_STORAGE_KEY,
        THEME_STORAGE_KEY,
        SETTINGS_STORAGE_KEY,
      ]);
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  }
}
