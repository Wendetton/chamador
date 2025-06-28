'use client';

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
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Improved beep using persistent AudioContext to handle user gesture resume
const playBeep = (() => {
  let ctx = null;
  return () => {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.value = 1000; // 1kHz
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    setTimeout(() => oscillator.stop(), 200);
  };
})();

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 10; i++) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
};

const initialDocumentData = {
  currentCall: { nome: '', sala: '', chamadoEm: null },
  history: [],
};

export default function CallPage() {
  const { docId } = useParams();
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [userColor, setUserColor] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [nome, setNome] = useState('');
  const [sala, setSala] = useState('');

  const presenceRef = useRef(null);
  const presenceIntervalRef = useRef(null);
  const beepIntervalRef = useRef(null);

  useEffect(() => {
    let localUserId = localStorage.getItem('collab_user_id');
    let localUserName = localStorage.getItem('collab_user_name');
    let localUserColor = localStorage.getItem('collab_user_color');
    if (!localUserId) {
      localUserId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('collab_user_id', localUserId);
    }
    setUserId(localUserId);
    if (!localUserName) {
      localUserName = prompt("Digite seu nome para colaborar:") || \`Anônimo-\${localUserId.substring(0, 4)}\`;
      localStorage.setItem('collab_user_name', localUserName);
    }
    setUserName(localUserName);
    if (!localUserColor) {
      localUserColor = getRandomColor();
      localStorage.setItem('collab_user_color', localUserColor);
    }
    setUserColor(localUserColor);
  }, []);

  useEffect(() => {
    if (!docId || !userId || !userName || !userColor) return;
    const docRef = doc(db, 'documents', docId);

    const unsubscribeDoc = onSnapshot(docRef, docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDocumentData({
          currentCall: data.currentCall || initialDocumentData.currentCall,
          history: data.history || initialDocumentData.history,
        });
      } else {
        setDoc(docRef, initialDocumentData);
      }
      setLoading(false);
    });

    presenceRef.current = doc(db, 'documents', docId, 'activeUsers', userId);
    const updatePresence = async () => {
      await setDoc(
        presenceRef.current,
        { name: userName, color: userColor, lastSeen: serverTimestamp() },
        { merge: true }
      );
    };
    updatePresence();
    presenceIntervalRef.current = setInterval(updatePresence, 15000);

    const usersCollectionRef = collection(db, 'documents', docId, 'activeUsers');
    const unsubscribeUsers = onSnapshot(usersCollectionRef, snapshot => {
      const users = [];
      const cutoff = new Date(Date.now() - 60000);
      snapshot.forEach(userDoc => {
        const userData = userDoc.data();
        if (userData.lastSeen?.toDate() > cutoff) {
          users.push({ id: userDoc.id, ...userData });
        }
      });
      setActiveUsers(users);
    });

    // Beep on new call, then every 20s
    if (documentData?.currentCall?.nome) {
      playBeep();
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = setInterval(playBeep, 20000);
    }

    const handleBeforeUnload = async () => {
      await deleteDoc(presenceRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribeDoc();
      unsubscribeUsers();
      clearInterval(presenceIntervalRef.current);
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [docId, userId, userName, userColor, documentData?.currentCall?.nome]);

  const updateField = async (path, value) => {
    if (!docId) return;
    await updateDoc(doc(db, 'documents', docId), { [path]: value });
  };

  const handleCall = () => {
    if (!nome || !sala) return;
    const newCall = { nome, sala, chamadoEm: new Date().toISOString() };
    const newHistory = [...(documentData.history || []), newCall];
    updateField('currentCall', newCall);
    updateField('history', newHistory);
    setNome('');
    setSala('');
  };

  const calcularTempo = data => {
    const diff = Math.floor((Date.now() - new Date(data).getTime()) / 60000);
    return diff === 0 ? 'Agora' : \`Há \${diff} min\`;
  };

  if (loading || !documentData) {
    return <div className="flex justify-center items-center h-screen"><p>Carregando painel...</p></div>;
  }
  if (!docId) {
    return <div className="flex justify-center items-center h-screen"><p>ID do documento não fornecido.</p></div>;
  }

  return (
    <div className="container mx-auto p-4 flex flex-col min-h-screen bg-gray-100">
      <header className="mb-6 py-4">
        <h1 className="text-3xl font-bold text-center text-black">Painel de Chamadas</h1>
        <p className="text-sm text-gray-600 text-center">
          Documento: {docId} | Editando como: <span style={{ color: userColor, fontWeight: 'bold' }}>{userName}</span>
        </p>
      </header>
      <div className="bg-white p-6 rounded shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4 text-black">Nova chamada</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Nome do paciente"
            value={nome}
            onChange={e => setNome(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 flex-1 text-black placeholder-black"
          />
          <input
            type="text"
            placeholder="Sala"
            value={sala}
            onChange={e => setSala(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-32 text-black placeholder-black"
          />
          <button
            onClick={handleCall}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            Chamar
          </button>
        </div>
      </div>

      {documentData.currentCall.nome && (
        <div className="bg-green-100 p-6 rounded shadow-md mb-6 animate-pulse">
          <h2 className="text-2xl font-bold text-green-700">Chamando: {documentData.currentCall.nome}</h2>
          <p className="text-lg text-green-600">Sala: {documentData.currentCall.sala}</p>
          <p className="text-sm text-gray-600">{calcularTempo(documentData.currentCall.chamadoEm)}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-black">Histórico de Chamadas</h2>
        {documentData.history.length > 0 ? (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {[...documentData.history].reverse().map((chamada, idx) => (
              <li key={idx} className="border p-3 rounded">
                <p className="text-black font-medium">{chamada.nome} - Sala {chamada.sala}</p>
                <p className="text-black text-xs">{calcularTempo(chamada.chamadoEm)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-black">Nenhuma chamada registrada ainda.</p>
        )}
      </div>

      <aside className="mt-8 bg-white p-4 rounded shadow-md">
        <h2 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">Usuários Ativos ({activeUsers.length})</h2>
        <ul className="max-h-60 overflow-y-auto space-y-2">
          {activeUsers.map(user => (
            <li key={user.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 transition-colors duration-150" style={{ backgroundColor: `${user.color}1A` }}>
              <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: user.color }}></span>
              <span className="text-sm font-medium" style={{ color: user.color }}>{user.name}</span>
            </li>
          ))}
        </ul>
      </aside>

      <footer className="mt-8 text-center text-sm text-gray-500 py-4 border-t border-gray-200">
        As alterações são salvas automaticamente em tempo real.
      </footer>
    </div>
  );
}
