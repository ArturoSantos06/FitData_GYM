import React, { useState, useEffect } from 'react';

function UserMembershipList({ refreshTrigger }) {
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortBy, setSortBy] = useState('recent'); 

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const fetchAssignments = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/user-memberships/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      if (!response.ok) throw new Error('Error al cargar asignaciones');
      const data = await response.json();
      setAssignments(data.results || data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [refreshTrigger]);


  // 1. Primero Filtramos (Buscador)
  const filteredAssignments = assignments.filter(item => {
    const search = searchTerm.toLowerCase();
    const estado = item.is_active ? 'activo' : 'vencido';
    const nombreCompleto = item.user_full_name ? item.user_full_name.toLowerCase() : '';
    const userId = item.user ? item.user.toString() : '';
    
    return (
        item.user_name.toLowerCase().includes(search) ||
        nombreCompleto.includes(search) ||
        item.membership_name.toLowerCase().includes(search) ||
        estado.includes(search) ||
        userId.includes(search)
    );
  });

  // 2. Después Ordenamos (Según lo que elijas en el select)
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    if (sortBy === 'name') {
      return a.user_name.localeCompare(b.user_name);
    } 
    if (sortBy === 'expiration') {
      return new Date(a.end_date) - new Date(b.end_date);
    }
    return new Date(b.start_date) - new Date(a.start_date);
  });

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-xl mt-6 border-t-4 border-teal-500 text-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-teal-400 to-green-400">
          Estado de Membresías
        </h2>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
            
            <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full md:w-auto bg-slate-900 border border-slate-600 text-white rounded-lg py-2 px-4 focus:outline-none focus:border-teal-500 cursor-pointer text-sm"
            >
                <option value="recent">📅 Más Recientes</option>
                <option value="name">🔤 Alfabético (A-Z)</option>
                <option value="expiration">⚠️ Próximos a Vencer</option>
            </select>

            {/* BUSCADOR */}
            <div className="relative w-full md:w-64">
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg py-2 px-4 pl-10 focus:outline-none focus:border-teal-500 transition-colors placeholder-slate-500 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
            </div>

            <button 
              onClick={fetchAssignments}
              className="text-teal-400 hover:text-teal-300 hover:bg-slate-700 p-2 rounded-lg transition-colors border border-slate-600"
              title="Actualizar lista"
            >
              🔄
            </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-700 text-left text-gray-300 uppercase text-sm leading-normal">
              <th className="py-3 px-6 border-b border-gray-600">ID</th>
              <th className="py-3 px-6 border-b border-gray-600">Usuario</th>
              <th className="py-3 px-6 border-b border-gray-600">Membresía</th>
              <th className="py-3 px-6 border-b border-gray-600">Inicio</th>
              <th className="py-3 px-6 border-b border-gray-600">Vencimiento</th>
              <th className="py-3 px-6 text-center border-b border-gray-600">Estado</th>
            </tr>
          </thead>
          <tbody className="text-gray-200 text-sm font-light">
            {sortedAssignments.map((item) => (
              <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700 transition-colors">
                <td className="py-3 px-6">
                  <span className="font-mono text-teal-400 font-semibold">{item.user}</span>
                </td>
                <td className="py-3 px-6 text-left">
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-sm">{item.user_name}</span>
                    {item.user_full_name && (
                      <span className="text-xs text-gray-400 uppercase tracking-wide">
                        {item.user_full_name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-6">
                  {item.membership_name}
                </td>
                <td className="py-3 px-6">
                  {item.start_date}
                </td>
                <td className="py-3 px-6 font-mono text-slate-300">
                  {item.end_date}
                </td>
                <td className="py-3 px-6 text-center">
                  <span
                    className={`py-1 px-3 rounded-full text-xs font-bold ${
                      item.is_active
                        ? 'bg-green-700 text-green-100 border border-green-500'
                        : 'bg-red-700 text-red-100 border border-red-500'
                    }`}
                  >
                    {item.is_active ? 'ACTIVO' : 'VENCIDO'}
                  </span>
                </td>
              </tr>
            ))}
            
            {sortedAssignments.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-500 italic">
                  {searchTerm ? 'No se encontraron resultados.' : 'No hay membresías asignadas.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserMembershipList;