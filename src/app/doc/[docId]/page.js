'use client';

import { useState } from 'react';

export default function ChamadorPage() {
  const [chamadas, setChamadas] = useState([]);
  const [nome, setNome] = useState('');
  const [sala, setSala] = useState('');

  const handleChamar = () => {
    if (!nome || !sala) return;
    const novaChamada = {
      id: Date.now(),
      nome,
      sala,
      chamadoEm: new Date(),
    };
    setChamadas([novaChamada, ...chamadas]);
    setNome('');
    setSala('');
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

      {chamadas.length > 0 && (
        <>
          <div className="bg-green-100 p-6 rounded shadow-md mb-6 animate-pulse">
            <h2 className="text-2xl font-bold text-green-700">Chamando: {chamadas[0].nome}</h2>
            <p className="text-lg text-green-600">Sala: {chamadas[0].sala}</p>
            <p className="text-sm text-gray-600">{calcularTempo(chamadas[0].chamadoEm)}</p>
          </div>

          <div className="bg-white p-6 rounded shadow-md">
            <h2 className="text-xl font-semibold mb-4">Histórico de Chamadas</h2>
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {chamadas.slice(1).map((chamada) => (
                <li key={chamada.id} className="border p-3 rounded">
                  <p className="font-medium">{chamada.nome} - Sala {chamada.sala}</p>
                  <p className="text-xs text-gray-500">{calcularTempo(chamada.chamadoEm)}</p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

