import { IAuditRepository } from '../../ports/IAuditRepository';
import { AuditEvent, AuditEventType } from '../../../domain/entities/AuditEvent';
import { AuditWriteFailedError, ValidationError } from '../../../domain/errors/DomainErrors';

export interface LogAuditEventRequest {
  readonly eventType: AuditEventType;
  readonly userId: string;
  readonly userEmail?: string;
  readonly distributionId?: string;
  readonly revision?: number;
  readonly metadata?: Record<string, unknown>;
}

export class LogAuditEventUseCase {
  constructor(private readonly auditRepository: IAuditRepository) {}

  public async execute(request: LogAuditEventRequest): Promise<AuditEvent> {
    if (!request.userId || request.userId.trim().length === 0) {
      throw new ValidationError('User ID is required to log an audit event.', 'validation.userIdRequired');
    }

    try {
      const event = AuditEvent.createNew(
        request.eventType,
        request.userId,
        request.userEmail,
        request.distributionId,
        request.revision,
        request.metadata
      );

      await this.auditRepository.logEvent(event);
      return event;
    } catch (err: any) {
      throw new AuditWriteFailedError(err.message || 'Failed to persist audit trail entry');
    }
  }
}
