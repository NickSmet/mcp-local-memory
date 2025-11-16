#!/usr/bin/env node

/**
 * Entry point for MCP Local Memory
 * 
 * Starts the MCP server on stdio for use with AI clients
 * Configuration is handled via Smithery or manual MCP config
 */

import('./index.js').catch((err) => {
  console.error('Error starting MCP server:', err);
  process.exit(1);
});

