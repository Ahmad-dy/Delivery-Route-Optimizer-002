import { IDistributionHistoryRepository } from '../../ports/IDistributionHistoryRepository';
import {
  DriverPerformanceMetrics,
  ReportFilter,
  ReportingDomainService
} from '../../../domain/entities/ReportingEntities';

export class GetDriverPerformanceUseCase {
  constructor(private readonly historyRepository: IDistributionHistoryRepository) {}

  public async execute(filter?: ReportFilter): Promise<readonly DriverPerformanceMetrics[]> {
    const distributions = await this.historyRepository.getAllForReporting({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      datePreset: filter?.periodPreset || filter?.datePreset
    });

    return ReportingDomainService.calculateDriverPerformance(distributions, filter?.driverId);
  }
}
