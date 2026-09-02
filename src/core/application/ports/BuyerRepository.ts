import { Buyer } from '../../domain/entities/Buyer';

export interface BuyerRepository {
  /**
   * Retrieves a single buyer by their unique business code
   */
  getByCode(buyerCode: string): Promise<Buyer | null>;

  /**
   * Retrieves multiple buyers by their unique business codes using efficient batched queries.
   */
  getByCodes(buyerCodes: readonly string[]): Promise<readonly Buyer[]>;

  /**
   * Retrieves all registered buyers from the master registry
   */
  getAll(): Promise<readonly Buyer[]>;

  /**
   * Persists a new buyer record. Rejects if buyerCode already exists.
   */
  create(buyer: Buyer): Promise<void>;

  /**
   * Updates an existing buyer record. Rejects if buyerCode does not exist.
   */
  update(buyer: Buyer): Promise<void>;

  /**
   * Deletes a buyer record by their unique business code.
   */
  delete(buyerCode: string): Promise<void>;

  /**
   * Checks whether a buyer exists by code
   */
  exists(buyerCode: string): Promise<boolean>;
}
