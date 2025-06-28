
'use client';

import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ChamadorPage() {
  const [pacienteAtual, setPacienteAtual] = useState({ nome: '', sala: '', chamadoEm: null });
  const [historico, setHistorico] = useState([]);
  const [nome, setNome] = useState('');
  const [sala, setSala] = useState('');
  const docRef = doc(db, 'painel', 'chamadaAtual');

  useEffect(() => {
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPacienteAtual(data.pacienteAtual || { nome: '', sala: '', chamadoEm: null });
        setHistorico(data.historico || []);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChamar = async () => {
    if (!nome || !sala) return;
    const novaChamada = {
      nome,
      sala,
      chamadoEm: new Date().toISOString(),
    };
    try {
      await updateDoc(docRef, {
        pacienteAtual: novaChamada,
        historico: arrayUnion(novaChamada),
      });
      setNome('');
      setSala('');
    } catch (error) {
      console.error("Erro ao chamar paciente:", error);
      try {
        // Caso o documento não exista ainda
        await setDoc(docRef, {
          pacienteAtual: novaChamada,
          historico: [novaChamada],
        });
        setNome('');
        setSala('');
      } catch (err) {
        console.error("Erro ao criar documento:", err);
      }
    }
  };

  const calcularTempo = (data) => {
    const diff = Math.floor((new Date().getTime() - new Date(data).getTime()) / 60000);
    return diff === 0 ? 'Agora' : `Há ${diff} min`;
  };

  return (
    <div className="container mx-auto p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-center">Painel de Chamadas</h1>

      <div className="bg-white p-6 rounded shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Nova chamada</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Nome do paciente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 flex-1"
          />
          <input
            type="text"
            placeholder="Sala"
            value={sala}
            onChange={(e) => setSala(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 w-32"
          />
          <button
            onClick={handleChamar}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
          >
            Chamar
          </button>
        </div>
      </div>

      {pacienteAtual && pacienteAtual.nome && (
        <div className="bg-green-100 p-6 rounded shadow-md mb-6 animate-pulse">
          <h2 className="text-2xl font-bold text-green-700">Chamando: {pacienteAtual.nome}</h2>
          <p className="text-lg text-green-600">Sala: {pacienteAtual.sala}</p>
          <p className="text-sm text-gray-600">{calcularTempo(pacienteAtual.chamadoEm)}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded shadow-md">
        <h2 className="text-xl font-semibold mb-4">Histórico de Chamadas</h2>
        {historico.length > 0 ? (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {[...historico].reverse().map((chamada, index) => (
              <li key={index} className="border p-3 rounded">
                <p className="font-medium">{chamada.nome} - Sala {chamada.sala}</p>
                <p className="text-xs text-gray-500">{calcularTempo(chamada.chamadoEm)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Nenhuma chamada registrada ainda.</p>
        )}
      </div>
    </div>
  );
}
