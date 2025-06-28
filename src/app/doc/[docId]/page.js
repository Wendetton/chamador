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

// Beep function using Web Audio API
function playBeep() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.type = 'sine';
  oscillator.frequency.value = 1000;
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
  setTimeout(() => oscillator.stop(), 200);
}

// Generate random color hex
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

const initialDocumentData = {
  activeCalls: [],       // Multiple ongoing calls
  history: [],           // All calls history
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

  const presenceRef = useRef(null);
  const presenceIntervalRef = useRef(null);
  const beepIntervalRef = useRef(null);

  // User identification
  useEffect(() => {
    let id = localStorage.getItem('collab_user_id');
    if (!id) {
      id = Math.random().toString(36).slice(2);
      localStorage.setItem('collab_user_id', id);
    }
    setUserId(id);
    let name = localStorage.getItem('collab_user_name');
    if (!name) {
      name = prompt('Digite seu nome:') || `Anônimo-${id.slice(0,4)}`;
      localStorage.setItem('collab_user_name', name);
    }
    setUserName(name);
    let color = localStorage.getItem('collab_user_color');
    if (!color) {
      color = getRandomColor();
      localStorage.setItem('collab_user_color', color);
    }
    setUserColor(color);
  }, []);

  // Real-time sync and presence
  useEffect(() => {
    if (!docId || !userId || !userName) return;
    const docRef = doc(db, 'documents', docId);

    const unsubDoc = onSnapshot(docRef, snap => {
      if (snap.exists()) {
        const data = snap.data();
        setDocumentData({
          activeCalls: data.activeCalls || [],
          history: data.history || []
        });
      } else {
        setDoc(docRef, initialDocumentData);
      }
      setLoading(false);
    });

    // Presence
    presenceRef.current = doc(db, 'documents', docId, 'activeUsers', userId);
    const updatePresence = () => setDoc(presenceRef.current, { name: userName, color: userColor, lastSeen: serverTimestamp() }, { merge: true });
    updatePresence();
    presenceIntervalRef.current = setInterval(updatePresence, 15000);

    // Active users
    const usersRef = collection(db, 'documents', docId, 'activeUsers');
    const unsubUsers = onSnapshot(usersRef, snap => {
      const now = Date.now();
      const users = snap.docs.filter(d => {
        const t = d.data().lastSeen?.toDate().getTime() || 0;
        return now - t < 60000;
      }).map(d => ({ id: d.id, ...d.data() }));
      setActiveUsers(users);
    });

    return () => {
      unsubDoc();
      unsubUsers();
      clearInterval(presenceIntervalRef.current);
    };
  }, [docId, userId, userName, userColor]);

  // Play beep if any active calls
  useEffect(() => {
    if (documentData.activeCalls.length) {
      playBeep();
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = setInterval(playBeep, 10000);
    } else {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    }
    return () => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    };
  }, [documentData.activeCalls]);

  // Helpers
  const updateField = async (path, value) => {
    if (!docId) return;
    await updateDoc(doc(db, 'documents', docId), { [path]: value });
  };

  const handleCall = () => {
    if (!nome || !sala) return;
    const call = { id: Date.now().toString(), nome, sala, chamadoEm: new Date().toISOString() };
    const active = [...documentData.activeCalls, call];
    const hist = [...documentData.history, call];
    updateField('activeCalls', active);
    updateField('history', hist);
    setNome('');
    setSala('');
  };

  const finalizeCall = id => {
    const active = documentData.activeCalls.filter(c => c.id !== id);
    updateField('activeCalls', active);
  };

  const formatTime = t => {
    const diff = Math.floor((Date.now() - new Date(t).getTime())/60000);
    return diff ? `Há ${diff} min` : 'Agora';
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="container mx-auto p-4 bg-gray-100 min-h-screen">
      <h1 className="text-3xl mb-4 text-center text-black">Painel de Chamadas</h1>
      <div className="bg-white p-4 rounded mb-6">
        <h2 className="text-xl font-semibold text-black mb-2">Nova chamada</h2>
        <div className="flex gap-2">
          <input className="border p-2 flex-1 text-black" placeholder="Nome do paciente" value={nome} onChange={e=>setNome(e.target.value)}/>
          <input className="border p-2 w-24 text-black" placeholder="Sala" value={sala} onChange={e=>setSala(e.target.value)}/>
          <button className="bg-blue-600 text-white px-4" onClick={handleCall}>Chamar</button>
        </div>
      </div>
      <div className="space-y-4 mb-6">
        {documentData.activeCalls.map(c => (
          <div key={c.id} className="bg-yellow-100 p-4 rounded flex justify-between items-center animate-pulse">
            <div>
              <p className="font-bold text-black">Chamando: {c.nome}</p>
              <p className="text-black">Sala {c.sala} - {formatTime(c.chamadoEm)}</p>
            </div>
            <button className="bg-red-500 text-white px-3 rounded" onClick={()=>finalizeCall(c.id)}>Finalizar</button>
          </div>
        ))}
      </div>
      <div className="bg-white p-4 rounded">
        <h2 className="text-xl font-semibold text-black mb-2">Histórico de Chamadas</h2>
        {documentData.history.length ? (
          <ul className="space-y-2 max-h-64 overflow-auto">
            {[...documentData.history].reverse().map(c=>(
              <li key={c.id} className="border p-2 rounded text-black">{c.nome} - Sala {c.sala} ({formatTime(c.chamadoEm)})</li>
            ))}
          </ul>
        ) : <p className="text-black">Nenhuma chamada.</p>}
      </div>
      <aside className="mt-6 bg-white p-4 rounded">
        <h3 className="font-semibold mb-2">Usuários Ativos ({activeUsers.length})</h3>
        <ul>
          {activeUsers.map(u=>(
            <li key={u.id} className="flex items-center text-black"><span className="w-2 h-2 rounded-full mr-2" style={{backgroundColor:u.color}}/> {u.name}</li>
          ))}
        </ul>
      </aside>
    </div>
);
}
