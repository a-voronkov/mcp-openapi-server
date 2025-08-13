import { describe, it, expect, beforeEach } from "vitest"
import { RedmineAuthProvider } from "../src/auth-provider.js"
import { AxiosError } from "axios"

describe("RedmineAuthProvider", () => {
  let authProvider: RedmineAuthProvider

  beforeEach(() => {
    authProvider = new RedmineAuthProvider()
  })

  describe("constructor", () => {
    it("should create provider without initial values", () => {
      expect(authProvider).toBeInstanceOf(RedmineAuthProvider)
      const status = authProvider.getAuthStatus()
      expect(status.hasApiKey).toBe(false)
      expect(status.switchUser).toBe(null)
    })

    it("should create provider with API key", () => {
      const provider = new RedmineAuthProvider("test-api-key")
      const status = provider.getAuthStatus()
      expect(status.hasApiKey).toBe(true)
      expect(status.apiKeyPreview).toBe("test-api...")
    })

    it("should create provider with API key and switch user", () => {
      const provider = new RedmineAuthProvider("test-api-key", "bot")
      const status = provider.getAuthStatus()
      expect(status.hasApiKey).toBe(true)
      expect(status.switchUser).toBe("bot")
    })
  })

  describe("setApiKey", () => {
    it("should set API key", () => {
      authProvider.setApiKey("new-api-key")
      const status = authProvider.getAuthStatus()
      expect(status.hasApiKey).toBe(true)
      expect(status.apiKeyPreview).toBe("new-api-...")
    })

    it("should update existing API key", () => {
      authProvider.setApiKey("first-key")
      authProvider.setApiKey("second-key")
      const status = authProvider.getAuthStatus()
      expect(status.apiKeyPreview).toBe("second-k...")
    })
  })

  describe("setSwitchUser", () => {
    it("should set switch user", () => {
      authProvider.setSwitchUser("testuser")
      const status = authProvider.getAuthStatus()
      expect(status.switchUser).toBe("testuser")
    })

    it("should update existing switch user", () => {
      authProvider.setSwitchUser("user1")
      authProvider.setSwitchUser("user2")
      const status = authProvider.getAuthStatus()
      expect(status.switchUser).toBe("user2")
    })
  })

  describe("getAuthHeaders", () => {
    it("should throw error when no API key is set", async () => {
      await expect(authProvider.getAuthHeaders()).rejects.toThrow(
        "Redmine API key not set"
      )
    })

    it("should return headers with API key", async () => {
      authProvider.setApiKey("test-key")
      const headers = await authProvider.getAuthHeaders()
      
      expect(headers).toEqual({
        "X-Redmine-API-Key": "test-key",
        "Accept": "application/json",
        "Content-Type": "application/json"
      })
    })

    it("should include switch user header when set", async () => {
      authProvider.setApiKey("test-key")
      authProvider.setSwitchUser("bot")
      const headers = await authProvider.getAuthHeaders()
      
      expect(headers["X-Redmine-API-Key"]).toBe("test-key")
      expect(headers["X-Redmine-Switch-User"]).toBe("bot")
      expect(headers["Accept"]).toBe("application/json")
      expect(headers["Content-Type"]).toBe("application/json")
    })
  })

  describe("handleAuthError", () => {
    it("should handle 401 errors with helpful message", async () => {
      const error = new AxiosError()
      error.response = { status: 401 } as any
      
      await expect(authProvider.handleAuthError(error)).rejects.toThrow(
        "Redmine authentication failed (401 Unauthorized)"
      )
    })

    it("should handle 403 errors with helpful message", async () => {
      const error = new AxiosError()
      error.response = { status: 403 } as any
      
      await expect(authProvider.handleAuthError(error)).rejects.toThrow(
        "Redmine access denied (403 Forbidden)"
      )
    })

    it("should not retry for auth errors", async () => {
      const error = new AxiosError()
      error.response = { status: 401 } as any
      
      try {
        await authProvider.handleAuthError(error)
      } catch (e) {
        // Expected to throw
      }
    })
  })

  describe("getAuthStatus", () => {
    it("should return correct status when no auth is set", () => {
      const status = authProvider.getAuthStatus()
      expect(status).toEqual({
        hasApiKey: false,
        apiKeyPreview: null,
        switchUser: null
      })
    })

    it("should return correct status with API key", () => {
      authProvider.setApiKey("very-long-api-key-for-testing")
      const status = authProvider.getAuthStatus()
      expect(status.hasApiKey).toBe(true)
      expect(status.apiKeyPreview).toBe("very-lon...")
      expect(status.switchUser).toBe(null)
    })

    it("should return correct status with both API key and switch user", () => {
      authProvider.setApiKey("test-key")
      authProvider.setSwitchUser("bot")
      const status = authProvider.getAuthStatus()
      expect(status.hasApiKey).toBe(true)
      expect(status.apiKeyPreview).toBe("test-key...")
      expect(status.switchUser).toBe("bot")
    })
  })

  describe("clearAuth", () => {
    it("should clear all authentication data", () => {
      authProvider.setApiKey("test-key")
      authProvider.setSwitchUser("bot")
      
      authProvider.clearAuth()
      
      const status = authProvider.getAuthStatus()
      expect(status.hasApiKey).toBe(false)
      expect(status.apiKeyPreview).toBe(null)
      expect(status.switchUser).toBe(null)
    })
  })
})
