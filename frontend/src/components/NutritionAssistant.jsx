import React, { useState, useEffect } from 'react';
import { ChefHat, X, Loader2, ExternalLink, Save } from 'lucide-react';
import { getAllMembers, getHealthProfileByMemberId, createHealthProfile } from '../firebase';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

// --- GENERADOR DE DIETA LOCAL EN ESPAÑOL ---
const baseDatosComidas = {
  desayunos: [
    { title: 'Avena con manzana, canela y nueces', kcal: 350, p: 12, c: 55, f: 10, time: 10 },
    { title: 'Huevos revueltos con espinaca y pan integral', kcal: 400, p: 20, c: 30, f: 22, time: 15 },
    { title: 'Yogur griego con berries y miel', kcal: 300, p: 18, c: 25, f: 14, time: 5 },
    { title: 'Tostadas de aguacate con huevo pochado', kcal: 450, p: 22, c: 40, f: 24, time: 15 },
    { title: 'Batido de proteína con plátano y avena', kcal: 380, p: 30, c: 45, f: 8, time: 5 },
  ],
  comidas: [
    { title: 'Pechuga de pollo a la plancha con arroz y brócoli', kcal: 500, p: 45, c: 50, f: 12, time: 25 },
    { title: 'Salmón al horno con quinoa y espárragos', kcal: 600, p: 40, c: 45, f: 25, time: 30 },
    { title: 'Ensalada de atún con garbanzos y vinagreta', kcal: 450, p: 35, c: 30, f: 20, time: 10 },
    { title: 'Tacos de pechuga de pavo con tortillas de maíz', kcal: 550, p: 40, c: 45, f: 22, time: 20 },
    { title: 'Pasta integral con carne de res magra molida', kcal: 650, p: 45, c: 70, f: 18, time: 25 },
  ],
  cenas: [
    { title: 'Filete de pescado blanco con vegetales al vapor', kcal: 350, p: 35, c: 15, f: 15, time: 20 },
    { title: 'Pechuga de pavo asada con ensalada verde', kcal: 300, p: 30, c: 10, f: 12, time: 20 },
    { title: 'Tortilla de claras de huevo con champiñones', kcal: 250, p: 25, c: 5, f: 10, time: 10 },
    { title: 'Queso cottage con almendras', kcal: 280, p: 25, c: 10, f: 15, time: 5 },
    { title: 'Fajitas de pollo en hojas de lechuga', kcal: 320, p: 30, c: 12, f: 14, time: 15 },
  ],
  snacks: [
    { title: 'Manzana con crema de maní', kcal: 200, p: 6, c: 25, f: 10, time: 5 },
    { title: 'Un puñado de nueces y almendras', kcal: 180, p: 5, c: 6, f: 16, time: 0 },
    { title: 'Gelatina sin azúcar y 1 porción de fresas', kcal: 100, p: 2, c: 20, f: 0, time: 5 },
    { title: 'Batido de proteína en agua', kcal: 120, p: 25, c: 3, f: 1, time: 2 },
    { title: 'Tortitas de arroz con requesón', kcal: 150, p: 10, c: 22, f: 2, time: 5 },
  ]
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generarMenuLocal = (targetCalories) => {
  const tKcal = Number(targetCalories);
  
  let desayuno = { ...getRandom(baseDatosComidas.desayunos), type: 'Desayuno' };
  let comida = { ...getRandom(baseDatosComidas.comidas), type: 'Comida' };
  let cena = { ...getRandom(baseDatosComidas.cenas), type: 'Cena' };
  
  let meals = [desayuno, comida, cena];
  let sumKcal = meals.reduce((acc, m) => acc + m.kcal, 0);

  // Agregar snacks hasta acercarse al target calórico
  let maxSnacks = 3;
  while (tKcal - sumKcal > 150 && maxSnacks > 0) {
    const snack = { ...getRandom(baseDatosComidas.snacks), type: 'Snack' };
    meals.push(snack);
    sumKcal += snack.kcal;
    maxSnacks--;
  }
  
  // Calcular ratio para ajustar porciones exactamente a las macros
  const ratio = tKcal / sumKcal;
  
  const finalMeals = meals.map((m, index) => {
    const adjustedKcal = Math.round(m.kcal * ratio);
    const servings = (ratio >= 1.3 ? 1.5 : (ratio <= 0.8 ? 0.75 : 1));
    return {
      id: `meal-${index}-${Date.now()}`,
      title: m.title,
      readyInMinutes: m.time,
      servings: servings,
      type: m.type,
      kcal: adjustedKcal,
      protein: Math.round(m.p * ratio),
      carbohydrates: Math.round(m.c * ratio),
      fat: Math.round(m.f * ratio)
    };
  });

  return {
    meals: finalMeals,
    nutrients: {
      calories: finalMeals.reduce((acc, m) => acc + m.kcal, 0),
      protein: finalMeals.reduce((acc, m) => acc + m.protein, 0),
      carbohydrates: finalMeals.reduce((acc, m) => acc + m.carbohydrates, 0),
      fat: finalMeals.reduce((acc, m) => acc + m.fat, 0)
    }
  };
};
// ---------------------------------------------

export default function NutritionAssistant() {
  const [open, setOpen] = useState(false);
  const [targetCalories, setTargetCalories] = useState(2000);
  const [suggestedMeals, setSuggestedMeals] = useState([]);
  const [dailyNutrients, setDailyNutrients] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para los pacientes
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isSavingCalories, setIsSavingCalories] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Cargar pacientes al abrir el panel
  useEffect(() => {
    if (open && patients.length === 0) {
      const loadPatients = async () => {
        setIsLoadingPatients(true);
        try {
          const userDataStr = localStorage.getItem('firebaseUser');
          let nutriId = null;
          let isAdmin = false;
          
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            nutriId = userData.uid;
            if (userData.email && userData.email.includes('admin')) {
              isAdmin = true;
            }
          }

          const res = await getAllMembers();
          
          if (res.success && res.data) {
            if (nutriId) {
              const q = query(collection(db, 'client_nutritionist_assignments'), where('nutritionistId', '==', nutriId));
              const snap = await getDocs(q);
              const assignedClientIds = snap.docs.map(doc => doc.data().clientId);

              const assignedMembers = res.data.filter(m => {
                const mUserId = String(m.userId || '').trim();
                const mUser = String(m.user || '').trim();
                const mId = String(m.id || '').trim();
                return assignedClientIds.some(id => 
                  id === mUserId || id === mUser || id === mId
                );
              });
              
              // Fallback para pruebas si no hay clientes asignados
              if (assignedMembers.length === 0) {
                setPatients(res.data);
              } else {
                setPatients(assignedMembers);
              }
            } else {
              setPatients(res.data);
            }
          } else {
            setPatients([]);
          }
        } catch (err) {
          console.error("Error loading assigned patients:", err);
          setPatients([]);
        } finally {
          setIsLoadingPatients(false);
        }
      };
      loadPatients();
    }
  }, [open, patients.length]);

  const handlePatientChange = async (e) => {
    const memberId = e.target.value;
    setSelectedPatientId(memberId);
    setSaveMessage('');
    
    if (!memberId) return;

    setIsLoadingPatients(true);
    const res = await getHealthProfileByMemberId(memberId);
    if (res.success && res.data && res.data.targetCalories) {
      setTargetCalories(res.data.targetCalories);
    }
    setIsLoadingPatients(false);
  };

  const saveCaloriesToPatient = async () => {
    if (!selectedPatientId) return;
    setIsSavingCalories(true);
    setSaveMessage('');
    
    const res = await createHealthProfile({
      memberId: selectedPatientId,
      targetCalories: Number(targetCalories)
    });

    if (res.success) {
      setSaveMessage('Guardado en el expediente');
      setTimeout(() => setSaveMessage(''), 3000);
    } else {
      setSaveMessage('Error al guardar');
    }
    setIsSavingCalories(false);
  };

  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    // Simular un tiempo de carga breve
    setTimeout(() => {
      try {
        const data = generarMenuLocal(targetCalories);
        setSuggestedMeals(data.meals);
        setDailyNutrients(data.nutrients);
      } catch (err) {
        console.error(err);
        setError('Ocurrió un error generando el menú local.');
      } finally {
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <>
      {/* Panel Flotante */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center gap-2">
              <ChefHat className="text-cyan-400" size={20} />
              <h3 className="font-bold text-white">Asistente de Menú</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700 text-sm">
            
            {/* Seleccionar Paciente */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Paciente (Opcional)</label>
              <div className="relative">
                <select
                  value={selectedPatientId}
                  onChange={handlePatientChange}
                  disabled={isLoadingPatients}
                  className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-800 p-2 pr-8 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                >
                  <option value="">-- Seleccionar paciente --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.fullName || `${p.nombre || ''} ${p.apellido || ''}`.trim() || p.email}
                    </option>
                  ))}
                </select>
                {isLoadingPatients && (
                  <div className="absolute right-2 top-2 text-slate-400">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Input Calorias */}
            <div className="mb-4">
              <label className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Objetivo Calórico (kcal)</span>
                {selectedPatientId && (
                  <button
                    onClick={saveCaloriesToPatient}
                    disabled={isSavingCalories}
                    className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors"
                  >
                    {isSavingCalories ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                    {saveMessage || 'Guardar en perfil'}
                  </button>
                )}
              </label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={targetCalories}
                  onChange={(e) => setTargetCalories(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  onClick={fetchSuggestions}
                  disabled={isLoading}
                  className="whitespace-nowrap rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 transition-colors flex items-center justify-center min-w-[100px]"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Generar'}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-xs">
                {error}
              </div>
            )}

            {dailyNutrients && (
              <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/50 p-3">
                <h4 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Resumen Diario</h4>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded border border-slate-700 bg-slate-800 p-2">
                    <span className="block text-slate-400">Calorías</span>
                    <span className="font-bold text-cyan-400">{dailyNutrients.calories}</span>
                  </div>
                  <div className="rounded border border-slate-700 bg-slate-800 p-2">
                    <span className="block text-slate-400">Proteína</span>
                    <span className="font-bold text-white">{dailyNutrients.protein}g</span>
                  </div>
                  <div className="rounded border border-slate-700 bg-slate-800 p-2">
                    <span className="block text-slate-400">Carbs</span>
                    <span className="font-bold text-white">{dailyNutrients.carbohydrates}g</span>
                  </div>
                  <div className="rounded border border-slate-700 bg-slate-800 p-2">
                    <span className="block text-slate-400">Grasas</span>
                    <span className="font-bold text-white">{dailyNutrients.fat}g</span>
                  </div>
                </div>
              </div>
            )}

            {suggestedMeals.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Comidas Sugeridas</h4>
                {suggestedMeals.map((meal, index) => (
                  <div
                    key={meal.id}
                    className="block rounded-lg border border-slate-700 bg-slate-800 p-3 hover:border-cyan-500/50 transition-colors group cursor-default"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-wider block mb-1">
                          {meal.type || `Comida ${index + 1}`}
                        </span>
                        <h5 className="font-medium text-slate-200 group-hover:text-cyan-400 transition-colors line-clamp-2">
                          {meal.title}
                        </h5>
                        <div className="mt-2 flex gap-3 text-xs text-slate-400">
                          <span>⏱ {meal.readyInMinutes} min</span>
                          <span>🍽 {meal.servings} porc.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !isLoading && (
                <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-slate-400">
                  <ChefHat size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Ingresa las calorías objetivo y genera un menú al instante para tu paciente.</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Burbuja Flotante */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-600 text-white shadow-[0_10px_30px_rgba(6,182,212,0.4)] transition-transform hover:scale-105"
        aria-label="Abrir asistente de menú"
      >
        {open ? <X size={24} /> : <ChefHat size={24} />}
      </button>
    </>
  );
}
