import { doc, setDoc, getDocs, collection, query, orderBy, limit as firestoreLimit, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseApp';
import { handleFirestoreError, OperationType } from '../firebase/firestoreErrorHandler';
import { AuditEvent, AuditEventProps } from '../../domain/entities/AuditEvent';
import { IAuditRepository, AuditFilter } from '../../application/ports/IAuditRepository';

export class FirestoreAuditRepository implements IAuditRepository {
  private static readonly COLLECTION = 'auditEvents';

  /**
   * Appends an audit event to the append-only audit trail collection.
   * Direct updates or deletions are strictly prohibited by Firestore security rules.
   */
  public async logEvent(event: AuditEvent): Promise<void> {
    const docPath = `${FirestoreAuditRepository.COLLECTION}/${event.eventId}`;
    try {
      const docRef = doc(db, FirestoreAuditRepository.COLLECTION, event.eventId);
      await setDoc(docRef, event.toJSON());
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }

  /**
   * Queries audit events matching the provided filter criteria.
   */
  public async listEvents(filter?: AuditFilter): Promise<readonly AuditEvent[]> {
    try {
      const colRef = collection(db, FirestoreAuditRepository.COLLECTION);
      const constraints: any[] = [];

      if (filter?.distributionId) {
        constraints.push(where('distributionId', '==', filter.distributionId));
      }
      if (filter?.userId) {
        constraints.push(where('userId', '==', filter.userId));
      }
      if (filter?.eventType) {
        constraints.push(where('eventType', '==', filter.eventType));
      }

      // Order by creation timestamp descending
      constraints.push(orderBy('createdAt', 'desc'));

      const maxLimit = filter?.limit ?? 100;
      constraints.push(firestoreLimit(maxLimit));

      const q = query(colRef, ...constraints);
      const snapshot = await getDocs(q);

      const events: AuditEvent[] = [];
      snapshot.forEach(docSnap => {
        try {
          const data = docSnap.data() as AuditEventProps;
          events.push(AuditEvent.create(data));
        } catch (err) {
          console.warn('Skipping corrupted audit record:', docSnap.id, err);
        }
      });

      return Object.freeze(events);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, FirestoreAuditRepository.COLLECTION);
      return Object.freeze([]);
    }
  }
}
