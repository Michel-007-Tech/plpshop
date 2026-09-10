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
    query,
    orderBy,
    limit,
    addDoc,
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

// Cache local hors-ligne (échoue silencieusement si plusieurs onglets ouverts)
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

// ============================================================
// CHAT EN TEMPS RÉEL
// Structure Firestore :
//   conversations/{conversationId}
//     - clientId (uid ou guest_xxx)
//     - clientName
//     - clientPhone
//     - lastMessage
//     - lastMessageAt
//     - unreadByAdmin (bool)
//     - unreadByClient (bool)
//     - createdAt
//   conversations/{conversationId}/messages/{messageId}
//     - sender ('client' | 'admin')
//     - text
//     - createdAt
// ============================================================

/**
 * Écoute toutes les conversations (pour l'admin)
 */
export function watchConversations(callback, onError) {
    const q = query(collection(db, 'conversations'), orderBy('lastMessageAt', 'desc'));
    return onSnapshot(q, function(snap) {
        var list = [];
        snap.forEach(function(d) {
            var data = d.data();
            data.id = d.id;
            list.push(data);
        });
        callback(list);
    }, function(err) {
        console.error('Erreur conversations:', err);
        if (onError) onError(err);
    });
}

/**
 * Écoute les messages d'une conversation
 */
export function watchMessages(conversationId, callback, onError) {
    const q = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'asc'),
        limit(200)
    );
    return onSnapshot(q, function(snap) {
        var list = [];
        snap.forEach(function(d) {
            var data = d.data();
            data.id = d.id;
            list.push(data);
        });
        callback(list);
    }, function(err) {
        console.error('Erreur messages:', err);
        if (onError) onError(err);
    });
}

/**
 * Écoute une conversation unique (pour le client)
 */
export function watchConversation(conversationId, callback, onError) {
    return onSnapshot(doc(db, 'conversations', conversationId), function(snap) {
        if (snap.exists()) {
            var data = snap.data();
            data.id = snap.id;
            callback(data);
        } else {
            callback(null);
        }
    }, function(err) {
        console.error('Erreur conversation:', err);
        if (onError) onError(err);
    });
}

/**
 * Crée ou récupère une conversation pour un client
 */
export async function getOrCreateConversation(clientId, clientName, clientPhone) {
    const conversationId = 'conv_' + clientId;
    const ref = doc(db, 'conversations', conversationId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            clientId: clientId,
            clientName: clientName || 'Invité',
            clientPhone: clientPhone || '',
            lastMessage: '',
            lastMessageAt: new Date().toISOString(),
            unreadByAdmin: false,
            unreadByClient: false,
            createdAt: new Date().toISOString()
        });
    }
    return conversationId;
}

/**
 * Envoie un message dans une conversation
 */
export async function sendMessage(conversationId, sender, text) {
    const msgRef = collection(db, 'conversations', conversationId, 'messages');
    await addDoc(msgRef, {
        sender: sender,
        text: text,
        createdAt: new Date().toISOString()
    });

    const convRef = doc(db, 'conversations', conversationId);
    const updateData = {
        lastMessage: text,
        lastMessageAt: new Date().toISOString()
    };
    if (sender === 'client') {
        updateData.unreadByAdmin = true;
        updateData.unreadByClient = false;
    } else {
        updateData.unreadByClient = true;
        updateData.unreadByAdmin = false;
    }
    await updateDoc(convRef, updateData);
}

/**
 * Marque une conversation comme lue
 */
export async function markConversationRead(conversationId, reader) {
    const convRef = doc(db, 'conversations', conversationId);
    const updateData = {};
    if (reader === 'admin') updateData.unreadByAdmin = false;
    else updateData.unreadByClient = false;
    await updateDoc(convRef, updateData);
}