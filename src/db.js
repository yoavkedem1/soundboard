import { openDB, deleteDB } from 'idb';

// Delete the old database if it exists
const deleteLegacyDB = async () => {
  try {
    // Check for the presence of the old idb-keyval store
    const oldDB = await window.indexedDB.open('soundboard-db');
    oldDB.onupgradeneeded = () => {
      oldDB.transaction.abort();
      oldDB.result?.close();
    };
    
    // Close and attempt to delete
    oldDB.onsuccess = async () => {
      oldDB.result.close();
      try {
        await deleteDB('soundboard-db');
        console.log('Legacy database deleted successfully');
        // Reload to ensure clean state
        window.location.reload();
      } catch (err) {
        console.error('Failed to delete legacy database:', err);
      }
    };
  } catch (err) {
    console.error('Error checking for legacy database:', err);
  }
};

// Create and initialize database
const dbPromise = openDB('soundboard-db-new', 1, {
  upgrade(db) {
    // Create object stores with proper keyPath
    if (!db.objectStoreNames.contains('sounds')) {
      const soundStore = db.createObjectStore('sounds', { keyPath: 'id' });
      soundStore.createIndex('groupId', 'groupId');
    }
    
    if (!db.objectStoreNames.contains('groups')) {
      db.createObjectStore('groups', { keyPath: 'id' });
    }
  },
});

// Sound operations
export async function saveSound(sound) {
  if (!sound.id) {
    sound.id = `sound_${Date.now()}`;
  }
  
  const db = await dbPromise;
  await db.put('sounds', sound);
  return sound;
}

export async function getAllSounds() {
  try {
    const db = await dbPromise;
    return await db.getAll('sounds');
  } catch (error) {
    console.error("Error getting sounds:", error);
    return [];
  }
}

export async function getSound(id) {
  const db = await dbPromise;
  return await db.get('sounds', id);
}

export async function deleteSound(id) {
  const db = await dbPromise;
  return await db.delete('sounds', id);
}

export async function clearAllSounds() {
  const db = await dbPromise;
  return await db.clear('sounds');
}

// Group operations
export async function saveGroup(group) {
  if (!group.id) {
    group.id = `group_${Date.now()}`;
  }
  
  const db = await dbPromise;
  await db.put('groups', group);
  return group;
}

export async function getAllGroups() {
  try {
    const db = await dbPromise;
    return await db.getAll('groups');
  } catch (error) {
    console.error("Error getting groups:", error);
    return [];
  }
}

export async function getGroup(id) {
  const db = await dbPromise;
  return await db.get('groups', id);
}

export async function deleteGroup(id) {
  const db = await dbPromise;
  return await db.delete('groups', id);
}

export async function clearAllGroups() {
  const db = await dbPromise;
  return await db.clear('groups');
}

// Get sounds by group
export async function getSoundsByGroup(groupId) {
  const db = await dbPromise;
  const tx = db.transaction('sounds', 'readonly');
  const index = tx.store.index('groupId');
  return await index.getAll(groupId);
}

// Reset entire database
export async function resetDatabase() {
  try {
    await deleteDB('soundboard-db'); // Try to delete old DB format
    const db = await dbPromise;
    await db.clear('sounds');
    await db.clear('groups');
    return true;
  } catch (error) {
    console.error("Error resetting database:", error);
    return false;
  }
}

// Check and clear old database on first load
export async function initializeDatabase() {
  try {
    await deleteLegacyDB();
    return true;
  } catch (err) {
    console.error('Database initialization error:', err);
    return false;
  }
} 