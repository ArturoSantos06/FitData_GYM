import React, { useState, useEffect } from 'react';
import SuccessModal from '../SuccessModal';
import { getProducts, getInventoryEntries, createInventoryEntry, getCurrentUser, getUser } from '../../firebase';

function Inventario() {
  const [productos, setProductos] = useState([]);
  const [historial, setHistorial] = useState([]);
  
  // Estados para el Modal de Agregar Stock
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cantidadAgregar, setCantidadAgregar] = useState('');

  // Estados para el Modal de Éxito
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentUserName, setCurrentUserName] = useState('Sistema');

  const cargarDatos = async () => {
    try {
      // 1. Cargar Productos 
      const productsResult = await getProducts();
      if (productsResult.success) {
        setProductos(productsResult.data);
      }

      // 2. Cargar Historial de Entradas
      const entriesResult = await getInventoryEntries();
      if (entriesResult.success) {
        setHistorial(entriesResult.data);
      }
    } catch (error) { 
      console.error(error); 
    }
  };

  useEffect(() => {
    setTimeout(() => cargarDatos(), 0);
    
    // Cargar nombre del usuario actual
    const loadUser = async () => {
      const user = getCurrentUser();
      if (user) {
        const userResult = await getUser(user.uid);
        if (userResult.success) {
          setCurrentUserName(userResult.data.username || userResult.data.email || 'Sistema');
        }
      }
    };
    loadUser();
  }, []);

  const abrirModal = (prod) => {
    setSelectedProduct(prod);
    setCantidadAgregar('');
    setShowModal(true);
  };

  const guardarEntrada = async (e) => {
    e.preventDefault();
    if (!cantidadAgregar || parseInt(cantidadAgregar) <= 0) {
      setSuccessMessage("Cantidad inválida");
      setShowSuccess(true);
      return;
    }

    try {
      const result = await createInventoryEntry({
        productoId: selectedProduct.id,
        cantidad: parseInt(cantidadAgregar),
        usuarioNombre: currentUserName
      });

      if (result.success) {
        setSuccessMessage(`¡Stock actualizado! Se agregaron ${cantidadAgregar} unidades.`);
        setShowSuccess(true);
        setShowModal(false);
        setCantidadAgregar('');
        cargarDatos(); 
      } else {
        setSuccessMessage(result.error || "Error al registrar entrada");
        setShowSuccess(true);
      }
    } catch (error) { 
      console.error(error);
      setSuccessMessage("Error al registrar entrada");
      setShowSuccess(true);
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-600">
        Control de Inventario
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PANEL IZQUIERDO: STOCK ACTUAL */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            📦 Stock Actual
          </h2>
          <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-200 uppercase bg-slate-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((prod) => (
                  <tr key={prod.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-white">{prod.nombre}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${prod.stock < 5 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {prod.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => abrirModal(prod)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                      >
                        + Agregar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL DERECHO: HISTORIAL DE ENTRADAS */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            📋 Historial de Entradas
          </h2>
          <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-200 uppercase bg-slate-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Cant.</th>
                  <th className="px-4 py-3">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {historial.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-4 italic">No hay registros aún.</td></tr>
                ) : (
                    historial.map((item) => {
                      const fechaObj = item.fecha?.toDate?.() || new Date(item.fecha || 0);
                      return (
                        <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-xs">
                                {fechaObj.toLocaleDateString()} {fechaObj.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </td>
                            <td className="px-4 py-3 text-white">{item.producto_nombre}</td>
                            <td className="px-4 py-3 text-right text-emerald-400 font-bold">+{item.cantidad}</td>
                            <td className="px-4 py-3 text-xs text-slate-500 uppercase">{item.usuario_nombre || 'Sistema'}</td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL PARA AGREGAR STOCK */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-600 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Agregar Stock a: <br/><span className="text-blue-400">{selectedProduct.nombre}</span></h3>
            
            <form onSubmit={guardarEntrada}>
                <label className="block text-sm text-gray-400 mb-2">Cantidad a ingresar:</label>
                <input 
                    type="number" 
                    min="1"
                    className="w-full p-3 bg-slate-800 border border-slate-500 rounded text-white focus:ring-2 focus:ring-blue-500 outline-none mb-6"
                    value={cantidadAgregar}
                    onChange={(e) => setCantidadAgregar(e.target.value)}
                    autoFocus
                />
                <div className="flex gap-3">
                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-slate-700 text-white rounded hover:bg-slate-600">Cancelar</button>
                    <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 font-bold">Guardar</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO */}
      <SuccessModal 
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="¡Actualizado!"
        message={successMessage}
      />

    </div>
  );
}

export default Inventario;