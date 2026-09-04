import {
  IDistributionHistoryRepository,
  HistoryPaginationResult
} from '../../ports/IDistributionHistoryRepository';
import { DistributionHistoryFilter } from '../../../domain/entities/ReportingEntities';

export interface GetDistributionHistoryRequest {
  readonly filter?: DistributionHistoryFilter;
  readonly limit?: number;
  readonly cursor?: string;
  readonly direction?: 'next' | 'prev';
}

export class GetDistributionHistoryUseCase {
  constructor(private readonly historyRepository: IDistributionHistoryRepository) {}

  public async execute(request: GetDistributionHistoryRequest = {}): Promise<HistoryPaginationResult> {
    const limit = request.limit ?? 20;
    return this.historyRepository.listHistory(request.filter, {
      limit,
      cursor: request.cursor,
      direction: request.direction
    });
  }
}
