import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config'; 

export const CitasEntrenador = (clienteId) => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let desuscribirCitas = () => {}; 

        const fetchAppointments = async () => {
            if (!clienteId) {
                setLoading(false);
                return;
            }
            
            try {
                // Bbuscamos tanto por ID largo como por ID corto
                let posiblesIds = [clienteId]; 

                const miembrosRef = collection(db, "miembros");
                const qMiembro = query(miembrosRef, where("authUid", "==", clienteId));
                const miembroSnapshot = await getDocs(qMiembro);

                if (!miembroSnapshot.empty) {
                    const idCorto = miembroSnapshot.docs[0].id;
                    posiblesIds.push(idCorto); 
                }

                const citasRef = collection(db, "entrenamientos");
                const qCitas = query(citasRef, where("clienteId", "in", posiblesIds));
                
                desuscribirCitas = onSnapshot(qCitas, (snapshot) => {
                    const citasFirebase = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        estado: doc.data().estado || 'activa'
                    }));
                    
                    setAppointments(citasFirebase.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)));
                    setLoading(false);
                }, (error) => {
                    console.error("Error en la conexión en vivo de citas:", error);
                    setLoading(false);
                });

            } catch (error) {
                console.error("Error iniciando la búsqueda:", error);
                setLoading(false);
            }
        };

        fetchAppointments();

        return () => desuscribirCitas();
    }, [clienteId]); 

    // CANCELAR
    const cancelarCita = async (id) => {
        try {
            const citaRef = doc(db, "entrenamientos", id);
            await updateDoc(citaRef, { estado: 'cancelada' });
            return true;
        } catch (error) {
            console.error("Error al cancelar:", error);
            return false;
        }
    };

    const verificarHorariosDisponibles = async (entrenadorId, fechaSeleccionada) => {
        try {
            const fechaObj = new Date(fechaSeleccionada + "T00:00:00");
            const diaSemana = fechaObj.getDay(); 

            if (diaSemana === 0) return []; 

            let jornadaCompleta = diaSemana === 6 
                ? ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00"]
                : ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

            const citasRef = collection(db, "entrenamientos");
            
            const q = query(citasRef, where("entrenadorId", "==", entrenadorId));
            const querySnapshot = await getDocs(q);
            
            const horasOcupadas = querySnapshot.docs
                .map(doc => doc.data())
                .filter(cita => cita.fecha === fechaSeleccionada && (cita.estado === "activa" || !cita.estado))
                .map(cita => cita.horaInicio);
            
            return jornadaCompleta.filter(hora => !horasOcupadas.includes(hora)); 
        } catch (error) {
            console.error("Error al buscar disponibilidad:", error);
            return []; 
        }
    };

    // REPROGRAMAR
    const reprogramarCita = async (idCita, nuevaFecha, nuevaHoraInicio) => {
        try {
            const citaRef = doc(db, "entrenamientos", idCita);
            const horaFinNum = parseInt(nuevaHoraInicio.split(":")[0]) + 1;
            const nuevaHoraFin = `${horaFinNum.toString().padStart(2, '0')}:00`;

            await updateDoc(citaRef, { 
                fecha: nuevaFecha,
                horaInicio: nuevaHoraInicio,
                horaFin: nuevaHoraFin
            });
            return true;
        } catch (error) {
            console.error("Error al reprogramar:", error);
            return false;
        }
    };

    return { appointments, loading, cancelarCita, verificarHorariosDisponibles, reprogramarCita };
};