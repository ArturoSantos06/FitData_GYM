import React, { useState, useEffect } from 'react';

function AssignMembership() {
  const [users, setUsers] = useState([]);
  const [membershipTypes, setMembershipTypes] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedMembership, setSelectedMembership] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    const fetchData = async (endpoint, setter) => {
      try {
        const response = await fetch(`${API_URL}/api/${endpoint}/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });
        if (!response.ok) throw new Error(`Error al cargar ${endpoint}`);
        const data = await response.json();
        setter(data.results || data);
      } catch (err) {
        console.error(err);
        setError(`No se pudieron cargar los datos de ${endpoint}.`);
      }
    };

    fetchData('users', setUsers); 
    fetchData('memberships', setMembershipTypes);

  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!selectedUser || !selectedMembership) {
      setError('Por favor selecciona un usuario y un tipo de membresía.');
      return;
    }

    const token = localStorage.getItem('token');
    const assignmentData = {
      user: selectedUser,
      membership_type: selectedMembership,
    };

    try {
      const response = await fetch(`${API_URL}/api/user-memberships/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(assignmentData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Error al asignar la membresía.');
      }

      const result = await response.json();
      setMessage(`¡Membresía asignada con éxito! Vence el ${result.end_date}.`);
      setSelectedUser('');
      setSelectedMembership('');

    } catch (err) {
      setError(err.message || 'Error desconocido al asignar.');
      console.error(err);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-xl mb-6 border-t-4 border-blue-500 text-gray-100">
      <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">Asignar Membresía a Cliente</h2>

      {error && <p className="mb-3 text-red-400 bg-red-900 p-3 rounded-lg border border-red-700">{error}</p>}
      {message && <p className="mb-3 text-green-400 bg-green-900 p-3 rounded-lg border border-green-700">{message}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div>
          <label htmlFor="user" className="block text-sm font-medium text-gray-300 mb-1">Seleccionar Cliente</label>
          <select
            id="user"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-3 text-white focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="" className="bg-gray-700">-- Selecciona un Cliente --</option>
            {users.map(user => (
              <option key={user.id} value={user.id} className="bg-gray-700">{user.username} ({user.first_name} {user.last_name})</option>
            ))}
          </select>
          {users.length === 0 && <p className="text-xs text-gray-500 mt-2">No se encontraron clientes. ¡Registra uno primero!</p>}
        </div>

        <div>
          <label htmlFor="membership" className="block text-sm font-medium text-gray-300 mb-1">Tipo de Membresía</label>
          <select
            id="membership"
            value={selectedMembership}
            onChange={(e) => setSelectedMembership(e.target.value)}
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-3 text-white focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="" className="bg-gray-700">-- Selecciona una Membresía --</option>
            {membershipTypes.map(type => (
              <option key={type.id} value={type.id} className="bg-gray-700">
                {type.name} ({type.duration_days} días - ${type.price})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-teal-700 transition duration-300 shadow-lg"
        >
          Asignar Membresía
        </button>
      </form>
    </div>
  );
}

export default AssignMembership;