import { ValidationError } from '../errors/DomainErrors';

export interface DeliveryListProps {
  readonly listNumber: string;
  readonly buyerCode: string;
  readonly buyerName: string;
  readonly weightKg: number;
}

export class DeliveryList {
  public readonly listNumber: string;
  public readonly buyerCode: string;
  public readonly buyerName: string;
  public readonly weightKg: number;

  constructor(listNumber: string, buyerCode: string, buyerName: string, weightKg: number) {
    DeliveryList.validate(listNumber, buyerCode, buyerName, weightKg);
    this.listNumber = listNumber.trim();
    this.buyerCode = buyerCode.trim();
    this.buyerName = buyerName.trim();
    this.weightKg = Math.round(weightKg * 100) / 100;
  }

  public static create(props: DeliveryListProps): DeliveryList {
    return new DeliveryList(props.listNumber, props.buyerCode, props.buyerName, props.weightKg);
  }

  public static validate(listNumber: string, buyerCode: string, buyerName: string, weightKg: number): void {
    if (!listNumber || typeof listNumber !== 'string' || listNumber.trim().length === 0) {
      throw new ValidationError(
        'Delivery List Number is required.',
        'validation.listNumberRequired',
        { listNumber }
      );
    }

    if (!buyerCode || typeof buyerCode !== 'string' || buyerCode.trim().length === 0) {
      throw new ValidationError(
        'Buyer Code is required on delivery list.',
        'validation.buyerCodeRequired',
        { buyerCode }
      );
    }

    if (!buyerName || typeof buyerName !== 'string' || buyerName.trim().length === 0) {
      throw new ValidationError(
        'Buyer Name is required on delivery list.',
        'validation.buyerNameRequired',
        { buyerName }
      );
    }

    if (typeof weightKg !== 'number' || Number.isNaN(weightKg) || weightKg <= 0) {
      throw new ValidationError(
        `List weight must be greater than 0 kg. Received: ${weightKg}`,
        'validation.invalidListWeight',
        { weightKg }
      );
    }
  }

  public toJSON(): DeliveryListProps {
    return {
      listNumber: this.listNumber,
      buyerCode: this.buyerCode,
      buyerName: this.buyerName,
      weightKg: this.weightKg
    };
  }
}
