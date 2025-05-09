import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppBar, Toolbar, Typography, Tabs, Tab, Box, Fab, Grid, Paper, 
  IconButton, ThemeProvider, createTheme, CssBaseline, Container, 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  TextField, CircularProgress, MenuItem, Select, InputLabel,
  FormControl, Alert, Snackbar, LinearProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoopIcon from '@mui/icons-material/Loop';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import { saveSound, getAllSounds, deleteSound, saveGroup, getAllGroups, resetDatabase } from './db';

// Create a fantasy-themed MUI theme
const theme = createTheme({
  palette: {
    primary: { main: '#8b5a2b' },
    secondary: { main: '#e3d5b8' },
    background: {
      default: '#f8f4e5',
      paper: '#f8f4e5',
    },
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
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'url("https://www.transparenttextures.com/patterns/parchment.png")',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none',
          fontWeight: 'bold',
        },
        containedPrimary: {
          color: '#fff',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#5a3921',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          minWidth: 'auto',
          padding: '8px 16px',
          marginRight: '8px',
          fontWeight: 'bold',
        },
      },
    },
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

const predefinedCategories = ['Ambience', 'Combat', 'Music', 'Voices', 'Special Effects'];

export default function App() {
  // State
  const [currentTab, setCurrentTab] = useState(0);
  const [sounds, setSounds] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState({});
  const [looping, setLooping] = useState({});
  const [audioMap, setAudioMap] = useState({});
  const [audioPositions, setAudioPositions] = useState({});
  const [addSoundOpen, setAddSoundOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newSound, setNewSound] = useState({
    name: '',
    file: null,
    color: '#8b5a2b',
    emoji: '🔊',
    groupId: ''
  });
  const [newGroup, setNewGroup] = useState({ name: '' });
  const [error, setError] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  
  // Refs
  const fileInputRef = useRef();
  const audioContextRef = useRef(null);
  
  // Get audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      // Create audio context on first use (helps with browser autoplay policies)
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);
  
  // Get all categories (predefined + custom)
  const allCategories = [
    { id: 'all', name: 'All Sounds' },
    ...predefinedCategories.map(cat => ({ id: cat.toLowerCase(), name: cat })),
    ...groups.filter(g => !predefinedCategories.map(c => c.toLowerCase()).includes(g.name.toLowerCase()))
  ];

  // Load sounds and groups from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const groupsData = await getAllGroups();
        setGroups(groupsData || []);
        
        const soundsData = await getAllSounds();
        setSounds(soundsData || []);
      } catch (err) {
        console.error("Error loading data from IndexedDB:", err);
        setError("Failed to load sounds. Please try resetting the database.");
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      Object.values(audioMap).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  }, [audioMap]);
  
  // Handle category change
  const handleCategoryChange = (event, newValue) => {
    setCurrentTab(newValue);
    
    // Stop all playing sounds
    stopAllSounds();
  };
  
  // Get filtered sounds for the current category
  const filteredSounds = sounds.filter(sound => {
    if (currentTab === 0) return true; // All sounds
    const category = allCategories[currentTab];
    if (!category) return false;
    return sound.groupId === category.id;
  });
  
  // Initialize audio context on first interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      // Create audio context on first user interaction
      getAudioContext();
      // Remove the event listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);
  
  // Handle play/pause with more robust event handling
  const handlePlayPause = async (sound) => {
    const id = sound.id;
    
    try {
      // If already playing, pause it
      if (playing[id]) {
        const audio = audioMap[id];
        if (audio) {
          audio.pause();
          // Reset the audio if it has looping disabled
          if (!looping[id]) {
            audio.currentTime = 0;
          }
        }
        
        setPlaying(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
        return;
      }
      
      // Ensure audio context is running
      const audioContext = getAudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Otherwise play this sound (while keeping other sounds playing)
      let audio = audioMap[id];
      
      // Create new audio element if none exists
      if (!audio) {
        audio = new Audio();
        
        // Make sure to set event handlers before loading audio
        audio.loop = !!looping[id];
        
        // Handle audio ending
        audio.addEventListener('ended', function onEnded() {
          if (!this.loop) {
            setPlaying(prev => {
              const newState = { ...prev };
              delete newState[id];
              return newState;
            });
          }
        });
        
        // Handle errors
        audio.addEventListener('error', function onError(err) {
          console.error("Audio playback error:", err);
          setPlaying(prev => {
            const newState = { ...prev };
            delete newState[id];
            return newState;
          });
          setError("Could not play sound. Try using a different browser or format.");
        });
        
        // Add time update event to track position
        audio.addEventListener('timeupdate', function onTimeUpdate() {
          setAudioPositions(prev => ({
            ...prev,
            [id]: {
              current: this.currentTime,
              duration: this.duration || sound.duration || 0
            }
          }));
        });
        
        // Initialize with zeroed position to fix progress bar
        setAudioPositions(prev => ({
          ...prev,
          [id]: {
            current: 0,
            duration: sound.duration || 0
          }
        }));
        
        // Set up audio
        audio.preload = "auto";
        audio.src = sound.data;
        
        // Store the audio element
        setAudioMap(prev => ({ ...prev, [id]: audio }));
      } else {
        // If we have an existing audio but it's not playing,
        // reset its current time if not looping
        if (!looping[id]) {
          audio.currentTime = 0;
        }
        
        // Make sure loop state is current
        audio.loop = !!looping[id];
      }
      
      // Try to unlock audio on iOS/Safari
      if (audio.paused) {
        const silentPlay = audio.play();
        if (silentPlay !== undefined) {
          try {
            await silentPlay;
          } catch (e) {
            // Probably user hasn't interacted yet
            console.warn('Initial play was rejected:', e);
            // We'll try again below
          }
        }
      }
      
      // Ensure audio is fully loaded before playing
      if (audio.readyState < 2) {  // HAVE_CURRENT_DATA (2) or higher needed for playback
        await new Promise((resolve, reject) => {
          const onCanPlay = () => {
            audio.removeEventListener('canplaythrough', onCanPlay);
            clearTimeout(timeout);
            resolve();
          };
          
          audio.addEventListener('canplaythrough', onCanPlay);
          
          // Set a timeout in case loading takes too long
          const timeout = setTimeout(() => {
            audio.removeEventListener('canplaythrough', onCanPlay);
            reject(new Error("Audio loading timed out"));
          }, 5000);
        });
      }
      
      // Play the audio without stopping other sounds
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      // Only update playing state after successful play
      setPlaying(prev => ({ ...prev, [id]: true }));
      
    } catch (err) {
      console.error("Error playing sound:", err);
      setPlaying(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      setError(`Could not play sound: ${err.message}`);
    }
  };
  
  // Handle loop toggle
  const handleLoopToggle = (sound) => {
    const id = sound.id;
    const newLoopState = !looping[id];
    
    // Update the loop state
    setLooping(prev => ({ ...prev, [id]: newLoopState }));
    
    // Update the audio if it exists
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
    Object.keys(playing).forEach(id => {
      if (playing[id]) {
        const audio = audioMap[id];
        if (audio) {
          audio.pause();
          audio.currentTime = 0; // Reset position
        }
      }
    });
    
    // Reset all state
    setPlaying({});
    setAudioPositions({}); // Clear all positions
  };
  
  // Handle add sound dialog
  const handleAddSoundOpen = () => setAddSoundOpen(true);
  const handleAddSoundClose = () => {
    setAddSoundOpen(false);
    setNewSound({
      name: '',
      file: null,
      color: '#8b5a2b',
      emoji: '🔊',
      groupId: ''
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
        icon: newSound.emoji,
        groupId: newSound.groupId || 'none',
        duration: Math.round(duration),
        dateAdded: new Date().toISOString()
      };
      
      // Save to database
      const savedSound = await saveSound(sound);
      
      // Add to state
      setSounds(prev => [...prev, savedSound]);
      
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
      await resetDatabase();
      
      // Reset state
      setSounds([]);
      setGroups([]);
      setAudioMap({});
      setPlaying({});
      setLooping({});
      
      setConfirmReset(false);
    } catch (err) {
      console.error("Error resetting database:", err);
      setError("Failed to reset database");
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
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        minHeight: '100vh',
        background: 'url("https://images.unsplash.com/photo-1518562180175-34a163b1a9cf?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        p: 2
      }}>
        <Container maxWidth="lg">
          <Paper sx={{
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: 3,
            position: 'relative',
          }}>
            {/* Header */}
            <AppBar position="static" color="primary" elevation={0}>
              <Toolbar sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
                <Typography variant="h1" sx={{ fontSize: { xs: '1.8rem', sm: '2.5rem' }, letterSpacing: 2 }}>
                  Fantasy Soundboard
                </Typography>
                <Box>
                  <IconButton color="inherit" onClick={() => setConfirmReset(true)} title="Reset Soundboard">
                    <RefreshIcon />
                  </IconButton>
                </Box>
              </Toolbar>
              
              {/* Category Tabs */}
              <Box sx={{ px: 2 }}>
                <Tabs
                  value={currentTab}
                  onChange={handleCategoryChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    mb: 1,
                    '& .MuiTab-root': {
                      bgcolor: 'secondary.main',
                      opacity: 0.7,
                      color: 'primary.main',
                      mx: 0.5,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: 'white',
                        opacity: 1,
                        fontWeight: 'bold',
                      },
                      '&:hover': {
                        opacity: 1,
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
                  {filteredSounds.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.7)' }}>
                      <Typography variant="h6" color="text.secondary">
                        No sounds in this category
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 1 }}>
                        Add some sounds to get started
                      </Typography>
                    </Paper>
                  ) : (
                    <Grid container spacing={3} justifyContent="center">
                      {filteredSounds.map((sound) => (
                        <Grid item key={sound.id} xs={6} sm={4} md={3} lg={2}>
                          <Paper
                            sx={{
                              width: '100%',
                              aspectRatio: '1/1',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              position: 'relative',
                              bgcolor: sound.color || theme.palette.primary.main,
                              color: 'white',
                              cursor: 'pointer',
                              transition: 'transform 0.2s, box-shadow 0.2s',
                              border: '3px solid rgba(255,255,255,0.5)',
                              '&:hover': {
                                transform: 'translateY(-5px)',
                                boxShadow: 6,
                                '& .sound-controls': {
                                  opacity: 1,
                                },
                              },
                            }}
                            onClick={() => handlePlayPause(sound)}
                          >
                            {/* Sound Icon */}
                            <Box sx={{ fontSize: '2.5rem', mb: 1 }}>
                              {sound.icon || '🔊'}
                            </Box>
                            
                            {/* Sound Name */}
                            <Typography
                              variant="subtitle1"
                              align="center"
                              sx={{
                                fontWeight: 'bold',
                                px: 2,
                                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                wordBreak: 'break-word',
                              }}
                            >
                              {sound.name}
                            </Typography>
                            
                            {/* Sound Duration and Progress */}
                            <Box sx={{ width: '80%', mt: 1 }}>
                              {playing[sound.id] && (
                                <LinearProgress 
                                  variant="determinate" 
                                  value={calculateProgress(audioPositions[sound.id])} 
                                  sx={{ 
                                    height: 4, 
                                    borderRadius: 2,
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: 'rgba(255,255,255,0.8)'
                                    }
                                  }}
                                />
                              )}
                              <Typography variant="caption" sx={{ 
                                opacity: 0.9, 
                                display: 'flex',
                                justifyContent: 'center',
                                mt: 0.5
                              }}>
                                {playing[sound.id] ? (
                                  <>
                                    {formatTime(audioPositions[sound.id]?.current)} / 
                                    {formatTime(audioPositions[sound.id]?.duration)}
                                  </>
                                ) : (
                                  formatTime(sound.duration)
                                )}
                              </Typography>
                            </Box>
                            
                            {/* Sound Controls */}
                            <Box
                              className="sound-controls"
                              sx={{
                                position: 'absolute',
                                top: 5,
                                right: 5,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                opacity: 0,
                                transition: 'opacity 0.2s',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconButton
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(255,255,255,0.8)',
                                  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlayPause(sound);
                                }}
                                color={playing[sound.id] ? 'primary' : 'default'}
                              >
                                {playing[sound.id] ? <PauseIcon /> : <PlayArrowIcon />}
                              </IconButton>
                              
                              <IconButton
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(255,255,255,0.8)',
                                  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoopToggle(sound);
                                }}
                                color={looping[sound.id] ? 'secondary' : 'default'}
                              >
                                <LoopIcon />
                              </IconButton>
                              
                              <IconButton
                                size="small"
                                sx={{
                                  bgcolor: 'rgba(255,255,255,0.8)',
                                  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSound(sound.id);
                                }}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                            
                            {/* Loop Indicator */}
                            {looping[sound.id] && (
                              <Box
                                sx={{
                                  position: 'absolute',
                                  bottom: 10,
                                  right: 10,
                                  fontSize: '1.2rem',
                                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                                }}
                              >
                                ∞
                              </Box>
                            )}
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </>
              )}
            </Container>
          </Paper>
          
          {/* Action Buttons */}
          <Box sx={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', gap: 2 }}>
            <Fab
              color="secondary"
              aria-label="add group"
              onClick={handleAddGroupOpen}
              sx={{ boxShadow: 3 }}
            >
              <CategoryIcon />
            </Fab>
            <Fab
              color="primary"
              aria-label="add sound"
              onClick={handleAddSoundOpen}
              sx={{ boxShadow: 3 }}
            >
              <AddIcon />
            </Fab>
          </Box>
          
          {/* Add Sound Dialog */}
          <Dialog open={addSoundOpen} onClose={handleAddSoundClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>Add New Sound</DialogTitle>
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
                    accept="audio/*"
                    hidden
                    onChange={(e) => setNewSound({ ...newSound, file: e.target.files[0] })}
                    ref={fileInputRef}
                  />
                </Button>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="Emoji Icon"
                    fullWidth
                    margin="normal"
                    value={newSound.emoji}
                    onChange={(e) => setNewSound({ ...newSound, emoji: e.target.value })}
                    inputProps={{ maxLength: 2 }}
                    placeholder="🔊"
                  />
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
          <Dialog open={addGroupOpen} onClose={handleAddGroupClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>Add New Category</DialogTitle>
            <DialogContent sx={{ pt: 2, pb: 3, px: 3, mt: 2 }}>
              <TextField
                label="Category Name"
                fullWidth
                margin="normal"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                required
                variant="outlined"
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleAddGroupClose}>Cancel</Button>
              <Button 
                onClick={handleAddGroup} 
                variant="contained" 
                color="primary"
                disabled={!newGroup.name}
              >
                Add Category
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Reset Confirmation Dialog */}
          <Dialog open={confirmReset} onClose={() => setConfirmReset(false)}>
            <DialogTitle>Reset Soundboard?</DialogTitle>
            <DialogContent>
              <Typography>
                This will delete all your sounds and categories. This action cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
              <Button onClick={handleResetDatabase} color="error" variant="contained">
                Reset Everything
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Error Snackbar */}
          <Snackbar
            open={!!error}
            autoHideDuration={6000}
            onClose={handleErrorClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={handleErrorClose} severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
} 