import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Button, List, ListItem, 
  ListItemText, ListItemIcon, Divider, LinearProgress, Alert
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { iPadTester } from './iPadTestSuite';

/**
 * iPad Test Runner Component
 * 
 * This component provides a UI for running and viewing the results
 * of the iPad simulation tests.
 */
export default function IPadTestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [isSimulatingiPad, setIsSimulatingiPad] = useState(false);

  // Run tests when requested
  const runTests = () => {
    setIsRunning(true);
    setTestResults(null);
    
    // Use setTimeout to allow UI to update before running tests
    setTimeout(() => {
      try {
        const results = iPadTester.runAllTests();
        setTestResults(results);
      } catch (error) {
        console.error('Error running tests:', error);
        setTestResults({ 
          error: true,
          errorMessage: error.message,
          total: 0,
          passed: 0,
          failed: 1, 
          skipped: 0,
          results: [] 
        });
      } finally {
        setIsRunning(false);
      }
    }, 100);
  };

  // Toggle iPad simulation
  const toggleiPadSimulation = () => {
    if (isSimulatingiPad) {
      iPadTester.restoreOriginalEnvironment();
      setIsSimulatingiPad(false);
    } else {
      iPadTester.mockiPad();
      setIsSimulatingiPad(true);
    }
  };

  // Get icon for test status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircleOutlineIcon fontSize="small" color="success" />;
      case 'failed':
        return <ErrorOutlineIcon fontSize="small" color="error" />;
      case 'skipped':
        return <SkipNextIcon fontSize="small" color="disabled" />;
      default:
        return <ErrorOutlineIcon fontSize="small" color="warning" />;
    }
  };
  
  // Get color for test status
  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'success.main';
      case 'failed':
        return 'error.main';
      case 'skipped':
        return 'text.disabled';
      default:
        return 'warning.main';
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ 
        p: 3, 
        borderRadius: 2,
        bgcolor: isSimulatingiPad ? 'rgba(255, 240, 230, 0.9)' : 'white' 
      }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ 
          fontWeight: 'bold',
          color: isSimulatingiPad ? '#ff6b00' : 'inherit'
        }}>
          {isSimulatingiPad ? 'iPad Simulation Active' : 'iPad Test Runner'}
        </Typography>
        
        {isSimulatingiPad && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Currently simulating iPad environment. This affects the entire browser window!
          </Alert>
        )}
        
        <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={runTests} 
            disabled={isRunning}
          >
            {isRunning ? 'Testing...' : 'Run iPad Tests'}
          </Button>
          
          <Button 
            variant={isSimulatingiPad ? "outlined" : "contained"}
            color={isSimulatingiPad ? "warning" : "secondary"}
            onClick={toggleiPadSimulation}
          >
            {isSimulatingiPad ? 'Disable iPad Simulation' : 'Simulate iPad Environment'}
          </Button>
        </Box>
        
        {isRunning && <LinearProgress sx={{ mb: 2 }} />}
        
        {testResults && !testResults.error && (
          <>
            <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                Test Results Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Total</Typography>
                  <Typography variant="h5">{testResults.total}</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="success.main">Passed</Typography>
                  <Typography variant="h5" color="success.main">{testResults.passed}</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="error.main">Failed</Typography>
                  <Typography variant="h5" color="error.main">{testResults.failed}</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.disabled">Skipped</Typography>
                  <Typography variant="h5" color="text.disabled">{testResults.skipped}</Typography>
                </Box>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Detailed Results
            </Typography>
            
            <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
              {testResults.results.map((result, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <Divider variant="inset" component="li" />}
                  <ListItem alignItems="flex-start">
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      {getStatusIcon(result.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography fontWeight="medium" color={getStatusColor(result.status)}>
                          {result.name}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.secondary">
                            Status: <Box component="span" sx={{ fontWeight: 'bold', color: getStatusColor(result.status) }}>
                              {result.status.toUpperCase()}
                            </Box>
                            {result.error && (
                              <Typography component="p" variant="body2" color="error.main" sx={{ mt: 0.5 }}>
                                Error: {result.error}
                              </Typography>
                            )}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </>
        )}
        
        {testResults && testResults.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Error running tests: {testResults.errorMessage || 'Unknown error'}
          </Alert>
        )}
        
        {!isRunning && !testResults && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Click "Run iPad Tests" to test iPad compatibility features.
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
} 