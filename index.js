
import { useState, useEffect } from 'react';
import { doc, setDoc, collection, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '@/components/ui/button';

export default function PainelPacientes() {
  const [nomePaciente, setNomePaciente] = useState('');
  const [pacienteAtual, setPacienteAtual] = useState(null);
  const [historico, setHistorico] = useState([]);

  const pacientesRef = collection(db, 'pacientes');
  const atualRef = doc(db, 'painel', 'atual');

  useEffect(() => {
    const unsubAtual = onSnapshot(atualRef, (docSnap) => {
      if (docSnap.exists()) {
        setPacienteAtual(docSnap.data());
      }
    });

    const unsubHistorico = onSnapshot(pacientesRef, (querySnapshot) => {
      const temp = [];
      querySnapshot.forEach((doc) => {
        temp.push(doc.data());
      });
      setHistorico(temp);
    });

    return () => {
      unsubAtual();
      unsubHistorico();
    };
  }, []);

  const adicionarPaciente = async () => {
    if (!nomePaciente.trim()) return;

    await setDoc(atualRef, {
      nome: nomePaciente,
      piscar: false,
      campainha: false,
      atendido: false,
    });

    setNomePaciente('');
  };

  const tocarCampainha = async () => {
    await updateDoc(atualRef, { campainha: true });
    setTimeout(() => updateDoc(atualRef, { campainha: false }), 1000);
  };

  const ativarPiscar = async () => {
    await updateDoc(atualRef, { piscar: !pacienteAtual?.piscar });
  };

  const marcarAtendido = async () => {
    if (!pacienteAtual) return;
    await setDoc(doc(pacientesRef), {
      nome: pacienteAtual.nome,
      data: new Date().toISOString(),
    });
    await setDoc(atualRef, {
      nome: '',
      piscar: false,
      campainha: false,
      atendido: true,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="flex gap-2 mb-6">
        <input
          value={nomePaciente}
          onChange={(e) => setNomePaciente(e.target.value)}
          placeholder="Digite o nome do paciente"
          className="border p-2 rounded"
        />
        <button onClick={adicionarPaciente}>Adicionar</button>
      </div>

      <div
        className={\`w-full p-6 text-center rounded \${pacienteAtual?.piscar ? 'animate-pulse bg-yellow-200' : 'bg-white'}\`}
      >
        <h1 className="text-5xl font-bold">{pacienteAtual?.nome || 'Aguardando paciente...'}</h1>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={tocarCampainha}>Campainha</button>
        <button onClick={ativarPiscar}>{pacienteAtual?.piscar ? 'Parar Piscar' : 'Piscar'}</button>
        <button onClick={marcarAtendido}>Atendido</button>
      </div>

      <div className="w-full mt-8 bg-gray-100 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Histórico</h2>
        {historico.map((item, index) => (
          <div key={index} className="border-b py-2">{item.nome} - {new Date(item.data).toLocaleTimeString()}</div>
        ))}
      </div>
    </div>
  );
}
