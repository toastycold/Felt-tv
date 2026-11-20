// Firebase web app config (from Firebase console → Project settings → Your apps).
// This key is meant to be public; the database security rules are what protect your data.
export const firebaseConfig = {
  apiKey: 'AIzaSyAhmBRTNdyFB68i1fo0pLlFZzTiZJkcthE',
  authDomain: 'felt-games.firebaseapp.com',
  // Check this matches the URL shown at the top of Build → Realtime Database.
  // (Databases outside the US look like https://felt-games-default-rtdb.<region>.firebasedatabase.app)
  databaseURL: 'https://felt-games-default-rtdb.firebaseio.com',
  projectId: 'felt-games',
  storageBucket: 'felt-games.firebasestorage.app',
  messagingSenderId: '359230268531',
  appId: '1:359230268531:web:6befd8711498d6c7e47606',
};

// The only Google account allowed to sign in to admin.html and approve suggestions.
// If you change this, change it in database.rules.json too, then run firebase deploy.
export const ADMIN_EMAIL = 'ouderkirkh2point0@gmail.com';
