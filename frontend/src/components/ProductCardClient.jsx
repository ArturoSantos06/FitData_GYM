import React from 'react';
import { ShoppingBag } from 'lucide-react';

const ProductCardClient = ({ title, price, stock, image }) => {
  const hasStock = (stock || 0) > 0;
  const displayPrice = typeof price === 'number' ? price.toFixed(2) : parseFloat(price || 0).toFixed(2);

  return (
    <div className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 hover:border-slate-600 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1">
      <div className="absolute top-3 right-3 z-10">
        {hasStock ? (
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-500/20 backdrop-blur-md">
            {stock} DISPONIBLES
          </span>
        ) : (
          <span className="bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-1 rounded-full border border-red-500/20 backdrop-blur-md">
            AGOTADO
          </span>
        )}
      </div>

      <div className="aspect-square bg-slate-800 relative overflow-hidden">
        {image ? (
          <img src={image} alt={title} className={`w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110 ${!hasStock ? 'grayscale opacity-50' : ''}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-800/50">
            <div className="w-16 h-16 opacity-20"><ShoppingBag size={64} /></div>
          </div>
        )}

        {hasStock && (
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <button className="bg-white text-slate-900 rounded-full p-3 transform scale-0 group-hover:scale-100 transition-transform duration-300 shadow-lg hover:bg-cyan-50">
              <ShoppingBag size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <h4 className="text-slate-200 font-bold text-sm mb-1 line-clamp-2 group-hover:text-cyan-400 transition-colors min-h-[40px]">{title}</h4>
        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Precio</span>
            <span className="text-lg font-black text-white">${displayPrice}</span>
          </div>
          <button disabled={!hasStock} className={`md:hidden rounded-lg p-2 transition-colors ${hasStock ? 'bg-slate-800 text-cyan-400 hover:bg-cyan-500/10' : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'}`}>
            <ShoppingBag size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCardClient;
