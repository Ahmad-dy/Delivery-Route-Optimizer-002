import { IDistributionHistoryRepository } from '../../ports/IDistributionHistoryRepository';
import {
  DistributionComparisonResult,
  ReportingDomainService
} from '../../../domain/entities/ReportingEntities';
import { NotFoundError } from '../../../domain/errors/DomainErrors';

export interface CompareDistributionsRequest {
  readonly baseIdentifier: { distributionId?: string; revision?: number };
  readonly targetIdentifier: { distributionId?: string; revision?: number };
}

export class CompareDistributionsUseCase {
  constructor(private readonly historyRepository: IDistributionHistoryRepository) {}

  public async execute(request: CompareDistributionsRequest): Promise<DistributionComparisonResult> {
    const baseDist = request.baseIdentifier.distributionId
      ? await this.historyRepository.getApprovedDistributionById(request.baseIdentifier.distributionId)
      : typeof request.baseIdentifier.revision === 'number'
      ? await this.historyRepository.getApprovedDistributionByRevision(request.baseIdentifier.revision)
      : null;

    if (!baseDist) {
      const id = request.baseIdentifier.distributionId || `rev-${request.baseIdentifier.revision}`;
      throw new NotFoundError('ApprovedDistribution (Base)', id);
    }

    const targetDist = request.targetIdentifier.distributionId
      ? await this.historyRepository.getApprovedDistributionById(request.targetIdentifier.distributionId)
      : typeof request.targetIdentifier.revision === 'number'
      ? await this.historyRepository.getApprovedDistributionByRevision(request.targetIdentifier.revision)
      : null;

    if (!targetDist) {
      const id = request.targetIdentifier.distributionId || `rev-${request.targetIdentifier.revision}`;
      throw new NotFoundError('ApprovedDistribution (Target)', id);
    }

    return ReportingDomainService.compareDistributions(baseDist, targetDist);
  }
}
