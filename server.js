// Simple local development server
// Run with: node server.js

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const API_URL = 'https://api.oeg-kraken.energy/v1/graphql/';

// Tariff configuration from environment (required)
const TARIFF_CONFIG = {
    low: process.env.TARIFF_LOW_PRICE ? parseFloat(process.env.TARIFF_LOW_PRICE) : null,
    standard: process.env.TARIFF_STANDARD_PRICE ? parseFloat(process.env.TARIFF_STANDARD_PRICE) : null,
    high: process.env.TARIFF_HIGH_PRICE ? parseFloat(process.env.TARIFF_HIGH_PRICE) : null
};

function validateTariffConfig() {
    const missing = [];
    if (TARIFF_CONFIG.low === null) missing.push('TARIFF_LOW_PRICE');
    if (TARIFF_CONFIG.standard === null) missing.push('TARIFF_STANDARD_PRICE');
    if (TARIFF_CONFIG.high === null) missing.push('TARIFF_HIGH_PRICE');
    return missing;
}

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);

    // API Routes
    if (url.pathname === '/api/auth' && req.method === 'POST') {
        await handleAuth(req, res);
    } else if (url.pathname === '/api/accounts' && req.method === 'GET') {
        await handleAccounts(req, res);
    } else if (url.pathname === '/api/account' && req.method === 'GET') {
        await handleAccount(req, res, url);
    } else if (url.pathname === '/api/measurements' && req.method === 'GET') {
        await handleMeasurements(req, res, url);
    } else if (url.pathname === '/api/config' && req.method === 'GET') {
        handleConfig(req, res);
    } else if (url.pathname.startsWith('/api/')) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    } else {
        // Serve static files
        serveStatic(req, res, url);
    }
});

async function handleAuth(req, res) {
    try {
        const body = await getBody(req);
        const { email, password } = JSON.parse(body);

        if (!email || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Email and password required' }));
            return;
        }

        const authQuery = `
            mutation krakenTokenAuthentication($email: String!, $password: String!) {
                obtainKrakenToken(input: {email: $email, password: $password}) {
                    token
                }
            }
        `;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: authQuery, variables: { email, password } })
        });

        const data = await response.json();

        if (data.errors) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: data.errors[0].message }));
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token: data.data.obtainKrakenToken.token }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
}

async function handleAccounts(req, res) {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authorization header required' }));
            return;
        }

        const accountsQuery = `
            query {
                viewer {
                    accounts {
                        number
                        status
                    }
                }
            }
        `;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify({ query: accountsQuery })
        });

        const data = await response.json();

        if (data.errors) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: data.errors[0].message }));
            return;
        }

        const accounts = data.data?.viewer?.accounts || [];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ accounts }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
}

async function handleAccount(req, res, url) {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authorization header required' }));
            return;
        }

        const accountNumber = url.searchParams.get('accountNumber');
        if (!accountNumber) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'accountNumber parameter required' }));
            return;
        }

        const accountQuery = `
            query getAccount($accountNumber: String!) {
                account(accountNumber: $accountNumber) {
                    properties {
                        id
                        electricityMalos {
                            id
                            meter { id }
                            agreements { id }
                        }
                    }
                }
            }
        `;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify({ query: accountQuery, variables: { accountNumber } })
        });

        const data = await response.json();

        if (data.errors) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: data.errors[0].message }));
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data.data.account));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
}

async function handleMeasurements(req, res, url) {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authorization header required' }));
            return;
        }

        const accountNumber = url.searchParams.get('accountNumber');
        const propertyId = url.searchParams.get('propertyId');
        const date = url.searchParams.get('date');
        const frequencyType = url.searchParams.get('frequencyType') || 'RAW_INTERVAL';
        const first = parseInt(url.searchParams.get('first') || '96');

        if (!accountNumber || !propertyId || !date) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'accountNumber, propertyId and date required' }));
            return;
        }

        const consumptionQuery = `
            query getSmartMeterUsage($accountNumber: String!, $propertyId: ID!, $date: Date!, $first: Int!) {
                account(accountNumber: $accountNumber) {
                    property(id: $propertyId) {
                        measurements(
                            utilityFilters: {electricityFilters: {readingFrequencyType: ${frequencyType}, readingQuality: COMBINED}}
                            startOn: $date
                            first: $first
                        ) {
                            edges {
                                node {
                                    ... on IntervalMeasurementType {
                                        startAt
                                        endAt
                                        value
                                        unit
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify({
                query: consumptionQuery,
                variables: { accountNumber, propertyId, date, first }
            })
        });

        const data = await response.json();

        if (data.errors) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: data.errors[0].message }));
            return;
        }

        const edges = data.data?.account?.property?.measurements?.edges || [];
        const readings = edges.map(e => ({
            startAt: e.node.startAt,
            endAt: e.node.endAt,
            value: e.node.value,
            unit: e.node.unit
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ readings }));
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
}

function handleConfig(req, res) {
    const missing = validateTariffConfig();
    if (missing.length > 0) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Missing environment variables: ${missing.join(', ')}` }));
        return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tariff: TARIFF_CONFIG }));
}

function serveStatic(req, res, url) {
    let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);

    const ext = path.extname(filePath);
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
    };

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
            res.end(content);
        }
    });
}

function getBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
