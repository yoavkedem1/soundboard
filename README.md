# Fantasy Soundboard

A fantasy-themed soundboard web application that allows you to save and organize sounds for tabletop RPGs, gaming sessions, or performances. The app stores all sounds locally on your device.

## Features

- Add, play, and manage sound clips
- Create categories to organize sounds
- Play/pause controls with progress indicators 
- Loop sounds for background ambience
- Fully responsive design (works great on iPad and other devices)
- Works offline (PWA support)
- All data stored locally in your browser

## How to Use

1. Visit the app in your browser
2. Click the "+" button to upload a sound file (MP3, WAV, etc.)
3. Name your sound, choose a color and icon
4. Create categories to organize your sounds
5. Tap on a sound to play it, tap again to pause
6. Use the loop button for continuous playback

## Automatic Deployment to GitHub Pages

This project is set up with GitHub Actions to automatically deploy to GitHub Pages whenever code is pushed to the main branch.

### Setup Instructions:

1. Fork or clone this repository
2. Enable GitHub Pages in your repository settings:
   - Go to your repository settings
   - Navigate to "Pages" in the sidebar
   - Under "Build and deployment", select "GitHub Actions" as the source
3. Push any changes to the main branch
4. GitHub Actions will automatically build and deploy your site
5. Your site will be published at `https://[your-username].github.io/[repository-name]/`

### Manual Deployment:

You can also deploy manually:

```bash
npm run deploy
```

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/[your-username]/[repository-name].git
   ```

2. Navigate to the project directory:
   ```bash
   cd [repository-name]
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Technical Details

- Built with React and Material-UI
- Uses IndexedDB (via idb library) for local storage
- Implements the Web Audio API for sound playback
- Progressive Web App (PWA) capabilities for offline use
- Vite as build tool and dev server

## Privacy

All your sounds are stored locally on your device using IndexedDB. No data is ever sent to any server.

## License

MIT License 
MIT License 