# Soundboard App

A personal soundboard web application that allows you to save and organize your favorite sounds. The app stores all sounds locally on your device.

## Features

- Add, play, and manage sound clips
- Create groups to organize sounds
- Fully responsive design (works great on iPad and other devices)
- Works offline (PWA support)
- All data stored locally on your device

## How to Use

1. Visit the app in your browser
2. Click "Add Sound" to upload a sound file (MP3, WAV, etc.)
3. Name your sound and choose a color
4. Create groups to organize your sounds
5. Tap on a sound to play it

## How to Host on GitHub Pages

1. Create a GitHub repository for the project
2. Upload all files to the repository
3. Go to the repository settings
4. Scroll down to the "GitHub Pages" section
5. Select the branch you want to deploy (usually `main` or `master`)
6. Save your changes
7. Your site will be published at `https://[your-username].github.io/[repository-name]/`

## Local Installation

If you prefer to run the app locally before hosting:

1. Clone the repository:
   ```
   git clone https://github.com/[your-username]/[repository-name].git
   ```

2. Navigate to the project directory:
   ```
   cd [repository-name]
   ```

3. Open the `index.html` file in your browser or use a local server:
   ```
   # Using Python
   python -m http.server
   
   # Or using Node.js with http-server
   npx http-server
   ```

## Technical Details

- Built with vanilla JavaScript (no dependencies)
- Uses IndexedDB for local storage
- Implements the Web Audio API for sound playback
- Progressive Web App (PWA) for offline use

## Privacy

All your sounds are stored locally on your device. No data is ever sent to any server.

## License

MIT License 