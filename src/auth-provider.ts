import { AxiosError } from "axios"

/**
 * Interface for providing authentication headers and handling authentication errors
 */
export interface AuthProvider {
  /**
   * Get authentication headers for the current request
   * This method is called before each API request to get fresh headers
   *
   * @returns Promise that resolves to headers object
   * @throws Error if authentication is not available (e.g., token expired)
   */
  getAuthHeaders(): Promise<Record<string, string>>

  /**
   * Handle authentication errors from API responses
   * This is called when the API returns authentication-related errors (401, 403)
   *
   * @param error - The axios error from the failed request
   * @returns Promise that resolves to true if the request should be retried, false otherwise
   */
  handleAuthError(error: AxiosError): Promise<boolean>
}

/**
 * Check if an error is authentication-related
 *
 * @param error - The error to check
 * @returns true if the error is authentication-related
 */
export function isAuthError(error: AxiosError): boolean {
  return error.response?.status === 401 || error.response?.status === 403
}

/**
 * Simple AuthProvider implementation that uses static headers
 * This is used for backward compatibility when no AuthProvider is provided
 */
export class StaticAuthProvider implements AuthProvider {
  constructor(private headers: Record<string, string> = {}) {}

  async getAuthHeaders(): Promise<Record<string, string>> {
    return { ...this.headers }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleAuthError(_error: AxiosError): Promise<boolean> {
    // Static auth provider cannot handle auth errors
    return false
  }
}

/**
 * Redmine-specific AuthProvider that handles API key authentication
 * 
 * Redmine supports three authentication methods:
 * 1. X-Redmine-API-Key header (recommended)
 * 2. Query parameter 'key' in URL
 * 3. HTTP Basic auth (username/password)
 * 
 * This provider uses the X-Redmine-API-Key header method.
 */
export class RedmineAuthProvider implements AuthProvider {
  private apiKey: string | null = null
  private switchUser: string | null = null

  constructor(apiKey?: string, switchUser?: string) {
    if (apiKey) {
      this.setApiKey(apiKey)
    }
    if (switchUser) {
      this.setSwitchUser(switchUser)
    }
  }

  /**
   * Set the Redmine API key
   * 
   * @param apiKey - The Redmine API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Set the user to impersonate (requires admin API key)
   * 
   * @param username - The username to switch to
   */
  setSwitchUser(username: string): void {
    this.switchUser = username
  }

  /**
   * Get authentication headers for Redmine API
   * 
   * @returns Headers object with Redmine-specific authentication
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.apiKey) {
      throw new Error(
        "Redmine API key not set. Please set your API key using setApiKey() method.\n\n" +
        "To get your API key:\n" +
        "1. Go to your Redmine profile page\n" +
        "2. Click on 'API access key'\n" +
        "3. Copy the generated key\n" +
        "4. Use setApiKey() to configure it"
      )
    }

    const headers: Record<string, string> = {
      "X-Redmine-API-Key": this.apiKey,
      "Accept": "application/json",
      "Content-Type": "application/json"
    }

    // Add user impersonation if configured (requires admin API key)
    if (this.switchUser) {
      headers["X-Redmine-Switch-User"] = this.switchUser
    }

    return headers
  }

  /**
   * Handle authentication errors from Redmine API
   * 
   * @param error - The axios error from the failed request
   * @returns Promise that resolves to true if the request should be retried, false otherwise
   */
  async handleAuthError(error: AxiosError): Promise<boolean> {
    const statusCode = error.response?.status

    if (statusCode === 401) {
      throw new Error(
        "Redmine authentication failed (401 Unauthorized). Please check:\n\n" +
        "1. Your API key is valid and not expired\n" +
        "2. REST API is enabled in Redmine (Administration → Settings → API → Enable REST API)\n" +
        "3. Your user account has API access enabled\n" +
        "4. The API key belongs to an active user account"
      )
    }

    if (statusCode === 403) {
      throw new Error(
        "Redmine access denied (403 Forbidden). Please check:\n\n" +
        "1. Your user account has permission to access the requested resource\n" +
        "2. If using user impersonation, your API key belongs to an admin user\n" +
        "3. The REST API is properly configured in Redmine\n" +
        "4. Your user account is not locked or disabled"
      )
    }

    // Don't retry for authentication errors
    return false
  }

  /**
   * Get current authentication status for debugging
   */
  getAuthStatus(): {
    hasApiKey: boolean
    apiKeyPreview: string | null
    switchUser: string | null
  } {
    return {
      hasApiKey: !!this.apiKey,
      apiKeyPreview: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : null,
      switchUser: this.switchUser
    }
  }

  /**
   * Clear the current API key and switch user
   */
  clearAuth(): void {
    this.apiKey = null
    this.switchUser = null
  }
}
