import { ValidationError } from '../errors/DomainErrors';

export type AuditEventType =
  | 'DISTRIBUTION_OPTIMIZATION_STARTED'
  | 'DISTRIBUTION_OPTIMIZATION_COMPLETED'
  | 'MANUAL_STOP_REASSIGNED'
  | 'MANUAL_STOP_REORDERED'
  | 'DISTRIBUTION_APPROVED'
  | 'DISTRIBUTION_EXPORTED_EXCEL'
  | 'DISTRIBUTION_EXPORTED_PDF'
  | 'DISTRIBUTION_VIEWED';

export interface AuditEventProps {
  readonly eventId: string;
  readonly eventType: AuditEventType;
  readonly userId: string;
  readonly userEmail?: string;
  readonly createdAt: string;
  readonly distributionId?: string;
  readonly revision?: number;
  readonly metadata?: Record<string, unknown>;
}

export class AuditEvent {
  public readonly eventId: string;
  public readonly eventType: AuditEventType;
  public readonly userId: string;
  public readonly userEmail?: string;
  public readonly createdAt: string;
  public readonly distributionId?: string;
  public readonly revision?: number;
  public readonly metadata?: Record<string, unknown>;

  constructor(props: AuditEventProps) {
    AuditEvent.validate(props);
    this.eventId = props.eventId.trim();
    this.eventType = props.eventType;
    this.userId = props.userId.trim();
    this.userEmail = props.userEmail ? props.userEmail.trim() : undefined;
    this.createdAt = props.createdAt;
    this.distributionId = props.distributionId ? props.distributionId.trim() : undefined;
    this.revision = typeof props.revision === 'number' ? props.revision : undefined;
    this.metadata = props.metadata ? Object.freeze({ ...props.metadata }) : undefined;
  }

  public static create(props: AuditEventProps): AuditEvent {
    return new AuditEvent(props);
  }

  public static createNew(
    eventType: AuditEventType,
    userId: string,
    userEmail?: string,
    distributionId?: string,
    revision?: number,
    metadata?: Record<string, unknown>
  ): AuditEvent {
    const eventId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const createdAt = new Date().toISOString();
    return new AuditEvent({
      eventId,
      eventType,
      userId,
      userEmail,
      createdAt,
      distributionId,
      revision,
      metadata
    });
  }

  public static validate(props: AuditEventProps): void {
    if (!props.eventId || typeof props.eventId !== 'string' || props.eventId.trim().length === 0) {
      throw new ValidationError('Event ID is required for audit event.', 'validation.eventIdRequired');
    }
    if (!props.eventType || typeof props.eventType !== 'string') {
      throw new ValidationError('Event type is required for audit event.', 'validation.eventTypeRequired');
    }
    if (!props.userId || typeof props.userId !== 'string' || props.userId.trim().length === 0) {
      throw new ValidationError('User ID is required for audit event.', 'validation.userIdRequired');
    }
    if (!props.createdAt || typeof props.createdAt !== 'string' || isNaN(Date.parse(props.createdAt))) {
      throw new ValidationError('Valid ISO createdAt timestamp is required for audit event.', 'validation.createdAtRequired');
    }
  }

  public toJSON(): AuditEventProps {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      userId: this.userId,
      userEmail: this.userEmail,
      createdAt: this.createdAt,
      distributionId: this.distributionId,
      revision: this.revision,
      metadata: this.metadata
    };
  }
}
