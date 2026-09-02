import { describe, it, expect } from 'vitest';
import { ExcelHeaderMatcher } from '../../core/domain/services/ExcelHeaderMatcher';

describe('ExcelHeaderMatcher', () => {
  it('should match standard English headers', () => {
    const headers = ['List Number', 'Buyer Code', 'Buyer Name', 'Weight'];
    const result = ExcelHeaderMatcher.matchHeaders(headers);

    expect(result.missingHeaders).toHaveLength(0);
    expect(result.matched).not.toBeNull();
    expect(result.matched?.listNumberHeader).toBe('List Number');
    expect(result.matched?.buyerCodeHeader).toBe('Buyer Code');
    expect(result.matched?.buyerNameHeader).toBe('Buyer Name');
    expect(result.matched?.weightHeader).toBe('Weight');
  });

  it('should match standard Arabic headers', () => {
    const headers = ['رقم القائمة', 'كود الزبون', 'اسم الزبون', 'الوزن (كغم)'];
    const result = ExcelHeaderMatcher.matchHeaders(headers);

    expect(result.matched).not.toBeNull();
    expect(result.missingHeaders).toHaveLength(0);
    expect(result.matched?.listNumberHeader).toBe('رقم القائمة');
    expect(result.matched?.buyerCodeHeader).toBe('كود الزبون');
    expect(result.matched?.buyerNameHeader).toBe('اسم الزبون');
    expect(result.matched?.weightHeader).toBe('الوزن (كغم)');
  });

  it('should match alternative and fuzzy header variants', () => {
    const headers = ['invoice_number', 'Customer Code', 'Store Name', 'load_kg'];
    const result = ExcelHeaderMatcher.matchHeaders(headers);

    expect(result.matched).not.toBeNull();
    expect(result.missingHeaders).toHaveLength(0);
    expect(result.matched?.listNumberHeader).toBe('invoice_number');
    expect(result.matched?.buyerCodeHeader).toBe('Customer Code');
    expect(result.matched?.buyerNameHeader).toBe('Store Name');
    expect(result.matched?.weightHeader).toBe('load_kg');
  });

  it('should identify missing required fields', () => {
    const headers = ['List Number', 'Customer Code']; // missing buyerName and weight
    const result = ExcelHeaderMatcher.matchHeaders(headers);

    expect(result.matched).toBeNull();
    expect(result.missingHeaders).toContain('buyerName');
    expect(result.missingHeaders).toContain('weight');
  });
});
