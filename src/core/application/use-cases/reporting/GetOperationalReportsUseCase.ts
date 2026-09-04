import { IDistributionHistoryRepository } from '../../ports/IDistributionHistoryRepository';
import {
  OperationalMetrics,
  ReportFilter,
  ReportingDomainService
} from '../../../domain/entities/ReportingEntities';

export class GetOperationalReportsUseCase {
  constructor(private readonly historyRepository: IDistributionHistoryRepository) {}

  public async execute(filter?: ReportFilter): Promise<OperationalMetrics> {
    const distributions = await this.historyRepository.getAllForReporting({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      datePreset: filter?.periodPreset || filter?.datePreset
    });

    return ReportingDomainService.calculateOperationalMetrics(distributions, filter);
  }
}
