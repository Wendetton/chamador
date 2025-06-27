
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCjkC_k4xmbY6VvPwN4-gVPuGgMRgQyQCQ',
  authDomain: 'chamador-c46ab.firebaseapp.com',
  projectId: 'chamador-c46ab',
  storageBucket: 'chamador-c46ab.firebasestorage.app',
  messagingSenderId: '44597594571',
  appId: '1:44597594571:web:a9f57c9ece2cbbcec58e4e',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
