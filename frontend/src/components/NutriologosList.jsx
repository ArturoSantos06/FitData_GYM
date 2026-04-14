import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config'; 
import { collection, query, where, getDocs } from 'firebase/firestore';
import { User, Star, Award, CheckCircle, AlertCircle } from 'lucide-react';
import { getCurrentUser, waitForAuthReady, assignNutritionistToClient, getClientNutritionistAssignment, getNutritionistReviews, addNutritionistReview } from '../firebase';

const NutriologosList = () => {
  const [nutris, setNutris] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNutri, setSelectedNutri] = useState(null);
  const [currentClientId, setCurrentClientId] = useState(null);
  const [assignedNutritionistId, setAssignedNutritionistId] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [reviews, setReviews] = useState({});
  const [hoveredStars, setHoveredStars] = useState({});

  const calculateAverageRating = (nutriId) => {
    const nutriReviews = reviews[nutriId] || [];
    if (nutriReviews.length === 0) return null;
    const sum = nutriReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / nutriReviews.length).toFixed(1);
  };

  const getReviewCount = (nutriId) => {
    return reviews[nutriId]?.length || 0;
  };

  const handleRateNutri = async (nutriId, rating) => {
    if (!currentClientId) {
      alert('Error: No se pudo identificar al cliente');
      return;
    }
    
    if (assignedNutritionistId !== nutriId) {
      alert('Solo puedes calificar a tu nutriólogo asignado');
      return;
    }
    
    const confirmRating = window.confirm(`¿Calificar a este nutriólogo con ${rating} estrella(s)?`);
    if (!confirmRating) return;
    
    try {
      const result = await addNutritionistReview(currentClientId, nutriId, rating);
      if (result.success) {
        alert('¡Gracias por tu calificación!');
        // Refresh reviews
        const nutriIds = nutris.map(n => n.id);
        const reviewsResult = await getNutritionistReviews(nutriIds);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        await waitForAuthReady();

        // Obtener cliente actual
        const currentUser = getCurrentUser();
        if (!currentUser) {
          setError('No se pudo identificar al cliente actual');
          return;
        }
        setCurrentClientId(currentUser.uid);

        // Verificar si ya tiene nutriólogo asignado
        const assignment = await getClientNutritionistAssignment(currentUser.uid);
        if (assignment.success) {
          setAssignedNutritionistId(assignment.data.nutritionistId);
        }

        // Obtener lista de nutriólogos
        console.log("Iniciando consulta a Firestore...");
        const q = query(collection(db, "users"), where("role", "==", "nutriologo"));
        const querySnapshot = await getDocs(q);

        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log("Nutriólogos encontrados:", data);
        setNutris(data);

        // Obtener reseñas
        if (data.length > 0) {
          const nutriIds = data.map(n => n.id);
          const reviewsResult = await getNutritionistReviews(nutriIds);
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

  const handleSelectNutri = async (nutri) => {
    if (!currentClientId) {
      alert('Error: No se pudo identificar al cliente');
      return;
    }
    
    if (assignedNutritionistId) {
      alert('Ya tienes un nutriólogo asignado. Si deseas cambiar, contacta a recepción.');
      return;
    }
    
    const confirmSelection = window.confirm(
      `¿Estás seguro de seleccionar a ${nutri.displayName || `${nutri.firstName} ${nutri.lastName}`.trim() || nutri.nombre} como tu nutriólogo?\n\nEsto iniciará tu plan de nutrición personalizado.`
    );
    
    if (!confirmSelection) return;
    
    setAssigning(true);
    try {
      const result = await assignNutritionistToClient(currentClientId, nutri.id);
      if (result.success) {
        setAssignedNutritionistId(nutri.id);
        setSelectedNutri(nutri);
        alert(`¡Felicidades! Has contratado a ${nutri.displayName || `${nutri.firstName} ${nutri.lastName}`.trim() || nutri.nombre} como tu nutriólogo.\n\nPronto recibirás tu plan nutricional personalizado.`);
      } else {
        alert(`Error al asignar nutriólogo: ${result.error}`);
      }
    } catch (err) {
      console.error('Error asignando nutriólogo:', err);
      alert('Error al procesar la selección. Inténtalo de nuevo.');
    } finally {
      setAssigning(false);
    }
  };

  if (error) return (
    <div className="p-6 text-center">
      <div className="bg-red-900/20 border border-red-500 rounded-xl p-4 text-red-400">
        <p className="font-semibold">Error al cargar especialistas</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="p-6 text-center">
      <div className="animate-pulse">
        <div className="bg-slate-800 rounded-xl p-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-emerald-400" />
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
      {assignedNutritionistId && (
        <div className="bg-green-900/20 border border-green-500 rounded-xl p-4 text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <p className="font-semibold">Ya tienes un nutriólogo asignado</p>
          </div>
          <p className="text-sm mt-1">Si deseas cambiar de especialista, contacta a recepción del gimnasio.</p>
        </div>
      )}
      
      {nutris.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nutris.map((n) => (
            <div 
              key={n.id} 
              className={`relative bg-slate-900/60 border rounded-xl p-6 transition-all duration-300 hover:bg-slate-800/80 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 ${
                selectedNutri?.id === n.id 
                  ? 'border-emerald-500 bg-emerald-900/20 shadow-lg shadow-emerald-500/20' 
                  : 'border-slate-700'
              }`}
            >
              {selectedNutri?.id === n.id && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
              )}

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-emerald-400" />
                </div>

                <div>
                  <h3 className="font-bold text-white text-lg">
                    {n.displayName || `${String(n.firstName || '').trim()} ${String(n.lastName || '').trim()}`.trim() || n.nombre || 'Sin nombre'}
                  </h3>
                  <p className="text-emerald-400 text-sm font-medium">{n.especialidad || 'Nutriólogo General'}</p>
                </div>

                <div className="flex items-center gap-1">
                  {assignedNutritionistId === n.id ? (
                    // Estrellas interactivas para calificar
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const nutriReviews = reviews[n.id] || [];
                        const myReview = nutriReviews.find(r => r.clientId === currentClientId);
                        const myRating = myReview ? myReview.rating : 0;
                        const displayRating = hoveredStars[n.id] || myRating;
                        const isFilled = star <= displayRating;
                        
                        return (
                          <button
                            key={star}
                            onClick={() => handleRateNutri(n.id, star)}
                            onMouseEnter={() => setHoveredStars(prev => ({ ...prev, [n.id]: star }))}
                            onMouseLeave={() => setHoveredStars(prev => ({ ...prev, [n.id]: 0 }))}
                            className="focus:outline-none disabled:cursor-default"
                            disabled={myRating > 0}
                          >
                            <Star 
                              className={`w-4 h-4 transition-colors ${isFilled ? 'text-amber-400 fill-current' : 'text-slate-600'}`} 
                            />
                          </button>
                        );
                      })}
                      <span className="text-slate-400 text-xs ml-2">
                        {calculateAverageRating(n.id) ? `(${calculateAverageRating(n.id)})` : '(Sin calificaciones)'}
                      </span>
                    </div>
                  ) : (
                    // Estrellas estáticas mostrando promedio
                    <>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const avgStr = calculateAverageRating(n.id);
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
                        {calculateAverageRating(n.id) ? `(${calculateAverageRating(n.id)})` : '(Sin reseñas)'}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Award className="w-4 h-4" />
                  <span>Certificado</span>
                </div>

                <button
                  onClick={() => handleSelectNutri(n)}
                  disabled={assigning || assignedNutritionistId === n.id}
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                    assignedNutritionistId === n.id
                      ? 'bg-green-600 hover:bg-green-500 text-white cursor-not-allowed'
                      : selectedNutri?.id === n.id
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50'
                  }`}
                >
                  {assigning && selectedNutri?.id === n.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                      Asignando...
                    </>
                  ) : assignedNutritionistId === n.id ? (
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
          <User className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No se encontraron especialistas disponibles</p>
          <p className="text-slate-500 text-sm mt-2">Estamos trabajando para expandir nuestro equipo de nutriólogos.</p>
        </div>
      )}
    </div>
  );
};

export default NutriologosList;