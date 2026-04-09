import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase/config'; 

export const useAppointments = (clienteId) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!clienteId) {
                setLoading(false);
                return;
            }
            try {
                const citasRef = collection(db, "citas");
                const q = query(citasRef, where("clienteId", "==", clienteId));
                const querySnapshot = await getDocs(q);

                const citasFirebase = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    estado: doc.data().estado || 'activa'
                }));
                
                setAppointments(citasFirebase.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)));
            } catch (error) {
                console.error("Error obteniendo citas:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [clienteId]);

    // Lógica de cancelar de la interfaz
    const cancelarCita = async (id) => {
        try {
            const citaRef = doc(db, "citas", id);
            await updateDoc(citaRef, { estado: 'cancelada' });
            
            // Actualizamos la lista local
            setAppointments(appointments.map(cita => 
                cita.id === id ? { ...cita, estado: 'cancelada' } : cita
            ));
            return true; // Retornamos "true" si fue un éxito
        } catch (error) {
            console.error("Error al cancelar la cita en Firebase:", error);
            return false; // Retornamos "false" si falló
        }
    };

    // Exportamos los datos y la función de cancelar
    return { appointments, loading, cancelarCita };
};