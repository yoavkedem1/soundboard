/**
 * Main Application Script for Soundboard App
 */

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize the storage first
        await StorageManager.init();
        
        // Then initialize the UI
        UIManager.init();
        
        console.log('Soundboard app initialized successfully!');
    } catch (error) {
        console.error('Error initializing application:', error);
        document.body.innerHTML = `
            <div class="error-container">
                <h1>Error Initializing Soundboard</h1>
                <p>${error.message || 'Unknown error'}</p>
                <p>Please try refreshing the page or use a different browser.</p>
            </div>
        `;
    }
});

// Service Worker Registration for PWA support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('ServiceWorker registration failed:', error);
            });
    });
} 