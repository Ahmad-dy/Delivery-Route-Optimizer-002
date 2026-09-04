import { ApprovedDistribution } from '../../domain/entities/ApprovedDistribution';

export interface DistributionRepository {
  /**
   * Persists an approved distribution snapshot immutably into Firestore.
   * Atomically computes the sequential revision number using a Firestore transaction,
   * enforces snapshot immutability (cannot overwrite or update existing snapshots),
   * and returns the persisted ApprovedDistribution with its authoritative revision.
   */
  saveApprovedDistribution(distribution: ApprovedDistribution): Promise<ApprovedDistribution>;

  /**
   * Retrieves an approved distribution snapshot by ID.
   */
  getApprovedDistribution(distributionId: string): Promise<ApprovedDistribution | null>;

  /**
   * Lists the most recent approved distributions in descending order of approval.
   */
  listApprovedDistributions(): Promise<readonly ApprovedDistribution[]>;
}
