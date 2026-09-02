import { DeliveryList } from '../entities/DeliveryList';
import { Buyer } from '../entities/Buyer';
import { ValidationError } from '../errors/DomainErrors';

export interface AggregatedStopResult {
  readonly stopId: string;
  readonly buyerCode: string;
  readonly buyerName: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly lists: readonly DeliveryList[];
  readonly totalWeightKg: number;
  readonly hasValidGps: boolean;
}

export class StopAggregationService {
  /**
   * Aggregates valid delivery lists by buyer code into atomic physical delivery stops.
   * Mandates that multiple lists for the same buyer produce exactly ONE DeliveryStop.
   * GPS coordinates and official name are sourced strictly from the authoritative Firebase Buyer master.
   * Every DeliveryStop MUST have a real matched Buyer and valid Firebase GPS coordinates.
   */
  public static aggregate(
    lists: readonly DeliveryList[],
    buyerLookupMap: ReadonlyMap<string, Buyer>
  ): readonly AggregatedStopResult[] {
    const listsByBuyer = new Map<string, DeliveryList[]>();

    for (const list of lists) {
      const existing = listsByBuyer.get(list.buyerCode);
      if (existing) {
        existing.push(list);
      } else {
        listsByBuyer.set(list.buyerCode, [list]);
      }
    }

    const stops: AggregatedStopResult[] = [];
    let stopIndex = 1;

    for (const [buyerCode, buyerLists] of listsByBuyer.entries()) {
      const buyer = buyerLookupMap.get(buyerCode);
      if (!buyer) {
        throw new ValidationError(
          `Cannot create DeliveryStop for buyer code '${buyerCode}' because buyer is missing from the master registry.`,
          'errors.buyerNotFound',
          { buyerCode }
        );
      }

      const isValidGps =
        typeof buyer.latitude === 'number' &&
        typeof buyer.longitude === 'number' &&
        !isNaN(buyer.latitude) &&
        !isNaN(buyer.longitude) &&
        buyer.latitude >= -90 &&
        buyer.latitude <= 90 &&
        buyer.longitude >= -180 &&
        buyer.longitude <= 180 &&
        !(buyer.latitude === 0 && buyer.longitude === 0);

      if (!isValidGps) {
        throw new ValidationError(
          `Cannot create DeliveryStop for buyer '${buyer.buyerName}' (${buyerCode}) because buyer has missing or invalid GPS coordinates in Firebase (${buyer.latitude}, ${buyer.longitude}).`,
          'errors.missingBuyerLocation',
          { buyerCode, buyerName: buyer.buyerName, latitude: buyer.latitude, longitude: buyer.longitude }
        );
      }

      const totalWeightKg = buyerLists.reduce((sum, l) => sum + l.weightKg, 0);
      const roundedWeightKg = Math.round(totalWeightKg * 100) / 100;

      const stopId = `STOP-${String(stopIndex).padStart(3, '0')}-${buyerCode}`;
      stopIndex++;

      stops.push({
        stopId,
        buyerCode,
        buyerName: buyer.buyerName,
        latitude: buyer.latitude,
        longitude: buyer.longitude,
        lists: Object.freeze([...buyerLists]),
        totalWeightKg: roundedWeightKg,
        hasValidGps: true
      });
    }

    return Object.freeze(stops);
  }
}
