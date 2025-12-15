// @ts-nocheck
import http from 'http';

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/profiles', // Adjust if your api is different, looks like / in server.ts
    method: 'GET',
};

async function runTest() {
    console.log("Starting Rate Limit Test...");
    let blocked = false;
    for (let i = 0; i < 110; i++) {
        await new Promise<void>((resolve) => {
            const req = http.request(options, (res) => {
                if (res.statusCode === 429) {
                    if (!blocked) {
                        console.log(`Request ${i + 1}: BLOCKED (Status 429) - SUCCESS`);
                        blocked = true;
                    }
                } else if (i % 20 === 0) {
                    console.log(`Request ${i + 1}: Status ${res.statusCode}`);
                }
                resolve();
            });
            req.on('error', (e) => {
                // Connection refused often happens if server isn't ready
                // console.error(`Privblem with request: ${e.message}`);
                resolve();
            });
            req.end();
        });
    }

    if (blocked) {
        console.log("Test PASSED: Requests were blocked after limit.");
    } else {
        console.log("Test FAILED: No requests were blocked.");
    }
}

// Wait a bit for server to start if running via a chained command, but here we will run manually
runTest();
