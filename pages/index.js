
import { useState, useEffect } from 'react';
import { doc, setDoc, collection, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
    <div style={{ padding: 20, textAlign: 'center' }}>
      <div style={{ marginBottom: 20 }}>
        <input
          value={nomePaciente}
          onChange={(e) => setNomePaciente(e.target.value)}
          placeholder="Digite o nome do paciente"
          style={{ padding: 10, marginRight: 10 }}
        />
        <button onClick={adicionarPaciente}>Adicionar</button>
      </div>

      <div style={{ padding: 20, border: '1px solid #ddd', marginBottom: 20, background: pacienteAtual?.piscar ? '#fff3cd' : '#fff' }}>
        <h1 style={{ fontSize: 40 }}>{pacienteAtual?.nome || 'Aguardando paciente...'}</h1>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button onClick={tocarCampainha} style={{ marginRight: 10 }}>Campainha</button>
        <button onClick={ativarPiscar} style={{ marginRight: 10 }}>{pacienteAtual?.piscar ? 'Parar Piscar' : 'Piscar'}</button>
        <button onClick={marcarAtendido}>Atendido</button>
      </div>

      <div style={{ textAlign: 'left' }}>
        <h2>Histórico</h2>
        {historico.map((item, index) => (
          <div key={index}>{item.nome} - {new Date(item.data).toLocaleTimeString()}</div>
        ))}
      </div>
    </div>
  );
}
