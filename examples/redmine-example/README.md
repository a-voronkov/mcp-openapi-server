# Redmine MCP Server Example

This example demonstrates how to use the MCP OpenAPI server with Redmine API using proper authentication.

## Problem

Redmine doesn't support Bearer token authentication. When using the default MCP server configuration, it proxies the `Authorization: Bearer ...` header from the OpenAI client, which causes 401 errors.

## Solution

Use the `RedmineAuthProvider` which sends the correct `X-Redmine-API-Key` header instead of `Authorization`.

## Setup

1. Get your Redmine API key:
   - Go to your Redmine profile page
   - Click on "API access key"
   - Copy the generated key

2. Ensure REST API is enabled in Redmine:
   - Go to Administration → Settings → API
   - Check "Enable REST API"

## Usage

```typescript
import { RedmineAuthProvider } from "@ivotoby/openapi-mcp-server"

// Create auth provider with your API key
const authProvider = new RedmineAuthProvider("your-api-key-here")

// Optionally set user impersonation (requires admin API key)
authProvider.setSwitchUser("bot")

// Use with MCP server
const server = new OpenAPIMCPServer({
  apiBaseUrl: "https://your-redmine-instance.com",
  openApiSpec: "path/to/redmine-openapi.yaml",
  authProvider: authProvider
})
```

## Authentication Methods

Redmine supports three authentication methods:

1. **X-Redmine-API-Key header** (recommended) - Used by this provider
2. **Query parameter** - Add `?key=your-api-key` to URLs
3. **HTTP Basic auth** - Username/password or API key as username

## User Impersonation

To impersonate another user (e.g., "bot"):

```typescript
authProvider.setSwitchUser("bot")
```

This requires:
- Your API key to belong to an admin user
- REST API to be enabled in Redmine

## Error Handling

The provider gives helpful error messages for common issues:

- **401 Unauthorized**: Check API key validity and REST API settings
- **403 Forbidden**: Check user permissions and impersonation settings

## Example API Calls

```bash
# Get project versions
curl -H "X-Redmine-API-Key: your-key" \
     -H "Accept: application/json" \
     "https://redmine.example.com/projects/1/versions.json"

# With user impersonation
curl -H "X-Redmine-API-Key: your-admin-key" \
     -H "X-Redmine-Switch-User: bot" \
     -H "Accept: application/json" \
     "https://redmine.example.com/projects/1/versions.json"
```
