import React, { useState, useEffect } from 'react';

// --- MODAL DE TÉRMINOS ---
const TermsModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-2xl w-full shadow-2xl relative max-h-[80vh] overflow-y-auto custom-scrollbar">
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl transition-colors">✕</button>
      
      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400 mb-6">
        Términos y Condiciones
      </h3>

      <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <h4 className="text-lg font-bold text-white mb-2">1. Membresía FullData (Anual)</h4>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>Acceso los 365 días del año.</li>
            <li>Locker personalizado</li>
            <li>Una Agua gratis a la semana</li>
            <li>Atención prioritaria</li>
          </ul>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <h4 className="text-lg font-bold text-white mb-2">2. Membresía Flex (Mensual)</h4>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>Acceso ilimitado por 30 días.</li>
            <li>Locker durante entrenamiento.</li>
          </ul>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <h4 className="text-lg font-bold text-white mb-2">3. Membresía Study (Estudiantes)</h4>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>Requiere credencial vigente.</li>
            <li>Acceso ilimitado por 30 días.</li>
            <li>Locker durante entrenamiento.</li>
          </ul>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          <h4 className="text-lg font-bold text-white mb-2">4. Day Pass (Visita)</h4>
          <ul className="list-disc list-inside space-y-1 text-slate-400">
            <li>Acceso único por un día.</li>
            <li>Vence a las 10:00 PM.</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded-full transition-colors">
          Cerrar
        </button>
      </div>
    </div>
  </div>
);

function MembershipAdmin() {
  const [memberships, setMemberships] = useState([]);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showTerms, setShowTerms] = useState(false);
  

  const [activeCardId, setActiveCardId] = useState(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    try {
      const response = await fetch(`${API_URL}/api/memberships/`);
      if (!response.ok) throw new Error('Error al cargar datos');
      const data = await response.json();
      setMemberships(data);
    } catch (error) { console.error('Error:', error); }
  };

  const getImageUrl = (imgPath) => {
    if (!imgPath) return null;
    if (imgPath.startsWith('http')) return imgPath;
    return `${API_URL}${imgPath}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('duration_days', duration);
    if (image) formData.append('image', image);

    const isEditing = editingId !== null;
    const url = isEditing ? `${API_URL}/api/memberships/${editingId}/` : `${API_URL}/api/memberships/`;
    const method = isEditing ? 'PATCH' : 'POST';
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Token ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Error al guardar');
      const savedData = await response.json();

      if (isEditing) {
        setMemberships(memberships.map((m) => (m.id === editingId ? savedData : m)));
      } else {
        setMemberships([...memberships, savedData]);
      }
      handleCancel();
    } catch (error) { console.error('Error:', error); alert("Error al guardar."); }
  };

  const handleEdit = (membership, e) => {
    e.stopPropagation(); 
    setName(membership.name);
    setPrice(membership.price);
    setDuration(membership.duration_days);
    setImage(null);
    setPreviewUrl(getImageUrl(membership.image));
    setEditingId(membership.id);
    setActiveCardId(null); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Borrar membresía?')) return;
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/api/memberships/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });
      setMemberships(memberships.filter((m) => m.id !== id));
    } catch (error) { console.error(error); }
  };

  const handleCancel = () => {
    setName('');
    setPrice('');
    setDuration('');
    setImage(null);
    setPreviewUrl(null);
    setEditingId(null);
  };

  // Función para manejar el clic en la tarjeta
  const handleCardClick = (id) => {
    if (activeCardId === id) {
      setActiveCardId(null); 
    } else {
      setActiveCardId(id); 
    }
  };

  const isEditing = editingId !== null;

  return (
    <div className="relative" onClick={() => setActiveCardId(null)}> 
    
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-4 bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700 h-fit lg:sticky lg:top-6 z-10" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400">
            {isEditing ? 'Editar Membresía' : 'Nueva Membresía'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Mensual Full" required />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Precio ($)</label>
                <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Días</label>
                <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Imagen de la Tarjeta</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-gray-900 border border-gray-600 rounded-lg" />
            </div>

            {previewUrl && (
              <div className="relative w-full aspect-video flex items-center justify-center mt-2 rounded-xl overflow-hidden border border-gray-700 bg-black">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-linear-to-r from-purple-600 to-blue-600 text-white font-bold py-3 rounded-lg hover:opacity-90 transition-all shadow-lg">
                  {isEditing ? 'Guardar' : 'Crear'}
              </button>
              {isEditing && (
                <button type="button" onClick={handleCancel} className="px-4 bg-gray-700 text-gray-300 font-bold rounded-lg hover:bg-gray-600">✕</button>
              )}
            </div>
          </form>
        </div>

        {/* COLUMNA DERECHA: LISTA DE TARJETAS */}
        <div className="lg:col-span-8">
          <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Membresías Activas</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {memberships.map((membership) => (
              <div 
                key={membership.id}
                onClick={(e) => {
                    e.stopPropagation(); 
                    handleCardClick(membership.id);
                }}
                className="group w-full aspect-video relative rounded-xl overflow-hidden shadow-2xl cursor-pointer bg-black border border-gray-800 transition-transform hover:-translate-y-1"
              >
                {/* Imagen */}
                {membership.image ? (
                    <img 
                      src={getImageUrl(membership.image)} 
                      alt={membership.name} 
                      className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">Sin Imagen</div>
                )}

                <div 
                    className={`absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 transition-opacity duration-300 
                    ${activeCardId === membership.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100 md:group-hover:opacity-100'}`} 

                >
                    <div className="text-center px-4">
                      <h3 className="text-white font-bold text-lg uppercase tracking-widest mb-1">{membership.name}</h3>
                      <p className="text-cyan-400 font-bold text-xl">${membership.price}</p>
                    </div>
                    
                    <div className="flex gap-3 mt-2">
                      <button onClick={(e) => handleEdit(membership, e)} className="px-5 py-2 bg-amber-500 text-black font-bold rounded-full hover:bg-amber-400 transition-all shadow-lg text-sm">
                        Editar
                      </button>
                      <button onClick={(e) => handleDelete(membership.id, e)} className="px-5 py-2 bg-red-600 text-white font-bold rounded-full hover:bg-red-500 transition-all shadow-lg text-sm">
                        Borrar
                      </button>
                    </div>
                    
                    {/* Indicador visual para móvil */}
                    <p className="text-[10px] text-gray-500 mt-2 md:hidden">(Toca de nuevo para cerrar)</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
             <button 
                onClick={(e) => { e.stopPropagation(); setShowTerms(true); }}
                className="text-gray-500 hover:text-cyan-400 text-sm underline transition-colors cursor-pointer inline-flex items-center gap-2"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               Ver Términos y Condiciones de Membresías 
             </button>
          </div>

        </div>
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

    </div>
  );
}

export default MembershipAdmin;