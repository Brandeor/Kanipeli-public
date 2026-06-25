export function readSave(key, fallback, storage = window.localStorage) {
  try {
    const value = storage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

export function writeSave(key, value, storage = window.localStorage) {
  try {
    storage.setItem(key, String(value));
  } catch (error) {
    // Saving is optional; gameplay should continue if browser storage is blocked.
  }
}
