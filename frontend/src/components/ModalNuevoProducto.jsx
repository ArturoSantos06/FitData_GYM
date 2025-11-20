import React, { useState } from 'react';

const ModalNuevoProducto = ({ isOpen, onClose, onProductoCreado }) => {
    const [nuevoProd, setNuevoProd] = useState({ nombre: '', precio: '', stock: '', imagen: null });
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        if ((name === 'precio' || name === 'stock') && value < 0) return;
        setNuevoProd({ ...nuevoProd, [name]: value });
    };

    const handleFileChange = (e) => setNuevoProd({ ...nuevoProd, imagen: e.target.files[0] });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('nombre', nuevoProd.nombre);
        formData.append('precio', nuevoProd.precio);
        formData.append('stock', nuevoProd.stock);
        if (nuevoProd.imagen) formData.append('imagen', nuevoProd.imagen);

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/api/productos/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${token}` }, // IMPORTANTE: Token
                body: formData
            });
            if (response.ok) {
                alert("¡Producto creado!");
                onProductoCreado();
                onClose();
                setNuevoProd({ nombre: '', precio: '', stock: '', imagen: null });
            } else {
                alert("Error al crear producto");
            }
        } catch (error) { console.error(error); }
    };

    // Estilos oscuros
    const styles = {
        overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' },
        modal: { background: '#1e293b', padding: '30px', borderRadius: '12px', width: '400px', border: '1px solid #334155', color: 'white', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' },
        input: { width: '100%', padding: '10px', marginBottom: '15px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '6px', outline: 'none' },
        label: { display: 'block', marginBottom: '5px', color: '#94a3b8', fontSize: '0.9rem' },
        btnSave: { width: '100%', padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
        btnClose: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.5rem' }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <button style={styles.btnClose} onClick={onClose}>✕</button>
                <h2 style={{ textAlign: 'center', marginTop: 0, color: '#22c55e' }}>Nuevo Producto</h2>
                <form onSubmit={handleSubmit}>
                    <label style={styles.label}>Nombre:</label>
                    <input type="text" name="nombre" onChange={handleChange} style={styles.input} required />
                    <label style={styles.label}>Precio ($):</label>
                    <input type="number" name="precio" onChange={handleChange} style={styles.input} required min="0" step="0.01" />
                    <label style={styles.label}>Stock:</label>
                    <input type="number" name="stock" onChange={handleChange} style={styles.input} required min="0" />
                    <label style={styles.label}>Imagen:</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{...styles.input, padding: '5px'}} />
                    <button type="submit" style={styles.btnSave}>GUARDAR</button>
                </form>
            </div>
        </div>
    );
};
export default ModalNuevoProducto;