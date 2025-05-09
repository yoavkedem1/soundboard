/**
 * UI Manager for Soundboard App
 * Handles user interface interactions and DOM manipulations
 */

const UIManager = (() => {
    // DOM Elements
    const elements = {
        addSoundBtn: document.getElementById('add-sound-btn'),
        addGroupBtn: document.getElementById('add-group-btn'),
        soundsContainer: document.getElementById('sounds-container'),
        groupsList: document.getElementById('groups-list'),
        addSoundModal: document.getElementById('add-sound-modal'),
        addGroupModal: document.getElementById('add-group-modal'),
        addSoundForm: document.getElementById('add-sound-form'),
        addGroupForm: document.getElementById('add-group-form'),
        soundNameInput: document.getElementById('sound-name'),
        soundFileInput: document.getElementById('sound-file'),
        soundColorInput: document.getElementById('sound-color'),
        soundGroupSelect: document.getElementById('sound-group'),
        groupNameInput: document.getElementById('group-name'),
        closeBtns: document.querySelectorAll('.close-btn')
    };

    // Currently selected group
    let currentGroupId = 'all';
    
    // Audio player
    let currentAudio = null;

    // Initialize UI
    const init = () => {
        bindEvents();
        loadGroups();
        loadSounds();
    };

    // Bind event listeners
    const bindEvents = () => {
        // Add sound button
        elements.addSoundBtn.addEventListener('click', () => {
            openModal(elements.addSoundModal);
            populateGroupsDropdown();
        });

        // Add group button
        elements.addGroupBtn.addEventListener('click', () => {
            openModal(elements.addGroupModal);
        });

        // Close modal buttons
        elements.closeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                closeModal(modal);
            });
        });

        // Modal background click to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal);
                }
            });
        });

        // Add sound form submit
        elements.addSoundForm.addEventListener('submit', handleAddSound);

        // Add group form submit
        elements.addGroupForm.addEventListener('submit', handleAddGroup);
    };

    // Open a modal
    const openModal = (modal) => {
        modal.classList.add('open');
    };

    // Close a modal
    const closeModal = (modal) => {
        modal.classList.remove('open');
        
        // Reset forms
        if (modal === elements.addSoundModal) {
            elements.addSoundForm.reset();
        } else if (modal === elements.addGroupModal) {
            elements.addGroupForm.reset();
        }
    };

    // Handle add sound form submission
    const handleAddSound = async (e) => {
        e.preventDefault();
        
        try {
            const name = elements.soundNameInput.value;
            const file = elements.soundFileInput.files[0];
            const color = elements.soundColorInput.value;
            const groupId = elements.soundGroupSelect.value || null;
            
            if (!file) {
                throw new Error('Please select a sound file');
            }
            
            // Convert sound file to base64
            const base64Sound = await fileToBase64(file);
            
            // Create sound object
            const sound = {
                name,
                soundData: base64Sound,
                color,
                groupId,
                fileName: file.name,
                dateAdded: new Date().toISOString()
            };
            
            // Add to storage
            await StorageManager.addSound(sound);
            
            // Update UI
            closeModal(elements.addSoundModal);
            loadSounds();
        } catch (error) {
            alert('Error adding sound: ' + error.message);
        }
    };

    // Handle add group form submission
    const handleAddGroup = async (e) => {
        e.preventDefault();
        
        try {
            const name = elements.groupNameInput.value;
            
            // Create group object
            const group = {
                name,
                dateAdded: new Date().toISOString()
            };
            
            // Add to storage
            await StorageManager.addGroup(group);
            
            // Update UI
            closeModal(elements.addGroupModal);
            loadGroups();
        } catch (error) {
            alert('Error adding group: ' + error.message);
        }
    };

    // Load all sounds or sounds from specific group
    const loadSounds = async () => {
        try {
            let sounds;
            
            if (currentGroupId === 'all') {
                sounds = await StorageManager.getAllSounds();
            } else {
                sounds = await StorageManager.getSoundsByGroup(currentGroupId);
            }
            
            renderSounds(sounds);
        } catch (error) {
            console.error('Error loading sounds:', error);
            elements.soundsContainer.innerHTML = '<div class="error-message">Error loading sounds</div>';
        }
    };

    // Render sounds to the container
    const renderSounds = (sounds) => {
        if (!sounds || sounds.length === 0) {
            elements.soundsContainer.innerHTML = `
                <div class="no-sounds-message">
                    <p>No sounds${currentGroupId !== 'all' ? ' in this group' : ''}! Click "Add Sound" to get started.</p>
                </div>
            `;
            return;
        }
        
        const html = sounds.map(sound => `
            <div class="sound-button" style="background-color: ${sound.color}" data-id="${sound.id}">
                <div class="sound-actions">
                    <button class="sound-action-btn edit-sound" title="Edit">✏️</button>
                    <button class="sound-action-btn delete-sound" title="Delete">🗑️</button>
                </div>
                <span>${sound.name}</span>
            </div>
        `).join('');
        
        elements.soundsContainer.innerHTML = html;
        
        // Add event listeners to sound buttons
        document.querySelectorAll('.sound-button').forEach(button => {
            button.addEventListener('click', (e) => {
                if (!e.target.classList.contains('sound-action-btn')) {
                    const soundId = button.dataset.id;
                    playSound(soundId);
                }
            });
        });
        
        // Add event listeners to edit buttons
        document.querySelectorAll('.edit-sound').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const soundId = button.closest('.sound-button').dataset.id;
                editSound(soundId);
            });
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-sound').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const soundId = button.closest('.sound-button').dataset.id;
                deleteSound(soundId);
            });
        });
    };

    // Load all groups
    const loadGroups = async () => {
        try {
            const groups = await StorageManager.getAllGroups();
            renderGroups(groups);
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    };

    // Render groups to the container
    const renderGroups = (groups) => {
        let html = `
            <div class="group ${currentGroupId === 'all' ? 'active' : ''}" data-group-id="all">
                <span>All Sounds</span>
            </div>
        `;
        
        if (groups && groups.length > 0) {
            html += groups.map(group => `
                <div class="group ${currentGroupId === group.id ? 'active' : ''}" data-group-id="${group.id}">
                    <span>${group.name}</span>
                </div>
            `).join('');
        }
        
        elements.groupsList.innerHTML = html;
        
        // Add event listeners to group buttons
        document.querySelectorAll('.group').forEach(groupEl => {
            groupEl.addEventListener('click', () => {
                const groupId = groupEl.dataset.groupId;
                changeGroup(groupId);
            });
        });
    };

    // Populate groups dropdown in add sound form
    const populateGroupsDropdown = async () => {
        try {
            const groups = await StorageManager.getAllGroups();
            
            let html = '<option value="">None</option>';
            
            if (groups && groups.length > 0) {
                html += groups.map(group => `
                    <option value="${group.id}">${group.name}</option>
                `).join('');
            }
            
            elements.soundGroupSelect.innerHTML = html;
        } catch (error) {
            console.error('Error populating groups dropdown:', error);
        }
    };

    // Change current group
    const changeGroup = (groupId) => {
        currentGroupId = groupId;
        loadGroups(); // Re-render groups to update active class
        loadSounds(); // Load sounds for the selected group
    };

    // Play a sound
    const playSound = async (soundId) => {
        try {
            // Stop currently playing sound if any
            if (currentAudio) {
                currentAudio.pause();
                currentAudio = null;
            }
            
            // Get all sounds and find the one with matching ID
            const sounds = await StorageManager.getAllSounds();
            const sound = sounds.find(s => s.id === soundId);
            
            if (!sound) {
                throw new Error('Sound not found');
            }
            
            // Create and play audio
            currentAudio = new Audio(sound.soundData);
            currentAudio.play();
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    };

    // Edit a sound
    const editSound = async (soundId) => {
        try {
            // Get the sound to edit
            const sounds = await StorageManager.getAllSounds();
            const sound = sounds.find(s => s.id === soundId);
            
            if (!sound) {
                throw new Error('Sound not found');
            }
            
            // TODO: Implement edit functionality
            alert('Edit functionality coming soon!');
        } catch (error) {
            console.error('Error editing sound:', error);
        }
    };

    // Delete a sound
    const deleteSound = async (soundId) => {
        try {
            if (confirm('Are you sure you want to delete this sound?')) {
                await StorageManager.deleteSound(soundId);
                loadSounds();
            }
        } catch (error) {
            console.error('Error deleting sound:', error);
        }
    };

    // Utility: Convert file to base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    return {
        init
    };
})(); 