// ============================================================
// FIREBASE - CONFIGURATION PARTAGÉE (PLP SHOP)
// Ce fichier est importé par admin.html ET index.html.
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAL629wDPkDgd06OlzplOQZfvYhgXvj1y4",
    authDomain: "ecommerce-7ae10.firebaseapp.com",
    projectId: "ecommerce-7ae10",
    storageBucket: "ecommerce-7ae10.firebasestorage.app",
    messagingSenderId: "970393666405",
    appId: "1:970393666405:web:2f4a0dd5cfc717d595578c",
    measurementId: "G-QH2JXSPJGY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Cache local hors-ligne (facultatif, échoue silencieusement si plusieurs onglets ouverts)
try {
    enableIndexedDbPersistence(db).catch(function() {});
} catch (e) {}

// ---- AUTHENTIFICATION ----
export function fbSignIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}
export function fbSignUp(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}
export function fbSignOut() {
    return signOut(auth);
}
export function fbOnAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}

// ---- FIRESTORE : collections (produits, commandes, utilisateurs) ----
// Écoute en temps réel une collection entière ; callback reçoit un tableau à jour
// à chaque changement, sur TOUS les appareils connectés.
export function watchCollection(name, callback, onError) {
    return onSnapshot(collection(db, name), function(snap) {
        var list = [];
        snap.forEach(function(d) {
            list.push(d.data());
        });
        callback(list);
    }, function(err) {
        console.error('Erreur écoute collection "' + name + '":', err);
        if (onError) onError(err);
    });
}

export function setDocIn(collectionName, docId, data) {
    return setDoc(doc(db, collectionName, String(docId)), data);
}

export function updateDocIn(collectionName, docId, data) {
    return updateDoc(doc(db, collectionName, String(docId)), data);
}

export function deleteDocIn(collectionName, docId) {
    return deleteDoc(doc(db, collectionName, String(docId)));
}

export function getDocIn(collectionName, docId) {
    return getDoc(doc(db, collectionName, String(docId)));
}

export function fbTimestamp() {
    return serverTimestamp();
}
