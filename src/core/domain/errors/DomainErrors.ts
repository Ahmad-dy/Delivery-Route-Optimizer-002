/**
 * Centralized Domain & Application Error Hierarchy
 * Includes machine-readable codes, technical messages, and user-facing localization keys.
 */

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_BUYER_CODE = 'DUPLICATE_BUYER_CODE',
  DUPLICATE_LIST_ERROR = 'DUPLICATE_LIST_ERROR',
  MISSING_BUYER_ERROR = 'MISSING_BUYER_ERROR',
  MISSING_LOCATION_ERROR = 'MISSING_LOCATION_ERROR',
  CAPACITY_EXCEEDED_ERROR = 'CAPACITY_EXCEEDED_ERROR',
  OVERSIZED_LIST_ERROR = 'OVERSIZED_LIST_ERROR',
  ROUTING_API_ERROR = 'ROUTING_API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  IMPORT_ERROR = 'IMPORT_ERROR',
  OPTIMIZATION_ERROR = 'OPTIMIZATION_ERROR',
  REPOSITORY_ERROR = 'REPOSITORY_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  ROUTING_UNAVAILABLE_ERROR = 'ROUTING_UNAVAILABLE_ERROR',
  ROUTING_TIMEOUT_ERROR = 'ROUTING_TIMEOUT_ERROR',
  ROUTING_QUOTA_ERROR = 'ROUTING_QUOTA_ERROR',
  ROUTING_INVALID_REQUEST_ERROR = 'ROUTING_INVALID_REQUEST_ERROR',
  ROUTING_NO_ROUTE_ERROR = 'ROUTING_NO_ROUTE_ERROR',
  DEPOT_LOCATION_INVALID_ERROR = 'DEPOT_LOCATION_INVALID_ERROR'
}

export abstract class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly messageKey: string;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, technicalMessage: string, messageKey: string, details?: Record<string, unknown>) {
    super(technicalMessage);
    this.name = this.constructor.name;
    this.code = code;
    this.messageKey = messageKey;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(technicalMessage: string, messageKey = 'errors.validation', details?: Record<string, unknown>) {
    super(ErrorCode.VALIDATION_ERROR, technicalMessage, messageKey, details);
  }
}

export class DuplicateBuyerError extends AppError {
  constructor(buyerCode: string) {
    super(
      ErrorCode.DUPLICATE_BUYER_CODE,
      `Buyer with code '${buyerCode}' already exists.`,
      'errors.duplicateBuyerCode',
      { buyerCode }
    );
  }
}

export class DuplicateListError extends AppError {
  constructor(listNumber: string) {
    super(
      ErrorCode.DUPLICATE_LIST_ERROR,
      `Delivery list with number '${listNumber}' is duplicated.`,
      'errors.duplicateListNumber',
      { listNumber }
    );
  }
}

export class MissingBuyerError extends AppError {
  constructor(buyerCode: string) {
    super(
      ErrorCode.MISSING_BUYER_ERROR,
      `Buyer with code '${buyerCode}' not found in registry.`,
      'errors.missingBuyer',
      { buyerCode }
    );
  }
}

export class MissingLocationError extends AppError {
  constructor(buyerCode: string) {
    super(
      ErrorCode.MISSING_LOCATION_ERROR,
      `Buyer '${buyerCode}' does not have valid GPS coordinates.`,
      'errors.missingLocation',
      { buyerCode }
    );
  }
}

export class CapacityExceededError extends AppError {
  constructor(driverId: string, attemptedWeight: number, maxAllowed: number) {
    super(
      ErrorCode.CAPACITY_EXCEEDED_ERROR,
      `Driver '${driverId}' assigned weight (${attemptedWeight} kg) exceeds 110% ceiling (${maxAllowed} kg).`,
      'errors.capacityExceeded',
      { driverId, attemptedWeight, maxAllowed }
    );
  }
}

export class OversizedListError extends AppError {
  constructor(listNumber: string, weightKg: number, fleetMaxCapacityKg: number) {
    super(
      ErrorCode.OVERSIZED_LIST_ERROR,
      `List #${listNumber} weight (${weightKg} kg) exceeds maximum fleet single-driver capacity (${fleetMaxCapacityKg} kg).`,
      'errors.oversizedList',
      { listNumber, weightKg, fleetMaxCapacityKg }
    );
  }
}

export class RoutingApiError extends AppError {
  constructor(technicalMessage: string, details?: Record<string, unknown>) {
    super(ErrorCode.ROUTING_API_ERROR, technicalMessage, 'errors.routingUnavailable', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(technicalMessage: string, details?: Record<string, unknown>) {
    super(ErrorCode.AUTHENTICATION_ERROR, technicalMessage, 'errors.authFailed', details);
  }
}

export class PermissionError extends AppError {
  constructor(technicalMessage: string, details?: Record<string, unknown>) {
    super(ErrorCode.PERMISSION_ERROR, technicalMessage, 'errors.permissionDenied', details);
  }
}

export class RepositoryError extends AppError {
  constructor(technicalMessage: string, details?: Record<string, unknown>) {
    super(ErrorCode.REPOSITORY_ERROR, technicalMessage, 'errors.repositoryFailure', details);
  }
}

export class NotFoundError extends AppError {
  constructor(entityName: string, id: string) {
    super(
      ErrorCode.NOT_FOUND_ERROR,
      `${entityName} with identifier '${id}' was not found.`,
      'errors.notFound',
      { entityName, id }
    );
  }
}

export class RoutingUnavailableError extends AppError {
  constructor(technicalMessage = 'Google Routes service is currently unavailable.', details?: Record<string, unknown>) {
    super(ErrorCode.ROUTING_UNAVAILABLE_ERROR, technicalMessage, 'errors.routingUnavailable', details);
  }
}

export class RoutingTimeoutError extends AppError {
  constructor(timeoutMs: number, details?: Record<string, unknown>) {
    super(
      ErrorCode.ROUTING_TIMEOUT_ERROR,
      `Routing request timed out after ${timeoutMs}ms.`,
      'errors.routingTimeout',
      { timeoutMs, ...details }
    );
  }
}

export class RoutingQuotaError extends AppError {
  constructor(technicalMessage = 'Google Routes API quota exceeded or rate limit hit.', details?: Record<string, unknown>) {
    super(ErrorCode.ROUTING_QUOTA_ERROR, technicalMessage, 'errors.routingQuotaExceeded', details);
  }
}

export class RoutingInvalidRequestError extends AppError {
  constructor(technicalMessage: string, details?: Record<string, unknown>) {
    super(ErrorCode.ROUTING_INVALID_REQUEST_ERROR, technicalMessage, 'errors.routingInvalidRequest', details);
  }
}

export class RoutingNoRouteError extends AppError {
  constructor(originId: string, destinationId: string, details?: Record<string, unknown>) {
    super(
      ErrorCode.ROUTING_NO_ROUTE_ERROR,
      `No road route found between '${originId}' and '${destinationId}'.`,
      'errors.routingNoRoute',
      { originId, destinationId, ...details }
    );
  }
}

export class DepotLocationInvalidError extends AppError {
  constructor(latitude?: number, longitude?: number) {
    super(
      ErrorCode.DEPOT_LOCATION_INVALID_ERROR,
      `Depot has missing or invalid GPS coordinates (${latitude}, ${longitude}).`,
      'errors.depotLocationInvalid',
      { latitude, longitude }
    );
  }
}

