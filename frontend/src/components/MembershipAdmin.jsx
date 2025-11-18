import React, { useState, useEffect } from 'react';

function MembershipAdmin() {
  const [memberships, setMemberships] = useState([]);
  
  // --- Estados para el formulario ---
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [editingId, setEditingId] = useState(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Carga las membresías existentes al iniciar
  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    try {
      const response = await fetch(`${API_URL}/api/memberships/`);
      if (!response.ok) throw new Error('Error al cargar datos');
      const data = await response.json();
      setMemberships(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const membershipData = {
      name: name,
      price: price,
      duration_days: parseInt(duration),
    };

    const isEditing = editingId !== null;
    const url = isEditing
      ? `${API_URL}/api/memberships/${editingId}/`
      : `${API_URL}/api/memberships/`;
    
    const method = isEditing ? 'PUT' : 'POST';
    
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`, 
        },
        body: JSON.stringify(membershipData),
      });

      if (!response.ok) throw new Error('Error al guardar la membresía');

      const savedData = await response.json();

      if (isEditing) {
        setMemberships(
          memberships.map((m) => (m.id === editingId ? savedData : m))
        );
      } else {
        setMemberships([...memberships, savedData]);
      }

      handleCancel();
      
    } catch (error) {
      console.error('Error al enviar:', error);
      alert("Error: No tienes permiso para realizar esta acción o los datos son inválidos.");
    }
  };

  const handleEdit = (membership) => {
    setName(membership.name);
    setPrice(membership.price);
    setDuration(membership.duration_days);
    setEditingId(membership.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres borrar esta membresía?')) {
      return;
    }

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/api/memberships/${id}/`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Token ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al borrar');

      setMemberships(memberships.filter((m) => m.id !== id));

    } catch (error) {
      console.error('Error al borrar:', error);
      alert("Error: No tienes permiso para borrar.");
    }
  };

  const handleCancel = () => {
    setName('');
    setPrice('');
    setDuration('');
    setEditingId(null);
  };

  const isEditing = editingId !== null;

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-xl mt-6 border-t-4 border-purple-500 text-gray-100">
      <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400">
        {isEditing ? `Editando: ${name}` : 'Configurar Tipos de Membresía'}
      </h2>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre de la Membresía</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-3 text-white focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Ej. Mensual, Anual..."
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Precio ($)</label>
            <input 
              type="number" 
              step="0.01" 
              value={price} 
              onChange={(e) => setPrice(e.target.value)} 
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-3 text-white focus:ring-blue-500 focus:border-blue-500" 
              placeholder="0.00"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Duración (días)</label>
            <input 
              type="number" 
              value={duration} 
              onChange={(e) => setDuration(e.target.value)} 
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-3 text-white focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Ej. 30"
              required 
            />
          </div>
        </div>
        
        <div className="mt-6 flex space-x-3">
          <button 
            type="submit" 
            className="bg-linear-to-r from-purple-600 to-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition duration-300 shadow-lg"
          >
            {isEditing ? 'Actualizar Tipo' : 'Crear Nuevo Tipo'}
          </button>
          
          {isEditing && (
            <button 
              type="button" 
              onClick={handleCancel} 
              className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-500 transition duration-300"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-700 text-gray-200 uppercase text-xs font-bold tracking-wider">
              <th className="text-left p-4 border-b border-gray-600">Nombre</th>
              <th className="text-left p-4 border-b border-gray-600">Precio</th>
              <th className="text-left p-4 border-b border-gray-600">Duración</th>
              <th className="text-left p-4 border-b border-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 text-gray-300">
            {memberships.map((membership) => (
              <tr key={membership.id} className="hover:bg-gray-750 transition-colors border-b border-gray-700 last:border-0">
                <td className="p-4 font-medium text-white">{membership.name}</td>
                <td className="p-4 text-green-400 font-bold">${membership.price}</td>
                <td className="p-4">{membership.duration_days} días</td>
                <td className="p-4 flex space-x-4">
                  <button 
                    onClick={() => handleEdit(membership)} 
                    className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(membership.id)} 
                    className="text-red-400 hover:text-red-300 font-semibold transition-colors"
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
            {memberships.length === 0 && (
              <tr>
                <td colSpan="4" className="p-6 text-center text-gray-500 italic">
                  No hay tipos de membresía configurados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MembershipAdmin;