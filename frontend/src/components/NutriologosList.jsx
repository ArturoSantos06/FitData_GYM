import React, { useEffect, useState } from 'react';
import { db } from '../firebase/config'; 
import { collection, query, where, getDocs } from 'firebase/firestore';

const NutriologosList = () => {
  const [nutris, setNutris] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNutris = async () => {
      try {
        setLoading(true);
        console.log("Iniciando consulta a Firestore...");
        
        const q = query(collection(db, "users"), where("role", "==", "nutriologo"));
        const querySnapshot = await getDocs(q);
        
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log("Nutriólogos encontrados:", data);
        setNutris(data);
      } catch (err) {
        console.error("Error detallado:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNutris();
  }, []);

  if (error) return <div className="p-4 text-red-500 bg-red-100 rounded">Error: {error}</div>;
  if (loading) return <div className="p-4 text-cyan-400 animate-pulse">Cargando especialistas...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {nutris.length > 0 ? (
        nutris.map((n) => (
          <div key={n.id} className="p-4 bg-slate-800 rounded-xl border border-slate-700">
            <h3 className="font-bold text-white">{n.nombre}</h3>
            <p className="text-cyan-400 text-sm">{n.especialidad}</p>
          </div>
        ))
      ) : (
        <p className="text-slate-500">No se encontraron nutriólogos en la base de datos.</p>
      )}
    </div>
  );
};

export default NutriologosList;