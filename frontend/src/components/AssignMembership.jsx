import React, { useState, useEffect } from 'react';
import SuccessModal from './SuccessModal';

// --- MODAL DE CONFIRMACIÓN DE CONFLICTO (RENOVACIÓN) ---
const RenewModal = ({ data, onConfirm, onCancel }) => {
  if (!data) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-600 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center">
        <div className="mb-4 flex justify-center"><span className="bg-amber-500/20 text-amber-400 p-3 rounded-full text-3xl">⚠️</span></div>
        <h3 className="text-xl font-bold text-white mb-2">Atención</h3>
        <p className="text-lg text-slate-200 mb-2 font-semibold">{data.message}</p>
        <p className="text-sm text-gray-400 mb-6 bg-slate-800 p-3 rounded-lg border border-slate-700">
          {data.detail}
          <br/><br/><span className="text-amber-400 font-bold">Nota: Esto reemplazará la membresía anterior.</span>
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="px-5 py-2.5 bg-linear-to-r from-green-600 to-teal-500 hover:from-green-500 hover:to-teal-400 text-white rounded-lg font-bold shadow-lg transition-transform hover:scale-105">Sí, Actualizar</button>
        </div>
      </div>
    </div>
  );
};

function AssignMembership({ onSuccess }) {
  const [users, setUsers] = useState([]);
  const [membershipTypes, setMembershipTypes] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedMembership, setSelectedMembership] = useState(null);
  
  // Estados de Pago
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [cambio, setCambio] = useState(0);

  // Estados de UI
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [conflictData, setConflictData] = useState(null);
  
  // Modal de Éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successSubMessage, setSuccessSubMessage] = useState('');

  // Estado de carga
  const [isLoading, setIsLoading] = useState(false);

  // Buscador de Clientes
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  // Para detectar clics fuera del buscador
  const dropdownRef = React.useRef(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const token = localStorage.getItem('token');
    const fetchData = async (endpoint, setter) => {
      try {
        const response = await fetch(`${API_URL}/api/${endpoint}/`, { headers: { 'Authorization': `Token ${token}` } });
        if (!response.ok) throw new Error(`Error al cargar ${endpoint}`);
        const data = await response.json();
        setter(data.results || data);
      } catch (err) { console.error(err); }
    };
    fetchData('users', setUsers); 
    fetchData('memberships', setMembershipTypes);

    // Click outside listener
    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setMostrarDropdown(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  const getImageUrl = (imgPath) => {
    if (!imgPath) return null;
    if (imgPath.startsWith('http')) return imgPath;
    return `${API_URL}${imgPath}`;
  };

  // Lógica de filtrado de clientes
  const clientesFiltrados = users.filter(user => {
      const nombreCompleto = `${user.first_name} ${user.last_name} ${user.username}`.toLowerCase();
      return nombreCompleto.includes(busquedaCliente.toLowerCase());
  });

  const seleccionarCliente = (user) => {
      setSelectedUser(user.id);
      setBusquedaCliente(`${user.username} (${user.first_name} ${user.last_name})`);
      setMostrarDropdown(false);
  };

  // Calcular precio
  const selectedPrice = membershipTypes.find(m => m.id === selectedMembership)?.price || 0;

  // Efecto para calcular cambio
  useEffect(() => {
    const recibido = parseFloat(montoRecibido) || 0;
    const precio = parseFloat(selectedPrice) || 0;
    setCambio(recibido - precio);
  }, [montoRecibido, selectedPrice]);

  const submitAssignment = async (forceRenew = false) => {
    setError('');
    setMessage('');
    
    if (!selectedUser || !selectedMembership) {
      setError('Selecciona cliente y membresía.'); return;
    }

    if (paymentMethod === 'EFECTIVO' && (parseFloat(montoRecibido) < parseFloat(selectedPrice))) {
        setError("El monto recibido es insuficiente.");
        return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('token');
    const payload = {
      user: selectedUser,
      membership_type: selectedMembership,
      payment_method: paymentMethod,
      monto_recibido: paymentMethod === 'EFECTIVO' ? parseFloat(montoRecibido) : selectedPrice,
      force_renew: forceRenew
    };

    try {
      const response = await fetch(`${API_URL}/api/user-memberships/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
        body: JSON.stringify(payload),
      });

      if (response.status === 409) {
        const conflict = await response.json();
        setConflictData(conflict);
        setIsLoading(false);
        return;
      }

      if (!response.ok) { 
        const errData = await response.json(); 
        throw new Error(errData.detail || errData.error || 'Error al asignar.'); 
      }

      const result = await response.json();
      
      setSuccessMessage(result.message || "Membresía Actualizada");
      if (paymentMethod === 'EFECTIVO') {
          setSuccessSubMessage(`💰 Cambio: $${cambio.toFixed(2)}\n📧 Ticket enviado.`);
      } else {
          setSuccessSubMessage("📧 Ticket enviado al correo.");
      }
      setShowSuccessModal(true);
      
      // Reset
      setSelectedUser('');
      setBusquedaCliente('');
      setSelectedMembership(null);
      setPaymentMethod('EFECTIVO');
      setMontoRecibido('');
      setConflictData(null);

      if (onSuccess) onSuccess();

    } catch (err) {
      setError(err.message);
      setConflictData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-xl mb-6 border-t-4 border-blue-500 text-gray-100 relative">
      
      {conflictData && <RenewModal data={conflictData} onCancel={() => setConflictData(null)} onConfirm={() => submitAssignment(true)} />}
      
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="¡Operación Exitosa!"
        message={successMessage}
        subMessage={successSubMessage}
      />

      <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-teal-400">
        Renovar Membresía
      </h2>

      {error && <div className="mb-4 bg-red-500/20 border border-red-500 text-red-200 p-3 rounded animate-pulse font-bold text-center">{error}</div>}

      <form onSubmit={(e) => { e.preventDefault(); submitAssignment(false); }} className="space-y-8">
        
        {/* 1. BUSCADOR DE CLIENTE */}
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-bold text-gray-300 mb-2">1. Selecciona el Cliente</label>
            <input 
                type="text"
                placeholder="Buscar por nombre o usuario..."
                value={busquedaCliente}
                onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setMostrarDropdown(true);
                    if(e.target.value === '') setSelectedUser('');
                }}
                onFocus={() => setMostrarDropdown(true)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-500"
            />
            
            {mostrarDropdown && (
                <ul className="absolute z-50 w-full bg-slate-800 border border-slate-600 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-2xl">
                    {clientesFiltrados.map(user => (
                        <li 
                            key={user.id} 
                            onClick={() => seleccionarCliente(user)}
                            className="p-3 hover:bg-slate-700 cursor-pointer text-white border-b border-slate-700 last:border-0"
                        >
                            <div className="font-bold text-cyan-400">{user.username}</div>
                            <div className="text-xs text-gray-400">{user.first_name} {user.last_name}</div>
                        </li>
                    ))}
                    {clientesFiltrados.length === 0 && (
                        <li className="p-3 text-gray-500 text-center italic">No se encontraron clientes</li>
                    )}
                </ul>
            )}
        </div>

        {/* 2. SELECCIÓN DE MEMBRESÍA */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-4">2. Elige la Membresía a Renovar</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {membershipTypes.map(type => (
              <div 
                key={type.id}
                onClick={() => setSelectedMembership(type.id)}
                className={`
                  group w-full aspect-video relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 bg-black border-2
                  ${selectedMembership === type.id 
                    ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.5)] scale-[1.02]' 
                    : 'border-gray-700 hover:border-gray-500 hover:scale-[1.01]'}
                `}
              >
                {type.image ? (
                  <img 
                    src={getImageUrl(type.image)} 
                    alt={type.name} 
                    className={`w-full h-full object-contain transition-all duration-500 ${selectedMembership !== type.id && 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`}
                  />
                ) : (
                   <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">Sin Imagen</div>
                )}
                
                {selectedMembership === type.id && (
                  <div className="absolute top-3 right-3 bg-cyan-500 text-black rounded-full p-1.5 shadow-lg z-10 animate-bounce-short">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 3. PAGO Y CAMBIO (MOVÍ ESTO ABAJO DE MEMBRESÍAS) */}
        <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">3. Pago</label>
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-600">
                <div className="flex gap-2 mb-3">
                    <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-1/2 bg-slate-800 border border-slate-500 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TARJETA">Tarjeta</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                    <div className="w-1/2 text-right">
                        <span className="block text-xs text-gray-400">Total a Cobrar</span>
                        <span className="text-xl font-bold text-green-400">${selectedPrice}</span>
                        <p className="text-[10px] text-slate-500">(IVA Incluido)</p>
                    </div>
                </div>

                {/* Input de Efectivo */}
                {paymentMethod === 'EFECTIVO' && (
                    <div className="animate-fade-in border-t border-slate-600 pt-2">
                        <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm text-gray-300">Recibido:</label>
                            <input 
                                type="number" 
                                value={montoRecibido} 
                                onChange={(e) => setMontoRecibido(e.target.value)} 
                                className="flex-1 p-1 bg-slate-800 border border-slate-500 rounded text-white text-right focus:ring-1 focus:ring-green-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm font-bold text-gray-300">Cambio:</span>
                            <span className={`font-bold ${cambio < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                                ${cambio.toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full bg-linear-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-all transform active:scale-95 text-lg uppercase tracking-widest flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Procesando...</span>
            </>
          ) : (
            "RENOVAR Y COBRAR"
          )}
        </button>
      </form>
    </div>
  );
}

export default AssignMembership;