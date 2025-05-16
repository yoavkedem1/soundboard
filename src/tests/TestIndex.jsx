import React from 'react';
import { 
  Container, Typography, Box, Paper, List, ListItem, 
  ListItemButton, ListItemIcon, ListItemText, Divider
} from '@mui/material';
import TabletMacIcon from '@mui/icons-material/TabletMac';
import { Link as RouterLink } from 'react-router-dom';

/**
 * Test Suite Index Page
 * 
 * This component provides navigation to various test suites
 */
export default function TestIndex() {
  // List of available test suites
  const testSuites = [
    {
      id: 'ipad',
      name: 'iPad Compatibility Tests',
      description: 'Test iPad-specific compatibility features like audio playback, volume controls, and file uploads',
      icon: <TabletMacIcon />,
      path: '/tests/ipad'
    }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom align="center" fontWeight="bold">
          Fantasy Soundboard Test Suite
        </Typography>
        
        <Typography variant="body1" paragraph align="center">
          Select a test suite below to verify specific functionality
        </Typography>
        
        <Box sx={{ my: 3 }}>
          <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
            {testSuites.map((suite, index) => (
              <React.Fragment key={suite.id}>
                {index > 0 && <Divider />}
                <ListItem disablePadding component={RouterLink} to={suite.path} sx={{ textDecoration: 'none', color: 'inherit' }}>
                  <ListItemButton>
                    <ListItemIcon>
                      {suite.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography variant="subtitle1" fontWeight="medium">
                          {suite.name}
                        </Typography>
                      } 
                      secondary={suite.description} 
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Box>
        
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 4 }}>
          Use these tests to verify functionality on specific devices and environments
        </Typography>
      </Paper>
    </Container>
  );
} 