import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryBuyerRepository } from '../../core/infrastructure/repositories/MemoryRepositories';
import {
  CreateBuyerUseCase,
  UpdateBuyerUseCase,
  DeleteBuyerUseCase,
  GetBuyerUseCase,
  ListBuyersUseCase
} from '../../core/application/use-cases/buyers/BuyerUseCases';
import { DuplicateBuyerError, NotFoundError } from '../../core/domain/errors/DomainErrors';

describe('Buyer Use Cases (Clean Architecture with Memory Repository)', () => {
  let buyerRepo: MemoryBuyerRepository;
  let createBuyer: CreateBuyerUseCase;
  let updateBuyer: UpdateBuyerUseCase;
  let deleteBuyer: DeleteBuyerUseCase;
  let getBuyer: GetBuyerUseCase;
  let listBuyers: ListBuyersUseCase;

  beforeEach(() => {
    buyerRepo = new MemoryBuyerRepository();
    createBuyer = new CreateBuyerUseCase(buyerRepo);
    updateBuyer = new UpdateBuyerUseCase(buyerRepo);
    deleteBuyer = new DeleteBuyerUseCase(buyerRepo);
    getBuyer = new GetBuyerUseCase(buyerRepo);
    listBuyers = new ListBuyersUseCase(buyerRepo);
  });

  it('creates and retrieves a buyer successfully', async () => {
    await createBuyer.execute({
      buyerCode: 'B-201',
      buyerName: 'Karada Market',
      latitude: 33.3054,
      longitude: 44.4215
    });

    const retrieved = await getBuyer.execute('B-201');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.buyerCode).toBe('B-201');
    expect(retrieved?.buyerName).toBe('Karada Market');
  });

  it('throws DuplicateBuyerError when creating a buyer with existing code', async () => {
    await createBuyer.execute({
      buyerCode: 'B-202',
      buyerName: 'Buyer A',
      latitude: 33.3,
      longitude: 44.3
    });

    await expect(
      createBuyer.execute({
        buyerCode: 'B-202',
        buyerName: 'Buyer B',
        latitude: 33.4,
        longitude: 44.4
      })
    ).rejects.toThrow(DuplicateBuyerError);
  });

  it('updates an existing buyer record', async () => {
    await createBuyer.execute({
      buyerCode: 'B-203',
      buyerName: 'Original Name',
      latitude: 33.3,
      longitude: 44.3
    });

    await updateBuyer.execute({
      buyerCode: 'B-203',
      buyerName: 'Updated Name',
      latitude: 33.35,
      longitude: 44.35
    });

    const updated = await getBuyer.execute('B-203');
    expect(updated?.buyerName).toBe('Updated Name');
    expect(updated?.latitude).toBe(33.35);
  });

  it('deletes an existing buyer record', async () => {
    await createBuyer.execute({
      buyerCode: 'B-204',
      buyerName: 'To Delete',
      latitude: 33.3,
      longitude: 44.3
    });

    await deleteBuyer.execute('B-204');
    const retrieved = await getBuyer.execute('B-204');
    expect(retrieved).toBeNull();
  });

  it('throws NotFoundError when deleting non-existent buyer', async () => {
    await expect(deleteBuyer.execute('NON_EXISTENT')).rejects.toThrow(NotFoundError);
  });

  it('lists all registered buyers', async () => {
    await createBuyer.execute({ buyerCode: 'B-1', buyerName: 'One', latitude: 33.1, longitude: 44.1 });
    await createBuyer.execute({ buyerCode: 'B-2', buyerName: 'Two', latitude: 33.2, longitude: 44.2 });

    const all = await listBuyers.execute();
    expect(all.length).toBe(2);
  });
});
