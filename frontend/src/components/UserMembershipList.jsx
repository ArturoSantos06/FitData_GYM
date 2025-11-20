import React, { useState, useEffect } from 'react';

function UserMembershipList() {
  const [assignments, setAssignments] = useState([]);
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
  }, []);

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-xl mt-6 border-t-4 border-teal-500 text-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-teal-400 to-green-400">Estado de Membresías Asignadas</h2>
        <button 
          onClick={fetchAssignments}
          className="text-sm text-teal-400 hover:text-teal-300 font-semibold transition-colors"
        >
          🔄 Actualizar
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-700 text-left text-gray-300 uppercase text-sm leading-normal">
              <th className="py-3 px-6 border-b border-gray-600">Usuario</th>
              <th className="py-3 px-6 border-b border-gray-600">Membresía</th>
              <th className="py-3 px-6 border-b border-gray-600">Inicio</th>
              <th className="py-3 px-6 border-b border-gray-600">Vencimiento</th>
              <th className="py-3 px-6 text-center border-b border-gray-600">Estado</th>
            </tr>
          </thead>
          <tbody className="text-gray-200 text-sm font-light">
            {assignments.map((item) => (
              <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700 transition-colors">
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
                <td className="py-3 px-6">
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
            
            {assignments.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-gray-400">
                  No hay membresías asignadas aún.
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