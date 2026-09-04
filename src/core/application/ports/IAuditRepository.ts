import { AuditEvent, AuditEventType } from '../../domain/entities/AuditEvent';

export interface AuditFilter {
  readonly distributionId?: string;
  readonly revision?: number;
  readonly userId?: string;
  readonly eventType?: AuditEventType;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly limit?: number;
}

export interface IAuditRepository {
  /**
   * Appends an audit event to the append-only audit trail collection.
   * Direct updates or deletions are strictly prohibited by security rules.
   */
  logEvent(event: AuditEvent): Promise<void>;

  /**
   * Queries audit events matching the provided filter criteria.
   */
  listEvents(filter?: AuditFilter): Promise<readonly AuditEvent[]>;
}
