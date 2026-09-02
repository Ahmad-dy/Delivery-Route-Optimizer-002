import { doc, getDoc, getDocs, setDoc, deleteDoc, collection, query, where, documentId } from 'firebase/firestore';
import { db } from '../firebase/firebaseApp';
import { handleFirestoreError, OperationType } from '../firebase/firestoreErrorHandler';
import { Buyer, BuyerProps } from '../../domain/entities/Buyer';
import { BuyerRepository } from '../../application/ports/BuyerRepository';

export class FirestoreBuyerRepository implements BuyerRepository {
  private static readonly COLLECTION = 'buyers';
  public static readonly FIRESTORE_IN_BATCH_LIMIT = 30;

  public async getByCode(buyerCode: string): Promise<Buyer | null> {
    const docPath = `${FirestoreBuyerRepository.COLLECTION}/${buyerCode}`;
    try {
      const docRef = doc(db, FirestoreBuyerRepository.COLLECTION, buyerCode);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return null;
      }
      const data = snapshot.data() as BuyerProps;
      return Buyer.create(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  }

  public async getByCodes(buyerCodes: readonly string[]): Promise<readonly Buyer[]> {
    const uniqueCodes = Array.from(new Set(buyerCodes.map(c => c.trim()))).filter(c => c.length > 0);
    if (uniqueCodes.length === 0) {
      return Object.freeze([]);
    }

    const chunks: string[][] = [];
    for (let i = 0; i < uniqueCodes.length; i += FirestoreBuyerRepository.FIRESTORE_IN_BATCH_LIMIT) {
      chunks.push(uniqueCodes.slice(i, i + FirestoreBuyerRepository.FIRESTORE_IN_BATCH_LIMIT));
    }

    try {
      const colRef = collection(db, FirestoreBuyerRepository.COLLECTION);
      const chunkPromises = chunks.map(async (chunk) => {
        const q = query(colRef, where(documentId(), 'in', chunk));
        const snapshot = await getDocs(q);
        const chunkBuyers: Buyer[] = [];
        snapshot.forEach(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data() as BuyerProps;
            chunkBuyers.push(Buyer.create(data));
          }
        });
        return chunkBuyers;
      });

      const results = await Promise.all(chunkPromises);
      return Object.freeze(results.flat());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, FirestoreBuyerRepository.COLLECTION);
    }
  }

  public async getAll(): Promise<readonly Buyer[]> {
    const collectionPath = FirestoreBuyerRepository.COLLECTION;
    try {
      const colRef = collection(db, collectionPath);
      const snapshot = await getDocs(colRef);
      const buyers: Buyer[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as BuyerProps;
        buyers.push(Buyer.create(data));
      });
      return Object.freeze(buyers);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    }
  }

  public async create(buyer: Buyer): Promise<void> {
    const docPath = `${FirestoreBuyerRepository.COLLECTION}/${buyer.buyerCode}`;
    try {
      const docRef = doc(db, FirestoreBuyerRepository.COLLECTION, buyer.buyerCode);
      await setDoc(docRef, buyer.toJSON());
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  }

  public async update(buyer: Buyer): Promise<void> {
    const docPath = `${FirestoreBuyerRepository.COLLECTION}/${buyer.buyerCode}`;
    try {
      const docRef = doc(db, FirestoreBuyerRepository.COLLECTION, buyer.buyerCode);
      await setDoc(docRef, buyer.toJSON(), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  }

  public async delete(buyerCode: string): Promise<void> {
    const docPath = `${FirestoreBuyerRepository.COLLECTION}/${buyerCode}`;
    try {
      const docRef = doc(db, FirestoreBuyerRepository.COLLECTION, buyerCode);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }

  public async exists(buyerCode: string): Promise<boolean> {
    const buyer = await this.getByCode(buyerCode);
    return buyer !== null;
  }
}
