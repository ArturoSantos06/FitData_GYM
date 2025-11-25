import React, { useState, useEffect } from 'react';

const ProductoCard = ({ producto, onAgregar, onEditar, onEliminar }) => {
    const [cantidad, setCantidad] = useState(1);
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

    const getInitialUrl = (img) => {
        if (!img) return "https://via.placeholder.com/150/1e293b/ffffff?text=Sin+Imagen";
        if (img.startsWith('http')) return img;
        return `${BASE_URL}${img}`;
    };

    const [imgSrc, setImgSrc] = useState(getInitialUrl(producto.imagen));
    useEffect(() => { setImgSrc(getInitialUrl(producto.imagen)); }, [producto.imagen]);

    const incrementar = () => { if (cantidad < producto.stock) setCantidad(cantidad + 1); };
    const decrementar = () => { if (cantidad > 1) setCantidad(cantidad - 1); };
    const handleImageError = () => { setImgSrc("https://via.placeholder.com/150/1e293b/ffffff?text=Sin+Imagen"); };

    return (
        // CARD: Padding pequeño en móvil (p-3), grande en PC (md:p-5)
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3 md:p-5 flex flex-col h-full shadow-xl relative transition-transform hover:-translate-y-1 duration-300 group overflow-hidden">
            
            {/* Botones de Acción (Ocultos en móvil para limpiar vista, visibles en PC al hacer hover o siempre visibles en móvil si prefieres) */}
            <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEditar(producto)} className="bg-slate-900/90 backdrop-blur-md border border-slate-600 p-1.5 rounded-md text-amber-400 hover:text-amber-300 shadow-lg">✏️</button>
                <button onClick={() => onEliminar(producto.id)} className="bg-slate-900/90 backdrop-blur-md border border-slate-600 p-1.5 rounded-md text-red-400 hover:text-red-300 shadow-lg">🗑️</button>
            </div>

            {/* IMAGEN: Altura ajustada. h-28 en móvil, h-40 en PC */}
            <div className="h-32 md:h-40 w-full flex justify-center items-center mb-2 md:mb-4 bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700/50 shrink-0">
                <img 
                    src={imgSrc} 
                    alt={producto.nombre} 
                    className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-110" 
                    onError={handleImageError} 
                />
            </div>

            {/* INFO: Crece para llenar espacio */}
            <div className="flex flex-col grow gap-1 mb-2 md:mb-4">
                {/* Título: Texto más chico en móvil, normal en PC */}
                <h3 className="text-sm md:text-lg font-bold text-slate-100 leading-tight line-clamp-2 h-9 md:h-12 flex items-center" title={producto.nombre}>
                    {producto.nombre}
                </h3>
                
                <div className="flex items-center justify-between">
                    {/* Precio: Ajuste de tamaño */}
                    <p className="text-lg md:text-2xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-cyan-400">
                        ${parseFloat(producto.precio).toFixed(2)}
                    </p>
                    <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-md whitespace-nowrap ${
                        producto.stock > 0 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                        Stock: {producto.stock}
                    </span>
                </div>
            </div>

            {/* CONTROLES: Pegados al fondo */}
            <div className="mt-auto pt-2 md:pt-3 border-t border-slate-700/50 grid grid-cols-[auto_1fr] gap-2 items-center w-full">
                
                {/* Contador: Altura h-8 en móvil, h-10 en PC */}
                <div className="flex items-center border border-slate-600 rounded-lg bg-slate-900 h-9 md:h-10 shadow-inner w-fit">
                    <button onClick={decrementar} className="px-2 md:px-3 h-full text-base md:text-xl text-slate-400 hover:text-white hover:bg-slate-800 rounded-l-lg">-</button>
                    <span className="w-6 md:w-8 text-center font-bold text-white text-xs md:text-sm">{cantidad}</span>
                    <button onClick={incrementar} className="px-2 md:px-3 h-full text-base md:text-xl text-slate-400 hover:text-white hover:bg-slate-800 rounded-r-lg">+</button>
                </div>

                {/* Botón Agregar: Tamaño de texto y altura responsivos */}
                <button
                    onClick={() => onAgregar(producto, cantidad)}
                    disabled={producto.stock === 0}
                    className={`h-9 md:h-10 px-2 rounded-lg font-bold text-white text-[10px] md:text-xs uppercase tracking-wide shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-1 w-full
                        ${producto.stock === 0 
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                            : 'bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500'
                        }`}
                >
                    Agregar
                </button>
            </div>
        </div>
    );
};

export default ProductoCard;