import { openDB, deleteDB } from 'idb';

// Only use version 2, remove all version 1 handling
const DB_VERSION = 2;

// Check if we've detected database version issues
let hasDetectedVersionMismatch = false;

// Delete ALL databases to ensure a clean start
const cleanDatabases = async () => {
  try {
    console.log('Cleaning all database versions...');
    
    // Delete both old and new databases to ensure clean state
    await deleteDB('soundboard-db');
    await deleteDB('soundboard-db-new');
    
    console.log('All databases deleted successfully');
    return true;
  } catch (err) {
    console.error('Error deleting databases:', err);
    return false;
  }
};

// Clear caches and unregister service workers
const clearCaches = async () => {
  // Unregister service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
      console.log('Service workers unregistered');
    } catch (err) {
      console.error('Error unregistering service workers:', err);
    }
  }
  
  // Clear caches
  if (window.caches) {
    try {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map(key => window.caches.delete(key)));
      console.log('Caches cleared');
    } catch (err) {
      console.error('Error clearing caches:', err);
    }
  }
};

// Try to open the database first just to check its existing version
const detectDatabaseVersion = async () => {
  try {
    // Try to open without specifying version to get existing version
    const tempDb = await openDB('soundboard-db-new');
    const actualVersion = tempDb.version;
    console.log(`Detected database version: ${actualVersion}`);
    
    // Close the database
    tempDb.close();
    
    // If the versions don't match, handle this situation
    if (actualVersion !== DB_VERSION) {
      console.warn(`Version mismatch: Code expects v${DB_VERSION}, database is v${actualVersion}`);
      hasDetectedVersionMismatch = true;
      
      // Any version mismatch requires a clean slate
      console.log("Database version mismatch detected, clearing cache and databases...");
      
      // Clean everything and reload
      await cleanDatabases();
      await clearCaches();
      
      // If we're not already in a clean reload, force one
      if (!window.location.search.includes('forceclean=1')) {
        window.location.href = window.location.pathname + '?forceclean=1';
        return false;
      }
    }
    
    return true;
  } catch (err) {
    // If database doesn't exist, that's fine - we'll create it
    if (err.name === 'NotFoundError') {
      console.log('Database does not exist yet, will be created');
      return true;
    }
    
    console.error('Error detecting database version:', err);
    return false;
  }
};

// Check database version at startup
detectDatabaseVersion().catch(err => {
  console.error('Error during version detection:', err);
});

// Create and initialize database - always start at version 2
const dbPromise = openDB('soundboard-db-new', DB_VERSION, {
  upgrade(db, oldVersion, newVersion) {
    console.log(`Creating/upgrading database from version ${oldVersion} to ${newVersion}`);
    
    // Always create full schema as version 2
    // We no longer have version 1 logic
    
    // Create object stores with proper keyPath if they don't exist
    if (!db.objectStoreNames.contains('sounds')) {
      const soundStore = db.createObjectStore('sounds', { keyPath: 'id' });
      soundStore.createIndex('groupId', 'groupId');
    }
    
    if (!db.objectStoreNames.contains('groups')) {
      db.createObjectStore('groups', { keyPath: 'id' });
    }
    
    console.log('Database schema created at version 2');
  },
  blocked() {
    console.warn('Database upgrade was blocked. Please close other tabs with this app.');
  },
  blocking() {
    console.warn('This tab is blocking a database upgrade. Please close this tab.');
  },
  terminated() {
    console.error('Database connection was terminated unexpectedly.');
  }
});

// Function to add volume property to existing sounds
// This is called after the database is upgraded
async function addVolumePropertyToSounds() {
  try {
    const db = await getDatabase();
    if (!db) return; // Exit if database is not available
    
    const tx = db.transaction('sounds', 'readwrite');
    const store = tx.objectStore('sounds');
    
    // Get all sounds
    const sounds = await store.getAll();
    
    // Add volume property to each sound
    for (const sound of sounds) {
      if (sound.volume === undefined) {
        sound.volume = 0.7; // Default volume
        await store.put(sound);
      }
    }
    
    await tx.done;
    console.log('Volume property added to all sounds');
    
  } catch (err) {
    console.error('Error adding volume property:', err);
  }
}

// Function to handle database version mismatch or connection issues
const getDatabase = async () => {
  try {
    return await dbPromise;
  } catch (err) {
    console.error('Database connection error:', err);
    
    // Check if it's a version error
    if (err.name === 'VersionError') {
      console.warn('Database version mismatch detected. Cleaning up...');
      
      // If we've already detected a mismatch, don't try to fix it again
      if (hasDetectedVersionMismatch) {
        console.error('Already tried to fix version mismatch, but still failing.');
        throw new Error('Unable to resolve database version mismatch');
      }
      
      hasDetectedVersionMismatch = true;
      
      try {
        // Close any existing connections
        try {
          const existingDB = await openDB('soundboard-db-new', null);
          if (existingDB) {
            existingDB.close();
          }
        } catch (e) {
          // Ignore errors here
        }
        
        // Delete databases and clear caches
        await cleanDatabases();
        await clearCaches();
        
        console.log('Database and caches cleared. Reloading...');
        
        // Force reload the page
        window.location.reload(true);
        return null;
      } catch (cleanupErr) {
        console.error('Error during cleanup:', cleanupErr);
        throw new Error('Failed to recover from version mismatch. Please reload the page.');
      }
    }
    
    throw err;
  }
};

// Check database version and run migrations if needed
dbPromise.then(db => {
  // Always ensure all sounds have volume
  addVolumePropertyToSounds();
}).catch(err => {
  console.error('Database initialization error:', err);
});

// Sound operations
export async function saveSound(sound) {
  if (!sound.id) {
    sound.id = `sound_${Date.now()}`;
  }
  
  // Validate sound data
  if (!sound.data) {
    throw new Error('Missing sound data');
  }
  
  // Ensure volume property exists
  if (sound.volume === undefined) {
    sound.volume = 0.7;
  }
  
  try {
    const db = await getDatabase();
    if (!db) return null;
    
    await db.put('sounds', sound);
    return sound;
  } catch (err) {
    console.error("Error saving sound to database:", err);
    throw new Error(`Failed to save sound: ${err.message}`);
  }
}

export async function getAllSounds() {
  try {
    const db = await getDatabase();
    if (!db) return [];
    
    const sounds = await db.getAll('sounds');
    
    // Validate sounds
    return sounds.filter(sound => {
      if (!sound.data) {
        console.warn(`Sound ${sound.id} is missing data, skipping`);
        return false;
      }
      return true;
    }).map(sound => {
      // Ensure volume property exists for backward compatibility
      if (sound.volume === undefined) {
        sound.volume = 0.7;
      }
      return sound;
    });
  } catch (error) {
    console.error("Error getting sounds:", error);
    return [];
  }
}

export async function getSound(id) {
  try {
    const db = await getDatabase();
    if (!db) return null;
    
    return await db.get('sounds', id);
  } catch (error) {
    console.error("Error getting sound:", error);
    return null;
  }
}

export async function deleteSound(id) {
  try {
    const db = await getDatabase();
    if (!db) return false;
    
    await db.delete('sounds', id);
    return true;
  } catch (error) {
    console.error("Error deleting sound:", error);
    return false;
  }
}

export async function clearAllSounds() {
  try {
    const db = await getDatabase();
    if (!db) return false;
    
    await db.clear('sounds');
    return true;
  } catch (error) {
    console.error("Error clearing sounds:", error);
    return false;
  }
}

// Group operations
export async function saveGroup(group) {
  if (!group.id) {
    group.id = `group_${Date.now()}`;
  }
  
  try {
    const db = await getDatabase();
    if (!db) return null;
    
    await db.put('groups', group);
    return group;
  } catch (error) {
    console.error("Error saving group:", error);
    return null;
  }
}

export async function getAllGroups() {
  try {
    const db = await getDatabase();
    if (!db) return [];
    
    return await db.getAll('groups');
  } catch (error) {
    console.error("Error getting groups:", error);
    return [];
  }
}

export async function getGroup(id) {
  try {
    const db = await getDatabase();
    if (!db) return null;
    
    return await db.get('groups', id);
  } catch (error) {
    console.error("Error getting group:", error);
    return null;
  }
}

export async function deleteGroup(id) {
  try {
    const db = await getDatabase();
    if (!db) return false;
    
    await db.delete('groups', id);
    return true;
  } catch (error) {
    console.error("Error deleting group:", error);
    return false;
  }
}

export async function clearAllGroups() {
  try {
    const db = await getDatabase();
    if (!db) return false;
    
    await db.clear('groups');
    return true;
  } catch (error) {
    console.error("Error clearing groups:", error);
    return false;
  }
}

// Get sounds by group
export async function getSoundsByGroup(groupId) {
  try {
    const db = await getDatabase();
    if (!db) return [];
    
    const tx = db.transaction('sounds', 'readonly');
    const index = tx.store.index('groupId');
    return await index.getAll(groupId);
  } catch (error) {
    console.error("Error getting sounds by group:", error);
    return [];
  }
}

// Reset entire database - modified to always use cleanDatabases
export async function resetDatabase() {
  try {
    // Delete all databases and clear caches
    await cleanDatabases();
    await clearCaches();
    
    // Force a page reload to reinitialize everything cleanly
    window.location.reload(true);
    
    return true;
  } catch (error) {
    console.error("Error resetting database:", error);
    return false;
  }
}

// Check and clear old database on first load
export async function initializeDatabase() {
  try {
    // Delete any legacy databases
    await cleanDatabases();
    
    // Wait for database to be ready
    const db = await getDatabase();
    if (db) {
      console.log(`Database initialized: v${db.version}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Database initialization error:', err);
    return false;
  }
} 