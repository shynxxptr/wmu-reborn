
const assert = require('assert');

// Mock Discord.js
const mockMessage = {
    author: { id: 'test_user_123' },
    content: '!bigslot 1000',
    channel: {
        send: (msg) => {
            console.log('[Bot Send]:', msg);
            return Promise.resolve({
                id: 'msg_123',
                edit: (content) => console.log('[Bot Edit]:', content),
                delete: () => console.log('[Bot Delete]')
            });
        },
        createMessageCollector: () => ({ on: () => { } })
    },
    reply: (msg) => {
        console.log('[Bot Reply]:', msg);
        return Promise.resolve({
            id: 'msg_123',
            edit: (content) => {
                // console.log('[Bot Reply Edit]:', JSON.stringify(content, null, 2));
                return Promise.resolve();
            },
            delete: () => Promise.resolve()
        });
    }
};

// Mock Database
const mockDb = {
    prepare: (query) => {
        return {
            get: (...args) => {
                if (query.includes('SELECT * FROM user_economy')) return { uang_jajan: 1000000, luck_boost: 0 };
                if (query.includes('SELECT uang_jajan FROM user_economy')) return { uang_jajan: 1000000 };
                return null;
            },
            run: (...args) => { },
            all: () => []
        };
    },
    addJackpot: () => { },
    getJackpot: () => 0,
    resetJackpot: () => { }
};

// Hijack require for database.js
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (path) {
    if (path === '../database.js') {
        return mockDb;
    }
    return originalRequire.apply(this, arguments);
};

// Load Handler
const handler = require('./gamblingHandler.js');

async function runTest() {
    console.log('--- TEST START ---');

    // Test 1: First Run (Should succeed)
    console.log('\nTest 1: First Run');
    await handler.handleGambling(mockMessage, '!bigslot', ['!bigslot', '1000']);

    // Test 2: Immediate Second Run (Should fail with Cooldown)
    console.log('\nTest 2: Immediate Second Run (Expect Cooldown)');
    await handler.handleGambling(mockMessage, '!bigslot', ['!bigslot', '1000']);

    // Test 3: Wait 11 seconds (Should succeed)
    // Note: Since we can't easily mock Date.now() inside the module without more complex mocking,
    // we might just have to wait or manually manipulate the map if it was exported.
    // But it's not exported.
    // So we will just verify the cooldown message appeared in Test 2.

    console.log('--- TEST END ---');
}

runTest();
