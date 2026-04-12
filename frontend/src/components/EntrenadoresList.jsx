import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config'; 
import { collection, query, where, getDocs } from 'firebase/firestore';
import { User, Star, Award, CheckCircle, Dumbbell } from 'lucide-react';
import { getCurrentUser, assignTrainerToClient, getClientTrainerAssignment, getTrainerReviews, addTrainerReview } from '../firebase';

const EntrenadoresList = () => {
  const [entrenadores, setEntrenadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEntrenador, setSelectedEntrenador] = useState(null);
  const [currentClientId, setCurrentClientId] = useState(null);
  const [assignedTrainerId, setAssignedTrainerId] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [reviews, setReviews] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Obtener cliente actual
        const currentUser = getCurrentUser();
        if (!currentUser) {
          setError('No se pudo identificar al cliente actual');
          return;
        }
        setCurrentClientId(currentUser.uid);
        
        // Verificar si ya tiene entrenador asignado
        const assignment = await getClientTrainerAssignment(currentUser.uid);
        if (assignment.success) {
          setAssignedTrainerId(assignment.data.trainerId);
        }
        
        // Obtener lista de entrenadores
        console.log("Iniciando consulta de entrenadores a Firestore...");
        const q = query(collection(db, "users"), where("role", "in", ["trainer", "entrenador"]));
        const querySnapshot = await getDocs(q);
        
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log("Entrenadores encontrados:", data);
        setEntrenadores(data);
        
        // Obtener reseñas
        if (data.length > 0) {
          const trainerIds = data.map(e => e.id);
          const reviewsResult = await getTrainerReviews(trainerIds);
          if (reviewsResult.success) {
            setReviews(reviewsResult.data);
          }
        }
      } catch (err) {
        console.error("Error detallado:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateAverageRating = (trainerId) => {
    const trainerReviews = reviews[trainerId] || [];
    if (trainerReviews.length === 0) return null;
    const sum = trainerReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / trainerReviews.length).toFixed(1);
  };

  const getReviewCount = (trainerId) => {
    return reviews[trainerId]?.length || 0;
  };

  const handleSelectEntrenador = async (entrenador) => {
    if (!currentClientId) {
      alert('Error: No se pudo identificar al cliente');
      return;
    }
    
    if (assignedTrainerId) {
      alert('Ya tienes un entrenador asignado. Si deseas cambiar, contacta a recepción.');
      return;
    }
    
    const confirmSelection = window.confirm(
      `¿Estás seguro de seleccionar a ${entrenador.displayName || `${entrenador.firstName} ${entrenador.lastName}`.trim() || entrenador.nombre} como tu entrenador?\n\nEsto iniciará tu plan de entrenamiento personalizado.`
    );
    
    if (!confirmSelection) return;
    
    setAssigning(true);
    try {
      const result = await assignTrainerToClient(currentClientId, entrenador.id);
      if (result.success) {
        setAssignedTrainerId(entrenador.id);
        setSelectedEntrenador(entrenador);
        alert(`¡Felicidades! Has contratado a ${entrenador.displayName || `${entrenador.firstName} ${entrenador.lastName}`.trim() || entrenador.nombre} como tu entrenador.\n\nPronto recibirás tu plan de entrenamiento personalizado.`);
      } else {
        alert(`Error al asignar entrenador: ${result.error}`);
      }
    } catch (err) {
      console.error('Error asignando entrenador:', err);
      alert('Error al procesar la selección. Inténtalo de nuevo.');
    } finally {
      setAssigning(false);
    }
  };

  const handleRateTrainer = async (trainerId, rating) => {
    if (!currentClientId) {
      alert('Error: No se pudo identificar al cliente');
      return;
    }
    
    if (assignedTrainerId !== trainerId) {
      alert('Solo puedes calificar a tu entrenador asignado');
      return;
    }
    
    const confirmRating = window.confirm(`¿Calificar a este entrenador con ${rating} estrella(s)?`);
    if (!confirmRating) return;
    
    try {
      const result = await addTrainerReview(currentClientId, trainerId, rating);
      if (result.success) {
        alert('¡Gracias por tu calificación!');
        // Refresh reviews
        const trainerIds = entrenadores.map(e => e.id);
        const reviewsResult = await getTrainerReviews(trainerIds);
        if (reviewsResult.success) {
          setReviews(reviewsResult.data);
        }
      } else {
        alert(`Error al calificar: ${result.error}`);
      }
    } catch (err) {
      console.error('Error calificando:', err);
      alert('Error al procesar la calificación. Inténtalo de nuevo.');
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
      {assignedTrainerId && (
        <div className="bg-green-900/20 border border-green-500 rounded-xl p-4 text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <p className="font-semibold">Ya tienes un entrenador asignado</p>
          </div>
          <p className="text-sm mt-1">Si deseas cambiar de especialista, contacta a recepción del gimnasio.</p>
        </div>
      )}
      
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
                  {assignedTrainerId === e.id ? (
                    // Estrellas interactivas para calificar
                    <>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const currentAvgStr = calculateAverageRating(e.id);
                        const currentAvg = currentAvgStr ? parseFloat(currentAvgStr) : 0;
                        return (
                          <button
                            key={star}
                            onClick={() => handleRateTrainer(e.id, star)}
                            className="focus:outline-none"
                          >
                            <Star 
                              className={`w-4 h-4 ${star <= currentAvg ? 'text-amber-400 fill-current' : 'text-slate-600'} hover:text-amber-400 transition-colors`} 
                            />
                          </button>
                        );
                      })}
                      <span className="text-slate-400 text-xs ml-2">
                        {calculateAverageRating(e.id) ? `(${calculateAverageRating(e.id)})` : '(Sin calificaciones)'}
                      </span>
                    </>
                  ) : (
                    // Estrellas estáticas mostrando promedio
                    <>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const avgStr = calculateAverageRating(e.id);
                        const avg = avgStr ? parseFloat(avgStr) : null;
                        const filled = avg ? star <= Math.round(avg) : false;
                        return (
                          <Star 
                            key={star} 
                            className={`w-4 h-4 ${filled ? 'text-amber-400 fill-current' : 'text-slate-600'}`} 
                          />
                        );
                      })}
                      <span className="text-slate-400 text-xs ml-2">
                        {calculateAverageRating(e.id) ? `(${calculateAverageRating(e.id)})` : '(Sin reseñas)'}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Award className="w-4 h-4" />
                  <span>Certificado</span>
                </div>

                <button
                  onClick={() => handleSelectEntrenador(e)}
                  disabled={assigning || assignedTrainerId === e.id}
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                    assignedTrainerId === e.id
                      ? 'bg-green-600 hover:bg-green-500 text-white cursor-not-allowed'
                      : selectedEntrenador?.id === e.id
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50'
                  }`}
                >
                  {assigning && selectedEntrenador?.id === e.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                      Asignando...
                    </>
                  ) : assignedTrainerId === e.id ? (
                    <>
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Asignado
                    </>
                  ) : (
                    'Seleccionar'
                  )}
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