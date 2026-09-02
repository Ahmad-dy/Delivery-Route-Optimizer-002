import { doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/firebaseApp';
import { handleFirestoreError, OperationType } from '../firebase/firestoreErrorHandler';
import { Driver, DriverProps } from '../../domain/entities/Driver';
import { DriverRepository } from '../../application/ports/DriverRepository';

export class FirestoreDriverRepository implements DriverRepository {
  private static readonly COLLECTION = 'drivers';

  public async getAll(): Promise<readonly Driver[]> {
    const collectionPath = FirestoreDriverRepository.COLLECTION;
    try {
      const colRef = collection(db, collectionPath);
      const snapshot = await getDocs(colRef);
      const drivers: Driver[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as DriverProps;
        drivers.push(Driver.create(data));
      });
      return Object.freeze(drivers);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    }
  }

  public async getById(driverId: string): Promise<Driver | null> {
    const docPath = `${FirestoreDriverRepository.COLLECTION}/${driverId}`;
    try {
      const docRef = doc(db, FirestoreDriverRepository.COLLECTION, driverId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return null;
      }
      const data = snapshot.data() as DriverProps;
      return Driver.create(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  }

  public async create(driver: Driver): Promise<void> {
    const docPath = `${FirestoreDriverRepository.COLLECTION}/${driver.driverId}`;
    try {
      const docRef = doc(db, FirestoreDriverRepository.COLLECTION, driver.driverId);
      await setDoc(docRef, driver.toJSON());
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  }

  public async update(driver: Driver): Promise<void> {
    const docPath = `${FirestoreDriverRepository.COLLECTION}/${driver.driverId}`;
    try {
      const docRef = doc(db, FirestoreDriverRepository.COLLECTION, driver.driverId);
      await setDoc(docRef, driver.toJSON(), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  }

  public async delete(driverId: string): Promise<void> {
    const docPath = `${FirestoreDriverRepository.COLLECTION}/${driverId}`;
    try {
      const docRef = doc(db, FirestoreDriverRepository.COLLECTION, driverId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }

  public async setActive(driverId: string, active: boolean): Promise<void> {
    const docPath = `${FirestoreDriverRepository.COLLECTION}/${driverId}`;
    try {
      const docRef = doc(db, FirestoreDriverRepository.COLLECTION, driverId);
      await updateDoc(docRef, { active });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  }
}
