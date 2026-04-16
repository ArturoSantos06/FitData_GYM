import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

function ListaMembresiasUsuario({ refreshTrigger }) {
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [usersById, setUsersById] = useState({});
  
  const [sortBy, setSortBy] = useState('recent');

  const resolveUser = (item) => {
    const keys = [
      item.userId,
      String(item.userId || '').trim(),
      item.authUid,
      String(item.authUid || '').trim(),
      String(item.userEmail || '').trim().toLowerCase(),
    ].filter(Boolean);

    for (const key of keys) {
      const direct = usersById[key];
      if (direct) return direct;
    }

    return {};
  };

  const isMembershipActive = (item) => {
    if (!item?.endDate) {
      return false;
    }

    const endDate = new Date(item.endDate);
    if (Number.isNaN(endDate.getTime())) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    return endDate >= today;
  };

  const fetchAssignments = async () => {
    try {
      const [membershipsSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, 'memberships')),
        getDocs(collection(db, 'users'))
      ]);

      const rawData = membershipsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const dataByUser = rawData.reduce((acc, current) => {
        const key = current.userId || current.user || current.id;
        const previous = acc[key];

        if (!previous) {
          acc[key] = current;
          return acc;
        }

        // Comparar por fecha de inicio, creación, o última actualización
        const currentDate = new Date(
          current.startDate || 
          current.updatedAt?.toDate?.() || 
          current.createdAt?.toDate?.() || 
          0
        ).getTime();
        
        const previousDate = new Date(
          previous.startDate || 
          previous.updatedAt?.toDate?.() || 
          previous.createdAt?.toDate?.() || 
          0
        ).getTime();

        if (currentDate > previousDate) {
          acc[key] = current;
        }

        return acc;
      }, {});

      const data = Object.values(dataByUser);

      const usersMap = {};
      usersSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const docId = docSnap.id;
        const authUid = String(data.authUid || '').trim();
        const legacyId = data.id;
        const email = String(data.email || '').trim().toLowerCase();

        usersMap[docId] = data;
        if (authUid) usersMap[authUid] = data;
        if (legacyId !== undefined && legacyId !== null) {
          usersMap[String(legacyId)] = data;
          const numericLegacy = Number(legacyId);
          if (!Number.isNaN(numericLegacy)) usersMap[numericLegacy] = data;
        }
        if (email) usersMap[email] = data;
      });

      setAssignments(data);
      setUsersById(usersMap);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    setTimeout(() => fetchAssignments(), 0);
  }, [refreshTrigger]);


  const filteredAssignments = assignments.filter(item => {
    const search = searchTerm.toLowerCase();
    const active = isMembershipActive(item);
    const estado = active ? 'activo' : 'vencido';
    const userData = resolveUser(item);
    const nombre = (userData.username || item.userName || '').toLowerCase();
    const nombreCompleto = (`${userData.firstName || ''} ${userData.lastName || ''}`.trim() || item.userFullName || '').toLowerCase();
    const userId = item.userId ? item.userId.toString() : '';
    const membershipName = (item.membershipTypeName || item.membershipName || '').toLowerCase();
    
    return (
        nombre.includes(search) ||
        nombreCompleto.includes(search) ||
        membershipName.includes(search) ||
        estado.includes(search) ||
        userId.includes(search)
    );
  });

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    if (sortBy === 'name') {
      const usernameA = (resolveUser(a).username || a.userName || '').trim();
      const usernameB = (resolveUser(b).username || b.userName || '').trim();
      return usernameA.localeCompare(usernameB, 'es', { sensitivity: 'base' });
    } 
    if (sortBy === 'expiration') {
      return new Date(a.endDate) - new Date(b.endDate);
    }
    return new Date(b.startDate) - new Date(a.startDate);
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
              <th className="py-3 px-6 border-b border-gray-600">Email</th>
              <th className="py-3 px-6 border-b border-gray-600">Membresía</th>
              <th className="py-3 px-6 border-b border-gray-600">Inicio</th>
              <th className="py-3 px-6 border-b border-gray-600">Vencimiento</th>
              <th className="py-3 px-6 text-center border-b border-gray-600">Estado</th>
            </tr>
          </thead>
          <tbody className="text-gray-200 text-sm font-light">
            {sortedAssignments.map((item) => (
              (() => {
                const userData = resolveUser(item);
                const displayUsername = userData.username || item.userName || 'N/A';
                const displayFullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || item.userFullName || '';
                const displayEmail = userData.email || item.userEmail || 'N/A';

                return (
              <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700 transition-colors">
                <td className="py-3 px-6">
                  <span className="font-mono text-teal-400 font-semibold">{item.id}</span>
                </td>
                <td className="py-3 px-6 text-left">
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-sm">
                      {displayUsername}
                    </span>
                    {displayFullName && (
                      <span className="text-xs text-gray-400 uppercase tracking-wide">
                        {displayFullName}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-6">
                  <span className="text-gray-300 text-sm">
                    {displayEmail}
                  </span>
                </td>
                <td className="py-3 px-6">
                  {item.membershipTypeName || item.membershipName || 'N/A'}
                </td>
                <td className="py-3 px-6">
                  {new Date(item.startDate).toLocaleDateString()}
                </td>
                <td className="py-3 px-6 font-mono text-slate-300">
                  {new Date(item.endDate).toLocaleDateString()}
                </td>
                <td className="py-3 px-6 text-center">
                  {(() => {
                    const active = isMembershipActive(item);
                    return (
                  <span
                    className={`py-1 px-3 rounded-full text-xs font-bold ${
                      active
                        ? 'bg-green-700 text-green-100 border border-green-500'
                        : 'bg-red-700 text-red-100 border border-red-500'
                    }`}
                  >
                    {active ? 'ACTIVO' : 'VENCIDO'}
                  </span>
                    );
                  })()}
                </td>
              </tr>
                );
              })()
            ))}
            
            {sortedAssignments.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-500 italic">
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

export default ListaMembresiasUsuario;