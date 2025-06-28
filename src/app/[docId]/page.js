
// Este é o conteúdo completo do arquivo /home/ubuntu/collab-doc-editor/src/app/doc/[docId]/page.js
// com as modificações na função handleCopy para formatação da tabela (Arial 10, alinhamentos, negrito, largura).

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot, setDoc, updateDoc, collection, deleteDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 10)]; // Use 16 for full hex range
  }
  return color;
};

const initialEyeData = {
  esf: '0.00',
  cil: '0.00',
  eixo: '0',
};

const initialDocumentData = {
  rightEye: { ...initialEyeData },
  leftEye: { ...initialEyeData },
  addition: {
    active: false,
    value: '+0.75',
  },
  annotations: '', 
};

const generateOptions = (start, end, step, formatFixed = 2) => {
  const options = [];
  if (step === 0) return options;
  const scale = Math.pow(10, formatFixed);
  const scaledStart = Math.round(start * scale);
  const scaledEnd = Math.round(end * scale);
  const scaledStep = Math.round(step * scale);
  if (scaledStep > 0) {
    for (let i = scaledStart; i <= scaledEnd; i += scaledStep) {
      const currentValue = i / scale;
      const value = formatFixed > 0 ? currentValue.toFixed(formatFixed) : currentValue.toString();
      const displayValue = (currentValue > 0 && formatFixed > 0 && value !== '0.00') ? `+${value}` : value;
      options.push({ value: value, label: displayValue });
    }
  } else {
    for (let i = scaledStart; i >= scaledEnd; i += scaledStep) {
      const currentValue = i / scale;
      const value = formatFixed > 0 ? currentValue.toFixed(formatFixed) : currentValue.toString();
      const displayValue = (currentValue > 0 && formatFixed > 0 && value !== '0.00') ? `+${value}` : value;
      options.push({ value: value, label: displayValue });
    }
  }
  return options;
};

const esfOptions = generateOptions(-15.00, 15.00, 0.25);
const cilOptions = generateOptions(0.00, -6.00, -0.25);
const eixoOptions = generateOptions(0, 180, 5, 0);
const additionOptions = generateOptions(0.75, 3.00, 0.25);

const EyeForm = ({ eyeLabel, eyeData, eyeKey, onFieldChange, colorClass }) => {
  if (!eyeData) return null;
  return (
    <div className={`bg-white p-6 rounded-lg shadow-lg border-t-4 ${colorClass}`}>
      <h2 className={`text-xl font-semibold mb-4 text-gray-700 border-b pb-2`}>{eyeLabel}</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor={`${eyeKey}-esf`} className="block text-sm font-medium text-gray-700 mb-1">Esférico (ESF)</label>
          <select
            id={`${eyeKey}-esf`}
            name="esf"
            value={eyeData.esf}
            onChange={(e) => onFieldChange(`${eyeKey}.esf`, e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm text-black"
          >
            {esfOptions.map(option => (
              <option key={`${eyeKey}-esf-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${eyeKey}-cil`} className="block text-sm font-medium text-gray-700 mb-1">Cilindro (CIL)</label>
          <select
            id={`${eyeKey}-cil`}
            name="cil"
            value={eyeData.cil}
            onChange={(e) => onFieldChange(`${eyeKey}.cil`, e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm text-black"
          >
            {cilOptions.map(option => (
              <option key={`${eyeKey}-cil-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${eyeKey}-eixo`} className="block text-sm font-medium text-gray-700 mb-1">Eixo</label>
          <select
            id={`${eyeKey}-eixo`}
            name="eixo"
            value={eyeData.eixo}
            onChange={(e) => onFieldChange(`${eyeKey}.eixo`, e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm text-black"
          >
            {eixoOptions.map(option => (
              <option key={`${eyeKey}-eixo-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default function DocumentPage() {
  const params = useParams();
  const docId = params.docId;
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [userColor, setUserColor] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [copyStatus, setCopyStatus] = useState('');

  const presenceRef = useRef(null);
  const presenceIntervalRef = useRef(null);
  const debounceTimeoutRef = useRef(null); 

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
      localUserName = prompt("Digite seu nome para colaborar:") || `Anônimo-${localUserId.substring(0, 4)}`;
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
    const unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentData = {
            rightEye: data.rightEye || { ...initialDocumentData.rightEye },
            leftEye: data.leftEye || { ...initialDocumentData.leftEye },
            addition: data.addition ? { active: typeof data.addition.active === 'boolean' ? data.addition.active : initialDocumentData.addition.active, value: data.addition.value || initialDocumentData.addition.value } : { ...initialDocumentData.addition },
            annotations: typeof data.annotations === 'string' ? data.annotations : initialDocumentData.annotations, 
        };
        setDocumentData(currentData);
      } else {
        setDoc(docRef, initialDocumentData).then(() => {
          setDocumentData(initialDocumentData);
        }).catch(error => console.error("Erro ao criar novo documento: ", error));
      }
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar documento:", error);
      setLoading(false);
    });

    presenceRef.current = doc(db, 'documents', docId, 'activeUsers', userId);
    const updatePresence = async () => {
      if (presenceRef.current) {
        try {
          await setDoc(presenceRef.current, { name: userName, color: userColor, lastSeen: serverTimestamp() }, { merge: true });
        } catch (e) { console.error("Erro ao atualizar presença: ", e); }
      }
    };
    updatePresence();
    presenceIntervalRef.current = setInterval(updatePresence, 15000);

    const usersCollectionRef = collection(db, 'documents', docId, 'activeUsers');
    const cleanupInactiveUsers = async () => {
      const sixtySecondsAgo = new Date(Date.now() - 60000);
      const q = query(usersCollectionRef, where('lastSeen', '<', sixtySecondsAgo));
      const inactiveSnapshot = await getDocs(q);
      inactiveSnapshot.forEach(async (userDoc) => {
        await deleteDoc(doc(db, 'documents', docId, 'activeUsers', userDoc.id));
      });
    };
    const unsubscribeUsers = onSnapshot(usersCollectionRef, (snapshot) => {
      const users = [];
      const sixtySecondsAgo = new Date(Date.now() - 60000);
      snapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        if (userData.lastSeen && userData.lastSeen.toDate && userData.lastSeen.toDate() > sixtySecondsAgo) {
          users.push({ id: userDoc.id, ...userData });
        } else if (!userData.lastSeen) { users.push({ id: userDoc.id, ...userData }); }
      });
      setActiveUsers(users);
      cleanupInactiveUsers();
    });

    const handleBeforeUnload = async () => {
      if (presenceRef.current) {
        await deleteDoc(presenceRef.current).catch(e => console.error("Erro ao remover presença no unload: ", e));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      unsubscribeDoc();
      unsubscribeUsers();
      clearInterval(presenceIntervalRef.current);
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [docId, userId, userName, userColor]);

  const updateDocInFirestore = async (dataToUpdate) => {
    if (!docId) return;
    const docRef = doc(db, 'documents', docId);
    try { await updateDoc(docRef, dataToUpdate); }
    catch (error) { console.error(`Erro ao salvar documento:`, error); }
  };

  const updateField = (path, value) => {
    setDocumentData(prevData => {
      const keys = path.split('.');
      let tempData = JSON.parse(JSON.stringify(prevData));
      let currentLevel = tempData;
      keys.forEach((key, index) => {
        if (index === keys.length - 1) { currentLevel[key] = value; }
        else { if (!currentLevel[key] || typeof currentLevel[key] !== 'object') { currentLevel[key] = {}; } currentLevel = currentLevel[key]; }
      });
      return tempData;
    });
    if (path === 'annotations') { 
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => {
            updateDocInFirestore({ [path]: value });
        }, 500); 
    } else {
        updateDocInFirestore({ [path]: value });
    }
  };

  const handleAdditionToggle = () => {
    if (!documentData || typeof documentData.addition === 'undefined') return;
    const newActiveState = !documentData.addition.active;
    updateField('addition.active', newActiveState);
  };

  const handleReset = async () => {
    if (!docId) return;
    const docRef = doc(db, 'documents', docId);
    try { await setDoc(docRef, initialDocumentData); setDocumentData(initialDocumentData); }
    catch (error) { console.error("Erro ao resetar documento:", error); }
  };

  const formatEsfericoForCopy = (esfValue) => {
    const num = parseFloat(esfValue);
    if (isNaN(num)) return esfValue; 
    if (num > 0) return `+${esfValue}`;
    return esfValue;
  };

  const handleCopy = async () => {
    if (!documentData) return;
    const { rightEye, leftEye, addition } = documentData;

    let additionValueText = '';
    if (addition.active && addition.value) {
        const val = addition.value.toString();
        additionValueText = val.startsWith('+') ? val : `+${val}`;
    }

    const rightEsfFormatted = formatEsfericoForCopy(rightEye.esf);
    const leftEsfFormatted = formatEsfericoForCopy(leftEye.esf);

    const tableRows = [
      ['', 'ESF', 'CIL', 'Eixo'],
      ['Olho Direito', rightEsfFormatted, rightEye.cil, rightEye.eixo],
      ['Olho Esquerdo', leftEsfFormatted, leftEye.cil, leftEye.eixo],
      [addition.active ? 'Para perto' : '', addition.active ? `Adição ${additionValueText} (AO)` : '', '', '']
    ];

    // Estilos CSS para a tabela copiada
    const tableStyle = 'border-collapse: collapse; width: auto; font-family: Tahoma, Arial, sans-serif; font-size: 10pt;';
    const thStyleBase = 'border: 1px solid #dddddd; padding: 4px; background-color: #f2f2f2;';
    const tdStyleBase = 'border: 1px solid #dddddd; padding: 4px;'
    
    const thStyles = {
        default: `${thStyleBase} text-align: left; width: 120px;`, // Coluna A - mais larga
        center: `${thStyleBase} text-align: center; width: 80px;`  // Colunas B, C, D - mais estreitas
};

    const tdStyles = {
        default: `${tdStyleBase} text-align: left; width: 120px;`,
        centerBold: `${tdStyleBase} text-align: center; font-weight: bold; width: 80px;`,
        right: `${tdStyleBase} text-align: right; width: 120px;`
};  

    let htmlTable = `<table style="${tableStyle}">`;
    htmlTable += `<thead><tr>`;
    // Célula A1 (vazia)
    htmlTable += `<th style="${thStyles.default}">${tableRows[0][0]}</th>`; 
    // Células B1, C1, D1 (cabeçalhos de valores) - centralizadas
    htmlTable += `<th style="${thStyles.center}">${tableRows[0][1]}</th>`; 
    htmlTable += `<th style="${thStyles.center}">${tableRows[0][2]}</th>`; 
    htmlTable += `<th style="${thStyles.center}">${tableRows[0][3]}</th>`; 
    htmlTable += `</tr></thead><tbody>`;
    
    // Linha Olho Direito
    htmlTable += `<tr>`;
    htmlTable += `<td style="${tdStyles.default}">${tableRows[1][0]}</td>`; // A2
    htmlTable += `<td style="${tdStyles.centerBold}">${tableRows[1][1]}</td>`; // B2
    htmlTable += `<td style="${tdStyles.centerBold}">${tableRows[1][2]}</td>`; // C2
    htmlTable += `<td style="${tdStyles.centerBold}">${tableRows[1][3]}</td>`; // D2
    htmlTable += `</tr>`;

    // Linha Olho Esquerdo
    htmlTable += `<tr>`;
    htmlTable += `<td style="${tdStyles.default}">${tableRows[2][0]}</td>`; // A3
    htmlTable += `<td style="${tdStyles.centerBold}">${tableRows[2][1]}</td>`; // B3
    htmlTable += `<td style="${tdStyles.centerBold}">${tableRows[2][2]}</td>`; // C3
    htmlTable += `<td style="${tdStyles.centerBold}">${tableRows[2][3]}</td>`; // D3
    htmlTable += `</tr>`;

    // Linha Adição
    htmlTable += `<tr>`;
    htmlTable += `<td style="${tdStyles.right}">${tableRows[3][0]}</td>`; // A4 - alinhado à direita
    htmlTable += `<td style="${tdStyles.default}" colspan="3">${tableRows[3][1]}</td>`; // B4 (colspan para ocupar o resto)
    // As células C4 e D4 são implicitamente cobertas pelo colspan, então não as adicionamos
    htmlTable += `</tr>`;

    htmlTable += '</tbody></table>';

    const tsvData = tableRows.map(row => row.join('\t')).join('\n');

    try {
      const blobHtml = new Blob([htmlTable], { type: 'text/html' });
      const blobText = new Blob([tsvData], { type: 'text/plain' });
      const clipboardItem = new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText });
      await navigator.clipboard.write([clipboardItem]);
      setCopyStatus('Copiado!');
    } catch (err) {
      console.error('Falha ao copiar: ', err);
      try {
        await navigator.clipboard.writeText(tsvData);
        setCopyStatus('Copiado como texto simples!');
      } catch (fallbackErr) {
        console.error('Falha ao copiar como texto simples: ', fallbackErr);
        setCopyStatus('Falha ao copiar.');
      }
    }
    setTimeout(() => setCopyStatus(''), 3000);
  };

  if (loading || !documentData) {
    return <div className="flex justify-center items-center h-screen"><p>Carregando documento...</p></div>;
  }
  if (!docId) {
    return <div className="flex justify-center items-center h-screen"><p>ID do documento não fornecido.</p></div>;
  }

  return (
    <div className="container mx-auto p-4 flex flex-col min-h-screen bg-gray-100">
      <header className="mb-6 py-4">
        <h1 className="text-3xl font-bold text-center text-gray-800">EyeNote</h1> 
        <p className="text-sm text-gray-600 text-center">Documento: {docId} | Editando como: <span style={{ color: userColor, fontWeight: 'bold' }}>{userName}</span></p>
      </header>
      <div className="flex flex-grow flex-col lg:flex-row gap-6">
        <main className="flex-grow lg:w-3/4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EyeForm eyeLabel="Olho Direito (OD)" eyeData={documentData.rightEye} eyeKey="rightEye" onFieldChange={updateField} colorClass="border-blue-500"/>
            <EyeForm eyeLabel="Olho Esquerdo (OE)" eyeData={documentData.leftEye} eyeKey="leftEye" onFieldChange={updateField} colorClass="border-green-500"/>
          </div>
          <div className="mt-6 bg-white p-6 rounded-lg shadow-lg border-t-4 border-purple-500">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Adição</h2>
            <div className="flex items-center mb-4">
              <label htmlFor="addition-toggle" className="flex items-center cursor-pointer">
                <div className="relative">
                  <input type="checkbox" id="addition-toggle" className="sr-only" checked={documentData.addition?.active || false} onChange={handleAdditionToggle}/>
                  <div className={`block w-14 h-8 rounded-full ${documentData.addition?.active ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${documentData.addition?.active ? 'translate-x-6' : ''}`}></div>
                </div>
                <div className="ml-3 text-gray-700 font-medium">Ativar Adição</div>
              </label>
            </div>
            {documentData.addition?.active && (
              <div>
                <label htmlFor="addition-value" className="block text-sm font-medium text-gray-700 mb-1">Valor da Adição</label>
                <select id="addition-value" name="additionValue" value={documentData.addition.value} onChange={(e) => updateField('addition.value', e.target.value)} className="mt-1 block w-full md:w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm text-black">
                  {additionOptions.map(option => (<option key={`addition-${option.value}`} value={option.value}>{option.label}</option>))}
                </select>
              </div>
            )}
          </div>
          <div className="mt-6 bg-white p-6 rounded-lg shadow-lg border-t-4 border-gray-500">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">Controles</h2>
            <div className="flex flex-wrap gap-4">
                <button onClick={handleReset} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">Resetar Valores</button>
                <button onClick={handleCopy} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md shadow-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">{copyStatus || 'Copiar para Tabela'}</button>
            </div>
            {copyStatus && <p className="text-sm text-gray-600 mt-2">{copyStatus === 'Copiado!' ? 'Dados copiados para a área de transferência.' : (copyStatus === 'Copiado como texto simples!' ? 'Dados copiados como texto simples.' : 'Não foi possível copiar.')}</p>}
          </div>
        </main>
        <aside className="w-full lg:w-1/4 bg-white p-4 rounded-lg shadow-md lg:sticky lg:top-6 self-start space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">Usuários Ativos ({activeUsers.length})</h2>
            <ul className="max-h-60 overflow-y-auto space-y-2">
              {activeUsers.map(user => (
                <li key={user.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 transition-colors duration-150" style={{ backgroundColor: user.color ? `${user.color}1A` : '#E5E7EB66' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: user.color || 'gray', marginRight: '10px', display: 'inline-block', flexShrink: 0 }}></span>
                  <span className="text-sm font-medium" style={{ color: user.color || 'black' }}>{user.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">Anotações</h2>
            <textarea
              value={documentData.annotations || ''}
              onChange={(e) => updateField('annotations', e.target.value)}
              placeholder="Digite suas anotações aqui..."
              className="w-full h-40 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm text-black"
            />
          </div>
        </aside>
      </div>
      <footer className="mt-8 text-center text-sm text-gray-500 py-4 border-t border-gray-200">
        As alterações são salvas automaticamente.
      </footer>
    </div>
  );
}

