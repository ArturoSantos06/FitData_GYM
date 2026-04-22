import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "fitdatagym-f347a",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Fetching users by email...');
  const snapU = await getDocs(query(collection(db, 'users'), where('email', '==', 'paravaloranta006@gmail.com')));
  let uid = null;
  for (const d of snapU.docs) {
      console.log('User:', d.id, d.data());
      uid = d.id;
  }

  if (!uid) {
    console.log('User not found by email, fetching all to search...');
    const all = await getDocs(collection(db, 'users'));
    for (const d of all.docs) {
      const data = d.data();
      if (data.email === 'paravaloranta006@gmail.com' || (data.nombre && data.nombre.includes('Agustin'))) {
        console.log('Possible User:', d.id, data);
        uid = d.id;
      }
    }
  }

  if (uid) {
    console.log('Found uid:', uid);
    console.log('Fetching trainer assignments for uid...');
    const snapT = await getDocs(query(collection(db, 'client_trainer_assignments'), where('trainerId', '==', uid)));
    console.log('Assignments count:', snapT.size);
    for (const d of snapT.docs) {
        console.log('Trainer Assignment:', d.id, d.data());
    }
  }
}
run().catch(console.error);
