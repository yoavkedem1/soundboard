import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppBar, Toolbar, Typography, Tabs, Tab, Box, Fab, Grid, Paper, 
  IconButton, ThemeProvider, createTheme, CssBaseline, Container, 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  TextField, CircularProgress, MenuItem, Select, InputLabel,
  FormControl, Alert, Snackbar, LinearProgress, ToggleButton,
  Slider, Badge, Tooltip, ClickAwayListener, Drawer, Chip, Divider,
  List, ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction,
  TabScrollButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoopIcon from '@mui/icons-material/Loop';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeMuteIcon from '@mui/icons-material/VolumeMute';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import TuneIcon from '@mui/icons-material/Tune';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import StopIcon from '@mui/icons-material/Stop';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { saveSound, getAllSounds, deleteSound, saveGroup, getAllGroups, resetDatabase, initializeDatabase } from './db';

// No longer needed - remove any references to the placeholder icon
// import placeholderIcon from './icons/icon-placeholder.svg';

// Create a fantasy-themed MUI theme that better follows Material Design 3
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#8b5a2b' },
    secondary: { main: '#e3d5b8' },
    background: {
      default: '#f8f4e5',
      paper: '#f8f4e5',
    },
    error: { main: '#B3261E' }, // MD3 error color
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Arial", sans-serif',
    h1: {
      fontFamily: '"Cinzel", serif',
      fontWeight: 700,
      color: '#5a3921',
    },
    h2: {
      fontFamily: '"Cinzel", serif',
      fontWeight: 700,
      color: '#5a3921',
    },
    h6: { fontWeight: 700 },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'url("https://www.transparenttextures.com/patterns/parchment.png")',
          transition: 'all 0.3s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 100, // More circular buttons per MD3
          textTransform: 'none',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          padding: '8px 24px',
        },
        containedPrimary: {
          color: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)', // Lighter shadow per MD3
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#5a3921',
          transition: 'all 0.2s ease',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          borderRadius: 100, // More circular tabs per MD3
          minWidth: 'auto',
          padding: '8px 16px',
          marginRight: '8px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.8)',
          height: 6,
        },
        thumb: {
          width: 16,
          height: 16,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0 3px 5px rgba(0,0,0,0.2)', // Lighter shadow per MD3
        }
      }
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px', // More space per MD3
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        }
      }
    }
  },
});

// Helper functions
function getDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// iOS specific audio initialization
function initializeIOSAudio() {
  return new Promise((resolve, reject) => {
    try {
      // Create a silent audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      
      // Create and play a silent buffer to unlock audio
      const silentBuffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(audioContext.destination);
      
      // iOS needs both start call and immediate resume
      if (source.start) {
        source.start(0);
      } else {
        source.noteOn(0);
      }
      
      // Resume the context
      audioContext.resume().then(() => {
        console.log('iOS audio initialized successfully');
        resolve(audioContext);
      }).catch(err => {
        console.warn('iOS audio resume failed:', err);
        reject(err);
      });
    } catch (err) {
      console.error('iOS audio initialization error:', err);
      reject(err);
    }
  });
}

// Function to decode audio data for iOS
function decodeAudioDataForIOS(audioContext, dataUrl) {
  return new Promise((resolve, reject) => {
    // Extract base64 data from data URL
    const base64Data = dataUrl.split(',')[1];
    
    if (!base64Data) {
      reject(new Error('Invalid audio data format'));
      return;
    }
    
    try {
      // Convert base64 to array buffer
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioData = bytes.buffer;
      
      // Decode the audio data
      audioContext.decodeAudioData(audioData)
        .then(decodedData => resolve(decodedData))
        .catch(err => {
          console.error('Error decoding audio data:', err);
          reject(err);
        });
    } catch (err) {
      console.error('Error processing audio data:', err);
      reject(err);
    }
  });
}

const predefinedCategories = ['Ambience', 'Combat', 'Music', 'Voices', 'Special Effects'];

// More accurate detection for iPad and iOS devices
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !window.MSStream);
const isiPad = isIOS && (navigator.maxTouchPoints > 1 || /iPad/.test(navigator.userAgent));

// Sound-related emoji collection
const emojiOptions = [
  '🔊', '🔈', '🔉', '🔇', '🎵', '🎶', '🎸', '🎺', '🎷', '🥁', 
  '🎻', '🎹', '🎤', '🎧', '🔔', '🔕', '📣', '📯', '🎼', '🎙️',
  '👏', '👋', '👣', '🐾', '💥', '⚡', '🔥', '💧', '🌊', '💨',
  '🌬️', '🌧️', '⛈️', '🌩️', '🌪️', '😱', '😭', '😤', '🐺', '🐉',
  '🐲', '🦁', '🐯', '🐻', '🐴', '🦊', '🦉', '🦇', '🐦', '🐮',
  '⚔️', '🛡️', '🏹', '🪄', '✨', '💫', '🌟', '🔮', '🧙', '🧝‍♂️'
];

export default function App() {
  // State
  const [currentTab, setCurrentTab] = useState(0);
  const [sounds, setSounds] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState({});
  const [paused, setPaused] = useState({}); // Track paused sounds separately
  const [looping, setLooping] = useState({});
  const [audioMap, setAudioMap] = useState({});
  const [audioPositions, setAudioPositions] = useState({});
  const [volumes, setVolumes] = useState({}); // New state for volume control
  const [showVolumeControls, setShowVolumeControls] = useState({}); // Which sound's volume controls to show
  const [addSoundOpen, setAddSoundOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newSound, setNewSound] = useState({
    name: '',
    file: null,
    color: '#8b5a2b',
    emoji: '🔊',
    groupId: '',
    volume: 0.7 // Default volume
  });
  const [newGroup, setNewGroup] = useState({ name: '' });
  const [error, setError] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [dragMode, setDragMode] = useState(false); // New state for drag mode
  const [audioContextInitialized, setAudioContextInitialized] = useState(false); // Track audio context
  
  // Refs
  const fileInputRef = useRef();
  const audioContextRef = useRef(null);
  const audioSourcesRef = useRef({});
  const dataRetryRef = useRef(null);
  
  // Function to cancel all loading operations
  const cancelLoadingOperations = (exceptId = null) => {
    Object.entries(loadingOperations).forEach(([id, cancel]) => {
      if (id !== exceptId && typeof cancel === 'function') {
        cancel();
      }
    });
    
    // Clear operations except the one we want to keep
    if (exceptId) {
      setLoadingOperations(prev => {
        const newOps = { ...prev };
        Object.keys(newOps).forEach(id => {
          if (id !== exceptId) {
            delete newOps[id];
          }
        });
        return newOps;
      });
    } else {
      setLoadingOperations({});
    }
  };
  
  // Initialize audio context only after user interaction - With enhanced iOS compatibility
  useEffect(() => {
    // Flag to track if component is mounted
    let mounted = true;
    
    // Function to create and unlock AudioContext
    const setupAudio = async () => {
      try {
        // Only create if not already created
        if (!audioContextRef.current && mounted) {
          console.log('Creating AudioContext...');
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioContextRef.current = new AudioContext();
          
          // iOS Safari specific unlocking
          if (audioContextRef.current.state === 'suspended') {
            console.log('AudioContext suspended, attempting to resume for iOS...');
            // iOS specific WebAudio unlock
            const unlock = async () => {
              if (audioContextRef.current && mounted) {
                // Create and play short silent buffer
                const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContextRef.current.destination);
                
                // Play the silent sound (required for iOS)
                if (source.start) {
                  source.start(0);
                } else {
                  source.noteOn(0);
                }
                
                // Resume context after the silent play attempt
                if (audioContextRef.current.state === 'suspended') {
                  await audioContextRef.current.resume();
                }
                
                console.log('iOS audio unlock attempt complete, state:', audioContextRef.current.state);
              }
            };
            
            // Run unlock
            await unlock();
          }
          
          if (mounted) {
            setAudioContextInitialized(true);
            console.log('AudioContext initialized:', audioContextRef.current.state);
          }
        }
      } catch (err) {
        console.warn('AudioContext initialization error:', err);
      }
    };
    
    // Add event listeners for user interaction - iOS compatible
    const setupAudioHandler = () => {
      setupAudio();
      // Don't immediately remove these for iOS - might need multiple interactions
      setTimeout(() => {
        if (audioContextRef.current && audioContextRef.current.state === 'running') {
          // Only remove listeners if we confirmed audio is working
          document.removeEventListener('click', setupAudioHandler);
          document.removeEventListener('touchend', setupAudioHandler);
          document.removeEventListener('touchstart', setupAudioHandler);
          document.removeEventListener('keydown', setupAudioHandler);
        }
      }, 1000);
    };
    
    // Add event listeners - iOS compatibility requires touchend and touchstart
    document.addEventListener('click', setupAudioHandler);
    document.addEventListener('touchend', setupAudioHandler); // Critical for iOS
    document.addEventListener('touchstart', setupAudioHandler);
    document.addEventListener('keydown', setupAudioHandler);
    
    // iOS requires a user gesture to initialize audio
    if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      console.log('iOS device detected, displaying audio start instructions...');
      setError('Tap anywhere on the screen to enable audio playback');
    }
    
    return () => {
      mounted = false;
      document.removeEventListener('click', setupAudioHandler);
      document.removeEventListener('touchend', setupAudioHandler);
      document.removeEventListener('touchstart', setupAudioHandler);
      document.removeEventListener('keydown', setupAudioHandler);
      
      // Also cleanup any audio resources
      Object.values(audioMap).forEach(audio => {
        if (audio) {
          try {
            audio.pause();
            audio.src = '';
            audio.onended = null;
            audio.ontimeupdate = null;
            audio.onerror = null;
          } catch (err) {
            console.warn('Error cleaning up audio:', err);
          }
        }
      });
      
      // Clear any pending data retry
      if (dataRetryRef.current) {
        clearTimeout(dataRetryRef.current);
        dataRetryRef.current = null;
      }
    };
  }, []);
  
  // Get audio context - only create on demand, not at startup
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      setAudioContextInitialized(true); // Try to unlock it right away
    }
    return audioContextRef.current;
  }, []);
  
  // Initialize database on mount
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        // Initialize database (will handle legacy database cleanup)
        await initializeDatabase();
        
        if (!mounted) return;
        
        // Load data after DB is initialized
        await loadData();
      } catch (err) {
        if (!mounted) return;
        console.error('Database initialization error:', err);
        setError('Database initialization failed. Try resetting the app data.');
      }
    };
    
    // Track user visibility to refresh data if needed
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible again, reloading data...');
        loadData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    init();
    
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Load sounds and groups from IndexedDB
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get latest sounds and groups from database
      const [loadedGroups, loadedSounds] = await Promise.all([
        getAllGroups(),
        getAllSounds()
      ]);
      
      if (loadedSounds.length === 0 && !dataRetryRef.current) {
        console.log('No sounds loaded on first try, scheduling retry...');
        dataRetryRef.current = setTimeout(async () => {
          console.log('Retrying data load...');
          dataRetryRef.current = null;
          await loadData();
        }, 1000);
        return;
      }
      
      console.log(`Loaded ${loadedSounds.length} sounds and ${loadedGroups.length} groups`);
      setSounds(loadedSounds);
      setGroups(loadedGroups);
      
      // Initialize volume state for each sound
      const initialVolumes = {};
      loadedSounds.forEach(sound => {
        initialVolumes[sound.id] = sound.volume !== undefined ? sound.volume : 0.7;
      });
      setVolumes(initialVolumes);
      
      // Initialize audio context if sounds were loaded but only on user interaction
      if (loadedSounds.length > 0) {
        const setupAudioForSounds = () => {
          // iOS requires user interaction to initialize audio
          getAudioContext();
          document.removeEventListener('touchstart', setupAudioForSounds);
          document.removeEventListener('click', setupAudioForSounds);
        };
        
        // Add both click and touch listeners for better iOS compatibility
        document.addEventListener('touchstart', setupAudioForSounds, { once: true });
        document.addEventListener('click', setupAudioForSounds, { once: true });
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(`Failed to load sounds: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Get all categories (predefined + custom)
  const allCategories = [
    { id: 'all', name: 'All Sounds' },
    ...predefinedCategories.map(cat => ({ id: cat.toLowerCase(), name: cat })),
    ...groups.filter(g => !predefinedCategories.map(c => c.toLowerCase()).includes(g.name.toLowerCase()))
  ];
  
  // Handle category change
  const handleCategoryChange = (event, newValue) => {
    setCurrentTab(newValue);
  };
  
  // Get filtered sounds for the current category
  const filteredSounds = sounds.filter(sound => {
    if (currentTab === 0) return true; // All sounds
    const category = allCategories[currentTab];
    if (!category) return false;
    return sound.groupId === category.id;
  });
  
  // Function to validate sound data source
  const isSoundDataValid = (sound) => {
    if (!sound) return false;
    if (!sound.data || typeof sound.data !== 'string') return false;
    if (sound.data.trim() === '') return false;
    // Check if data is a valid data URL
    if (!sound.data.startsWith('data:')) return false;
    return true;
  };
  
  // Handle play/pause for a sound - Improved for iOS compatibility
  const handlePlayPause = async (sound) => {
    try {
      if (!isSoundDataValid(sound)) {
        console.error('Invalid sound data:', sound);
        setError(`Cannot play sound "${sound.name}": Invalid sound data`);
        return;
      }
      
      // If already playing, pause it (but don't remove from mixer)
      if (playing[sound.id]) {
        // Get the audio element
        const audioElement = audioMap[sound.id];
        if (audioElement) {
          try {
            // Pause the audio
            audioElement.pause();
            
            // Update state: mark as paused but still in the mixer
            setPlaying(prev => ({ ...prev, [sound.id]: false }));
            setPaused(prev => ({ ...prev, [sound.id]: true }));
          } catch (err) {
            console.error('Error pausing audio:', err);
          }
        }
        return;
      }
      
      // If was paused, resume it
      if (paused[sound.id] && audioMap[sound.id]) {
        const audio = audioMap[sound.id];
        try {
          // For iOS, ensure audio context is running first
          if (isIOS && audioContextRef.current) {
            await audioContextRef.current.resume();
          }
          
          // iOS requires user interaction to play audio
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              setPlaying(prev => ({ ...prev, [sound.id]: true }));
              setPaused(prev => ({ ...prev, [sound.id]: false }));
            }).catch(err => {
              console.error('Error resuming audio:', err, err.name, err.message);
              
              // Enhanced error handling for iOS
              if (err.name === 'NotAllowedError') {
                setError('iOS requires interaction. Tap on the screen to play audio.');
                
                // Create iOS specific unlock function
                const unlockIOSAudio = async () => {
                  try {
                    // Try to initialize iOS audio first
                    if (isIOS) {
                      await initializeIOSAudio();
                    }
                    
                    if (audioContextRef.current) {
                      await audioContextRef.current.resume();
                    }
                    
                    // Try playing again after user interaction
                    await audio.play();
                    setPlaying(prev => ({ ...prev, [sound.id]: true }));
                    setPaused(prev => ({ ...prev, [sound.id]: false }));
                    
                    // Clear error message
                    setError(null);
                    
                    // Clean up event listener
                    document.removeEventListener('touchend', unlockIOSAudio);
                  } catch (unlockErr) {
                    console.error('Failed to unlock iOS audio:', unlockErr);
                    setError(`Audio playback error: ${unlockErr.message || 'iOS audio restrictions'}. Try reloading the page.`);
                  }
                };
                
                // Add event listener for iOS touch
                document.addEventListener('touchend', unlockIOSAudio, { once: true });
              } else if (err.name === 'AbortError' && isIOS) {
                setError('iPad audio error. Try pausing other apps playing audio or reload the page.');
              } else {
                setError(`Error playing "${sound.name}": ${err.message || 'Unknown error'}`);
              }
            });
          }
        } catch (err) {
          console.error('Error resuming audio:', err);
          setError(`Error with "${sound.name}": ${err.message || 'Unknown error'}`);
        }
        return;
      }
      
      // For new sound playback, we need more careful handling on iOS
      try {
        // Create a new Audio element with iOS optimizations
        const audio = new Audio();
        
        // Enhanced iOS handling
        if (isIOS) {
          // Explicit audio properties for iOS
          audio.preload = 'auto'; 
          audio.autoplay = false; // Never autoplay on iOS
          
          try {
            // Make sure audio context is initialized and resumed
            if (!audioContextRef.current) {
              audioContextRef.current = await initializeIOSAudio();
              setAudioContextInitialized(true);
            } else if (audioContextRef.current.state === 'suspended') {
              await audioContextRef.current.resume();
            }
          } catch (iosErr) {
            console.warn('iOS audio context setup issue:', iosErr);
            // Continue with direct Audio API approach
          }
        }
        
        // Set up event handlers before setting src
        const onEnded = () => {
          if (!looping[sound.id]) {
            setPlaying(prev => ({ ...prev, [sound.id]: false }));
            setAudioPositions(prev => ({ ...prev, [sound.id]: 0 }));
          }
        };
        
        const onTimeUpdate = () => {
          if (audio.currentTime > 0) { // Only update if actually playing
            setAudioPositions(prev => ({ ...prev, [sound.id]: audio.currentTime }));
          }
        };
        
        const onError = (e) => {
          // Enhanced error object logging
          const errorDetails = {
            code: audio.error?.code,
            message: audio.error?.message,
            name: audio.error?.name,
            raw: e
          };
          console.error(`Audio playback error for ${sound.name}:`, errorDetails);
          
          // Provide specific error messages based on error code
          let errorMessage = 'Unknown error';
          
          if (audio.error) {
            switch (audio.error.code) {
              case 1: // MEDIA_ERR_ABORTED
                errorMessage = 'Playback aborted';
                break;
              case 2: // MEDIA_ERR_NETWORK
                errorMessage = 'Network error';
                break;
              case 3: // MEDIA_ERR_DECODE
                errorMessage = 'Audio format not supported';
                if (isIOS) {
                  errorMessage += ' (iPad may require MP3 format)';
                }
                break;
              case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                errorMessage = 'Audio source not supported';
                break;
              default:
                errorMessage = audio.error.message || 'Playback error';
            }
          }
          
          setPlaying(prev => ({ ...prev, [sound.id]: false }));
          setError(`Error playing "${sound.name}": ${errorMessage}`);
        };
        
        // Add event listeners
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('error', onError, true); // Capture phase for better error catching
        
        // Set source
        audio.src = sound.data;
        
        // Configure audio
        audio.loop = !!looping[sound.id];
        
        // Set volume based on settings
        const baseVolume = sound.volume !== undefined ? sound.volume : 0.7;
        audio.volume = Math.max(0, Math.min(1, baseVolume * masterVolume));
        
        // Load the audio 
        audio.load();
        
        // Update audio map early to ensure it's available
        setAudioMap(prev => ({
          ...prev,
          [sound.id]: audio
        }));
        
        // Initialize position
        setAudioPositions(prev => ({ ...prev, [sound.id]: 0 }));
        
        // iPad-specific handling with user gesture requirement
        const playWithIOSHandling = async () => {
          try {
            // Try to play normally first
            await audio.play();
            
            // If we get here, playback started successfully
            setPlaying(prev => ({ ...prev, [sound.id]: true }));
            setPaused(prev => {
              const newState = { ...prev };
              delete newState[sound.id]; // Remove from paused state
              return newState;
            });
          } catch (err) {
            console.warn('iOS play attempt failed:', err);
            
            if (err.name === 'NotAllowedError') {
              setError('iPad requires user interaction to play audio. Tap anywhere.');
              
              // Create one-time touch handler for iOS
              const handleIOSTouch = async () => {
                try {
                  // Resume any audio contexts
                  if (audioContextRef.current) {
                    await audioContextRef.current.resume();
                  }
                  
                  // Try playing again after user interaction
                  await audio.play();
                  
                  // Update UI state
                  setPlaying(prev => ({ ...prev, [sound.id]: true }));
                  setPaused(prev => ({ ...prev, [sound.id]: false }));
                  
                  // Clear error
                  setError(null);
                } catch (retryErr) {
                  console.error('iOS retry failed:', retryErr);
                  setError(`Could not play sound on iPad: ${retryErr.message || 'Unknown error'}. Try reloading.`);
                } finally {
                  // Always remove listener
                  document.removeEventListener('touchend', handleIOSTouch);
                }
              };
              
              // Add the touch handler
              document.addEventListener('touchend', handleIOSTouch, { once: true });
            } else {
              // Handle other errors
              setError(`Couldn't play sound: ${err.message || 'Unknown error'}`);
            }
          }
        };
        
        // Start playback with iOS handling
        playWithIOSHandling();
        
      } catch (err) {
        console.error('Error in handlePlayPause:', err);
        setError(`Playback error: ${err.message || 'Unknown error'}`);
      }
    } catch (outerErr) {
      console.error('Unexpected error in handlePlayPause:', outerErr);
      setError(`Unexpected error: ${outerErr.message || 'Unknown error'}`);
    }
  };
  
  // Completely stop a sound (remove it from the mixer)
  const handleStopSound = (sound) => {
    try {
      const audio = audioMap[sound.id];
      if (audio) {
        // Stop playback
        audio.pause();
        audio.currentTime = 0;
        
        // Update state to remove from mixer completely
        setPlaying(prev => {
          const newState = { ...prev };
          delete newState[sound.id];
          return newState;
        });
        setPaused(prev => {
          const newState = { ...prev };
          delete newState[sound.id];
          return newState;
        });
      }
    } catch (err) {
      console.error(`Error stopping sound ${sound.name}:`, err);
    }
  };
  
  // Handle loop toggle
  const handleLoopToggle = (sound) => {
    const id = sound.id;
    // Toggle the loop state
    const newLoopState = !looping[id];
    
    // Update the loop state in our app
    setLooping(prev => ({ ...prev, [id]: newLoopState }));
    
    // If this sound is currently playing, apply the loop setting directly
    const audio = audioMap[id];
    if (audio) {
      audio.loop = newLoopState;
    }
  };
  
  // Handle delete sound
  const handleDeleteSound = async (id) => {
    // First stop if playing
    if (playing[id]) {
      const audio = audioMap[id];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPlaying(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    }
    
    // Remove from audio map
    setAudioMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
    
    // Remove from loop map
    setLooping(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
    
    // Remove from positions map
    setAudioPositions(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
    
    // Delete from database
    try {
      await deleteSound(id);
      setSounds(prev => prev.filter(sound => sound.id !== id));
    } catch (err) {
      console.error("Error deleting sound:", err);
      setError(`Failed to delete sound: ${err.message}`);
    }
  };
  
  // Stop all playing sounds
  const stopAllSounds = () => {
    try {
      // Get a list of all sounds in the mixer (playing or paused)
      const allSoundIds = [...Object.keys(playing), ...Object.keys(paused)];
      const uniqueSoundIds = [...new Set(allSoundIds)];
      
      // Stop each sound individually
      uniqueSoundIds.forEach(id => {
        const audio = audioMap[id];
        if (audio) {
          // Remove event listeners
          audio.onended = null;
          audio.ontimeupdate = null;
          audio.oncanplaythrough = null;
          audio.onerror = null;
          
          // Stop playback
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (err) {
            console.warn(`Error stopping sound ${id}:`, err);
          }
          
          // Clear source
          audio.src = '';
        }
      });
      
      // Clear all states
      setPlaying({});
      setPaused({});
      setAudioPositions({});
      
      console.log(`Stopped ${uniqueSoundIds.length} sounds`);
    } catch (err) {
      console.error('Error stopping all sounds:', err);
      setError('Failed to stop all sounds');
    }
  };
  
  // Handle add sound dialog
  const handleAddSoundOpen = () => setAddSoundOpen(true);
  const handleAddSoundClose = () => {
    setAddSoundOpen(false);
    setShowEmojiPicker(false);
    setNewSound({
      name: '',
      file: null,
      color: '#8b5a2b',
      emoji: '🔊',
      groupId: '',
      volume: 0.7 // Default volume
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  // Handle add group dialog
  const handleAddGroupOpen = () => setAddGroupOpen(true);
  const handleAddGroupClose = () => {
    setAddGroupOpen(false);
    setNewGroup({ name: '' });
  };
  
  // Handle adding a new sound
  const handleAddSound = async () => {
    if (!newSound.name || !newSound.file) {
      setError("Please provide a name and sound file");
      return;
    }
    
    try {
      setLoading(true);
      
      // Convert file to data URL
      const data = await fileToDataURL(newSound.file);
      const duration = await getDuration(newSound.file);
      
      // Create the sound object
      const sound = {
        id: `sound_${Date.now()}`, // Ensure unique ID format
        name: newSound.name,
        data: data,
        color: newSound.color,
        icon: newSound.emoji, // Use the emoji from the picker
        emoji: newSound.emoji, // Store for future reference
        groupId: newSound.groupId || 'none',
        duration: Math.round(duration),
        dateAdded: new Date().toISOString(),
        volume: newSound.volume || 0.7 // Include volume in the sound object
      };
      
      // Save to database
      const savedSound = await saveSound(sound);
      
      // Add to state
      setSounds(prev => [...prev, savedSound]);
      
      // Initialize volume state for this sound
      setVolumes(prev => ({
        ...prev,
        [savedSound.id]: savedSound.volume || 0.7
      }));
      
      // Close dialog
      handleAddSoundClose();
    } catch (err) {
      console.error("Error adding sound:", err);
      setError(`Failed to add sound: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle adding a new group
  const handleAddGroup = async () => {
    if (!newGroup.name) {
      setError("Please provide a group name");
      return;
    }
    
    try {
      // Create group object with consistent ID format
      const group = {
        id: `group_${newGroup.name.toLowerCase().replace(/\s+/g, '_')}`,
        name: newGroup.name,
        dateAdded: new Date().toISOString()
      };
      
      // Save to database
      const savedGroup = await saveGroup(group);
      
      // Add to state
      setGroups(prev => [...prev, savedGroup]);
      
      // Close dialog
      handleAddGroupClose();
    } catch (err) {
      console.error("Error adding group:", err);
      setError(`Failed to add group: ${err.message}`);
    }
  };
  
  // Handle database reset
  const handleResetDatabase = async () => {
    try {
      setLoading(true);
      
      // Stop all sounds first before making DB changes
      stopAllSounds();
      
      // Reset database
      const success = await resetDatabase();
      
      if (success) {
        // Reset state
        setSounds([]);
        setGroups([]);
        setAudioMap({});
        setPlaying({});
        setLooping({});
        setAudioPositions({});
        
        // Show success message
        setError("Database reset successfully. You can now add new sounds.");
        setTimeout(() => setError(null), 3000);
      } else {
        setError("Failed to reset database. Try reloading the page.");
      }
      
      setConfirmReset(false);
    } catch (err) {
      console.error("Error resetting database:", err);
      setError(`Failed to reset database: ${err.message}. Try reloading the page.`);
    } finally {
      setLoading(false);
    }
  };
  
  // Close error snackbar
  const handleErrorClose = () => setError(null);
  
  // Format time display
  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds && timeInSeconds !== 0) return '0:00';
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage safely
  const calculateProgress = (position) => {
    if (!position) return 0;
    const { current, duration } = position;
    if (!current || !duration || duration <= 0) return 0;
    const progress = (current / duration) * 100;
    return Math.min(Math.max(progress, 0), 100); // Ensure it's between 0-100
  };
  
  // Prevent page resets by using try-catch for audio operations
  useEffect(() => {
    // Unregister any existing service workers to prevent page resets
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(
        registrations => {
          if (registrations.length > 1) {
            console.log(`Found ${registrations.length} service workers, cleaning up...`);
            // Keep only the most recent one
            registrations.slice(0, -1).forEach(registration => {
              registration.unregister();
            });
          }
        }
      ).catch(err => {
        console.error('Service worker unregister failed:', err);
      });
    }
  }, []);
  
  // Toggle volume control visibility
  const toggleVolumeControls = (id, event) => {
    if (event) event.stopPropagation();
    
    // Only toggle the clicked sound and close others
    setShowVolumeControls(prev => {
      const newControls = {};
      // If this one was open, close it. Otherwise open it
      if (prev[id]) {
        return newControls; // Empty object closes all
      } else {
        newControls[id] = true;
        return newControls;
      }
    });
  };
  
  // Handle volume change with improved muting
  const handleVolumeChange = (sound, newValue) => {
    const id = sound.id;
    
    if (!sound) {
      console.error("Cannot change volume: invalid sound object");
      return;
    }
    
    // Update the sound's base volume
    const updatedSound = { ...sound, volume: newValue };
    
    // Set volumes state first for UI response
    setVolumes(prev => ({...prev, [id]: newValue}));
    
    // Update sounds state to reflect new volume
    setSounds(prev => prev.map(s => s.id === id ? updatedSound : s));
    
    // Calculate effective volume with master volume
    const effectiveVolume = newValue * masterVolume;
    
    // Update audio if playing
    const audio = audioMap[id];
    if (audio) {
      try {
        // Force true muting for very low volumes (0-1%)
        if (effectiveVolume <= 0.01) {
          console.log(`Setting ${sound.name} to truly muted`);
          audio.muted = true;
          audio.volume = 0;
        } else {
          audio.muted = false;
          const clampedVolume = Math.max(0, Math.min(1, effectiveVolume));
          audio.volume = clampedVolume;
          console.log(`Setting ${sound.name} volume to ${audio.volume} (effective: ${effectiveVolume})`);
        }
      } catch (err) {
        console.error(`Error setting volume for ${sound.name}:`, err);
      }
    }
    
    // Save volume preference for next play
    saveSound(updatedSound).catch(err => {
      console.error("Failed to save volume setting:", err);
    });
  };
  
  // Add keyboard support for volume
  useEffect(() => {
    // Check if any volume controls are visible
    const hasVisibleVolumeControls = Object.values(showVolumeControls).some(isShown => isShown);
    if (!hasVisibleVolumeControls) return;
    
    // Find the ID of the sound with visible volume controls
    const activeId = Object.entries(showVolumeControls).find(([id, isShown]) => isShown)?.[0];
    if (!activeId) return;
    
    // Get the sound and current volume
    const sound = sounds.find(s => s.id === activeId);
    if (!sound) return;
    
    const currentVolume = volumes[activeId] || 0.7;
    
    // Handle keyboard events
    const handleKeyDown = (e) => {
      // Arrow up: Increase volume
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newVolume = Math.min(1, currentVolume + 0.05);
        handleVolumeChange(sound, newVolume);
      }
      
      // Arrow down: Decrease volume
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newVolume = Math.max(0, currentVolume - 0.05);
        handleVolumeChange(sound, newVolume);
      }
      
      // Escape: Close volume controls
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowVolumeControls({});
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showVolumeControls, volumes, sounds, handleVolumeChange]);
  
  // Handle drag end (when user finishes dragging a sound)
  const handleDragEnd = async (result) => {
    // If dropped outside a droppable area
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    
    // If dropped in the same position
    if (source.index === destination.index) return;
    
    // Find the sound that was dragged
    const draggedSound = sounds.find(sound => sound.id === draggableId);
    if (!draggedSound) return;
    
    try {
      // Create a new array with the updated order
      const updatedSounds = Array.from(filteredSounds);
      
      // Remove the dragged item from its original position
      const [removed] = updatedSounds.splice(source.index, 1);
      
      // Insert it at the new position
      updatedSounds.splice(destination.index, 0, removed);
      
      // If moved to a different group (category)
      if (result.destination.droppableId !== result.source.droppableId) {
        // Update the sound with the new group ID
        const newGroupId = result.destination.droppableId;
        
        // Save to database with updated group ID
        const updatedSound = {
          ...draggedSound,
          groupId: newGroupId === 'all' ? '' : newGroupId
        };
        
        // Update database
        await saveSound(updatedSound);
        
        // Update local state
        setSounds(prevSounds => 
          prevSounds.map(s => 
            s.id === draggedSound.id ? updatedSound : s
          )
        );
      }
      
      // Set drag mode back to false
      setDragMode(false);
    } catch (err) {
      console.error('Error saving dragged sound:', err);
      setError('Failed to update sound position');
    }
  };
  
  // Toggle drag mode
  const toggleDragMode = () => {
    setDragMode(!dragMode);
  };
  
  // Update tooltip implementations to avoid MUI warnings
  const renderSoundButton = (sound, index) => {
    const isPlaying = playing[sound.id];
    const isLooping = looping[sound.id];
    const duration = sound.duration || 0;
    const position = audioPositions[sound.id] || 0;
    const progress = calculateProgress(position);
    const showControls = showVolumeControls[sound.id];
    const soundVolume = sound.volume !== undefined ? sound.volume : 0.7; // Ensure volume is always available
    
    const soundContent = (
      <Paper 
        elevation={3}
        data-sound-item
        data-sound-id={sound.id}
        className="sound-item"
        sx={{
          p: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: `linear-gradient(rgba(255,255,255,0.8), rgba(255,255,255,0.8)), url("https://www.transparenttextures.com/patterns/parchment.png")`,
          borderRadius: 4,
          boxShadow: isPlaying ? '0 0 15px rgba(139, 90, 43, 0.7)' : undefined,
          '&:hover': {
            transform: dragMode ? 'none' : 'translateY(-2px)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
          },
          cursor: dragMode ? 'move' : 'default',
          WebkitTapHighlightColor: 'transparent', // iOS fix
        }}
      >
        {/* Drag handle only shown in drag mode */}
        {dragMode && (
          <Box sx={{ 
            position: 'absolute',
            top: 5,
            right: 5,
            color: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            padding: '8px', // Larger touch area for iOS
          }}>
            <DragIndicatorIcon />
          </Box>
        )}
        
        {/* Sound progress bar */}
        {isPlaying && duration > 0 && (
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              height: 5,
              borderRadius: '5px 5px 0 0',
              '& .MuiLinearProgress-bar': {
                bgcolor: sound.color || theme.palette.primary.main,
              }
            }} 
          />
        )}
        
        {/* Sound info & controls */}
        <Box display="flex" flexDirection="column" alignItems="center" flexGrow={1}>
          <Typography 
            variant="h6" 
            align="center" 
            gutterBottom 
            sx={{ 
              wordBreak: 'break-word',
              fontFamily: '"Cinzel", serif',
              color: sound.color || theme.palette.primary.main,
              mt: 1
            }}
          >
            <span style={{ marginRight: 8 }}>{sound.emoji || '🔊'}</span>
            {sound.name}
            {/* Loop indicator */}
            {isLooping && (
              <Box 
                component="span" 
                sx={{
                  display: 'inline-block',
                  ml: 1,
                  bgcolor: theme.palette.secondary.main,
                  color: 'white',
                  fontSize: '0.7rem',
                  px: 0.7,
                  py: 0.2,
                  borderRadius: '10px',
                  verticalAlign: 'middle'
                }}
              >
                LOOP
              </Box>
            )}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', mb: 1 }}>
            {/* Only show controls if not in drag mode */}
            {!dragMode ? (
              <>
                {/* Play/Pause Button with improved tooltip and larger touch area */}
                <Tooltip title={isPlaying ? "Pause" : "Play"}>
                  <IconButton 
                    onClick={() => handlePlayPause(sound)}
                    color={isPlaying ? "secondary" : "primary"}
                    size="large"
                    aria-label={isPlaying ? "Pause" : "Play"}
                    sx={{ padding: '12px' }} // Larger touch area for iOS
                  >
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>
                </Tooltip>
                
                {/* Loop Button with improved tooltip and larger touch area */}
                <Tooltip title={isLooping ? "Looping On" : "Loop Sound"}>
                  <IconButton 
                    onClick={() => handleLoopToggle(sound)}
                    color={isLooping ? "secondary" : "default"}
                    size="large"
                    aria-label={isLooping ? "Looping On" : "Loop Sound"}
                    sx={{ padding: '12px' }} // Larger touch area for iOS
                  >
                    <Badge 
                      variant="dot" 
                      color="secondary"
                      invisible={!isLooping}
                    >
                      <LoopIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
                
                {/* Volume Button with improved tooltip and larger touch area */}
                <Tooltip title="Adjust Volume">
                  <IconButton 
                    onClick={(e) => toggleVolumeControls(sound.id, e)}
                    color={showControls ? "secondary" : "default"}
                    size="large"
                    aria-label="Adjust Volume"
                    sx={{ padding: '12px' }} // Larger touch area for iOS
                  >
                    {getVolumeIcon(sound.volume || 0.7)}
                  </IconButton>
                </Tooltip>
                
                {/* Delete Button with improved tooltip and larger touch area */}
                <Tooltip title="Delete Sound">
                  <IconButton 
                    onClick={() => handleDeleteSound(sound.id)}
                    color="error"
                    size="small"
                    aria-label="Delete Sound"
                    sx={{ padding: '8px' }} // Larger touch area for iOS
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              // Show category in drag mode
              <Chip 
                label={sound.groupId ? allCategories.find(c => c.id === sound.groupId)?.name || 'Unknown' : 'Uncategorized'}
                size="small"
                color="primary" 
                variant="outlined"
                sx={{ my: 1 }}
              />
            )}
          </Box>
          
          {/* Volume control - simplified version to avoid ClickAwayListener issues */}
          {showControls && !dragMode && (
            <Box 
              onClick={(e) => e.stopPropagation()} 
              sx={{ 
                width: '90%',
                bgcolor: 'rgba(0,0,0,0.1)',
                borderRadius: 2,
                p: 1,
                mb: 1,
                position: 'relative',
                zIndex: 10
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <IconButton 
                  size="small" 
                  onClick={() => handleVolumeChange(sound, 0)}
                  sx={{ p: 0.5 }}
                >
                  <VolumeOffIcon fontSize="small" />
                </IconButton>
                
                <Slider
                  size="small"
                  value={soundVolume * 100}
                  onChange={(e, newValue) => handleVolumeChange(sound, newValue / 100)}
                  aria-labelledby="volume-slider"
                  valueLabelDisplay="auto"
                  valueLabelFormat={value => `${Math.round(value)}%`}
                  sx={{ 
                    mx: 1,
                    color: sound.color || theme.palette.primary.main,
                    '& .MuiSlider-thumb': {
                      width: 14, 
                      height: 14
                    }
                  }}
                />
                
                <IconButton 
                  size="small" 
                  onClick={() => handleVolumeChange(sound, 1)}
                  sx={{ p: 0.5 }}
                >
                  <VolumeUpIcon fontSize="small" />
                </IconButton>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                <Button 
                  size="small" 
                  onClick={() => setShowVolumeControls(prev => {
                    const newControls = {...prev};
                    delete newControls[sound.id];
                    return newControls;
                  })}
                  sx={{ 
                    minWidth: 'unset', 
                    p: 0.5, 
                    fontSize: '0.7rem',
                    color: 'rgba(0,0,0,0.6)'
                  }}
                >
                  Close
                </Button>
              </Box>
            </Box>
          )}
          
          {/* Show duration if available and not in drag mode */}
          {duration > 0 && !dragMode && (
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ mt: 1 }}
            >
              {isPlaying ? `${formatTime(position)} / ${formatTime(duration)}` : formatTime(duration)}
            </Typography>
          )}
        </Box>
      </Paper>
    );
    
    // If in drag mode, wrap with Draggable
    if (dragMode) {
      return (
        <Draggable 
          key={sound.id} 
          draggableId={sound.id} 
          index={index}
        >
          {(provided, snapshot) => (
            <Grid
              item xs={12} sm={6} md={4} lg={3}
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              sx={{
                opacity: snapshot.isDragging ? 0.8 : 1,
              }}
            >
              {soundContent}
            </Grid>
          )}
        </Draggable>
      );
    }
    
    // Regular rendering when not in drag mode
    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={sound.id}>
        {soundContent}
      </Grid>
    );
  };
  
  // Apply master volume to all playing sounds
  useEffect(() => {
    // Apply master volume to all currently playing audio elements
    Object.entries(audioMap).forEach(([id, audio]) => {
      if (audio) {
        try {
          // Calculate effective volume (soundVolume * masterVolume)
          const sound = sounds.find(s => s.id === id);
          if (sound) {
            const soundVolume = sound.volume || 0.7;
            const effectiveVolume = soundVolume * masterVolume;
            
            console.log(`Master volume changed: Applying to ${sound.name}, base vol=${soundVolume}, master=${masterVolume}, effective=${effectiveVolume}`);
            
            // Force true muting when master volume is near zero
            if (masterVolume <= 0.01) {
              console.log(`Setting master mute on ${sound.name}`);
              audio.muted = true;
              audio.volume = 0;
            } 
            // Or when the effective volume is near zero
            else if (effectiveVolume <= 0.01) {
              console.log(`Setting effective mute on ${sound.name}`);
              audio.muted = true;
              audio.volume = 0;
            } else {
              audio.muted = false;
              audio.volume = Math.max(0, Math.min(1, effectiveVolume));
            }
          }
        } catch (err) {
          console.warn(`Error adjusting volume for sound ${id}:`, err);
        }
      }
    });
  }, [masterVolume, audioMap, sounds]);
  
  // Toggle the mixer drawer
  const toggleMixer = () => {
    setDrawerOpen(!drawerOpen);
    
    // If opening mixer, ensure we close any volume popups
    if (!drawerOpen) {
      setShowVolumeControls({});
    }
  };
  
  // Get the count of currently playing sounds
  const playingSoundsCount = Object.values(playing).filter(Boolean).length;
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #f2efe6 0%, #e0d8c0 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        p: { xs: 1, sm: 2 }, // Reduced padding on mobile
        WebkitTapHighlightColor: 'transparent', // Prevent iOS tap highlight
        touchAction: 'manipulation', // Optimize for touch
        WebkitOverflowScrolling: 'touch', // Better iOS scrolling
        overscrollBehavior: 'none', // Prevent scroll bounce on iOS
      }}>
        <Container maxWidth="lg">
          <Paper sx={{
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: 3,
            position: 'relative',
            WebkitTapHighlightColor: 'transparent', // Remove tap highlight on iOS
          }}>
            {/* Header */}
            <AppBar position="static" color="primary" elevation={0} 
              sx={{
                background: 'linear-gradient(135deg, #8b5a2b 0%, #a67c52 100%)',
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
              }}
            >
              <Toolbar sx={{ 
                justifyContent: 'space-between', 
                px: { xs: 2, sm: 3 }, // Responsive padding
                py: { xs: 1, sm: 2 }, // Shorter on mobile for more content space
              }}>
                <Typography 
                  variant="h1" 
                  sx={{ 
                    fontSize: { xs: '1.5rem', sm: '2.5rem' }, // Even smaller on mobile
                    letterSpacing: { xs: 1, sm: 2 },
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                >
                  Fantasy Soundboard
                </Typography>
                <Box>
                  {/* Toggle drag mode button - Increased hit area for iOS */}
                  {sounds.length > 0 && (
                    <Tooltip title={dragMode ? "Exit Organize Mode" : "Organize Sounds"}>
                      <IconButton 
                        color={dragMode ? "secondary" : "inherit"}
                        onClick={toggleDragMode}
                        sx={{ 
                          mr: 1,
                          padding: { xs: '12px', sm: '8px' }, // Larger touch target on mobile
                          backgroundColor: dragMode ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                          '&:hover': { 
                            backgroundColor: dragMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
                          }
                        }}
                        aria-label={dragMode ? "Exit Organize Mode" : "Organize Sounds"}
                      >
                        <DragIndicatorIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                
                  <Tooltip title="Reset Soundboard">
                    <IconButton 
                      color="inherit" 
                      onClick={() => setConfirmReset(true)} 
                      sx={{ 
                        padding: { xs: '12px', sm: '8px' }, // Larger touch target on mobile
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        '&:hover': { 
                          backgroundColor: 'rgba(255,255,255,0.2)',
                        }
                      }}
                      aria-label="Reset Soundboard"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Toolbar>
              
              {/* Category Tabs */}
              <Box sx={{ px: 2, mb: 1.5 }}>
                <Tabs
                  value={currentTab}
                  onChange={handleCategoryChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  aria-label="Category tabs"
                  ScrollButtonComponent={(props) => {
                    // Only render scroll buttons when really needed
                    // This prevents the constant appearance/disappearance causing jumps
                    if (props.direction === 'left' && currentTab === 0) return null;
                    if (props.direction === 'right' && currentTab === allCategories.length - 1) return null;
                    return <TabScrollButton {...props} />;
                  }}
                  sx={{
                    mb: 1,
                    // Add stop-hover effect to prevent jumpy behavior
                    '.MuiTabs-scrollButtons': {
                      '&.Mui-disabled': { opacity: 0.3 },
                      // Increase clickable area
                      width: 40,
                      // Add buffer zone to prevent flickering on edge hover
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        width: '20px',
                        zIndex: 1,
                      },
                      '&.MuiTabScrollButton-root': { transition: 'opacity 0.3s ease' },
                    },
                    '& .MuiTab-root': {
                      bgcolor: 'secondary.main',
                      opacity: 0.7,
                      color: 'primary.main',
                      mx: 0.5,
                      fontWeight: 'bold',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      '&.Mui-selected': {
                        bgcolor: '#fff',
                        color: 'primary.main',
                        opacity: 1,
                        fontWeight: 'bold',
                      },
                      '&:hover': {
                        opacity: 1,
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                      },
                    },
                  }}
                >
                  {allCategories.map((cat, index) => (
                    <Tab key={cat.id} label={cat.name} />
                  ))}
                </Tabs>
              </Box>
            </AppBar>
            
            {/* Main Content */}
            <Container sx={{ py: 4 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {dragMode && (
                    <Box 
                      sx={{ 
                        p: 2, 
                        mb: 3, 
                        bgcolor: 'rgba(227, 213, 184, 0.5)', 
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2 
                      }}
                    >
                      <DragIndicatorIcon color="primary" />
                      <Typography>
                        <strong>Organize Mode:</strong> Drag sounds to reorder or drop them on tabs to change category
                      </Typography>
                    </Box>
                  )}
                  
                  {filteredSounds.length === 0 ? (
                    <Paper sx={{ 
                      p: 4, 
                      textAlign: 'center', 
                      bgcolor: 'rgba(255,255,255,0.7)',
                      border: '1px solid rgba(139, 90, 43, 0.2)', 
                      boxShadow: '0 4px 20px rgba(139, 90, 43, 0.1)'
                    }}>
                      <Typography variant="h6" color="text.secondary">
                        No sounds in this category
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 1 }}>
                        Add some sounds to get started
                      </Typography>
                    </Paper>
                  ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable 
                        droppableId={allCategories[currentTab].id} 
                        type="SOUND"
                        direction="horizontal"
                      >
                        {(provided) => (
                          <Grid 
                            container 
                            spacing={3} 
                            justifyContent="center"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {filteredSounds.map((sound, index) => renderSoundButton(sound, index))}
                            {provided.placeholder}
                          </Grid>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </>
              )}
            </Container>
          </Paper>
          
          {/* Volume Mixer FAB - Only show when sounds are playing and not in drag mode */}
          {playingSoundsCount > 0 && !dragMode && (
            <Tooltip title="Volume Mixer">
              <Fab
                color="secondary"
                onClick={toggleMixer}
                sx={{ 
                  position: 'fixed',
                  bottom: 16,
                  left: 16,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                  },
                  transition: 'all 0.3s ease'
                }}
                aria-label="Volume Mixer"
              >
                <Badge
                  badgeContent={playingSoundsCount}
                  color="primary"
                >
                  <TuneIcon />
                </Badge>
              </Fab>
            </Tooltip>
          )}
          
          {/* Exit drag mode FAB - Only show when in drag mode */}
          {dragMode && (
            <Tooltip title="Exit Organize Mode">
              <Fab
                color="primary"
                onClick={toggleDragMode}
                sx={{ 
                  position: 'fixed',
                  bottom: 16,
                  left: 16,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                  },
                  transition: 'all 0.3s ease'
                }}
                aria-label="Exit Organize Mode"
              >
                <DragIndicatorIcon />
              </Fab>
            </Tooltip>
          )}
          
          {/* Action Buttons */}
          <Box sx={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 2 }}>
            {/* Hide action buttons in drag mode */}
            {!dragMode && (
              <>
                <Tooltip title="Add Category">
                  <Fab
                    color="secondary"
                    onClick={handleAddGroupOpen}
                    sx={{ 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                      },
                      transition: 'all 0.3s ease'
                    }}
                    aria-label="Add Category"
                  >
                    <CategoryIcon />
                  </Fab>
                </Tooltip>
                <Tooltip title="Add Sound">
                  <Fab
                    color="primary"
                    onClick={handleAddSoundOpen}
                    sx={{ 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                      },
                      transition: 'all 0.3s ease'
                    }}
                    aria-label="Add Sound"
                  >
                    <AddIcon />
                  </Fab>
                </Tooltip>
              </>
            )}
          </Box>
          
          {/* Volume Mixer Drawer */}
          <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{
              sx: {
                width: { xs: '100%', sm: 320 },
                maxWidth: '100%',
                borderTopRightRadius: 16,
                borderBottomRightRadius: 16,
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                backgroundImage: 'linear-gradient(to bottom, #f8f4e5, #e0d8c0)',
              }
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ 
                mb: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: 1 
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TuneIcon /> Volume Mixer
                </Box>
                {/* Mobile-friendly close button */}
                <IconButton 
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close volume mixer"
                  sx={{ 
                    display: { xs: 'flex', sm: 'none' },
                    bgcolor: 'rgba(0,0,0,0.05)',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Typography>
              
              {/* Master volume control */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(255,255,255,0.7)' }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Master Volume
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <IconButton 
                    onClick={() => {
                      console.log("Setting master volume to 0 (mute all)");
                      const newVolume = 0;
                      setMasterVolume(newVolume);
                      
                      // Apply to all currently playing sounds immediately
                      Object.entries(audioMap).forEach(([id, audio]) => {
                        if (audio) {
                          // Force muting
                          console.log(`Muting sound ${id}`);
                          audio.volume = 0;
                          audio.muted = true;
                        }
                      });
                    }}
                    size="small"
                  >
                    <VolumeOffIcon fontSize="small" />
                  </IconButton>
                  
                  <Slider
                    value={masterVolume * 100}
                    onChange={(e, newValue) => {
                      // Convert percentage to decimal
                      const newVolume = newValue / 100;
                      console.log(`Master volume changed to ${newVolume * 100}%`);
                      
                      // Update state
                      setMasterVolume(newVolume);
                      
                      // Apply to all currently playing sounds immediately
                      Object.entries(audioMap).forEach(([id, audio]) => {
                        if (audio) {
                          const sound = sounds.find(s => s.id === id);
                          if (sound) {
                            const baseVolume = sound.volume !== undefined ? sound.volume : 0.7;
                            const effectiveVolume = baseVolume * newVolume;
                            
                            // Ensure proper muting
                            if (newVolume <= 0.01 || effectiveVolume <= 0.01) {
                              console.log(`Muting sound ${sound.name}`);
                              audio.volume = 0;
                              audio.muted = true;
                            } else {
                              console.log(`Setting ${sound.name} volume to ${effectiveVolume}`);
                              audio.muted = false;
                              audio.volume = Math.max(0, Math.min(1, effectiveVolume));
                            }
                          }
                        }
                      });
                    }}
                    aria-labelledby="master-volume-slider"
                    valueLabelDisplay="auto"
                    valueLabelFormat={value => `${Math.round(value)}%`}
                    sx={{ mx: 1 }}
                  />
                  
                  <IconButton 
                    onClick={() => {
                      const newVolume = 1.0;
                      setMasterVolume(newVolume);
                      
                      // Apply to all currently playing sounds immediately
                      Object.entries(audioMap).forEach(([id, audio]) => {
                        if (audio) {
                          const sound = sounds.find(s => s.id === id);
                          if (sound) {
                            const baseVolume = sound.volume !== undefined ? sound.volume : 0.7;
                            audio.muted = false;
                            audio.volume = baseVolume; // Set to base volume (1.0 master means use base volume)
                          }
                        }
                      });
                    }}
                    size="small"
                  >
                    <VolumeUpIcon fontSize="small" />
                  </IconButton>
                  
                  <Box sx={{ minWidth: 35, textAlign: 'right' }}>
                    <Typography variant="body2" color="text.secondary">
                      {Math.round(masterVolume * 100)}%
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Currently playing sounds */}
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Currently Playing
              </Typography>
              
              {Object.keys({ ...playing, ...paused }).length === 0 ? (
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.5)' }}>
                  <Typography variant="body2" color="text.secondary">
                    No sounds playing
                  </Typography>
                </Paper>
              ) : (
                <List sx={{ 
                  bgcolor: 'rgba(255,255,255,0.5)', 
                  borderRadius: 2,
                  maxHeight: '50vh',
                  overflow: 'auto'
                }}>
                  {Object.keys({ ...playing, ...paused }).map(id => {
                    const sound = sounds.find(s => s.id === id);
                    if (!sound) return null;
                    
                    const audio = audioMap[id];
                    const position = audioPositions[id] || 0;
                    const duration = sound.duration || 0;
                    const soundVolume = sound.volume !== undefined ? sound.volume : 0.7;
                    const isPlaying = playing[id];
                    const isPaused = paused[id];
                    
                    return (
                      <ListItem key={id} sx={{ 
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        px: 2,
                        py: 1,
                        opacity: isPaused ? 0.7 : 1, // Dim paused sounds
                      }}>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <span style={{ marginRight: 8 }}>{sound.emoji || '🔊'}</span>
                            <Typography variant="body2" noWrap sx={{ 
                              flexGrow: 1, 
                              fontWeight: 'bold',
                              fontStyle: isPaused ? 'italic' : 'normal', // Italicize paused sounds
                            }}>
                              {sound.name}
                              {isPaused && <span style={{ marginLeft: '4px', fontSize: '80%', color: '#777' }}>(Paused)</span>}
                              {/* Loop indicator in mixer */}
                              {looping[id] && (
                                <Box 
                                  component="span" 
                                  sx={{
                                    display: 'inline-block',
                                    ml: 1,
                                    bgcolor: theme.palette.secondary.main,
                                    color: 'white',
                                    fontSize: '0.6rem',
                                    px: 0.5,
                                    py: 0.1,
                                    borderRadius: '8px',
                                    verticalAlign: 'middle'
                                  }}
                                >
                                  LOOP
                                </Box>
                              )}
                            </Typography>
                            
                            {/* Play/Pause Button */}
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handlePlayPause(sound)}
                              sx={{ mr: 1 }}
                            >
                              {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                            </IconButton>
                            
                            {/* Stop Button */}
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleStopSound(sound)}
                            >
                              <StopIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: '100%' }}>
                              <Slider
                                size="small"
                                value={soundVolume * 100}
                                onChange={(e, newValue) => {
                                  const newVol = newValue / 100;
                                  handleVolumeChange(sound, newVol);
                                }}
                                aria-label={`${sound.name} volume`}
                                sx={{ 
                                  color: sound.color || theme.palette.primary.main 
                                }}
                              />
                              <Box sx={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                fontSize: '0.75rem',
                                color: 'text.secondary'
                              }}>
                                <span>{Math.round(soundVolume * 100)}%</span>
                                {duration > 0 && (
                                  <span>{formatTime(position)} / {formatTime(duration)}</span>
                                )}
                              </Box>
                            </Box>
                          </Box>
                          
                          {/* Progress bar */}
                          {duration > 0 && (
                            <LinearProgress 
                              variant="determinate" 
                              value={(position / duration) * 100} 
                              sx={{ 
                                height: 3, 
                                mt: 0.5, 
                                borderRadius: 5,
                                bgcolor: 'rgba(0,0,0,0.05)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: sound.color || theme.palette.primary.main,
                                },
                                opacity: isPaused ? 0.5 : 1, // Dim progress for paused sounds
                              }}
                            />
                          )}
                        </Box>
                      </ListItem>
                    );
                  })}
                </List>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined" 
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={stopAllSounds}
                  sx={{ width: '100%' }}
                >
                  Stop All Sounds
                </Button>
              </Box>
              
              {/* Mobile close button at the bottom */}
              <Box sx={{ 
                mt: 2, 
                display: { xs: 'block', sm: 'none' },
                position: 'sticky',
                bottom: 0,
                pb: 2
              }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<CloseIcon />}
                  onClick={() => setDrawerOpen(false)}
                  sx={{ width: '100%' }}
                >
                  Close Mixer
                </Button>
              </Box>
            </Box>
          </Drawer>
          
          {/* Add Sound Dialog */}
          <Dialog 
            open={addSoundOpen} 
            onClose={handleAddSoundClose} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                // Ensure better iOS dialog behavior
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                // Fix issues with iOS input handling
                touchAction: 'pan-y'
              }
            }}
          >
            <DialogTitle sx={{ 
              bgcolor: 'primary.main', 
              color: 'white',
              background: 'linear-gradient(135deg, #8b5a2b 0%, #a67c52 100%)',
            }}>
              Add New Sound
            </DialogTitle>
            <DialogContent sx={{ pt: 2, pb: 3, px: 3, mt: 2 }}>
              <TextField
                label="Sound Name"
                fullWidth
                margin="normal"
                value={newSound.name}
                onChange={(e) => setNewSound({ ...newSound, name: e.target.value })}
                required
                variant="outlined"
              />
              
              <Box sx={{ mt: 2, mb: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<VolumeUpIcon />}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  {newSound.file ? newSound.file.name : 'Upload Sound File'}
                  <input
                    type="file"
                    accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/*"
                    onChange={(e) => {
                      try {
                        const selectedFile = e.target.files?.[0];
                        
                        if (!selectedFile) {
                          console.warn('No file selected or file selection was cancelled');
                          return;
                        }

                        // Log file info for debugging
                        console.log('File selected:', {
                          name: selectedFile.name,
                          size: selectedFile.size,
                          type: selectedFile.type
                        });

                        // Update state with the selected file
                        setNewSound(prev => ({ ...prev, file: selectedFile }));

                        // Clear error if previously set
                        if (error && error.includes('file')) {
                          setError(null);
                        }
                      } catch (err) {
                        console.error('Error selecting file:', err);
                        setError(`File selection error: ${err.message}. Please try a different file or method.`);
                      }
                    }}
                    ref={fileInputRef}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                </Button>

                {/* iOS helper text */}
                {isiPad && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                    Tap to select from your files. For iPad, tap "Browse" to select from Files app instead of recording video.
                  </Typography>
                )}
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Icon
                    </Typography>
                    <Paper
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '56px',
                        width: '56px',
                        cursor: 'pointer',
                        fontSize: '2rem',
                        border: '1px solid #ddd',
                        '&:hover': {
                          backgroundColor: '#f8f8f8'
                        }
                      }}
                    >
                      {newSound.emoji}
                    </Paper>
                  </Box>
                  
                  {showEmojiPicker && (
                    <ClickAwayListener onClickAway={() => setShowEmojiPicker(false)}>
                      <Paper 
                        elevation={3}
                        sx={{ 
                          p: 1, 
                          maxHeight: '200px',
                          overflowY: 'auto',
                          mt: 1,
                          position: 'absolute',
                          zIndex: 1300,
                          width: '260px'
                        }}
                      >
                        <Grid container spacing={1}>
                          {emojiOptions.map((emoji, index) => (
                            <Grid item key={index} xs={2}>
                              <Box 
                                sx={{ 
                                  p: 1,
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  fontSize: '1.5rem',
                                  borderRadius: '4px',
                                  '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                  },
                                  backgroundColor: newSound.emoji === emoji ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                                }}
                                onClick={() => {
                                  setNewSound({ ...newSound, emoji });
                                  setShowEmojiPicker(false);
                                }}
                              >
                                {emoji}
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Paper>
                    </ClickAwayListener>
                  )}
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Background Color"
                    fullWidth
                    margin="normal"
                    type="color"
                    value={newSound.color}
                    onChange={(e) => setNewSound({ ...newSound, color: e.target.value })}
                  />
                </Grid>
              </Grid>
              
              {/* Add volume slider */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Default Volume
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <VolumeDownIcon color="action" />
                  <Slider
                    value={newSound.volume}
                    onChange={(e, newValue) => setNewSound({ ...newSound, volume: newValue })}
                    min={0}
                    max={1}
                    step={0.01}
                    sx={{ 
                      color: '#8b5a2b',
                      '& .MuiSlider-thumb': { 
                        width: 16, 
                        height: 16 
                      }
                    }}
                  />
                  <VolumeUpIcon color="action" />
                </Box>
              </Box>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="category-label">Category</InputLabel>
                <Select
                  labelId="category-label"
                  value={newSound.groupId}
                  onChange={(e) => setNewSound({ ...newSound, groupId: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {allCategories.slice(1).map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleAddSoundClose}>Cancel</Button>
              <Button 
                onClick={handleAddSound} 
                variant="contained" 
                color="primary"
                disabled={!newSound.name || !newSound.file}
              >
                Add Sound
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Add Group Dialog */}
          <Dialog open={addGroupOpen} onClose={handleAddGroupClose} maxWidth="sm" fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }
            }}
          >
            <DialogTitle sx={{ 
              bgcolor: 'secondary.main', 
              color: 'primary.main',
              background: 'linear-gradient(135deg, #e3d5b8 0%, #f0e9d9 100%)',
              fontWeight: 'bold'
            }}>
              Add New Category
            </DialogTitle>
            <DialogContent sx={{ pt: 2, pb: 3, px: 3, mt: 2 }}>
              <TextField
                label="Category Name"
                fullWidth
                margin="normal"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                required
                variant="outlined"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <Box sx={{ mr: 1, color: 'primary.main', opacity: 0.7 }}>
                      <CategoryIcon />
                    </Box>
                  )
                }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button 
                onClick={handleAddGroupClose}
                variant="outlined"
                sx={{
                  borderRadius: '20px',
                  px: 2,
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddGroup} 
                variant="contained" 
                color="primary"
                disabled={!newGroup.name}
                sx={{
                  borderRadius: '20px',
                  px: 3,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                Add Category
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Reset Confirmation Dialog */}
          <Dialog 
            open={confirmReset} 
            onClose={() => setConfirmReset(false)}
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
              }
            }}
          >
            <DialogTitle sx={{ fontWeight: 'bold' }}>
              Reset Soundboard?
            </DialogTitle>
            <DialogContent>
              <Typography>
                This will delete all your sounds and categories. This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button 
                onClick={() => setConfirmReset(false)}
                variant="outlined"
                sx={{
                  borderRadius: '20px',
                  px: 2,
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleResetDatabase} 
                color="error" 
                variant="contained"
                sx={{
                  borderRadius: '20px',
                  px: 2,
                }}
              >
                Reset Everything
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Error Snackbar */}
          <Snackbar
            open={!!error}
            autoHideDuration={5000}
            onClose={handleErrorClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              onClose={handleErrorClose} 
              severity="error" 
              variant="filled"
              sx={{ 
                width: '100%',
                '& .MuiAlert-message': {
                  fontSize: '0.95rem'
                }
              }}
            >
              {error}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

// Helper function to get the appropriate volume icon based on level
function getVolumeIcon(volume, fontSize) {
  const style = fontSize ? { fontSize } : {};
  
  if (volume === 0) return <VolumeOffIcon sx={style} />;
  if (volume < 0.3) return <VolumeMuteIcon sx={style} />;
  if (volume < 0.7) return <VolumeDownIcon sx={style} />;
  return <VolumeUpIcon sx={style} />;
} 