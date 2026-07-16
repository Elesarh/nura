import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp({
  projectId: serviceAccount.projectId
});

const db = getFirestore(app);

async function check() {
  const users = await db.collection('users').get();
  users.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}
check().catch(console.error);
