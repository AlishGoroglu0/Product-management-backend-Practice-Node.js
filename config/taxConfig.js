// config/taxConfig.js
// Hardcoded tax presets. Add regions as needed.
// rate is a decimal: 0.20 = 20%

export const DEFAULT_TAX_REGION = 'TR';

export const TAX_PRESETS = {
  TR:    [{ name: 'VAT',        rate: 0.20   }],
 'US-CA':[{ name: 'Sales Tax', rate: 0.0725 }],
  DE:    [{ name: 'VAT',        rate: 0.19   }],
  AE:    [{ name: 'VAT',        rate: 0.05   }],
};