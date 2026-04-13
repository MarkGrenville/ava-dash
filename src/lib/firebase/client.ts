import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import {
	getFirestore,
	connectFirestoreEmulator,
	type Firestore
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
	apiKey: 'AIzaSyAM0LRObYyQLkUK5L41iMsaBxGXDau-nWQ',
	authDomain: 'ava-dash.firebaseapp.com',
	projectId: 'ava-dash',
	storageBucket: 'ava-dash.firebasestorage.app',
	messagingSenderId: '178523762075',
	appId: '1:178523762075:web:78b41b5db847b22b2b053e'
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

function initialize() {
	if (getApps().length > 0) {
		app = getApps()[0];
	} else {
		app = initializeApp(firebaseConfig);
	}

	auth = getAuth(app);
	db = getFirestore(app);
	storage = getStorage(app);

	if (import.meta.env.DEV) {
		console.log('[firebase] Connecting to emulators...');
		try {
			connectAuthEmulator(auth, 'http://localhost:7512', { disableWarnings: true });
			connectFirestoreEmulator(db, 'localhost', 7511);
			connectStorageEmulator(storage, 'localhost', 7513);
			console.log('[firebase] Emulators connected');
		} catch (err) {
			console.log('[firebase] Emulators already connected or error:', (err as Error).message);
		}
	}
}

initialize();

export { app, auth, db, storage };

export const API_BASE = import.meta.env.DEV
	? 'http://localhost:7510/ava-dash/us-central1/api'
	: '/api';
