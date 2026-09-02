import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseApp';
import { handleFirestoreError, OperationType } from '../firebase/firestoreErrorHandler';
import { GlobalSettings, GlobalSettingsProps } from '../../domain/entities/Settings';
import { SettingsRepository } from '../../application/ports/SettingsRepository';

export class FirestoreSettingsRepository implements SettingsRepository {
  private static readonly COLLECTION = 'settings';
  private static readonly DOC_ID = GlobalSettings.DEFAULT_SETTING_ID;

  public async getGlobalSettings(): Promise<GlobalSettings> {
    const docPath = `${FirestoreSettingsRepository.COLLECTION}/${FirestoreSettingsRepository.DOC_ID}`;
    try {
      const docRef = doc(db, FirestoreSettingsRepository.COLLECTION, FirestoreSettingsRepository.DOC_ID);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        const defaultSettings = GlobalSettings.createDefault();
        await this.updateGlobalSettings(defaultSettings);
        return defaultSettings;
      }
      const data = snapshot.data() as GlobalSettingsProps;
      return new GlobalSettings(data.depot, data.optimizationConfig, data.companyName, data.updatedAt);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }
  }

  public async updateGlobalSettings(settings: GlobalSettings): Promise<void> {
    const docPath = `${FirestoreSettingsRepository.COLLECTION}/${FirestoreSettingsRepository.DOC_ID}`;
    try {
      const docRef = doc(db, FirestoreSettingsRepository.COLLECTION, FirestoreSettingsRepository.DOC_ID);
      await setDoc(docRef, settings.toJSON(), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }
}
