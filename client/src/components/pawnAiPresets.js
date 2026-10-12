// Example inputs for the native pawn shop AI tools. Record references are never examples.
const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 7)}-01`;
const yearStart = `${today.slice(0, 4)}-01-01`;
export const nativePresets = {
  valuation: [
    { item_description: 'Apple iPhone 15 Pro, 256 GB, unlocked, battery health 89%, minor case wear; charger included.', category: 'Electronics', condition: 'Good', brand: 'Apple', model: 'iPhone 15 Pro', age: '2 years' },
    { item_description: 'Fender Player Stratocaster, sunburst, original pickups, clean frets and hard case.', category: 'Musical Instruments', condition: 'Excellent', brand: 'Fender', model: 'Player Stratocaster', age: '3 years' },
    { item_description: '14k yellow gold rope chain, 22 inches, 18 grams, clasp functional; hallmark visible.', category: 'Jewelry', condition: 'Good', brand: 'Unbranded', model: 'Rope chain', age: 'Approx. 5 years' },
  ],
  market: [
    { item_category: 'Electronics', item_name: 'Unlocked iPhone 15 Pro 256 GB', region: 'New York City, NY' },
    { item_category: 'Musical Instruments', item_name: 'Fender Player Stratocaster', region: 'Austin, TX' },
    { item_category: 'Jewelry', item_name: '14k gold rope chain, 18 g', region: 'Atlanta, GA' },
  ],
  risk: [
    { customer_history: 'Three loans over 18 months, all redeemed on time; income and identity require normal verification.', loan_amount: '300', item_value: '700', item_category: 'Electronics' },
    { customer_history: 'Two previous loans; one was redeemed during the grace period. Verify current repayment capacity.', loan_amount: '450', item_value: '1100', item_category: 'Musical Instruments' },
    { customer_history: 'New customer with no verified loan history. Treat payment behavior as unknown.', loan_amount: '200', item_value: '550', item_category: 'Jewelry' },
  ],
  counterfeit: [
    { item_description: 'Designer handbag with monogram canvas, date code visible and uneven stitching near the interior seam.', category: 'Designer Goods', brand: 'Louis Vuitton', serial_number: 'Not verified; inspect physical item', photos_description: 'Brown canvas, tan handles, interior label and zipper pull available for inspection.' },
    { item_description: 'Used iPhone 15 Pro with replacement display and retail box. Check device identifiers against the physical handset.', category: 'Electronics', brand: 'Apple', serial_number: 'Not verified; inspect device settings', photos_description: 'Front and back are clean; box label and device settings should be compared in person.' },
    { item_description: '14k gold chain stamped 14K, clasp shows discoloration. Confirm metal content with approved test.', category: 'Jewelry', brand: 'Unbranded', serial_number: 'No serial number on item', photos_description: 'Hallmark on clasp; surface wear and discoloration near solder joint.' },
  ],
  regulatory: [
    { report_type: 'daily_transaction', date_range_start: today, date_range_end: today, location: 'Albany, NY', transactions_summary: 'Example: 12 loans, 4 redemptions, 2 retail sales. Replace with verified ledger totals.' },
    { report_type: 'monthly_summary', date_range_start: monthStart, date_range_end: today, location: 'Austin, TX', transactions_summary: 'Example monthly review: reconcile purchases, loans, redemptions, and required records against the ledger.' },
    { report_type: 'annual_compliance', date_range_start: yearStart, date_range_end: today, location: 'Atlanta, GA', transactions_summary: 'Example annual review: confirm license dates, transaction retention, employee training, and exception records.' },
  ],
  negotiation: [
    { item_description: 'Unlocked iPhone 15 Pro 256 GB in good condition, charger included.', estimated_value: '620', customer_asking_price: '750', market_conditions: 'normal' },
    { item_description: 'Fender Player Stratocaster with hard case and light fret wear.', estimated_value: '480', customer_asking_price: '600', market_conditions: 'slow' },
    { item_description: '14k rope chain, 18 g, pending metal verification.', estimated_value: '700', customer_asking_price: '850', market_conditions: 'hot' },
  ],
  market_price: [
    { category: 'Electronics', description: 'Unlocked iPhone 15 Pro, 256 GB, battery health 89%, minor wear.', condition: 'Good', brand: 'Apple', model: 'iPhone 15 Pro' },
    { category: 'Musical Instruments', description: 'Player Stratocaster with hard case, working electronics and light fret wear.', condition: 'Good', brand: 'Fender', model: 'Player Stratocaster' },
    { category: 'Jewelry', description: '14k yellow gold rope chain, 22 inches, 18 g; metal content pending verification.', condition: 'Good', brand: 'Unbranded', model: 'Rope chain' },
  ],
  loan_calc: [
    { appraisedValue: '620', itemCategory: 'Electronics' },
    { appraisedValue: '480', itemCategory: 'Musical Instruments' },
    { appraisedValue: '700', itemCategory: 'Jewelry' },
  ],
  compliance: [
    { jurisdiction: 'New York City, NY', businessType: 'Traditional pawn shop (buy/sell/loan)', specificQuestion: 'What records and holding periods apply to secondhand electronics?' },
    { jurisdiction: 'Austin, TX', businessType: 'Secondhand dealer only', specificQuestion: 'What identification and reporting steps apply to purchases from the public?' },
    { jurisdiction: 'Atlanta, GA', businessType: 'Pawn shop with firearms sales', specificQuestion: 'What separate state and federal firearm record obligations should be reviewed?' },
  ],
  'auction-price': [
    { item_description: 'Unlocked iPhone 15 Pro, 256 GB, good condition, charger included.', category: 'Electronics', condition: 'Good', starting_price: '350', comparable_sales: '[{"item":"similar unlocked handset","sold_price":590,"source":"example, verify before use"}]' },
    { item_description: 'Fender Player Stratocaster with hard case and light wear.', category: 'Musical Instruments', condition: 'Good', starting_price: '275', comparable_sales: '[{"item":"similar guitar with case","sold_price":475,"source":"example, verify before use"}]' },
    { item_description: '14k gold rope chain, 18 g, metal content pending verification.', category: 'Jewelry', condition: 'Good', starting_price: '400', comparable_sales: '[{"item":"similar 14k chain","sold_price":680,"source":"example, verify before use"}]' },
  ],
  expiration: [
    { item_description: 'Unlocked iPhone 15 Pro, 256 GB, good condition.', days_in_stock: '45', holding_cost: '12', seasonal_factors: 'Demand may soften after a new model launch.' },
    { item_description: 'Fender Player Stratocaster with hard case.', days_in_stock: '90', holding_cost: '18', seasonal_factors: 'Back-to-school music purchases may affect demand.' },
    { item_description: '14k gold rope chain, 18 g.', days_in_stock: '120', holding_cost: '8', seasonal_factors: 'Holiday gift demand may affect sell-through.' },
  ],
  'lifetime-value': [
    { transactions_summary: 'Example: four redeemed loans over two years, no verified late payments.', average_loan_size: '300', months_active: '24', redemption_rate: '1' },
    { transactions_summary: 'Example: three purchases and two loans; one redemption during grace period.', average_loan_size: '450', months_active: '18', redemption_rate: '0.8' },
    { transactions_summary: 'Example: new customer with one redeemed loan; limited history.', average_loan_size: '200', months_active: '6', redemption_rate: '1' },
  ],
  'theft-detection': [
    { no_sale_count: '5', time_range: 'Last 30 days', recent_transactions: '[{"type":"refund","amount":120,"note":"example only"}]', void_history: '[{"amount":80,"reason":"customer changed mind","note":"example only"}]' },
    { no_sale_count: '2', time_range: 'Last 14 days', recent_transactions: '[{"type":"sale","amount":250,"note":"example only"}]', void_history: '[{"amount":40,"reason":"duplicate entry","note":"example only"}]' },
    { no_sale_count: '0', time_range: 'Last 7 days', recent_transactions: '[{"type":"sale","amount":95,"note":"example only"}]', void_history: '[]' },
  ],
};

export const nativePresetLabels = ['Example 1', 'Example 2', 'Example 3'];
export function applyNativePreset(tool, current, index) {
  return { ...current, ...nativePresets[tool][index] };
}
