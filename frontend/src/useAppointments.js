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
                //Buscar en "miembros"
                const miembrosRef = collection(db, "miembros");
                const qMiembro = query(miembrosRef, where("authUid", "==", clienteId));
                const miembroSnapshot = await getDocs(qMiembro);

                if (miembroSnapshot.empty) {
                    console.log("No se encontró el perfil corto del miembro.");
                    setLoading(false);
                    return; 
                }

                // Extraemos el ID corto
                const idCorto = miembroSnapshot.docs[0].id;

                // Buscamos las citas
                const citasRef = collection(db, "citas");
                const qCitas = query(citasRef, where("clienteId", "==", idCorto));
                const querySnapshot = await getDocs(qCitas);

                const citasFirebase = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    estado: doc.data().estado || 'activa'
                }));
                
                // Ordenamos por fecha
                setAppointments(citasFirebase.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)));
            } catch (error) {
                console.error("Error obteniendo citas:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [clienteId]); 

    // CANCELAR
    const cancelarCita = async (id) => {
        try {
            const citaRef = doc(db, "citas", id);
            await updateDoc(citaRef, { estado: 'cancelada' });
            
            setAppointments(appointments.map(cita => 
                cita.id === id ? { ...cita, estado: 'cancelada' } : cita
            ));
            return true;
        } catch (error) {
            console.error("Error al cancelar la cita en Firebase:", error);
            return false;
        }
    };

    // BUSCAR HORARIOS LIBRES 
    const verificarHorariosDisponibles = async (nutriologoId, fechaSeleccionada) => {
        try {
            const fechaObj = new Date(fechaSeleccionada + "T00:00:00");
            const diaSemana = fechaObj.getDay(); 

            if (diaSemana === 0) {
                return []; 
            }

            let jornadaCompleta = [];
            if (diaSemana === 6) {
                jornadaCompleta = [
                    "06:00", "07:00", "08:00", "09:00", "10:00", 
                    "11:00", "12:00", "13:00", "14:00"
                ];
            } else {
                jornadaCompleta = [
                    "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
                    "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
                    "18:00", "19:00", "20:00", "21:00", "22:00"
                ];
            }

            const citasRef = collection(db, "citas");
            const q = query(citasRef, where("nutriologoId", "==", nutriologoId));
            const querySnapshot = await getDocs(q);
            
            const horasOcupadas = querySnapshot.docs
                .map(doc => doc.data())
                .filter(cita => cita.fecha === fechaSeleccionada && (cita.estado === "activa" || !cita.estado))
                .map(cita => cita.horaInicio);
            
            const horasLibres = jornadaCompleta.filter(hora => !horasOcupadas.includes(hora));
            
            return horasLibres; 

        } catch (error) {
            console.error("Error al buscar disponibilidad:", error);
            return []; 
        }
    };

    // REPROGRAMAR CITA
    const reprogramarCita = async (idCita, nuevaFecha, nuevaHoraInicio) => {
        try {
            const citaRef = doc(db, "citas", idCita);
            
            // Calculamos la hora de fin sumándole 1 hora
            const horaFinNum = parseInt(nuevaHoraInicio.split(":")[0]) + 1;
            const nuevaHoraFin = `${horaFinNum.toString().padStart(2, '0')}:00`;

            await updateDoc(citaRef, { 
                fecha: nuevaFecha,
                horaInicio: nuevaHoraInicio,
                horaFin: nuevaHoraFin
            });
            
            setAppointments(appointments.map(cita => 
                cita.id === idCita 
                    ? { ...cita, fecha: nuevaFecha, horaInicio: nuevaHoraInicio, horaFin: nuevaHoraFin } 
                    : cita
            ));
            return true;
        } catch (error) {
            console.error("Error al reprogramar la cita:", error);
            return false;
        }
    };

    return { appointments, loading, cancelarCita, verificarHorariosDisponibles, reprogramarCita };
};