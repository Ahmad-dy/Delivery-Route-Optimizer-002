import { AuthRepository, AuthUser, AuthStateChangeCallback } from '../../ports/AuthRepository';

export class SignInUseCase {
  constructor(private readonly authRepo: AuthRepository) {}

  public async executeWithEmail(email: string, pass: string): Promise<AuthUser> {
    return this.authRepo.signInWithEmail(email, pass);
  }

  public async executeWithGoogle(): Promise<AuthUser> {
    return this.authRepo.signInWithGoogle();
  }
}

export class SignOutUseCase {
  constructor(private readonly authRepo: AuthRepository) {}

  public async execute(): Promise<void> {
    return this.authRepo.signOut();
  }
}

export class ObserveAuthStateUseCase {
  constructor(private readonly authRepo: AuthRepository) {}

  public execute(callback: AuthStateChangeCallback): () => void {
    return this.authRepo.onAuthStateChanged(callback);
  }
}
