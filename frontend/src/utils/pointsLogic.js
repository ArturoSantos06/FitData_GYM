import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase/config'; // assuming config is exported here

// --- INICIO CÓDIGO NUEVO GYM-POINTS ---

/**
 * Calcula los puntos ganados (10% del total pagado en MXN, floor).
 * @param {number} totalMXN - Monto pagado en pesos.
 * @returns {number} Puntos ganados.
 */
export const calcularPuntosGanados = (totalMXN) => {
    if (!totalMXN || isNaN(totalMXN)) return 0;
    return Math.floor(totalMXN * 0.1);
};

/**
 * Calcula el precio en puntos de un producto (2x precio en MXN).
 * @param {number} costoMXN - Costo del producto en pesos.
 * @returns {number} Costo en puntos.
 */
export const calcularPrecioPuntos = (costoMXN) => {
    if (!costoMXN || isNaN(costoMXN)) return 0;
    return Math.floor(costoMXN * 2);
};

/**
 * Ejecuta el descuento de puntos para un usuario (Pago).
 * Utiliza runTransaction para asegurar saldo suficiente sin condiciones de carrera.
 * @param {string} userId - ID del usuario.
 * @param {number} pointsToDeduct - Cantidad total de puntos a descontar.
 * @param {string} description - Concepto (ej. Compra en Tienda).
 * @returns {object} { success: boolean, error?: string }
 */
export const processPointsPayment = async (userId, pointsToDeduct, description = 'Pago con puntos') => {
    if (!userId) return { success: false, error: 'Usuario no proporcionado.' };
    const userRef = doc(db, 'users', userId);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error('El usuario no existe.');
            }

            const currentPoints = userDoc.data().gymPoints || 0;
            if (currentPoints < pointsToDeduct) {
                throw new Error(`Saldo insuficiente. Tienes ${currentPoints} puntos, pero necesitas ${pointsToDeduct}.`);
            }

            const newPoints = currentPoints - pointsToDeduct;
            // Solo actualizar gymPoints (esto SÍ está permitido por las reglas de Firestore)
            transaction.update(userRef, { gymPoints: newPoints });
        });
        console.log(`✅ ${pointsToDeduct} puntos deductados usar ${userId}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Error al descontar puntos:`, error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Abonar puntos a un usuario (Ganancia por compras).
 * Utiliza runTransaction para actualizar el saldo.
 * @param {string} userId - ID del usuario.
 * @param {number} pointsToEarn - Cantidad de puntos ganados.
 * @param {string} description - Concepto.
 */
export const awardPoints = async (userId, pointsToEarn, description = 'Ganancia por compra') => {
    if (!userId || pointsToEarn <= 0) return { success: false, error: 'Parámetros inválidos' };
    const userRef = doc(db, 'users', userId);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error('El usuario no existe.');
            }

            const currentPoints = userDoc.data().gymPoints || 0;
            const newPoints = currentPoints + pointsToEarn;

            // Solo actualizar gymPoints (esto SÍ está permitido por las reglas de Firestore)
            transaction.update(userRef, { gymPoints: newPoints });
        });
        console.log(`✅ ${pointsToEarn} puntos otorgados a usuario ${userId}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Error al otorgar puntos:`, error.message);
        return { success: false, error: error.message };
    }
};
// --- FIN CÓDIGO NUEVO GYM-POINTS ---
