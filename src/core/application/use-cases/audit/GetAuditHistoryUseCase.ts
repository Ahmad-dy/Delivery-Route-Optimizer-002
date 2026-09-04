import { IAuditRepository, AuditFilter } from '../../ports/IAuditRepository';
import { AuditEvent } from '../../../domain/entities/AuditEvent';

export class GetAuditHistoryUseCase {
  constructor(private readonly auditRepository: IAuditRepository) {}

  public async execute(filter?: AuditFilter): Promise<readonly AuditEvent[]> {
    return this.auditRepository.listEvents(filter);
  }
}
