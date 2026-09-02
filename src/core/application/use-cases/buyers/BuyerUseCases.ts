import { Buyer, BuyerProps } from '../../../domain/entities/Buyer';
import { BuyerRepository } from '../../ports/BuyerRepository';
import { DuplicateBuyerError, NotFoundError } from '../../../domain/errors/DomainErrors';

export class CreateBuyerUseCase {
  constructor(private readonly buyerRepo: BuyerRepository) {}

  public async execute(props: BuyerProps): Promise<Buyer> {
    const buyer = Buyer.create(props);
    const exists = await this.buyerRepo.exists(buyer.buyerCode);
    if (exists) {
      throw new DuplicateBuyerError(buyer.buyerCode);
    }
    await this.buyerRepo.create(buyer);
    return buyer;
  }
}

export class UpdateBuyerUseCase {
  constructor(private readonly buyerRepo: BuyerRepository) {}

  public async execute(props: BuyerProps): Promise<Buyer> {
    const buyer = Buyer.create(props);
    const exists = await this.buyerRepo.exists(buyer.buyerCode);
    if (!exists) {
      throw new NotFoundError('Buyer', buyer.buyerCode);
    }
    await this.buyerRepo.update(buyer);
    return buyer;
  }
}

export class DeleteBuyerUseCase {
  constructor(private readonly buyerRepo: BuyerRepository) {}

  public async execute(buyerCode: string): Promise<void> {
    const exists = await this.buyerRepo.exists(buyerCode);
    if (!exists) {
      throw new NotFoundError('Buyer', buyerCode);
    }
    await this.buyerRepo.delete(buyerCode);
  }
}

export class GetBuyerUseCase {
  constructor(private readonly buyerRepo: BuyerRepository) {}

  public async execute(buyerCode: string): Promise<Buyer | null> {
    return this.buyerRepo.getByCode(buyerCode);
  }
}

export class ListBuyersUseCase {
  constructor(private readonly buyerRepo: BuyerRepository) {}

  public async execute(): Promise<readonly Buyer[]> {
    return this.buyerRepo.getAll();
  }
}
