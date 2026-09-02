import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../firebase/firebaseApp';
import { AuthRepository, AuthUser, AuthStateChangeCallback } from '../../application/ports/AuthRepository';
import { AuthenticationError } from '../../domain/errors/DomainErrors';

export class FirebaseAuthRepository implements AuthRepository {
  private mapUser(user: User | null): AuthUser | null {
    if (!user) return null;
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'Dispatcher',
      role: 'DISPATCHER'
    };
  }

  public async getCurrentUser(): Promise<AuthUser | null> {
    return this.mapUser(auth.currentUser);
  }

  public async signInWithEmail(email: string, pass: string): Promise<AuthUser> {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const user = this.mapUser(cred.user);
      if (!user) throw new Error('Failed to resolve authenticated user.');
      return user;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AuthenticationError(`Failed to sign in: ${message}`);
    }
  }

  public async signInWithGoogle(): Promise<AuthUser> {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const user = this.mapUser(cred.user);
      if (!user) throw new Error('Failed to resolve authenticated user from Google provider.');
      return user;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AuthenticationError(`Failed to sign in with Google: ${message}`);
    }
  }

  public async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AuthenticationError(`Failed to sign out: ${message}`);
    }
  }

  public onAuthStateChanged(callback: AuthStateChangeCallback): () => void {
    return firebaseOnAuthStateChanged(auth, (user) => {
      callback(this.mapUser(user));
    });
  }
}
