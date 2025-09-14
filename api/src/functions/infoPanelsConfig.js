const { app } = require("@azure/functions");
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'info-panels-config.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function infoPanelsConfig(request, context) {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        const method = request.method?.toLowerCase();

        if (method === 'get') {
            // Load configuration
            if (fs.existsSync(CONFIG_FILE)) {
                const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: configData
                };
            } else {
                // Return default configuration if file doesn't exist
                const defaultConfig = {
                    version: "1.0.0",
                    panels: [
                        {
                            id: "sample-panel-1",
                            name: "Zone 1",
                            position: { x: 0, y: 2, z: 0 },
                            content: {
                                zone: "Zone",
                                temperature: 22.5,
                                humidity: 45
                            },
                            visible: true,
                            created: new Date().toISOString(),
                            modified: new Date().toISOString()
                        }
                    ],
                    editMode: false,
                    settings: {
                        panelScale: 1.0,
                        opacity: 0.9,
                        showConnectorLines: true
                    }
                };
                
                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(defaultConfig, null, 2)
                };
            }
        } else if (method === 'post') {
            // Save configuration
            const body = await request.text();
            
            if (!body) {
                return {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'Request body is required' })
                };
            }

            // Validate JSON
            try {
                const config = JSON.parse(body);
                
                // Basic validation
                if (!config.version || !Array.isArray(config.panels)) {
                    return {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ error: 'Invalid configuration format' })
                    };
                }

                // Save to file
                fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
                
                context.log('Info panels configuration saved successfully');
                
                return {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ success: true, message: 'Configuration saved successfully' })
                };
            } catch (parseError) {
                return {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'Invalid JSON format' })
                };
            }
        } else {
            return {
                status: 405,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }
    } catch (error) {
        context.log.error('Error in infoPanelsConfig function:', error);
        return {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
}

app.http('infoPanelsConfig', {
    methods: ['GET', 'POST'],
    route: 'data/info-panels-config.json',
    authLevel: 'anonymous',
    handler: infoPanelsConfig
});