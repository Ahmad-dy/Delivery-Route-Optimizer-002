import {
  OperationalMetrics,
  DriverPerformanceMetrics,
  ReportFilter
} from '../../domain/entities/ReportingEntities';

export interface IReportRepository {
  /**
   * Retrieves operational summary metrics across approved distributions for the specified filter period.
   */
  getOperationalMetrics(filter?: ReportFilter): Promise<OperationalMetrics>;

  /**
   * Retrieves aggregated driver performance metrics for the specified filter period.
   */
  getDriverPerformance(filter?: ReportFilter): Promise<readonly DriverPerformanceMetrics[]>;
}
