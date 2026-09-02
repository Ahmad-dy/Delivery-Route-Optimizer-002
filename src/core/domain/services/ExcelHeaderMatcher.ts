export interface MatchedHeaders {
  readonly listNumberHeader: string;
  readonly buyerCodeHeader: string;
  readonly buyerNameHeader: string;
  readonly weightHeader: string;
}

export class ExcelHeaderMatcher {
  private static readonly LIST_NUMBER_ALIASES = [
    'listnumber',
    'list_number',
    'list number',
    'list no',
    'listno',
    'list_no',
    'listid',
    'list_id',
    'invoicenumber',
    'invoice_number',
    'invoice number',
    'رقم القائمة',
    'رقم قائمة',
    'رقم الفاتورة',
    'رقم_القائمة'
  ];

  private static readonly BUYER_CODE_ALIASES = [
    'buyercode',
    'buyer_code',
    'buyer code',
    'buyerid',
    'buyer_id',
    'customercode',
    'customer_code',
    'customer code',
    'customerid',
    'كود المشتري',
    'كود المشتري',
    'رمز المشتري',
    'كود الزبون',
    'رمز الزبون',
    'رقم المشتري',
    'كود_المشتري'
  ];

  private static readonly BUYER_NAME_ALIASES = [
    'buyername',
    'buyer_name',
    'buyer name',
    'customername',
    'customer_name',
    'customer name',
    'storename',
    'store_name',
    'store name',
    'اسم المشتري',
    'اسم الزبون',
    'اسم المتجر',
    'اسم_المشتري'
  ];

  private static readonly WEIGHT_ALIASES = [
    'weight',
    'weightkg',
    'weight_kg',
    'weight (kg)',
    'weight(kg)',
    'weight in kg',
    'weight kg',
    'loadkg',
    'load_kg',
    'load (kg)',
    'payload',
    'payloadkg',
    'الوزن',
    'الوزن كغم',
    'الوزن كجم',
    'الوزن (كغم)',
    'الوزن (كجم)',
    'الوزن_كغم',
    'الوزن_كجم',
    'حمولة كغم',
    'الحمولة'
  ];

  public static normalize(header: string): string {
    if (!header) return '';
    return header
      .toLowerCase()
      .trim()
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[_\-\(\)\[\]\/\\.:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public static cleanToken(header: string): string {
    return this.normalize(header).replace(/\s+/g, '');
  }

  public static matchHeaders(availableHeaders: readonly string[]): {
    matched: MatchedHeaders | null;
    missingHeaders: readonly ('listNumber' | 'buyerCode' | 'buyerName' | 'weight')[];
  } {
    let listNumberHeader: string | null = null;
    let buyerCodeHeader: string | null = null;
    let buyerNameHeader: string | null = null;
    let weightHeader: string | null = null;

    for (const rawHeader of availableHeaders) {
      if (!rawHeader) continue;
      const normalized = this.normalize(rawHeader);
      const cleaned = this.cleanToken(rawHeader);

      // Check List Number
      if (!listNumberHeader && this.isMatch(normalized, cleaned, this.LIST_NUMBER_ALIASES)) {
        listNumberHeader = rawHeader;
        continue;
      }

      // Check Buyer Code
      if (!buyerCodeHeader && this.isMatch(normalized, cleaned, this.BUYER_CODE_ALIASES)) {
        buyerCodeHeader = rawHeader;
        continue;
      }

      // Check Buyer Name
      if (!buyerNameHeader && this.isMatch(normalized, cleaned, this.BUYER_NAME_ALIASES)) {
        buyerNameHeader = rawHeader;
        continue;
      }

      // Check Weight
      if (!weightHeader && this.isMatch(normalized, cleaned, this.WEIGHT_ALIASES)) {
        weightHeader = rawHeader;
        continue;
      }
    }

    const missingHeaders: ('listNumber' | 'buyerCode' | 'buyerName' | 'weight')[] = [];
    if (!listNumberHeader) missingHeaders.push('listNumber');
    if (!buyerCodeHeader) missingHeaders.push('buyerCode');
    if (!buyerNameHeader) missingHeaders.push('buyerName');
    if (!weightHeader) missingHeaders.push('weight');

    if (missingHeaders.length > 0 || !listNumberHeader || !buyerCodeHeader || !buyerNameHeader || !weightHeader) {
      return { matched: null, missingHeaders };
    }

    return {
      matched: {
        listNumberHeader,
        buyerCodeHeader,
        buyerNameHeader,
        weightHeader
      },
      missingHeaders: []
    };
  }

  private static isMatch(normalized: string, cleaned: string, aliases: readonly string[]): boolean {
    for (const alias of aliases) {
      const aliasNormalized = this.normalize(alias);
      const aliasCleaned = this.cleanToken(alias);
      if (
        normalized === aliasNormalized ||
        cleaned === aliasCleaned ||
        normalized.includes(aliasNormalized) ||
        cleaned.includes(aliasCleaned)
      ) {
        return true;
      }
    }
    return false;
  }
}
