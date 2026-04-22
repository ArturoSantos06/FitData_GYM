import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  console.log('Fetching users by email...');
  const snapU = await db.collection('users').where('email', '==', 'paravaloranta006@gmail.com').get();
  let uid = null;
  snapU.forEach(d => {
      console.log('User:', d.id, d.data());
      uid = d.id;
  });

  if (!uid) {
    console.log('User not found by email, searching all users...');
    const all = await db.collection('users').get();
    all.forEach(d => {
      const data = d.data();
      if (data.email === 'paravaloranta006@gmail.com' || (data.nombre && data.nombre.includes('Agustin'))) {
        console.log('Possible User:', d.id, data);
        uid = d.id;
      }
    });
  }

  if (uid) {
    console.log('Found uid:', uid);
    console.log('Fetching trainer assignments for uid...');
    const snapT = await db.collection('client_trainer_assignments').where('trainerId', '==', uid).get();
    console.log('Trainer Assignments count:', snapT.size);
    snapT.forEach(d => {
        console.log('Trainer Assignment:', d.id, d.data());
    });

    console.log('Also checking client_nutritionist_assignments...');
    const snapN = await db.collection('client_nutritionist_assignments').where('nutritionistId', '==', uid).get();
    console.log('Nutritionist Assignments count:', snapN.size);
    snapN.forEach(d => {
        console.log('Nutritionist Assignment:', d.id, d.data());
    });
    
    // Let's also check who is assigned to uid just in case they are backward
    console.log('Checking all client_trainer_assignments where clientId is him?');
    const allT = await db.collection('client_trainer_assignments').where('clientId', '==', uid).get();
    allT.forEach(d => {
        console.log('Found matching Assignment where clientId == uid:', d.id, d.data());
    });
  }
}
run().catch(console.error);
