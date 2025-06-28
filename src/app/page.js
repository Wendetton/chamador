
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [docIdInput, setDocIdInput] = useState('');
  const router = useRouter();

  const handleNavigateToDocument = () => {
    if (docIdInput.trim()) {
      router.push(`/doc/${docIdInput.trim()}`);
    }
  };

  const handleCreateNewDocument = () => {
    const newDocId = Math.random().toString(36).substring(2, 15);
    router.push(`/doc/${newDocId}`);
  };

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-black">Editor de Documentos Colaborativo</h1>
      
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 text-black">Acessar Documento Existente</h2>
          <input
            type="text"
            value={docIdInput}
            onChange={(e) => setDocIdInput(e.target.value)}
            placeholder="Digite o ID do Documento"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mb-3 text-black"
          />
          <button
            onClick={handleNavigateToDocument}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
          >
            Acessar Documento
          </button>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2 text-black">Ou Crie um Novo</h2>
          <button
            onClick={handleCreateNewDocument}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
          >
            Criar Novo Documento
          </button>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray-600 text-center">
        Para testar a colaboração, abra o mesmo link de documento em duas janelas ou navegadores diferentes.
      </p>
    </div>
  );
}


