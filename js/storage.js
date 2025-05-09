/**
 * Storage Manager for Soundboard App
 * Handles local storage of sounds and groups using IndexedDB
 */

const StorageManager = (() => {
    const DB_NAME = 'soundboard-db';
    const DB_VERSION = 1;
    const SOUNDS_STORE = 'sounds';
    const GROUPS_STORE = 'groups';
    let db;

    // Initialize the database
    const init = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create sounds object store
                if (!db.objectStoreNames.contains(SOUNDS_STORE)) {
                    const soundsStore = db.createObjectStore(SOUNDS_STORE, { keyPath: 'id' });
                    soundsStore.createIndex('groupId', 'groupId', { unique: false });
                }
                
                // Create groups object store
                if (!db.objectStoreNames.contains(GROUPS_STORE)) {
                    db.createObjectStore(GROUPS_STORE, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                reject('IndexedDB error: ' + event.target.errorCode);
            };
        });
    };

    // Add a new sound
    const addSound = (sound) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([SOUNDS_STORE], 'readwrite');
            const store = transaction.objectStore(SOUNDS_STORE);
            
            // Generate a unique ID if not provided
            if (!sound.id) {
                sound.id = Date.now().toString();
            }

            const request = store.add(sound);
            
            request.onsuccess = () => resolve(sound);
            request.onerror = () => reject('Error adding sound');
        });
    };

    // Get all sounds
    const getAllSounds = () => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([SOUNDS_STORE], 'readonly');
            const store = transaction.objectStore(SOUNDS_STORE);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Error getting sounds');
        });
    };

    // Get sounds by group ID
    const getSoundsByGroup = (groupId) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([SOUNDS_STORE], 'readonly');
            const store = transaction.objectStore(SOUNDS_STORE);
            const index = store.index('groupId');
            const request = index.getAll(groupId);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Error getting sounds by group');
        });
    };

    // Update a sound
    const updateSound = (sound) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([SOUNDS_STORE], 'readwrite');
            const store = transaction.objectStore(SOUNDS_STORE);
            const request = store.put(sound);
            
            request.onsuccess = () => resolve(sound);
            request.onerror = () => reject('Error updating sound');
        });
    };

    // Delete a sound
    const deleteSound = (soundId) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([SOUNDS_STORE], 'readwrite');
            const store = transaction.objectStore(SOUNDS_STORE);
            const request = store.delete(soundId);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Error deleting sound');
        });
    };

    // Add a new group
    const addGroup = (group) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([GROUPS_STORE], 'readwrite');
            const store = transaction.objectStore(GROUPS_STORE);
            
            // Generate a unique ID if not provided
            if (!group.id) {
                group.id = Date.now().toString();
            }

            const request = store.add(group);
            
            request.onsuccess = () => resolve(group);
            request.onerror = () => reject('Error adding group');
        });
    };

    // Get all groups
    const getAllGroups = () => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([GROUPS_STORE], 'readonly');
            const store = transaction.objectStore(GROUPS_STORE);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Error getting groups');
        });
    };

    // Update a group
    const updateGroup = (group) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([GROUPS_STORE], 'readwrite');
            const store = transaction.objectStore(GROUPS_STORE);
            const request = store.put(group);
            
            request.onsuccess = () => resolve(group);
            request.onerror = () => reject('Error updating group');
        });
    };

    // Delete a group and update its sounds
    const deleteGroup = (groupId) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([GROUPS_STORE, SOUNDS_STORE], 'readwrite');
            const groupStore = transaction.objectStore(GROUPS_STORE);
            const soundStore = transaction.objectStore(SOUNDS_STORE);
            const index = soundStore.index('groupId');
            
            // First, get all sounds with this groupId
            const soundsRequest = index.getAll(groupId);
            
            soundsRequest.onsuccess = () => {
                const sounds = soundsRequest.result;
                
                // Remove the group
                const deleteRequest = groupStore.delete(groupId);
                
                deleteRequest.onsuccess = () => {
                    // Update each sound to remove the groupId
                    const promises = sounds.map(sound => {
                        sound.groupId = null;
                        return updateSound(sound);
                    });
                    
                    Promise.all(promises)
                        .then(() => resolve())
                        .catch(() => reject('Error updating sounds after group deletion'));
                };
                
                deleteRequest.onerror = () => reject('Error deleting group');
            };
            
            soundsRequest.onerror = () => reject('Error getting sounds for group');
        });
    };

    return {
        init,
        addSound,
        getAllSounds,
        getSoundsByGroup,
        updateSound,
        deleteSound,
        addGroup,
        getAllGroups,
        updateGroup,
        deleteGroup
    };
})(); 