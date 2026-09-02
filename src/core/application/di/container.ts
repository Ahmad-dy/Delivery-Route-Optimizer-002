import { BuyerRepository } from '../ports/BuyerRepository';
import { DriverRepository } from '../ports/DriverRepository';
import { SettingsRepository } from '../ports/SettingsRepository';
import { AuthRepository } from '../ports/AuthRepository';
import { IRoutingService } from '../ports/IRoutingService';
import { IOptimizationService } from '../ports/IOptimizationService';
import { IExcelParser } from '../ports/IExcelParser';
import { IBuyerLookupService } from '../ports/IBuyerLookupService';

import { FirestoreBuyerRepository } from '../../infrastructure/repositories/FirestoreBuyerRepository';
import { FirestoreDriverRepository } from '../../infrastructure/repositories/FirestoreDriverRepository';
import { FirestoreSettingsRepository } from '../../infrastructure/repositories/FirestoreSettingsRepository';
import { FirebaseAuthRepository } from '../../infrastructure/repositories/FirebaseAuthRepository';
import { GoogleRoutingService } from '../../infrastructure/routing/GoogleRoutingService';
import { MockRoutingAdapter } from '../../infrastructure/routing/MockRoutingAdapter';
import { OptimizationEngine } from '../../infrastructure/optimization/OptimizationEngine';
import { MockOptimizationAdapter } from '../../infrastructure/optimization/MockOptimizationAdapter';
import { XlsxExcelParserAdapter } from '../../infrastructure/adapters/XlsxExcelParserAdapter';
import { BuyerLookupService } from '../../infrastructure/services/BuyerLookupService';

import {
  CreateBuyerUseCase,
  UpdateBuyerUseCase,
  DeleteBuyerUseCase,
  GetBuyerUseCase,
  ListBuyersUseCase
} from '../use-cases/buyers/BuyerUseCases';

import {
  CreateDriverUseCase,
  UpdateDriverUseCase,
  DeleteDriverUseCase,
  SetDriverActiveUseCase,
  ListDriversUseCase
} from '../use-cases/drivers/DriverUseCases';

import {
  GetGlobalSettingsUseCase,
  UpdateGlobalSettingsUseCase
} from '../use-cases/settings/SettingsUseCases';

import {
  SignInUseCase,
  SignOutUseCase,
  ObserveAuthStateUseCase
} from '../use-cases/auth/AuthUseCases';

import { ImportDeliveryExcelUseCase } from '../use-cases/import/ImportDeliveryExcelUseCase';
import { GenerateRouteMatrixUseCase } from '../use-cases/routing/GenerateRouteMatrixUseCase';
import { CalculateRouteMetricsUseCase } from '../use-cases/routing/CalculateRouteMetricsUseCase';
import { OptimizeDistributionUseCase } from '../use-cases/optimization/OptimizeDistributionUseCase';
import { ReassignStopUseCase } from '../use-cases/optimization/ReassignStopUseCase';

export interface AppContainer {
  readonly buyerRepo: BuyerRepository;
  readonly driverRepo: DriverRepository;
  readonly settingsRepo: SettingsRepository;
  readonly authRepo: AuthRepository;
  readonly routingService: IRoutingService;
  readonly googleRoutingService: GoogleRoutingService;
  readonly mockRoutingAdapter: MockRoutingAdapter;
  readonly optimizationService: IOptimizationService;
  readonly optimizationEngine: OptimizationEngine;
  readonly excelParser: IExcelParser;
  readonly buyerLookupService: IBuyerLookupService;

  // Buyer Use Cases
  readonly createBuyerUseCase: CreateBuyerUseCase;
  readonly updateBuyerUseCase: UpdateBuyerUseCase;
  readonly deleteBuyerUseCase: DeleteBuyerUseCase;
  readonly getBuyerUseCase: GetBuyerUseCase;
  readonly listBuyersUseCase: ListBuyersUseCase;

  // Driver Use Cases
  readonly createDriverUseCase: CreateDriverUseCase;
  readonly updateDriverUseCase: UpdateDriverUseCase;
  readonly deleteDriverUseCase: DeleteDriverUseCase;
  readonly setDriverActiveUseCase: SetDriverActiveUseCase;
  readonly listDriversUseCase: ListDriversUseCase;

  // Settings Use Cases
  readonly getGlobalSettingsUseCase: GetGlobalSettingsUseCase;
  readonly updateGlobalSettingsUseCase: UpdateGlobalSettingsUseCase;

  // Auth Use Cases
  readonly signInUseCase: SignInUseCase;
  readonly signOutUseCase: SignOutUseCase;
  readonly observeAuthStateUseCase: ObserveAuthStateUseCase;

  // Import Use Cases
  readonly importDeliveryExcelUseCase: ImportDeliveryExcelUseCase;

  // Routing Use Cases
  readonly generateRouteMatrixUseCase: GenerateRouteMatrixUseCase;
  readonly calculateRouteMetricsUseCase: CalculateRouteMetricsUseCase;

  // Optimization Use Cases (Stage 5)
  readonly optimizeDistributionUseCase: OptimizeDistributionUseCase;
  readonly reassignStopUseCase: ReassignStopUseCase;
}

export function createProductionContainer(): AppContainer {
  const buyerRepo = new FirestoreBuyerRepository();
  const driverRepo = new FirestoreDriverRepository();
  const settingsRepo = new FirestoreSettingsRepository();
  const authRepo = new FirebaseAuthRepository();

  const googleApiKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_MAPS_API_KEY) ||
    '';

  const googleRoutingService = new GoogleRoutingService({
    apiKey: googleApiKey
  });
  const mockRoutingAdapter = new MockRoutingAdapter();

  // If Google API key is configured, use GoogleRoutingService; otherwise use MockRoutingAdapter
  const routingService: IRoutingService = googleApiKey ? googleRoutingService : mockRoutingAdapter;

  const optimizationEngine = new OptimizationEngine();
  const optimizationService: IOptimizationService = optimizationEngine;
  const excelParser = new XlsxExcelParserAdapter();
  const buyerLookupService = new BuyerLookupService(buyerRepo);

  const generateRouteMatrixUseCase = new GenerateRouteMatrixUseCase(routingService);
  const calculateRouteMetricsUseCase = new CalculateRouteMetricsUseCase(routingService);
  const optimizeDistributionUseCase = new OptimizeDistributionUseCase(optimizationService, routingService);
  const reassignStopUseCase = new ReassignStopUseCase();

  return {
    buyerRepo,
    driverRepo,
    settingsRepo,
    authRepo,
    routingService,
    googleRoutingService,
    mockRoutingAdapter,
    optimizationService,
    optimizationEngine,
    excelParser,
    buyerLookupService,

    createBuyerUseCase: new CreateBuyerUseCase(buyerRepo),
    updateBuyerUseCase: new UpdateBuyerUseCase(buyerRepo),
    deleteBuyerUseCase: new DeleteBuyerUseCase(buyerRepo),
    getBuyerUseCase: new GetBuyerUseCase(buyerRepo),
    listBuyersUseCase: new ListBuyersUseCase(buyerRepo),

    createDriverUseCase: new CreateDriverUseCase(driverRepo),
    updateDriverUseCase: new UpdateDriverUseCase(driverRepo),
    deleteDriverUseCase: new DeleteDriverUseCase(driverRepo),
    setDriverActiveUseCase: new SetDriverActiveUseCase(driverRepo),
    listDriversUseCase: new ListDriversUseCase(driverRepo),

    getGlobalSettingsUseCase: new GetGlobalSettingsUseCase(settingsRepo),
    updateGlobalSettingsUseCase: new UpdateGlobalSettingsUseCase(settingsRepo),

    signInUseCase: new SignInUseCase(authRepo),
    signOutUseCase: new SignOutUseCase(authRepo),
    observeAuthStateUseCase: new ObserveAuthStateUseCase(authRepo),

    importDeliveryExcelUseCase: new ImportDeliveryExcelUseCase(excelParser, buyerLookupService, driverRepo),

    generateRouteMatrixUseCase,
    calculateRouteMetricsUseCase,

    optimizeDistributionUseCase,
    reassignStopUseCase
  };
}

export const container = createProductionContainer();
