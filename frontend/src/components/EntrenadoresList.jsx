import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { User, Star, Award, CheckCircle, Dumbbell } from 'lucide-react';

const EntrenadoresList = () => {
  const [entrenadores, setEntrenadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEntrenador, setSelectedEntrenador] = useState(null);

  useEffect(() => {
    const fetchEntrenadores = async () => {
      try {
        setLoading(true);
        console.log("Iniciando consulta de entrenadores a Firestore...");

        const q = query(collection(db, "users"), where("role", "in", ["trainer", "entrenador"]));
        const querySnapshot = await getDocs(q);

        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log("Entrenadores encontrados:", data);
        setEntrenadores(data);
      } catch (err) {
        console.error("Error detallado:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEntrenadores();
  }, []);

  const handleSelectEntrenador = async (entrenador) => {
    setSelectedEntrenador(entrenador);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Debes iniciar sesión para vincularte con un entrenador.");
        return;
      }
      
      const trainerName = entrenador.displayName || `${String(entrenador.firstName || '').trim()} ${String(entrenador.lastName || '').trim()}`.trim() || entrenador.nombre || 'tu nuevo entrenador';

      await setDoc(doc(db, 'client_trainer_assignments', user.uid), {
        clientId: user.uid,
        trainerId: entrenador.id,
        assignedAt: new Date()
      });

      alert(`¡Vinculación exitosa! Se ha guardado a ${trainerName} como tu entrenador.`);
    } catch (err) {
      console.error("Error al guardar la asignación:", err);
      alert("Hubo un error al vincular el entrenador: " + err.message);
    }
  };

  if (error) return (
    <div className="p-6 text-center">
      <div className="bg-red-900/20 border border-red-500 rounded-xl p-4 text-red-400">
        <p className="font-semibold">Error al cargar entrenadores</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="p-6 text-center">
      <div className="animate-pulse">
        <div className="bg-slate-800 rounded-xl p-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-3 bg-slate-700 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {entrenadores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entrenadores.map((e) => (
            <div
              key={e.id}
              className={`relative bg-slate-900/60 border rounded-xl p-6 transition-all duration-300 hover:bg-slate-800/80 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 ${
                selectedEntrenador?.id === e.id
                  ? 'border-blue-500 bg-blue-900/20 shadow-lg shadow-blue-500/20'
                  : 'border-slate-700'
              }`}
            >
              {selectedEntrenador?.id === e.id && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="w-6 h-6 text-blue-400" />
                </div>
              )}

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Dumbbell className="w-8 h-8 text-blue-400" />
                </div>

                <div>
                  <h3 className="font-bold text-white text-lg">
                    {e.displayName || `${String(e.firstName || '').trim()} ${String(e.lastName || '').trim()}`.trim() || e.nombre || 'Sin nombre'}
                  </h3>
                  <p className="text-blue-400 text-sm font-medium">{e.especialidad || 'Entrenador Personal'}</p>
                </div>

                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 text-amber-400 fill-current" />
                  ))}
                  <span className="text-slate-400 text-xs ml-2">(4.9)</span>
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Award className="w-4 h-4" />
                  <span>Certificado</span>
                </div>

                <button
                  onClick={() => handleSelectEntrenador(e)}
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                    selectedEntrenador?.id === e.id
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {selectedEntrenador?.id === e.id ? 'Seleccionado' : 'Seleccionar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No se encontraron entrenadores disponibles</p>
          <p className="text-slate-500 text-sm mt-2">Estamos trabajando para expandir nuestro equipo de entrenadores.</p>
        </div>
      )}
    </div>
  );
};

export default EntrenadoresList;