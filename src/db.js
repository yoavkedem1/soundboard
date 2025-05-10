import { openDB, deleteDB } from 'idb';

// Database configuration
const DB_NAME = 'soundboard-db';
const DB_VERSION = 2;

// Track database state
let dbInstance = null;
let dbInitialized = false;
let dbInitializing = false;
let dbInitPromise = null;

/**
 * Database schema definition
 */
const createSchema = (db, oldVersion, newVersion) => {
  console.log(`Creating/upgrading database from version ${oldVersion} to ${newVersion}`);
  
  // Create sounds store if it doesn't exist
  if (!db.objectStoreNames.contains('sounds')) {
    const soundsStore = db.createObjectStore('sounds', { keyPath: 'id' });
    soundsStore.createIndex('groupId', 'groupId');
    console.log('Created sounds store');
  }
  
  // Create groups store if it doesn't exist
  if (!db.objectStoreNames.contains('groups')) {
    db.createObjectStore('groups', { keyPath: 'id' });
    console.log('Created groups store');
  }
  
  console.log(`Database schema updated to version ${newVersion}`);
};

/**
 * Clean up stale databases
 */
const cleanupDatabases = async () => {
  try {
    await deleteDB(DB_NAME);
    await deleteDB('soundboard-db-new'); // Delete any old database versions
    console.log('Old databases cleaned up');
    return true;
  } catch (err) {
    console.error('Failed to cleanup databases:', err);
    return false;
  }
};

/**
 * Initialize the database system
 */
export const initializeDatabase = async () => {
  // Return existing promise if already initializing
  if (dbInitializing && dbInitPromise) {
    return dbInitPromise;
  }
  
  // Return early if already initialized
  if (dbInitialized && dbInstance) {
    return dbInstance;
  }
  
  // Set initializing flag
  dbInitializing = true;
  
  // Create initialization promise
  dbInitPromise = (async () => {
    console.log('Initializing database...');
    
    try {
      // Open database with specified schema
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade: createSchema,
        blocked() {
          console.warn('Database upgrade blocked. Close other tabs with this app open.');
        },
        blocking() {
          console.warn('This tab is blocking a database upgrade.');
        },
        terminated() {
          console.error('Database connection terminated unexpectedly.');
          dbInstance = null;
          dbInitialized = false;
        }
      });
      
      // Add volume property to existing sounds if needed (migration)
      await ensureVolumeProperty(db);
      
      // Store database instance
      dbInstance = db;
      dbInitialized = true;
      console.log('Database initialized successfully');
      
      return db;
    } catch (err) {
      console.error('Database initialization failed:', err);
      
      // Only attempt cleanup if it's a version error
      if (err.name === 'VersionError') {
        console.log('Version mismatch detected, cleaning up...');
        await cleanupDatabases();
        
        // Try one more time after cleanup
        try {
          const db = await openDB(DB_NAME, DB_VERSION, { upgrade: createSchema });
          dbInstance = db;
          dbInitialized = true;
          console.log('Database initialized after cleanup');
          return db;
        } catch (retryErr) {
          console.error('Failed to initialize database after cleanup:', retryErr);
          throw retryErr;
        }
      } else {
        throw err;
      }
    } finally {
      dbInitializing = false;
    }
  })();
  
  return dbInitPromise;
};

/**
 * Get existing database connection or open a new one
 */
async function getDb() {
  if (dbInstance) return dbInstance;
  return initializeDatabase();
}

/**
 * Ensure all sounds have a volume property
 */
async function ensureVolumeProperty(db) {
  try {
    const tx = db.transaction('sounds', 'readwrite');
    const store = tx.objectStore('sounds');
    const sounds = await store.getAll();
    
    let updated = 0;
    for (const sound of sounds) {
      if (sound.volume === undefined) {
        sound.volume = 0.7; // Default volume
        await store.put(sound);
        updated++;
      }
    }
    
    if (updated > 0) {
      console.log(`Added volume property to ${updated} sounds`);
    }
    
    await tx.done;
    return true;
  } catch (err) {
    console.error('Failed to update sound volumes:', err);
    return false;
  }
}

/**
 * Reset the entire database
 */
export async function resetDatabase() {
  try {
    // Reset state
    dbInstance = null;
    dbInitialized = false;
    dbInitializing = false;
    dbInitPromise = null;
    
    // Delete database files
    await cleanupDatabases();
    
    // Clear any service worker caches
    if (window.caches) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map(key => window.caches.delete(key)));
    }
    
    return true;
  } catch (err) {
    console.error('Reset failed:', err);
    return false;
  }
}

/**
 * Sound operations
 */
export async function saveSound(sound) {
  try {
    if (!sound.id) {
      sound.id = `sound_${Date.now()}`;
    }
    
    if (!sound.data) {
      throw new Error('Missing sound data');
    }
    
    // Ensure volume property exists
    if (sound.volume === undefined) {
      sound.volume = 0.7;
    }
    
    const db = await getDb();
    await db.put('sounds', sound);
    return sound;
  } catch (err) {
    console.error('Failed to save sound:', err);
    throw err;
  }
}

export async function getAllSounds() {
  try {
    const db = await getDb();
    const sounds = await db.getAll('sounds');
    
    // Filter out invalid sounds and ensure volume property
    return sounds
      .filter(sound => sound && sound.data && typeof sound.data === 'string')
      .map(sound => ({
        ...sound,
        volume: sound.volume ?? 0.7
      }));
  } catch (err) {
    console.error('Failed to get sounds:', err);
    return [];
  }
}

export async function getSound(id) {
  try {
    const db = await getDb();
    return await db.get('sounds', id);
  } catch (err) {
    console.error('Failed to get sound:', err);
    return null;
  }
}

export async function deleteSound(id) {
  try {
    const db = await getDb();
    await db.delete('sounds', id);
    return true;
  } catch (err) {
    console.error('Failed to delete sound:', err);
    return false;
  }
}

export async function clearAllSounds() {
  try {
    const db = await getDb();
    await db.clear('sounds');
    return true;
  } catch (err) {
    console.error('Failed to clear sounds:', err);
    return false;
  }
}

/**
 * Group operations
 */
export async function saveGroup(group) {
  try {
    if (!group.id) {
      group.id = `group_${Date.now()}`;
    }
    
    const db = await getDb();
    await db.put('groups', group);
    return group;
  } catch (err) {
    console.error('Failed to save group:', err);
    throw err;
  }
}

export async function getAllGroups() {
  try {
    const db = await getDb();
    return await db.getAll('groups');
  } catch (err) {
    console.error('Failed to get groups:', err);
    return [];
  }
}

export async function getGroup(id) {
  try {
    const db = await getDb();
    return await db.get('groups', id);
  } catch (err) {
    console.error('Failed to get group:', err);
    return null;
  }
}

export async function deleteGroup(id) {
  try {
    const db = await getDb();
    await db.delete('groups', id);
    return true;
  } catch (err) {
    console.error('Failed to delete group:', err);
    return false;
  }
}

export async function clearAllGroups() {
  try {
    const db = await getDb();
    await db.clear('groups');
    return true;
  } catch (err) {
    console.error('Failed to clear groups:', err);
    return false;
  }
}

export async function getSoundsByGroup(groupId) {
  try {
    const db = await getDb();
    const tx = db.transaction('sounds', 'readonly');
    const index = tx.store.index('groupId');
    const sounds = await index.getAll(groupId);
    return sounds;
  } catch (err) {
    console.error('Failed to get sounds by group:', err);
    return [];
  }
} 