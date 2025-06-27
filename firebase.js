
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'SUA_API_KEY',
  authDomain: 'SEU_DOMINIO.firebaseapp.com',
  projectId: 'SEU_PROJECT_ID',
  storageBucket: 'SEU_BUCKET.appspot.com',
  messagingSenderId: 'SEU_MESSAGING_ID',
  appId: 'SEU_APP_ID',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
