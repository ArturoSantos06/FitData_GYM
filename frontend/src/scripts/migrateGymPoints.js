import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config.js';

const runMigration = async () => {
    console.log('Iniciando migración de GYM-Points...');
    let successCount = 0;
    let failCount = 0;

    try {
        const querySnapshot = await getDocs(collection(db, 'productos'));
        const total = querySnapshot.size;
        console.log(`Encontrados ${total} productos. Procesando...`);

        for (const document of querySnapshot.docs) {
            try {
                const data = document.data();
                const precioBase = parseFloat(data.precio) || 0;
                const precioPuntos = precioBase * 2;

                await updateDoc(doc(db, 'productos', document.id), {
                    precioPuntos: precioPuntos
                });
                successCount++;
            } catch (err) {
                console.error(`Error actualizando producto ${document.id}:`, err);
                failCount++;
            }
        }

        console.log('--- RESUMEN DE MIGRACIÓN ---');
        console.log(`Total procesados: ${total}`);
        console.log(`Éxito: ${successCount}`);
        console.log(`Fallos: ${failCount}`);
        console.log('Migración completada con éxito.');

    } catch (error) {
        console.error('Error durante la migración:', error);
    }
};

runMigration();
