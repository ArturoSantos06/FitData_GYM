import React, { useState, useEffect, useRef } from 'react';
import ProductoCard from './ProductoCard';
import ModalNuevoProducto from './ModalNuevoProducto';
import ModalEditarProducto from './ModalEditarProducto';
import HistorialVentas from './HistorialVentas';
import ConfirmModal from './ConfirmModal';
import SuccessModal from './SuccessModal';
import ErrorModal from './ErrorModal'; 

function PuntoDeVenta() {
    const [listaProductos, setListaProductos] = useState([]);
    const [listaClientes, setListaClientes] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState('');
    const [metodoPago, setMetodoPago] = useState('EFECTIVO');
    
    const [montoRecibido, setMontoRecibido] = useState('');
    const [cambio, setCambio] = useState(0);

    // Modales
    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarModalEdit, setMostrarModalEdit] = useState(false);
    const [productoAEditar, setProductoAEditar] = useState(null);
    
    const [showDeleteProductModal, setShowDeleteProductModal] = useState(false);
    const [productToDeleteDB, setProductToDeleteDB] = useState(null);

    const [showDeleteCartModal, setShowDeleteCartModal] = useState(false);
    const [itemToDeleteCart, setItemToDeleteCart] = useState(null);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [successSubMessage, setSuccessSubMessage] = useState('');

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [errorTitle, setErrorTitle] = useState('');

    // Estado de carga
    const [isLoading, setIsLoading] = useState(false);

    const [recargarHistorial, setRecargarHistorial] = useState(0);
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [mostrarDropdown, setMostrarDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    useEffect(() => {
        cargarDatos();
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, []);

    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setMostrarDropdown(false);
        }
    };

    const calcularTotal = () => {
        return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);
    };

    useEffect(() => {
        const total = calcularTotal();
        const recibido = parseFloat(montoRecibido) || 0;
        setCambio(recibido - total);
    }, [montoRecibido, carrito]);

    const cargarDatos = async () => {
        const token = localStorage.getItem('token');
        try {
            const resProd = await fetch(`${API_URL}/api/productos/`, { headers: { 'Authorization': `Token ${token}` } });
            const resCli = await fetch(`${API_URL}/api/users/`, { headers: { 'Authorization': `Token ${token}` } });

            if (resProd.ok && resCli.ok) {
                setListaProductos(await resProd.json());
                const usersData = await resCli.json();
                setListaClientes(usersData.results || usersData);
            }
        } catch (error) { console.error("Error cargando datos", error); }
    };

    // --- Eliminación Producto DB ---
    const confirmarEliminacionDB = (id) => {
        setProductToDeleteDB(id);
        setShowDeleteProductModal(true);
    };
    
    const ejecutarEliminacionDB = async () => {
        if (!productToDeleteDB) return;
        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_URL}/api/productos/${productToDeleteDB}/`, { 
                method: 'DELETE', 
                headers: { 'Authorization': `Token ${token}` } 
            });
            cargarDatos();
            setShowDeleteProductModal(false);
        } catch (error) { alert("Error al eliminar"); }
    };

    // --- Eliminación Carrito ---
    const pedirConfirmacionCarrito = (id) => {
        setItemToDeleteCart(id);
        setShowDeleteCartModal(true);
    };

    const confirmarBorrarCarrito = () => {
        if (itemToDeleteCart) {
            setCarrito(carrito.filter(item => item.id !== itemToDeleteCart));
            setShowDeleteCartModal(false);
            setItemToDeleteCart(null);
        }
    };

    // --- Buscador ---
    const clientesFiltrados = listaClientes.filter(cliente => {
        const nombreCompleto = `${cliente.first_name} ${cliente.last_name} ${cliente.username}`.toLowerCase();
        return nombreCompleto.includes(busquedaCliente.toLowerCase());
    });

    const seleccionarCliente = (id, nombreMostrar) => {
        setClienteSeleccionado(id);
        setBusquedaCliente(nombreMostrar);
        setMostrarDropdown(false);
    };

    const abrirEditar = (producto) => {
        setProductoAEditar(producto);
        setMostrarModalEdit(true);
    };

    const agregarAlCarrito = (producto, cantidad) => {
        const existe = carrito.find(item => item.id === producto.id);
        const actual = existe ? existe.cantidad : 0;
        if (actual + cantidad > producto.stock) { 
            // ALERTA DE STOCK PERSONALIZADA
            setErrorTitle("Stock Insuficiente");
            setErrorMessage("No hay suficientes productos en el inventario.");
            setShowErrorModal(true);
            return; 
        }

        if (existe) {
            setCarrito(carrito.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + cantidad } : item));
        } else {
            setCarrito([...carrito, { id: producto.id, nombre: producto.nombre, precio: parseFloat(producto.precio), cantidad }]);
        }
    };

    const procesarVenta = async () => {
        // CAMBIO 1: Modal si el carrito está vacío
        if (carrito.length === 0) {
            setErrorTitle("Carrito Vacío");
            setErrorMessage("Agrega productos antes de cobrar.");
            setShowErrorModal(true);
            return;
        }
        
        const total = calcularTotal();
        if (metodoPago === 'EFECTIVO') {
            if (!montoRecibido || parseFloat(montoRecibido) < total) {
                // CAMBIO 2: Modal si falta dinero
                setErrorTitle("Pago Insuficiente");
                setErrorMessage("El monto recibido es menor al total.");
                setShowErrorModal(true);
                return;
            }
        }

        setIsLoading(true);
        const token = localStorage.getItem('token');
        const data = {
            cliente_id: clienteSeleccionado || null,
            metodo_pago: metodoPago,
            total: total,
            productos: carrito.map(i => ({ id: i.id, cantidad: i.cantidad, nombre: i.nombre, precio: i.precio })),
            monto_recibido: metodoPago === 'EFECTIVO' ? parseFloat(montoRecibido) : total 
        };

        try {
            const res = await fetch(`${API_URL}/api/crear-venta/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                let mensajeExtra = clienteSeleccionado ? "\n📧 Ticket enviado." : "";
                
                if (metodoPago === 'EFECTIVO') {
                    setSuccessMessage("¡Venta registrada correctamente!" + mensajeExtra);
                    setSuccessSubMessage(`💰 Cambio: $${cambio.toFixed(2)}`);
                } else {
                    setSuccessMessage("¡Venta registrada correctamente!" + mensajeExtra);
                    setSuccessSubMessage("");
                }
                setShowSuccessModal(true);

                setCarrito([]);
                setMontoRecibido('');
                setClienteSeleccionado('');
                setBusquedaCliente('');
                cargarDatos();
                setRecargarHistorial(prev => prev + 1);
            } else { 
                const err = await res.json();
                setErrorTitle("Error");
                setErrorMessage(err.error || "Error desconocido al procesar venta.");
                setShowErrorModal(true);
            }
        } catch (e) { 
            console.error(e);
            setErrorTitle("Error");
            setErrorMessage("Error al conectar con el servidor.");
            setShowErrorModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Estilos
    const s = {
        container: { padding: '20px', background: '#0f172a', minHeight: '100vh', color: 'white' },
        header: { textAlign: 'center', color: '#38bdf8', fontSize: '2.5rem', marginBottom: '30px', fontWeight: 'bold', textTransform: 'uppercase' },
        grid: { display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px' },
        prodGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
        ticket: { background: '#1e293b', padding: '20px', borderRadius: '12px', height: 'fit-content', border: '1px solid #334155', position: 'sticky', top: '20px', overflow: 'visible' },
        total: { fontSize: '2rem', textAlign: 'right', color: '#4ade80', fontWeight: 'bold', margin: '20px 0' },
        btnPay: { width: '100%', padding: '15px', background: 'linear-gradient(to right, #2563eb, #06b6d4)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }
    };

    return (
        <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white">
            
            <ConfirmModal 
                isOpen={showDeleteProductModal}
                onClose={() => setShowDeleteProductModal(false)}
                onConfirm={ejecutarEliminacionDB}
                title="¿Eliminar Producto?"
                message="Esta acción eliminará el producto del inventario permanentemente."
            />

            <ConfirmModal 
                isOpen={showDeleteCartModal}
                onClose={() => setShowDeleteCartModal(false)}
                onConfirm={confirmarBorrarCarrito}
                title="¿Quitar del carrito?"
                message="¿Estás seguro de que quieres quitar este producto de la venta actual?"
            />

            <SuccessModal 
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="¡Venta Exitosa!"
                message={successMessage}
                subMessage={successSubMessage}
            />

            {/* MODAL DE ERROR / ADVERTENCIA  */}
            <ErrorModal 
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title={errorTitle}
                message={errorMessage}
            />

            <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500 uppercase">
                Punto de Venta
            </h1>
            
            <div className="text-center mb-8">
                <button onClick={() => setMostrarModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-6 rounded-lg font-bold shadow-lg hover:shadow-emerald-500/20 transition-all transform hover:-translate-y-1">
                    + NUEVO PRODUCTO
                </button>
            </div>

            <ModalNuevoProducto isOpen={mostrarModal} onClose={() => setMostrarModal(false)} onProductoCreado={cargarDatos} />
            <ModalEditarProducto isOpen={mostrarModalEdit} onClose={() => setMostrarModalEdit(false)} producto={productoAEditar} onProductoActualizado={cargarDatos} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* PRODUCTOS */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {listaProductos.map(p => (
                            <ProductoCard 
                                key={p.id} 
                                producto={p} 
                                onAgregar={agregarAlCarrito} 
                                onEditar={abrirEditar} 
                                onEliminar={confirmarEliminacionDB} 
                            />
                        ))}
                    </div>
                    {listaProductos.length === 0 && <p className="text-center text-slate-500 mt-10 text-xl italic">No hay productos disponibles.</p>}
                </div>

                {/* TICKET */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl lg:sticky lg:top-6">
                        <h3 className="text-xl font-bold text-indigo-400 border-b border-slate-700 pb-4 mb-6">Ticket de Venta</h3>
                        
                        <div className="relative mb-4" ref={dropdownRef}>
                            <label className="block text-sm font-bold text-slate-400 mb-2">Cliente:</label>
                            <input 
                                type="text"
                                placeholder="Buscar cliente..."
                                value={busquedaCliente}
                                onChange={(e) => {
                                    setBusquedaCliente(e.target.value);
                                    setMostrarDropdown(true);
                                    if(e.target.value === '') setClienteSeleccionado('');
                                }}
                                onFocus={() => setMostrarDropdown(true)}
                                className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-500"
                            />
                            {mostrarDropdown && (
                                <ul className="absolute z-50 w-full bg-slate-800 border border-slate-600 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-2xl">
                                    <li onClick={() => seleccionarCliente('', '-- Público General --')} className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 font-bold text-cyan-400">-- Público General --</li>
                                    {clientesFiltrados.map(c => {
                                        const nombreCompleto = c.first_name ? `${c.first_name} ${c.last_name}` : c.username;
                                        return (
                                            <li key={c.id} onClick={() => seleccionarCliente(c.id, nombreCompleto)} className="p-3 hover:bg-slate-700 cursor-pointer text-white border-b border-slate-700 last:border-0">
                                                <div className="font-bold">{nombreCompleto}</div>
                                                <div className="text-xs text-gray-400">Usuario: {c.username}</div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        <label className="block text-sm font-bold text-slate-400 mb-2">Pago:</label>
                        <select className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="TARJETA">Tarjeta</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                        </select>

                        {metodoPago === 'EFECTIVO' && (
                            <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-600">
                                <label className="block text-sm text-gray-400 mb-1 font-bold">Recibido ($):</label>
                                <input 
                                    type="number" 
                                    value={montoRecibido} 
                                    onChange={(e) => setMontoRecibido(e.target.value)} 
                                    className="w-full p-2 bg-slate-800 border border-slate-500 rounded text-white text-right font-mono text-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="0.00"
                                />
                                <div className="flex justify-between mt-3 pt-3 border-t border-slate-600">
                                    <span className="text-gray-300 font-bold">Cambio:</span>
                                    <span className={`text-xl font-bold ${cambio < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                                        ${cambio.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 border-t border-slate-700 pt-4 max-h-64 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {carrito.map(i => (
                                <div key={i.id} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-lg border border-slate-700/50">
                                    <div><span className="font-bold text-white mr-2">{i.cantidad}x</span> <span className="text-slate-300 text-sm">{i.nombre}</span></div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-emerald-400">${(i.precio * i.cantidad).toFixed(2)}</span>
                                        {/* Usamos pedirConfirmacionCarrito en lugar de borrar directo */}
                                        <button onClick={() => pedirConfirmacionCarrito(i.id)} className="text-red-400 hover:text-red-200 font-bold">✕</button>
                                    </div>
                                </div>
                            ))}
                            {carrito.length === 0 && <p className="text-center text-slate-500 py-4 italic">Carrito vacío</p>}
                        </div>

                        <div style={s.total}>Total: ${calcularTotal().toFixed(2)}</div>
                        
                        <p className="text-right text-slate-400 text-xs mb-4">(IVA Incluido)</p>
                        
                        <button 
                            style={s.btnPay} 
                            onClick={procesarVenta}
                            disabled={isLoading}
                            className={`${isLoading ? 'opacity-70 cursor-not-allowed' : ''} flex justify-center items-center gap-2`}
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
                                "COBRAR"
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <HistorialVentas reloadTrigger={recargarHistorial} />
        </div>
    );
}

export default PuntoDeVenta;