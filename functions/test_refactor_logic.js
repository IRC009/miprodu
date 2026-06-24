// functions/test_refactor_logic.js
const { PLAN_CONFIG, calcularDiasRestantes } = require('./src/core/pricing');
const { parseSubscriptionReference } = require('./src/core/externalRef');

console.log('--- Testing Pricing Logic ---');
console.log('PLAN_CONFIG:', JSON.stringify(PLAN_CONFIG, null, 2));

const mockSub = {
  cycleEndDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days from now
};
const days = calcularDiasRestantes(mockSub);
console.log('Days remaining (should be 10):', days);

console.log('\n--- Testing ExternalRef Logic ---');
const refPipe = 'rest-123|mixed|2|3|annual|old-sub-456';
const parsedPipe = parseSubscriptionReference(refPipe);
console.log('Parsed Pipe Reference:', JSON.stringify(parsedPipe, null, 2));

const refJSON = JSON.stringify({ restaurantId: 'rest-789', planLevel: 1, branches: 5, billing: 'monthly' });
const parsedJSON = parseSubscriptionReference(refJSON);
console.log('Parsed JSON Reference:', JSON.stringify(parsedJSON, null, 2));

if (days === 10 && parsedPipe.restaurantId === 'rest-123' && parsedPipe.isMixed && parsedJSON.restaurantId === 'rest-789') {
  console.log('\n✅ LOGIC TESTS PASSED!');
} else {
  console.log('\n❌ LOGIC TESTS FAILED!');
  process.exit(1);
}
