import { openDB } from 'idb';

// Create and initialize database
const dbPromise = openDB('soundboard-db', 1, {
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
    sound.id = Date.now().toString();
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
    group.id = Date.now().toString();
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
  const db = await dbPromise;
  await db.clear('sounds');
  await db.clear('groups');
  return true;
} 