// Import through a TypeScript module so Vite serves transformed JSON as JavaScript,
// while Node's test runner still gets the required JSON import attribute.
import data from './data/zone-items.json' with { type: 'json' }

export default data
