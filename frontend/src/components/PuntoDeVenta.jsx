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
        <div style={s.container}>
            <h1 style={s.header}>Punto de Venta</h1>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button onClick={() => setMostrarModal(true)} style={{ background: '#22c55e', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>+ NUEVO PRODUCTO</button>
            </div>

            <ModalNuevoProducto isOpen={mostrarModal} onClose={() => setMostrarModal(false)} onProductoCreado={cargarDatos} />
            <ModalEditarProducto isOpen={mostrarModalEdit} onClose={() => setMostrarModalEdit(false)} producto={productoAEditar} onProductoActualizado={cargarDatos} />

            <div style={s.grid}>
                <div>
                    <div style={s.prodGrid}>
                        {listaProductos.map(p => (
                            <ProductoCard key={p.id} producto={p} onAgregar={agregarAlCarrito} onEditar={abrirEditar} onEliminar={eliminarProductoDB} />
                        ))}
                    </div>
                </div>

                <div style={s.ticket}>
                    <h3 style={{ borderBottom: '1px solid #475569', paddingBottom: '10px', color: '#a5b4fc', marginTop: 0 }}>Ticket de Venta</h3>
                    
                    <div className="relative mb-4" ref={dropdownRef}>
                        <label style={{ display: 'block', marginTop: '15px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '5px' }}>Cliente:</label>
                        
                        <input 
                            type="text"
                            placeholder="Buscar cliente por nombre..."
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
                                {/* CORREGIDO: Quitamos text-white para que solo sea cyan */}
                                <li 
                                    onClick={() => seleccionarCliente('', '-- Público General --')}
                                    className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 font-bold text-cyan-400"
                                >
                                    -- Público General --
                                </li>

                                {clientesFiltrados.map(c => {
                                    const nombreCompleto = c.first_name ? `${c.first_name} ${c.last_name}` : c.username;
                                    return (
                                        <li 
                                            key={c.id} 
                                            onClick={() => seleccionarCliente(c.id, nombreCompleto)}
                                            className="p-3 hover:bg-slate-700 cursor-pointer text-white border-b border-slate-700 last:border-0"
                                        >
                                            <div className="font-bold">{nombreCompleto}</div>
                                            <div className="text-xs text-gray-400">Usuario: {c.username}</div>
                                        </li>
                                    );
                                })}
                                {clientesFiltrados.length === 0 && <li className="p-3 text-gray-500 text-center italic">No se encontraron clientes</li>}
                            </ul>
                        )}
                    </div>

                    <label style={{ display: 'block', marginTop: '15px', color: '#94a3b8', fontWeight: 'bold' }}>Pago:</label>
                    <select style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', border: '1px solid #475569', borderRadius: '6px', marginTop: '5px' }} value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TARJETA">Tarjeta</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                    </select>

                    <div style={{ marginTop: '25px', maxHeight: '350px', overflowY: 'auto', paddingRight: '5px' }}>
                        {carrito.map(i => (
                            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #334155', alignItems: 'center' }}>
                                <div>
                                    <strong style={{color: '#e2e8f0'}}>{i.cantidad}x</strong> 
                                    <span style={{marginLeft: '10px', color: '#94a3b8'}}>{i.nombre}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontWeight: 'bold', color: 'white' }}>${(i.precio * i.cantidad).toFixed(2)}</span>
                                    <button onClick={() => eliminarDelCarrito(i.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', padding: '0 5px' }}>✕</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={s.total}>Total: ${calcularTotal().toFixed(2)}</div>
                    <button style={s.btnPay} onClick={procesarVenta}>COBRAR</button>
                </div>
            </div>

            <HistorialVentas reloadTrigger={recargarHistorial} />
        </div>
    );
}

export default PuntoDeVenta;