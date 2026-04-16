import React, { useState } from 'react';
import ConfirmModal from './ConfirmModal';
import { createProduct, uploadProductImage } from '../firebase';

const ModalNuevoProducto = ({ isOpen, onClose, onProductoCreado }) => {
    const [nuevoProd, setNuevoProd] = useState({ nombre: '', precio: '', stock: '', imagen: null });
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState('');
    const [, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        if ((name === 'precio' || name === 'stock') && value < 0) return;
        setNuevoProd({ ...nuevoProd, [name]: value });
    };

    const handleFileChange = (e) => setNuevoProd({ ...nuevoProd, imagen: e.target.files[0] });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setShowError('');
        
        try {
            // --- INICIO CÓDIGO NUEVO GYM-POINTS ---
            const precioNormal = parseFloat(nuevoProd.precio);
            const precioPuntos = precioNormal * 2;
            // --- FIN CÓDIGO NUEVO GYM-POINTS ---

            // 1. Crear producto primero
            const productResult = await createProduct({
                nombre: nuevoProd.nombre,
                precio: precioNormal,
                // --- INICIO CÓDIGO NUEVO GYM-POINTS ---
                precioPuntos: precioPuntos,
                // --- FIN CÓDIGO NUEVO GYM-POINTS ---
                stock: parseInt(nuevoProd.stock),
                imagen: null 
            });
            
            if (!productResult.success) {
                throw new Error(productResult.error || 'Error al crear producto');
            }
            
            // 2. Si hay imagen, subirla
            let imagenUrl = null;
            if (nuevoProd.imagen) {
                console.log('📷 Subiendo imagen:', nuevoProd.imagen.name);
                const uploadResult = await uploadProductImage(nuevoProd.imagen, productResult.id);
                
                if (!uploadResult.success) {
                    throw new Error(`Error al subir imagen: ${uploadResult.error}`);
                }
                
                imagenUrl = uploadResult.url;
                console.log('✅ Imagen subida correctamente');
            }
            
            // 3. Actualizar producto con URL de imagen si fue subida
            if (imagenUrl) {
                const { updateProduct } = await import('../firebase');
                await updateProduct(productResult.id, { 
                    imagen: imagenUrl,
                    image: imagenUrl 
                });
            }
            
            setShowSuccess(true);
            onProductoCreado();
            setNuevoProd({ nombre: '', precio: '', stock: '', imagen: null });
            setTimeout(() => {
                setShowSuccess(false);
                onClose();
                setIsLoading(false);
            }, 1800);
        } catch (error) { 
            setShowError(error.message || 'Error al crear producto');
            setIsLoading(false);
        }
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
        <>
        {/* Modal de éxito estilo ConfirmModal */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-1100 p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-600 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center transform scale-100 transition-transform">
              <div className="mb-4 flex justify-center">
                <div className="bg-green-500/20 p-3 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¡Producto creado!</h3>
              <p className="text-gray-400 text-sm">Se ha agregado exitosamente</p>
            </div>
          </div>
        )}

        <div style={styles.overlay}>
            <div style={styles.modal}>
                <button style={styles.btnClose} onClick={onClose}>✕</button>
                <h2 style={{ textAlign: 'center', marginTop: 0, color: '#22c55e' }}>Nuevo Producto</h2>

                {/* Error */}
                {Boolean(showError) && (
                  <div style={{ marginBottom: '12px', background: '#7f1d1d', color: 'white', padding: '8px 10px', borderRadius: '8px' }}>
                    {showError}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                    <label style={styles.label}>Nombre:</label>
                    <input type="text" name="nombre" value={nuevoProd.nombre} onChange={handleChange} style={styles.input} required />
                    <label style={styles.label}>Precio ($):</label>
                    <input type="number" name="precio" value={nuevoProd.precio} onChange={handleChange} style={styles.input} required min="0" step="0.01" />
                    {/* --- INICIO CÓDIGO NUEVO GYM-POINTS --- */}
                    <label style={{...styles.label, color: '#fcd34d'}}>Precio en Puntos (GYM-Points):</label>
                    <input 
                        type="number" 
                        value={nuevoProd.precio ? parseFloat(nuevoProd.precio) * 2 : ''} 
                        style={{...styles.input, background: '#334155', color: '#fcd34d', cursor: 'not-allowed'}} 
                        readOnly 
                    />
                    {/* --- FIN CÓDIGO NUEVO GYM-POINTS --- */}
                    <label style={styles.label}>Stock:</label>
                    <input type="number" name="stock" value={nuevoProd.stock} onChange={handleChange} style={styles.input} required min="0" />
                    <label style={styles.label}>Imagen:</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} style={{...styles.input, padding: '5px'}} />
                    <button type="submit" style={styles.btnSave}>GUARDAR</button>
                </form>
            </div>
        </div>
        </>
    );
};
export default ModalNuevoProducto;