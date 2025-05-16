// Enhanced IndexedDB management with iOS Safari compatibility
const DB_NAME = 'soundboard';
const DB_VERSION = 2;
const SOUNDS_STORE = 'sounds';
const GROUPS_STORE = 'groups';
const MAX_RETRIES = 3; // Limit retries to prevent infinite loops

// Track initialization state
let dbInitialized = false;
let dbInitPromise = null;
let initRetries = 0;

// Detect iOS/Safari
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Log platform info once
console.log(`Database initializing for: ${isIOS ? 'iOS' : 'Non-iOS'}, ${isSafari ? 'Safari' : 'Non-Safari'} browser`);

// Store current database version to prevent constant resets
let currentDbVersion = null;

/**
 * Database schema definition
 */
const createSchema = (db, oldVersion, newVersion) => {
  console.log(`Creating/upgrading database from version ${oldVersion} to ${newVersion}`);
  
  // Create sounds store if it doesn't exist
  if (!db.objectStoreNames.contains(SOUNDS_STORE)) {
    const soundsStore = db.createObjectStore(SOUNDS_STORE, { keyPath: 'id' });
    soundsStore.createIndex('groupId', 'groupId', { unique: false });
    console.log('Created sounds store with groupId index');
  }
  
  // Create groups store if it doesn't exist
  if (!db.objectStoreNames.contains(GROUPS_STORE)) {
    db.createObjectStore(GROUPS_STORE, { keyPath: 'id' });
    console.log('Created groups store');
  }
  
  console.log(`Database schema updated to version ${newVersion}`);
  
  // Store the current version to prevent unnecessary resets
  currentDbVersion = newVersion;
};

/**
 * Delete a database safely
 */
const deleteDB = (name) => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.deleteDatabase(name);
      
      request.onsuccess = () => {
        console.log(`Database ${name} deleted successfully`);
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error(`Error deleting database ${name}:`, event.target.error);
        reject(event.target.error);
      };
      
      // Special handling for blocked events - iOS Safari specific
      request.onblocked = (event) => {
        console.warn(`Database ${name} deletion blocked - close all other tabs`);
        // Try to continue anyway
        resolve(false);
      };
    } catch (err) {
      console.error(`Exception deleting database ${name}:`, err);
      reject(err);
    }
  });
};

/**
 * Clean up stale databases
 */
const cleanupDatabases = async () => {
  console.log('Cleaning all database versions...');
  try {
    // Avoid unnecessary cleanups if we already verified the DB version
    if (currentDbVersion === DB_VERSION) {
      console.log('Database version already correct, skipping cleanup');
      return true;
    }
    
    await deleteDB(DB_NAME);
    await deleteDB('soundboard-db-new'); // Delete any old database versions
    
    // Reset initialization state
    dbInitialized = false;
    dbInitPromise = null;
    initRetries = 0;
    currentDbVersion = null;
    
    console.log('Old databases cleaned up');
    return true;
  } catch (err) {
    console.error('Failed to cleanup databases:', err);
    return false;
  }
};

/**
 * Detect database version without upgrading
 */
export const detectDatabaseVersion = () => {
  return new Promise((resolve) => {
    try {
      // Open connection without version to avoid upgrade
      const request = indexedDB.open(DB_NAME);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const version = db.version;
        console.log(`Detected database version: ${version}`);
        
        // Store current version
        currentDbVersion = version;
        
        // Check if version matches expected
        if (version !== DB_VERSION) {
          console.log(`Version mismatch: Code expects v${DB_VERSION}, database is v${version}`);
          
          // Only trigger cleanup if versions don't match and we haven't retried too many times
          if (initRetries < MAX_RETRIES) {
            console.log('Database version mismatch detected, clearing cache and databases...');
            db.close();
            
            cleanupDatabases().then(() => {
              resolve(false);
            });
          } else {
            console.warn(`Max retries (${MAX_RETRIES}) reached for database reset, continuing with v${version}`);
            db.close();
            resolve(true);
          }
        } else {
          console.log('Database version is current');
          db.close();
          resolve(true);
        }
      };
      
      request.onerror = (event) => {
        console.error('Error detecting database version:', event.target.error);
        resolve(false);
      };
    } catch (error) {
      console.error('Exception detecting database version:', error);
      resolve(false);
    }
  });
};

/**
 * Initialize the database system
 */
export const initializeDatabase = async () => {
  // First, detect the database version
  await detectDatabaseVersion();
  
  // Use existing initialization promise if already in progress
  if (dbInitPromise) {
    console.log('Database initialization already in progress, reusing promise');
    return dbInitPromise;
  }
  
  console.log(`Initializing database (attempt ${initRetries + 1}/${MAX_RETRIES})`);
  
  // Create a new initialization promise
  dbInitPromise = new Promise((resolve, reject) => {
    try {
      // Check if IndexedDB is available
      if (!window.indexedDB) {
        const error = new Error('IndexedDB is not supported in this browser');
        console.error(error);
        reject(error);
        return;
      }
      
      // Open database with retry logic
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      // Handle errors (especially important for Safari/iOS)
      request.onerror = (event) => {
        const error = new Error(`Database error: ${event.target.error}`);
        console.error(error);
        
        // Reset init promise to allow retry
        dbInitPromise = null;
        
        // Check retry count
        if (initRetries < MAX_RETRIES) {
          console.warn(`Database open failed, will retry (${initRetries + 1}/${MAX_RETRIES})`);
          initRetries++;
          
          // Retry after a delay (increasing with each retry)
          setTimeout(() => {
            initializeDatabase()
              .then(resolve)
              .catch(reject);
          }, 1000 * initRetries);
        } else {
          console.error('Max database initialization retries reached');
          reject(error);
        }
      };
      
      // Handle successful opening
      request.onsuccess = (event) => {
        const db = event.target.result;
        console.log(`Database initialized successfully (version ${db.version})`);
        
        // Store the current version
        currentDbVersion = db.version;
        
        // Handle connection errors - critical for iOS Safari
        db.onerror = (event) => {
          console.error('Database error:', event.target.error);
        };
        
        // Reset state for success
        dbInitialized = true;
        dbInitPromise = null;
        initRetries = 0;
        
        resolve(db);
      };
      
      // Handle database setup/upgrade
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const transaction = event.target.transaction;
        
        console.log(`Database upgrade needed: ${event.oldVersion} to ${event.newVersion}`);
        
        // Call schema creation function
        createSchema(db, event.oldVersion, event.newVersion);
        
        // Special handling for Safari
        if (isSafari || isIOS) {
          // Safari needs explicit handling of transaction completion
          transaction.oncomplete = () => {
            console.log('Safari: transaction completed successfully');
          };
        }
      };
      
      // Handle blocked (another tab has the database open with an older version)
      request.onblocked = (event) => {
        console.warn('This tab is blocking a database upgrade. Please close this tab.');
        
        // Reset init promise to allow retry
        dbInitPromise = null;
        
        // Only alert once to avoid spamming
        if (initRetries === 0) {
          // Use a less intrusive approach than alert()
          console.error('Database blocked - Close other tabs of this app and refresh');
        }
        
        // Check retry count
        if (initRetries < MAX_RETRIES) {
          console.warn(`Database blocked, will retry (${initRetries + 1}/${MAX_RETRIES})`);
          initRetries++;
          
          // Retry with increased delay
          setTimeout(() => {
            initializeDatabase()
              .then(resolve)
              .catch(reject);
          }, 2000 * initRetries);
        } else {
          // Instead of rejecting, try to continue with current version
          console.warn('Database blocked after multiple retry attempts, continuing with existing version');
          
          // Try to resolve with what we have
          try {
            if (event.target.result) {
              resolve(event.target.result);
            } else {
              reject(new Error('Database blocked and could not continue'));
            }
          } catch (err) {
            reject(new Error('Database blocked and could not recover'));
          }
        }
      };
    } catch (error) {
      console.error('Critical database initialization error:', error);
      dbInitPromise = null;
      reject(error);
    }
  });
  
  return dbInitPromise;
};

// Helper to safely get database connection
const getDatabase = async () => {
  try {
    // Initialize if not already done
    if (!dbInitialized) {
      await initializeDatabase();
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = (event) => {
        reject(new Error(`Error opening database: ${event.target.error}`));
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      // For Safari: we need to handle onblocked in getDatabase too
      request.onblocked = (event) => {
        console.warn('Database access blocked - trying to continue anyway');
        
        // Try to proceed anyway
        try {
          if (event.target.result) {
            resolve(event.target.result);
          } else {
            reject(new Error('Database access blocked'));
          }
        } catch (err) {
          reject(new Error('Database access blocked and could not recover'));
        }
      };
    });
  } catch (error) {
    console.error('Error getting database:', error);
    throw error;
  }
};

/**
 * Ensure all sounds have a volume property
 */
async function ensureVolumeProperty(db) {
  try {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SOUNDS_STORE], 'readwrite');
      const store = transaction.objectStore(SOUNDS_STORE);
      const request = store.getAll();
      let updated = 0;
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        const sounds = event.target.result;
        
        // If no sounds, we're done
        if (!sounds || sounds.length === 0) {
          resolve(true);
          return;
        }
        
        // Process each sound that needs volume
        let pendingUpdates = 0;
        
        for (const sound of sounds) {
          if (sound.volume === undefined) {
            sound.volume = 0.7; // Default volume
            pendingUpdates++;
            
            const updateRequest = store.put(sound);
            
            updateRequest.onsuccess = () => {
              updated++;
              pendingUpdates--;
              
              // When all updates are complete
              if (pendingUpdates === 0) {
                if (updated > 0) {
                  console.log(`Added volume property to ${updated} sounds`);
                }
                resolve(true);
              }
            };
            
            updateRequest.onerror = (event) => {
              console.error('Error updating sound volume:', event.target.error);
              pendingUpdates--;
              
              // Still resolve even if some updates fail
              if (pendingUpdates === 0) {
                resolve(updated > 0);
              }
            };
          }
        }
        
        // If no updates were needed
        if (pendingUpdates === 0) {
          resolve(true);
        }
      };
      
      // Handle transaction errors
      transaction.onerror = (event) => {
        reject(event.target.error);
      };
      
      // Handle transaction completion
      transaction.oncomplete = () => {
        console.log('Volume property update transaction completed');
      };
    });
  } catch (err) {
    console.error('Failed to update sound volumes:', err);
    return false;
  }
}

/**
 * Reset the entire database
 */
export const resetDatabase = async () => {
  return new Promise((resolve, reject) => {
    try {
      // Close any existing connections first
      indexedDB.deleteDatabase(DB_NAME);
      
      // Wait a bit before reinitializing
      setTimeout(async () => {
        try {
          // Reset state
          dbInitialized = false;
          dbInitPromise = null;
          initRetries = 0;
          
          // Initialize fresh database
          await initializeDatabase();
          console.log('Database reset successfully');
          resolve(true);
        } catch (error) {
          console.error('Error reinitializing database after reset:', error);
          reject(error);
        }
      }, 500);
    } catch (error) {
      console.error('Error resetting database:', error);
      reject(error);
    }
  });
};

/**
 * Sound operations
 */
export const saveSound = async (sound) => {
  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SOUNDS_STORE], 'readwrite');
      const store = transaction.objectStore(SOUNDS_STORE);
      
      // Handle transaction errors
      transaction.onerror = (event) => {
        console.error('Transaction error:', event.target.error);
        reject(event.target.error);
      };
      
      // Handle request
      const request = store.put(sound);
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        resolve(sound);
      };
      
      // Extra handling for Safari
      if (isSafari || isIOS) {
        transaction.oncomplete = () => {
          console.log(`Sound saved successfully: ${sound.id}`);
        };
      }
    });
  } catch (error) {
    console.error('Error saving sound:', error);
    throw error;
  }
};

export const getAllSounds = async () => {
  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SOUNDS_STORE], 'readonly');
      const store = transaction.objectStore(SOUNDS_STORE);
      const request = store.getAll();
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        // Filter out any corrupted data
        const sounds = event.target.result.filter(sound => 
          sound && sound.id && sound.name && sound.data);
        
        // Log if data was filtered
        if (sounds.length !== event.target.result.length) {
          console.warn(`Filtered out ${event.target.result.length - sounds.length} invalid sound records`);
        }
          
        resolve(sounds);
      };
    });
  } catch (error) {
    console.error('Error getting sounds:', error);
    // Return empty array on error to prevent app crashes
    return [];
  }
};

export const getSound = async (id) => {
  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SOUNDS_STORE], 'readonly');
      const store = transaction.objectStore(SOUNDS_STORE);
      const request = store.get(id);
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  } catch (err) {
    console.error('Failed to get sound:', err);
    return null;
  }
};

export const deleteSound = async (id) => {
  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SOUNDS_STORE], 'readwrite');
      const store = transaction.objectStore(SOUNDS_STORE);
      const request = store.delete(id);
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        resolve(true);
      };
    });
  } catch (error) {
    console.error('Error deleting sound:', error);
    throw error;
  }
};

export const clearAllSounds = async () => {
  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SOUNDS_STORE], 'readwrite');
      const store = transaction.objectStore(SOUNDS_STORE);
      const request = store.clear();
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = () => {
        resolve(true);
      };
    });
  } catch (err) {
    console.error('Failed to clear sounds:', err);
    return false;
  }
};

/**
 * Group operations
 */
export const saveGroup = async (group) => {
  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GROUPS_STORE], 'readwrite');
      const store = transaction.objectStore(GROUPS_STORE);
      const request = store.put(group);
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        resolve(group);
      };
    });
  } catch (error) {
    console.error('Error saving group:', error);
    throw error;
  }
};

export const getAllGroups = async () => {
  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GROUPS_STORE], 'readonly');
      const store = transaction.objectStore(GROUPS_STORE);
      const request = store.getAll();
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        // Filter out any corrupted data
        const groups = event.target.result.filter(group => 
          group && group.id && group.name);
        
        resolve(groups);
      };
    });
  } catch (error) {
    console.error('Error getting groups:', error);
    // Return empty array on error
    return [];
  }
};

export const getGroup = async (id) => {
  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GROUPS_STORE], 'readonly');
      const store = transaction.objectStore(GROUPS_STORE);
      const request = store.get(id);
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  } catch (err) {
    console.error('Failed to get group:', err);
    return null;
  }
};

export const deleteGroup = async (id) => {
  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GROUPS_STORE], 'readwrite');
      const store = transaction.objectStore(GROUPS_STORE);
      const request = store.delete(id);
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = () => {
        resolve(true);
      };
    });
  } catch (err) {
    console.error('Failed to delete group:', err);
    return false;
  }
};

export const clearAllGroups = async () => {
  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([GROUPS_STORE], 'readwrite');
      const store = transaction.objectStore(GROUPS_STORE);
      const request = store.clear();
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = () => {
        resolve(true);
      };
    });
  } catch (err) {
    console.error('Failed to clear groups:', err);
    return false;
  }
};

export const getSoundsByGroup = async (groupId) => {
  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SOUNDS_STORE], 'readonly');
      const store = transaction.objectStore(SOUNDS_STORE);
      const index = store.index('groupId');
      const request = index.getAll(groupId);
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  } catch (err) {
    console.error('Failed to get sounds by group:', err);
    return [];
  }
};

// Export additional helpful functions for testing/debugging
export const getDatabaseStatus = async () => {
  try {
    if (!window.indexedDB) {
      return { supported: false, message: 'IndexedDB not supported' };
    }
    
    const db = await getDatabase();
    return {
      supported: true,
      initialized: dbInitialized,
      version: db.version,
      name: db.name,
      objectStores: Array.from(db.objectStoreNames),
      platform: {
        isIOS,
        isSafari
      }
    };
  } catch (error) {
    return {
      supported: true,
      initialized: false,
      error: error.message,
      platform: {
        isIOS,
        isSafari
      }
    };
  }
}; 