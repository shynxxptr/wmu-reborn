const { generateCard } = require('./utils/cardGenerator.js');
const fs = require('fs');
const path = require('path');

async function test() {
    console.log('Testing Card Generator with EXISTING assets...');

    // Test Case 1: Ambatron (Mythical) - Known to exist
    try {
        console.log('Generating Ambatron...');
        const buffer = await generateCard('Ambatron', 'Mythical');
        if (buffer) {
            fs.writeFileSync('test_card_ambatron.png', buffer);
            console.log('✅ Success: test_card_ambatron.png created');
        } else {
            console.error('❌ Failed: Ambatron Buffer is null');
        }
    } catch (e) {
        console.error('❌ Error Ambatron:', e);
    }

    // Test Case 2: Mang Ujang (Special) - Should exist
    try {
        console.log('Generating Mang Ujang...');
        const buffer = await generateCard('Mang Ujang', 'Special');
        if (buffer) {
            fs.writeFileSync('test_card_mangujang_retry.png', buffer);
            console.log('✅ Success: test_card_mangujang_retry.png created');
        } else {
            console.error('❌ Failed: Mang Ujang Buffer is null');
        }
    } catch (e) {
        console.error('❌ Error Mang Ujang:', e);
    }
}

test();
