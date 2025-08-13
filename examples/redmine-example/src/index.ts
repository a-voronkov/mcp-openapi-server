import { OpenAPIMCPServer } from "@ivotoby/openapi-mcp-server"
import { RedmineAuthProvider } from "@ivotoby/openapi-mcp-server"

/**
 * Example of using MCP OpenAPI server with Redmine API
 * 
 * This demonstrates proper authentication for Redmine which doesn't support
 * Bearer tokens but requires X-Redmine-API-Key header.
 */

async function main() {
  // Create Redmine auth provider with your API key
  const authProvider = new RedmineAuthProvider()
  
  // Set your Redmine API key (get this from your Redmine profile)
  authProvider.setApiKey("your-redmine-api-key-here")
  
  // Optionally set user impersonation (requires admin API key)
  // authProvider.setSwitchUser("bot")
  
  // Check auth status
  const authStatus = authProvider.getAuthStatus()
  console.log("Auth status:", authStatus)
  
  // Create MCP server with Redmine auth provider
  const server = new OpenAPIMCPServer({
    name: "Redmine MCP Server",
    version: "1.0.0",
    apiBaseUrl: "https://redmine.fambear.online",
    openApiSpec: "path/to/redmine-openapi.yaml", // You'll need to provide this
    authProvider: authProvider,
    transportType: "http",
    httpPort: 3000,
    httpHost: "127.0.0.1",
    allowedOrigins: ["*"], // Configure as needed
    toolsMode: "dynamic" // Use dynamic tools from OpenAPI spec
  })
  
  try {
    await server.start()
    console.log("Redmine MCP server started successfully!")
    console.log("Server is running on http://127.0.0.1:3000/mcp")
    console.log("Use the RedmineAuthProvider to authenticate with X-Redmine-API-Key")
  } catch (error) {
    console.error("Failed to start server:", error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down Redmine MCP server...")
  process.exit(0)
})

process.on("SIGTERM", () => {
  console.log("\nShutting down Redmine MCP server...")
  process.exit(0)
})

// Run the server
main().catch((error) => {
  console.error("Unhandled error:", error)
  process.exit(1)
})
