
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

// Load Handler
const handler = require('./gamblingHandler_temp.js');

async function runTest() {
    console.log('--- TEST START ---');

    // Test 1: First Run (Should succeed)
    console.log('\nTest 1: First Run');
    await handler.handleGambling(mockMessage, '!bigslot', ['!bigslot', '1000', 'turbo', '1']);

    // Test 2: Immediate Second Run (Should fail with Cooldown)
    console.log('\nTest 2: Immediate Second Run (Expect Cooldown)');
    await handler.handleGambling(mockMessage, '!bigslot', ['!bigslot', '1000', 'turbo', '1']);

    console.log('--- TEST END ---');
}

runTest();
