/**
 * MCP Server for Shadow Agent
 * Integrates Model Context Protocol with the Express backend
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { allTools } from './tools';
import { allResources, allResourceTemplates } from './resources';
import type { Express, Request, Response } from 'express';

// Create MCP Server instance
const mcpServer = new McpServer({
    name: 'shadow-agent',
    version: '1.0.0',
    description: 'Privacy-Preserving AI Marketplace on Solana with x402 payments'
});

// Register all tools
for (const tool of allTools) {
    mcpServer.tool(
        tool.name,
        tool.description,
        tool.inputSchema.shape,
        async (args) => {
            try {
                const result = await tool.execute(args as any);
                return {
                    content: [{
                        type: 'text' as const,
                        text: JSON.stringify(result, null, 2)
                    }]
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                return {
                    content: [{
                        type: 'text' as const,
                        text: JSON.stringify({ error: message })
                    }],
                    isError: true
                };
            }
        }
    );
}

// Register static resources
for (const resource of allResources) {
    mcpServer.resource(
        resource.uri,
        resource.name,
        async (uri) => {
            const content = await resource.fetch();
            return {
                contents: [{
                    uri: uri.href,
                    mimeType: resource.mimeType,
                    text: content
                }]
            };
        }
    );
}

// Store transports for session management
const transports = new Map<string, StreamableHTTPServerTransport>();

/**
 * Setup MCP routes on the Express app
 * Mounts at /mcp endpoint for Streamable HTTP transport
 */
export function setupMcpRoutes(app: Express) {
    // MCP endpoint - handles all MCP protocol messages
    app.all('/mcp', async (req: Request, res: Response) => {
        // Handle preflight
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
            return res.status(204).end();
        }

        const sessionId = req.headers['mcp-session-id'] as string | undefined;

        console.log(`[MCP] Request ${req.method} /mcp - Session: ${sessionId || 'New'}`);

        if (req.method === 'GET') {
            // SSE stream for server-to-client messages
            let transport: StreamableHTTPServerTransport;

            if (sessionId && transports.has(sessionId)) {
                transport = transports.get(sessionId)!;
            } else {
                // Create new transport for new session
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => crypto.randomUUID(),
                    onsessioninitialized: (id) => {
                        transports.set(id, transport);
                    }
                });

                // Connect transport to MCP server
                await mcpServer.connect(transport);
            }

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');

            // Handle the SSE connection
            await transport.handleRequest(req, res);

        } else if (req.method === 'POST') {
            // JSON-RPC messages
            let transport: StreamableHTTPServerTransport;

            if (sessionId && transports.has(sessionId)) {
                transport = transports.get(sessionId)!;
            } else {
                // Create new transport for new session (for initialize request)
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => crypto.randomUUID(),
                    onsessioninitialized: (id) => {
                        transports.set(id, transport);
                        console.log(`[MCP] Session created: ${id}`);
                    }
                });

                // Connect transport to MCP server
                await mcpServer.connect(transport);
            }

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
            await transport.handleRequest(req, res);

        } else if (req.method === 'DELETE') {
            // Session cleanup
            if (sessionId && transports.has(sessionId)) {
                const transport = transports.get(sessionId)!;
                await transport.close();
                transports.delete(sessionId);
                return res.status(200).json({ message: 'Session closed' });
            }
            return res.status(404).json({ error: 'Session not found' });
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    });

    // MCP discovery endpoint (optional, for clients that look for it)
    app.get('/mcp/info', (_req: Request, res: Response) => {
        res.json({
            name: 'shadow-agent',
            version: '1.0.0',
            description: 'Privacy-Preserving AI Marketplace on Solana with x402 payments',
            protocol: 'mcp',
            transport: 'streamable-http',
            endpoint: '/mcp',
            tools: allTools.map(t => ({ name: t.name, description: t.description })),
            resources: allResources.map(r => ({ uri: r.uri, name: r.name }))
        });
    });

    console.log('MCP Server mounted at /mcp');
}

export { mcpServer };
