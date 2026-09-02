import { Buyer } from '../../domain/entities/Buyer';
import { Driver } from '../../domain/entities/Driver';
import { GlobalSettings } from '../../domain/entities/Settings';
import { BuyerRepository } from '../../application/ports/BuyerRepository';
import { DriverRepository } from '../../application/ports/DriverRepository';
import { SettingsRepository } from '../../application/ports/SettingsRepository';
import { AuthRepository, AuthUser, AuthStateChangeCallback } from '../../application/ports/AuthRepository';

export class MemoryBuyerRepository implements BuyerRepository {
  private buyers: Map<string, Buyer> = new Map();

  constructor(initialBuyers: Buyer[] = []) {
    for (const b of initialBuyers) {
      this.buyers.set(b.buyerCode, b);
    }
  }

  public async getByCode(buyerCode: string): Promise<Buyer | null> {
    return this.buyers.get(buyerCode) || null;
  }

  public async getByCodes(buyerCodes: readonly string[]): Promise<readonly Buyer[]> {
    const uniqueCodes = Array.from(new Set(buyerCodes.map(c => c.trim()))).filter(c => c.length > 0);
    const found: Buyer[] = [];
    for (const code of uniqueCodes) {
      const b = this.buyers.get(code);
      if (b) {
        found.push(b);
      }
    }
    return Object.freeze(found);
  }

  public async getAll(): Promise<readonly Buyer[]> {
    return Object.freeze(Array.from(this.buyers.values()));
  }

  public async create(buyer: Buyer): Promise<void> {
    this.buyers.set(buyer.buyerCode, buyer);
  }

  public async update(buyer: Buyer): Promise<void> {
    this.buyers.set(buyer.buyerCode, buyer);
  }

  public async delete(buyerCode: string): Promise<void> {
    this.buyers.delete(buyerCode);
  }

  public async exists(buyerCode: string): Promise<boolean> {
    return this.buyers.has(buyerCode);
  }

  public clear(): void {
    this.buyers.clear();
  }
}

export class MemoryDriverRepository implements DriverRepository {
  private drivers: Map<string, Driver> = new Map();

  constructor(initialDrivers: Driver[] = []) {
    for (const d of initialDrivers) {
      this.drivers.set(d.driverId, d);
    }
  }

  public async getAll(): Promise<readonly Driver[]> {
    return Object.freeze(Array.from(this.drivers.values()));
  }

  public async getById(driverId: string): Promise<Driver | null> {
    return this.drivers.get(driverId) || null;
  }

  public async create(driver: Driver): Promise<void> {
    this.drivers.set(driver.driverId, driver);
  }

  public async update(driver: Driver): Promise<void> {
    this.drivers.set(driver.driverId, driver);
  }

  public async delete(driverId: string): Promise<void> {
    this.drivers.delete(driverId);
  }

  public async setActive(driverId: string, active: boolean): Promise<void> {
    const driver = this.drivers.get(driverId);
    if (driver) {
      this.drivers.set(driverId, driver.withActiveStatus(active));
    }
  }

  public clear(): void {
    this.drivers.clear();
  }
}

export class MemorySettingsRepository implements SettingsRepository {
  private settings: GlobalSettings;

  constructor(initialSettings: GlobalSettings = GlobalSettings.createDefault()) {
    this.settings = initialSettings;
  }

  public async getGlobalSettings(): Promise<GlobalSettings> {
    return this.settings;
  }

  public async updateGlobalSettings(settings: GlobalSettings): Promise<void> {
    this.settings = settings;
  }
}

export class MemoryAuthRepository implements AuthRepository {
  private currentUser: AuthUser | null = null;
  private listeners: Set<AuthStateChangeCallback> = new Set();

  constructor(initialUser: AuthUser | null = null) {
    this.currentUser = initialUser;
  }

  public async getCurrentUser(): Promise<AuthUser | null> {
    return this.currentUser;
  }

  public async signInWithEmail(email: string): Promise<AuthUser> {
    const user: AuthUser = {
      uid: 'test-user-id',
      email,
      displayName: email.split('@')[0],
      role: 'DISPATCHER'
    };
    this.currentUser = user;
    this.notifyListeners();
    return user;
  }

  public async signInWithGoogle(): Promise<AuthUser> {
    const user: AuthUser = {
      uid: 'google-test-user',
      email: 'dispatcher@delivery.iq',
      displayName: 'مأمور التوزيع التجريبي',
      role: 'DISPATCHER'
    };
    this.currentUser = user;
    this.notifyListeners();
    return user;
  }

  public async signOut(): Promise<void> {
    this.currentUser = null;
    this.notifyListeners();
  }

  public onAuthStateChanged(callback: AuthStateChangeCallback): () => void {
    this.listeners.add(callback);
    callback(this.currentUser);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    for (const cb of this.listeners) {
      cb(this.currentUser);
    }
  }
}
