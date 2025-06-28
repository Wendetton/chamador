`use client`;

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  collection,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const initialDocumentData = {
  currentCall: { nome: '', sala: '', chamadoEm: null, color: 'green' },
  history: [],
};

export default function CallPage() {
  const { docId } = useParams();
  const [documentData, setDocumentData] = useState(initialDocumentData);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [userColor, setUserColor] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [nome, setNome] = useState('');
  const [sala, setSala] = useState('');
  const [selectedColor, setSelectedColor] = useState('green');

  const presenceRef = useRef(null);
  const presenceIntervalRef = useRef(null);

  // Identify or prompt for user details
  useEffect(() => {
    let localId = localStorage.getItem('collab_user_id');
    if (!localId) {
      localId = Math.random().toString(36).slice(2);
      localStorage.setItem('collab_user_id', localId);
    }
    setUserId(localId);

    let localName = localStorage.getItem('collab_user_name');
    if (!localName) {
      localName = prompt('Digite seu nome para colaborar:') || `Anônimo-${localId.slice(0,4)}`;
      localStorage.setItem('collab_user_name', localName);
    }
    setUserName(localName);

    let localClr = localStorage.getItem('collab_user_color');
    if (!localClr) {
      localClr = getRandomColor();
      localStorage.setItem('collab_user_color', localClr);
    }
    setUserColor(localClr);
  }, []);

  // Firestore real-time sync and presence
  useEffect(() => {
    if (!docId) return;
    const docRef = doc(db, 'documents', docId);

    // Listen document
    const unsubDoc = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setDocumentData(snap.data());
        } else {
          setDoc(docRef, initialDocumentData);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Snapshot error:', err);
        setLoading(false);
      }
    );

    // Presence tracking
    presenceRef.current = doc(db, 'documents', docId, 'activeUsers', userId);
    const updatePresence = () => {
      setDoc(
        presenceRef.current,
        { name: userName, color: userColor, lastSeen: serverTimestamp() },
        { merge: true }
      );
    };
    updatePresence();
    presenceIntervalRef.current = setInterval(updatePresence, 15000);

    const usersRef = collection(db, 'documents', docId, 'activeUsers');
    const unsubUsers = onSnapshot(usersRef, (snap) => {
      const cutoff = new Date(Date.now() - 60000);
      const users = [];
      snap.forEach((d) => {
        const u = d.data();
        if (u.lastSeen?.toDate() > cutoff) users.push({ id: d.id, ...u });
      });
      setActiveUsers(users);
    });

    const onUnload = () => deleteDoc(presenceRef.current);
    window.addEventListener('beforeunload', onUnload);

    return () => {
      unsubDoc();
      unsubUsers();
      clearInterval(presenceIntervalRef.current);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [docId, userId, userName, userColor]);

  // Generic partial update
  const updateField = (path, value) => {
    if (!docId) return;
    updateDoc(doc(db, 'documents', docId), { [path]: value });
  };

  // Handle call action
  const handleCall = () => {
    if (!nome || !sala) return;
    const call = { nome, sala, chamadoEm: new Date().toISOString(), color: selectedColor };
    const hist = [...(documentData.history || []), call];
    updateField('currentCall', call);
    updateField('history', hist);
    setNome('');
    setSala('');
  };

  // Color mapping for display
  const colors = {
    red: { bg: 'bg-red-100', text: 'text-red-700' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    green: { bg: 'bg-green-100', text: 'text-green-700' },
  };
  const { bg, text } = colors[documentData.currentCall.color] || colors.green;

  const formatTime = (t) => {
    const diff = Math.floor((Date.now() - new Date(t)) / 60000);
    return diff ? `Há ${diff} min` : 'Agora';
  };

  if (loading) return <div className="p-4">Carregando...</div>;

  return (
    <div className="container mx-auto p-4 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-6">Painel de Chamadas</h1>

      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4 text-black">Nova chamada</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Nome do paciente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="border px-4 py-2 rounded flex-1 text-black placeholder-black"
          />
          <input
            type="text"
            placeholder="Sala"
            value={sala}
            onChange={(e) => setSala(e.target.value)}
            className="border px-4 py-2 rounded w-32 text-black placeholder-black"
          />
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="border px-2 py-2 rounded text-black"
          >
            <option value="red">Vermelho</option>
            <option value="yellow">Amarelo</option>
            <option value="green">Verde</option>
          </select>
          <button
            onClick={handleCall}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Chamar
          </button>
        </div>
      </div>

      <div className={`${bg} p-6 rounded shadow mb-6 animate-pulse`}></div>

    </div>
  );
}
