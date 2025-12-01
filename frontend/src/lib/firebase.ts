import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDYVCN2Y2zwAVqQSxgyQKdmim16VMZToZs",
  authDomain: "equityguessr.firebaseapp.com",
  projectId: "equityguessr",
  storageBucket: "equityguessr.firebasestorage.app",
  messagingSenderId: "923655241964",
  appId: "1:923655241964:web:3ffeb7eca6a5495f66e5c9",
  measurementId: "G-EYPG1S1X67"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
