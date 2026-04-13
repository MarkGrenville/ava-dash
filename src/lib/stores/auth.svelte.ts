import { auth, db } from '$lib/firebase/client';
import {
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signInWithPopup,
	GoogleAuthProvider,
	signOut as firebaseSignOut,
	type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from '$lib/types';

let currentUser = $state<FirebaseUser | null>(null);
let userProfile = $state<User | null>(null);
let loading = $state(true);
let profileLoading = $state(false);
let error = $state<string | null>(null);

const isAuthenticated = $derived(currentUser !== null);
const isAdmin = $derived(userProfile?.role === 'admin');

async function loadProfile(user: FirebaseUser) {
	profileLoading = true;
	try {
		const adminDoc = await getDoc(doc(db, 'administrators', user.uid));
		const adminRole = adminDoc.exists() ? 'admin' : 'user';
		console.log(`[auth] Role: ${adminRole}`);

		const userDoc = await getDoc(doc(db, 'users', user.uid));
		if (userDoc.exists()) {
			userProfile = { ...userDoc.data() as User, role: adminRole };
		} else {
			const newProfile: User = {
				uid: user.uid,
				email: user.email || '',
				displayName: user.displayName || user.email || '',
				role: adminRole,
				createdAt: new Date().toISOString()
			};
			await setDoc(doc(db, 'users', user.uid), newProfile);
			userProfile = newProfile;
			console.log('[auth] Created user profile');
		}
	} catch (err) {
		console.error('[auth] Failed to load user profile:', err);
		userProfile = {
			uid: user.uid,
			email: user.email || '',
			displayName: user.displayName || user.email || '',
			role: 'user',
			createdAt: new Date().toISOString()
		};
	} finally {
		profileLoading = false;
	}
}

try {
	onAuthStateChanged(auth, (user) => {
		currentUser = user;
		loading = false;
		if (user) {
			console.log(`[auth] User signed in: ${user.email}`);
			loadProfile(user);
		} else {
			userProfile = null;
			profileLoading = false;
			console.log('[auth] User signed out');
		}
	});
} catch (err) {
	console.error('[auth] Failed to set up auth listener:', err);
	loading = false;
}

setTimeout(() => {
	if (loading) {
		console.warn('[auth] Auth state timed out after 5s, forcing loading=false');
		loading = false;
	}
}, 5000);

async function signInWithEmail(email: string, password: string) {
	error = null;
	try {
		await signInWithEmailAndPassword(auth, email, password);
	} catch (err) {
		error = (err as Error).message;
		console.error('[auth] Email sign-in error:', error);
		throw err;
	}
}

async function signInWithGoogle() {
	error = null;
	try {
		const provider = new GoogleAuthProvider();
		await signInWithPopup(auth, provider);
	} catch (err) {
		error = (err as Error).message;
		console.error('[auth] Google sign-in error:', error);
		throw err;
	}
}

async function signOut() {
	await firebaseSignOut(auth);
}

async function getIdToken(): Promise<string | null> {
	if (!currentUser) return null;
	return currentUser.getIdToken();
}

export const authStore = {
	get currentUser() {
		return currentUser;
	},
	get userProfile() {
		return userProfile;
	},
	get loading() {
		return loading;
	},
	get profileLoading() {
		return profileLoading;
	},
	get error() {
		return error;
	},
	get isAuthenticated() {
		return isAuthenticated;
	},
	get isAdmin() {
		return isAdmin;
	},
	signInWithEmail,
	signInWithGoogle,
	signOut,
	getIdToken
};
