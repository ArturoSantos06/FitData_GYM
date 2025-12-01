import React, { useState, useEffect } from 'react';
import SuccessModal from './SuccessModal';

const ModalEditarProducto = ({ isOpen, onClose, producto, onProductoActualizado }) => {
    const [datos, setDatos] = useState({ nombre: '', precio: '', stock: '', imagen: null });
    const [showSuccess, setShowSuccess] = useState(false);
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    useEffect(() => {
        if (producto) setDatos({ nombre: producto.nombre, precio: producto.precio, stock: producto.stock, imagen: null });
    }, [producto]);

    if (!isOpen && !showSuccess) return null; 

    const handleChange = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setDatos({ ...datos, imagen: e.target.files[0] });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('nombre', datos.nombre);
        formData.append('precio', datos.precio);
        formData.append('stock', datos.stock);
        if (datos.imagen) formData.append('imagen', datos.imagen);

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/api/productos/${producto.id}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${token}` },
                body: formData
            });
            if (response.ok) {
                const diferencia = parseInt(datos.stock) - parseInt(producto.stock);
                
                if (diferencia !== 0) {
                    try {
                        await fetch(`${API_URL}/api/inventario-entradas/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
                            body: JSON.stringify({
                                producto: producto.id,
                                cantidad: Math.abs(diferencia)
                            })
                        });
                    } catch (inventoryError) {
                        console.error('Error registrando entrada de inventario:', inventoryError);
                    }
                }
                
                onProductoActualizado();
                onClose(); 
                setShowSuccess(true); 
            } else { alert("Error al actualizar"); }
        } catch (error) { console.error(error); }
    };

    // Estilos
    const styles = {
        overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' },
        modal: { background: '#1e293b', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid #334155', color: 'white', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' },
        input: { width: '100%', padding: '10px', marginBottom: '15px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px', outline: 'none' },
        label: { display: 'block', marginBottom: '5px', color: '#94a3b8', fontSize: '0.9rem' },
        btnSave: { width: '100%', padding: '12px', background: '#f59e0b', color: 'black', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
        btnClose: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem' }
    };

    return (
        <>
            {/* Renderizar formulario SOLO si está abierto */}
            {isOpen && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <button style={styles.btnClose} onClick={onClose}>✕</button>
                        <h2 style={{ textAlign: 'center', marginTop: 0, color: '#f59e0b' }}>Editar Producto</h2>
                        <form onSubmit={handleSubmit}>
                            <label style={styles.label}>Nombre:</label>
                            <input type="text" name="nombre" value={datos.nombre} onChange={handleChange} style={styles.input} />
                            <label style={styles.label}>Precio ($):</label>
                            <input type="number" name="precio" value={datos.precio} onChange={handleChange} style={styles.input} />
                            <label style={styles.label}>Stock:</label>
                            <input type="number" name="stock" value={datos.stock} onChange={handleChange} style={styles.input} />
                            <label style={styles.label}>Imagen:</label>
                            <input type="file" accept="image/*" onChange={handleFileChange} style={{...styles.input, padding: '5px'}} />
                            <button type="submit" style={styles.btnSave}>GUARDAR CAMBIOS</button>
                        </form>
                    </div>
                </div>
            )}

            <SuccessModal 
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                title="¡Actualizado!"
                message="El producto se ha modificado correctamente."
            />
        </>
    );
};

export default ModalEditarProducto;