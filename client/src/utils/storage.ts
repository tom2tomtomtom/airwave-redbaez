/**
 * Utilities for local storage persistence
 */

/**
 * Save data to local storage with a key
 */
export const saveToStorage = <T>(key: string, data: T): void => {
  try {
    const serialisedData = JSON.stringify(data);
    localStorage.setItem(key, serialisedData);
  } catch (error) {
    console.error(`Failed to save data to localStorage for key ${key}:`, error);
  }
};

/**
 * Retrieve data from local storage by key
 */
export const getFromStorage = <T>(key: string): T | null => {
  try {
    const serialisedData = localStorage.getItem(key);
    if (!serialisedData) return null;
    return JSON.parse(serialisedData) as T;
  } catch (error) {
    console.error(`Failed to get data from localStorage for key ${key}:`, error);
    return null;
  }
};

/**
 * Remove item from local storage by key
 */
export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove data from localStorage for key ${key}:`, error);
  }
};

/**
 * Storage keys used in the application
 */
export const STORAGE_KEYS = {
  BRIEF: 'airwave_brief_data',
  MOTIVATIONS: 'airwave_motivations',
  SELECTED_MOTIVATIONS: 'airwave_selected_motivations',
};
