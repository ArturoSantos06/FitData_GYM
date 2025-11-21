import React, { useState, useEffect, useRef } from 'react';
import ProductoCard from './ProductoCard';
import ModalNuevoProducto from './ModalNuevoProducto';
import ModalEditarProducto from './ModalEditarProducto';
import HistorialVentas from './HistorialVentas';

function PuntoDeVenta() {
    const [listaProductos, setListaProductos] = useState([]);
    const [listaClientes, setListaClientes] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [metodoPago, setMetodoPago] = useState('EFECTIVO');
    
    const [mostrarModal, setMostrarModal] = useState(false);
    const [mostrarModalEdit, setMostrarModalEdit] = useState(false);
    const [productoAEditar, setProductoAEditar] = useState(null);
    const [recargarHistorial, setRecargarHistorial] = useState(0);

    // --- ESTADOS DEL BUSCADOR ---
    const [clienteSeleccionado, setClienteSeleccionado] = useState('');
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

    const clientesFiltrados = listaClientes.filter(cliente => {
        const nombreCompleto = `${cliente.first_name} ${cliente.last_name} ${cliente.username}`.toLowerCase();
        return nombreCompleto.includes(busquedaCliente.toLowerCase());
    });

    const seleccionarCliente = (id, nombreMostrar) => {
        setClienteSeleccionado(id);
        setBusquedaCliente(nombreMostrar);
        setMostrarDropdown(false);
    };

    const eliminarProductoDB = async (id) => {
        if (window.confirm("¿Seguro que quieres eliminar este producto?")) {
            const token = localStorage.getItem('token');
            try {
                await fetch(`${API_URL}/api/productos/${id}/`, { method: 'DELETE', headers: { 'Authorization': `Token ${token}` } });
                cargarDatos();
            } catch (error) { alert("Error al eliminar"); }
        }
    };

    const abrirEditar = (producto) => {
        setProductoAEditar(producto);
        setMostrarModalEdit(true);
    };

    const agregarAlCarrito = (producto, cantidad) => {
        const existe = carrito.find(item => item.id === producto.id);
        const actual = existe ? existe.cantidad : 0;
        if (actual + cantidad > producto.stock) { alert("Stock insuficiente"); return; }

        if (existe) {
            setCarrito(carrito.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + cantidad } : item));
        } else {
            setCarrito([...carrito, { id: producto.id, nombre: producto.nombre, precio: parseFloat(producto.precio), cantidad }]);
        }
    };

    const eliminarDelCarrito = (id) => { setCarrito(carrito.filter(item => item.id !== id)); };
    const calcularTotal = () => { return carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0); };

    const procesarVenta = async () => {
        if (carrito.length === 0) return alert("Carrito vacío");
        const token = localStorage.getItem('token');
        const data = {
            cliente_id: clienteSeleccionado || null,
            metodo_pago: metodoPago,
            total: calcularTotal(),
            productos: carrito.map(i => ({ id: i.id, cantidad: i.cantidad, nombre: i.nombre, precio: i.precio }))
        };

        try {
            const res = await fetch(`${API_URL}/api/crear-venta/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert("¡Venta Exitosa! 🛒");
                setCarrito([]);
                setClienteSeleccionado('');
                setBusquedaCliente('');
                cargarDatos();
                setRecargarHistorial(prev => prev + 1);
            } else { 
                const err = await res.json();
                alert("Error: " + (err.error || "Desconocido")); 
            }
        } catch (e) { console.error(e); }
    };

    return (
        // Contenedor Principal con Tailwind
        <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white">
            
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase tracking-widest">
                Punto de Venta
            </h1>
            
            <div className="text-center mb-8">
                <button 
                    onClick={() => setMostrarModal(true)} 
                    className="bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-6 rounded-lg font-bold shadow-lg hover:shadow-emerald-500/20 transition-all transform hover:-translate-y-1"
                >
                    + NUEVO PRODUCTO
                </button>
            </div>

            <ModalNuevoProducto isOpen={mostrarModal} onClose={() => setMostrarModal(false)} onProductoCreado={cargarDatos} />
            <ModalEditarProducto isOpen={mostrarModalEdit} onClose={() => setMostrarModalEdit(false)} producto={productoAEditar} onProductoActualizado={cargarDatos} />


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {listaProductos.map(p => (
                            <ProductoCard key={p.id} producto={p} onAgregar={agregarAlCarrito} onEditar={abrirEditar} onEliminar={eliminarProductoDB} />
                        ))}
                    </div>
                    {listaProductos.length === 0 && (
                        <p className="text-center text-slate-500 mt-10 text-xl italic">No hay productos disponibles.</p>
                    )}
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl lg:sticky lg:top-6">
                        <h3 className="text-xl font-bold text-indigo-400 border-b border-slate-700 pb-4 mb-6">Ticket de Venta</h3>
                        
                        {/* Buscador de Clientes */}
                        <div className="relative mb-6" ref={dropdownRef}>
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
                                    {clientesFiltrados.length === 0 && <li className="p-3 text-gray-500 text-center italic">No se encontraron clientes</li>}
                                </ul>
                            )}
                        </div>

                        {/* Método de Pago */}
                        <label className="block text-sm font-bold text-slate-400 mb-2">Pago:</label>
                        <select 
                            className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none mb-6"
                            value={metodoPago} 
                            onChange={e => setMetodoPago(e.target.value)}
                        >
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="TARJETA">Tarjeta</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                        </select>

                        {/* Lista del Carrito */}
                        <div className="border-t border-slate-700 pt-4 max-h-64 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {carrito.length === 0 && (
                                <p className="text-center text-slate-500 py-8 italic">El carrito está vacío</p>
                            )}
                            {carrito.map(i => (
                                <div key={i.id} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-lg border border-slate-700/50">
                                    <div>
                                        <span className="font-bold text-white mr-2">{i.cantidad}x</span> 
                                        <span className="text-slate-300 text-sm">{i.nombre}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-emerald-400">${(i.precio * i.cantidad).toFixed(2)}</span>
                                        <button onClick={() => eliminarDelCarrito(i.id)} className="text-red-400 hover:text-red-200 font-bold text-lg transition-colors">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total y Botón */}
                        <div className="mt-6 border-t border-slate-700 pt-4">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-slate-400 text-sm uppercase font-bold">Total a Pagar</span>
                                <span className="text-3xl font-extrabold text-emerald-400">${calcularTotal().toFixed(2)}</span>
                            </div>
                            
                            <button 
                                onClick={procesarVenta}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg transform active:scale-95 transition-all"
                            >
                                COBRAR VENTA
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Historial */}
            <HistorialVentas reloadTrigger={recargarHistorial} />
        </div>
    );
}

export default PuntoDeVenta;