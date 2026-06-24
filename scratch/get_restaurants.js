const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  projectId: 'webexplora-2ab9a'
});
const db = getFirestore();
db.collection('restaurants').limit(5).get()
  .then(snap => {
    snap.forEach(doc => {
      console.log(doc.id, '=>', doc.data().slug, doc.data().name);
    });
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
