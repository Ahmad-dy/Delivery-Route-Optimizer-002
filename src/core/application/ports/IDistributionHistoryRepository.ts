import { ApprovedDistribution } from '../../domain/entities/ApprovedDistribution';
import { DistributionHistoryFilter } from '../../domain/entities/ReportingEntities';

export interface HistoryPaginationResult {
  readonly items: readonly ApprovedDistribution[];
  readonly totalCount: number;
  readonly nextCursor?: string;
  readonly prevCursor?: string;
  readonly hasMore: boolean;
}

export interface IDistributionHistoryRepository {
  /**
   * Retrieves an approved distribution snapshot by its ID.
   */
  getApprovedDistributionById(distributionId: string): Promise<ApprovedDistribution | null>;

  /**
   * Retrieves an approved distribution snapshot by its sequence revision number.
   */
  getApprovedDistributionByRevision(revision: number): Promise<ApprovedDistribution | null>;

  /**
   * Lists approved distribution snapshots with cursor-based pagination and flexible filtering.
   */
  listHistory(
    filter?: DistributionHistoryFilter,
    pagination?: { limit: number; cursor?: string; direction?: 'next' | 'prev' }
  ): Promise<HistoryPaginationResult>;

  /**
   * Lists all approved distributions within an optional date range or calendar preset for reporting purposes.
   */
  getAllForReporting(filter?: { startDate?: string; endDate?: string; datePreset?: string }): Promise<readonly ApprovedDistribution[]>;
}
