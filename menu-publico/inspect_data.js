import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBafz_Q8k9xlFShr87_9HHwawI92I-10o0",
  authDomain: "webexplora-2ab9a.firebaseapp.com",
  projectId: "webexplora-2ab9a",
  storageBucket: "webexplora-2ab9a.firebasestorage.app",
  messagingSenderId: "169255016651",
  appId: "1:169255016651:web:2a69abde4cb0830da9e34e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  const email = "isaacrodas10@gmail.com";
  const pass = "32613036";
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  console.log("Logged in as:", userCredential.user.uid);

  const restaurantId = "uMtzhb1HhNfBbByVd82EYTZKF1u2";
  await updateDoc(doc(db, `restaurants/${restaurantId}/config/design`), {
    menuViewMode: "video-vertical"
  });
  console.log("Updated design menuViewMode to video-vertical");
}

run().catch(console.error);
