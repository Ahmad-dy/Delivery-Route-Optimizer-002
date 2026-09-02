export interface AuthUser {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly role?: string;
}

export type AuthStateChangeCallback = (user: AuthUser | null) => void;

export interface AuthRepository {
  /**
   * Returns current authenticated user or null
   */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * Signs in with email and password or provider
   */
  signInWithEmail(email: string, password: string): Promise<AuthUser>;

  /**
   * Signs in with Google popup
   */
  signInWithGoogle(): Promise<AuthUser>;

  /**
   * Signs out current user
   */
  signOut(): Promise<void>;

  /**
   * Subscribes to authentication state transitions
   */
  onAuthStateChanged(callback: AuthStateChangeCallback): () => void;
}
