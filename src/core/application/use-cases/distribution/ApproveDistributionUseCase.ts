import { Route } from '../../../domain/entities/Route';
import { DeliveryStop } from '../../../domain/entities/DeliveryStop';
import { Driver } from '../../../domain/entities/Driver';
import { Depot } from '../../../domain/entities/Depot';
import { DistributionResult } from '../../../domain/entities/DistributionResult';
import { ApprovedDistribution } from '../../../domain/entities/ApprovedDistribution';
import { DistributionRepository } from '../../ports/DistributionRepository';
import { DistributionInvariantValidator, InvariantValidationResult } from '../../../domain/services/DistributionValidator';
import { DistributionWarningService, DomainDistributionWarning } from '../../../domain/services/distribution/DistributionWarningService';
import { OptimizationConfig } from '../../../domain/value-objects/OptimizationConfig';
import { OptimizationEvaluationService } from '../../../domain/services/OptimizationEvaluationService';

export interface ApproveDistributionRequest {
  readonly distributionId?: string;
  readonly routes: readonly Route[];
  readonly unassignedStops: readonly DeliveryStop[];
  readonly oversizedStops: readonly DeliveryStop[];
  readonly activeDrivers: readonly Driver[];
  readonly depot: Depot;
  readonly config: OptimizationConfig;
  readonly referenceDistanceMeters: number;
  readonly approvedBy?: string;
}

export interface ApproveDistributionResult {
  readonly success: boolean;
  readonly errorMessage?: string;
  readonly approvedDistribution?: ApprovedDistribution;
  readonly validation: InvariantValidationResult;
  readonly warnings: readonly DomainDistributionWarning[];
}

export class ApproveDistributionUseCase {
  constructor(private readonly distributionRepository: DistributionRepository) {}

  public async execute(request: ApproveDistributionRequest): Promise<ApproveDistributionResult> {
    const {
      distributionId,
      routes,
      unassignedStops,
      oversizedStops,
      activeDrivers,
      depot,
      config,
      referenceDistanceMeters,
      approvedBy
    } = request;

    // 1. Evaluate objective breakdown
    const scoreBreakdown = OptimizationEvaluationService.evaluateSolution({
      routes,
      activeDrivers,
      referenceDistanceMeters,
      config
    });

    const totalWeightKg = routes.reduce((sum, r) => sum + r.totalWeightKg, 0);
    const totalDurationSeconds = routes.reduce((sum, r) => sum + r.totalDurationSeconds, 0);

    const tempResult = new DistributionResult({
      routes,
      unassignedStops,
      oversizedStops,
      warnings: [],
      totalDistanceMeters: scoreBreakdown.totalDistanceMeters,
      totalDurationSeconds,
      totalWeightKg,
      driversUsed: scoreBreakdown.usedDriversCount
    });

    // 2. Strict Invariant Validation
    const validation = DistributionInvariantValidator.validate(tempResult, activeDrivers, depot);

    // 3. Domain Warnings evaluation
    const domainWarnings = DistributionWarningService.evaluateWarnings({
      routes,
      activeDrivers,
      unassignedStops,
      oversizedStops
    });

    // 4. Check for blocking hard errors
    const hasHardErrors = !validation.isValid || domainWarnings.some(w => w.severity === 'error');

    if (hasHardErrors) {
      const errorMessages = [
        ...validation.violations.map(v => v.message),
        ...domainWarnings.filter(w => w.severity === 'error').map(w => w.message)
      ];
      return {
        success: false,
        errorMessage: `لا يمكن اعتماد التوزيع لوجود مخالفات تشغيلية حرجة:\n• ${errorMessages.join('\n• ')}`,
        validation,
        warnings: domainWarnings
      };
    }

    // 5. Generate immutable snapshot candidate
    const finalDistributionId = distributionId || `dist_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${Math.random().toString(36).substring(2, 8)}`;
    const nowIso = new Date().toISOString();

    const allAssignedStops = routes.flatMap(r => r.orderedStops);

    const approvedCandidate = new ApprovedDistribution({
      distributionId: finalDistributionId,
      createdAt: nowIso,
      approvedAt: nowIso,
      approvedBy,
      depot,
      drivers: activeDrivers,
      routes,
      stops: allAssignedStops,
      unassigned: unassignedStops,
      metrics: {
        initialDistanceMeters: referenceDistanceMeters,
        finalDistanceMeters: scoreBreakdown.totalDistanceMeters,
        initialLoadVariance: 0,
        finalLoadVariance: scoreBreakdown.loadDisparity,
        finalOptimizationScore: scoreBreakdown.finalScore,
        totalDurationSeconds,
        iterationCount: 1,
        executionDurationMs: 0,
        activeDriversUsed: scoreBreakdown.usedDriversCount
      },
      optimizationScore: scoreBreakdown.finalScore,
      warnings: domainWarnings.map(w => ({
        code: w.code,
        message: w.message,
        messageKey: w.code
      })),
      revision: 0 // Unassigned placeholder; authoritative revision is assigned exclusively by backend/repository transaction
    });

    // 6. Persist to repository with atomic sequence transaction
    const savedApproved = await this.distributionRepository.saveApprovedDistribution(approvedCandidate);

    return {
      success: true,
      approvedDistribution: savedApproved,
      validation,
      warnings: domainWarnings
    };
  }
}
