import { IDistributionHistoryRepository } from '../../ports/IDistributionHistoryRepository';
import { IAuditRepository } from '../../ports/IAuditRepository';
import { ApprovedDistribution } from '../../../domain/entities/ApprovedDistribution';
import { AuditEvent } from '../../../domain/entities/AuditEvent';
import { NotFoundError } from '../../../domain/errors/DomainErrors';

export interface GetDistributionDetailsRequest {
  readonly distributionId?: string;
  readonly revision?: number;
  readonly requestingUserId?: string;
  readonly requestingUserEmail?: string;
}

export class GetDistributionDetailsUseCase {
  constructor(
    private readonly historyRepository: IDistributionHistoryRepository,
    private readonly auditRepository?: IAuditRepository
  ) {}

  public async execute(request: GetDistributionDetailsRequest): Promise<ApprovedDistribution> {
    let distribution: ApprovedDistribution | null = null;

    if (request.distributionId) {
      distribution = await this.historyRepository.getApprovedDistributionById(request.distributionId);
    } else if (typeof request.revision === 'number') {
      distribution = await this.historyRepository.getApprovedDistributionByRevision(request.revision);
    } else {
      throw new NotFoundError('ApprovedDistribution', 'unspecified');
    }

    if (!distribution) {
      const identifier = request.distributionId || `revision-${request.revision}`;
      throw new NotFoundError('ApprovedDistribution', identifier);
    }

    // Record audit event for viewing historical snapshot
    if (this.auditRepository && request.requestingUserId) {
      try {
        const auditEvent = AuditEvent.createNew(
          'DISTRIBUTION_VIEWED',
          request.requestingUserId,
          request.requestingUserEmail,
          distribution.distributionId,
          distribution.revision,
          {
            accessedAt: new Date().toISOString(),
            routesCount: distribution.routes.length,
            stopsCount: distribution.stops.length
          }
        );
        await this.auditRepository.logEvent(auditEvent);
      } catch (err) {
        // Non-blocking for viewing operation, but log warning
        console.warn('Failed to record DISTRIBUTION_VIEWED audit event:', err);
      }
    }

    return distribution;
  }
}
