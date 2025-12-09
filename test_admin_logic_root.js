const db = require('./database.js');

console.log('🧪 Testing Admin Logic...');

const testUser = '999999999999999999';
const adderUser = 'SYSTEM_TEST';

// 1. Clean up first
db.removeAdmin(testUser);

// 2. Check initial state
let isAdmin = db.isAdmin(testUser);
console.log(`[1] Initial Check (Should be false): ${isAdmin === false ? 'PASS' : 'FAIL'}`);

// 3. Add Admin
db.addAdmin(testUser, adderUser);
isAdmin = db.isAdmin(testUser);
console.log(`[2] After Add (Should be true): ${isAdmin === true ? 'PASS' : 'FAIL'}`);

// 4. Check Get Admins
const admins = db.getAdmins();
const found = admins.find(a => a.user_id === testUser);
console.log(`[3] Get Admins (Should contain test user): ${found ? 'PASS' : 'FAIL'}`);

// 5. Remove Admin
db.removeAdmin(testUser);
isAdmin = db.isAdmin(testUser);
console.log(`[4] After Remove (Should be false): ${isAdmin === false ? 'PASS' : 'FAIL'}`);

console.log('✅ Test Complete.');
