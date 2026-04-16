import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "fitdatagym-f347a",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Fetching trainers...');
  const snapT = await getDocs(collection(db, 'client_trainer_assignments'));
  for (const d of snapT.docs) {
      console.log('Trainer Assignment:', d.id, d.data());
  }

  console.log('Fetching nutritionists...');
  const snapN = await getDocs(collection(db, 'client_nutritionist_assignments'));
  for (const d of snapN.docs) {
      console.log('Nutri Assignment:', d.id, d.data());
  }

  console.log('Fetching users...');
  const snapU = await getDocs(collection(db, 'users'));
  for (const d of snapU.docs) {
      console.log('User:', d.id, d.data().nombre, d.data().apellido, d.data().role);
  }
}
run().catch(console.error);
