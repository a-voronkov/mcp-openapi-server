import { OpenAPIV3 } from "openapi-types"
import { readFile } from "fs/promises"
import { Tool } from "@modelcontextprotocol/sdk/types.js"
import yaml from "js-yaml"
import crypto from "crypto"
import { REVISED_COMMON_WORDS_TO_REMOVE, WORD_ABBREVIATIONS } from "./abbreviations.js"

/**
 * Class to load and parse OpenAPI specifications
 */
export class OpenAPISpecLoader {
  /**
   * Load an OpenAPI specification from a file path or URL
   */
  async loadOpenAPISpec(specPathOrUrl: string): Promise<OpenAPIV3.Document> {
    let specContent: string
    if (specPathOrUrl.startsWith("http://") || specPathOrUrl.startsWith("https://")) {
      const response = await fetch(specPathOrUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch OpenAPI spec from URL: ${specPathOrUrl}`)
      }
      specContent = await response.text()
    } else {
      specContent = await readFile(specPathOrUrl, "utf-8")
    }

    // Attempt to parse as JSON, then YAML if JSON parsing fails
    try {
      return JSON.parse(specContent) as OpenAPIV3.Document
    } catch (jsonError) {
      try {
        return yaml.load(specContent) as OpenAPIV3.Document
      } catch (yamlError) {
        throw new Error(
          `Failed to parse OpenAPI spec as JSON or YAML: ${
            (jsonError as Error).message
          } | ${(yamlError as Error).message}`,
        )
      }
    }
  }

  /**
   * Parse an OpenAPI specification into a map of tools
   */
  parseOpenAPISpec(spec: OpenAPIV3.Document): Map<string, Tool> {
    const tools = new Map<string, Tool>()

    // Convert each OpenAPI path to an MCP tool
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem) continue

      for (const [method, operation] of Object.entries(pathItem)) {
        if (method === "parameters" || !operation) continue

        // Skip invalid HTTP methods
        if (!["get", "post", "put", "patch", "delete", "options", "head"].includes(method.toLowerCase())) {
          console.log(`Skipping non-HTTP method "${method}" for path ${path}`);
          continue;
        }

        const op = operation as OpenAPIV3.OperationObject
        // Create a clean tool ID by removing the leading slash and replacing special chars
        const cleanPath = path.replace(/^\//, "").replace(/\{([^}]+)\}/g, "$1")
        const toolId = `${method.toUpperCase()}-${cleanPath}`.replace(/[^a-zA-Z0-9-]/g, "-")

        let nameSource = op.operationId || op.summary || `${method.toUpperCase()} ${path}`
        const name = this.abbreviateOperationId(nameSource)

        const tool: Tool = {
          name,
          description: op.description || `Make a ${method.toUpperCase()} request to ${path}`,
          inputSchema: {
            type: "object",
            properties: {},
          },
        }

        // Add parameters from operation
        if (op.parameters) {
          const requiredParams: string[] = []

          for (const param of op.parameters) {
            if ("name" in param && "in" in param) {
              const paramSchema = param.schema as OpenAPIV3.SchemaObject
              if (tool.inputSchema && tool.inputSchema.properties) {
                tool.inputSchema.properties[param.name] = {
                  type: paramSchema.type || "string",
                  description: param.description || `${param.name} parameter`,
                }
              }
              // Add required parameters to our temporary array
              if (param.required === true) {
                requiredParams.push(param.name)
              }
            }
          }

          // Only add the required array if there are required parameters
          if (requiredParams.length > 0 && tool.inputSchema) {
            tool.inputSchema.required = requiredParams
          }
        }
        tools.set(toolId, tool)
      }
    }

    return tools
  }

  // Helper function to generate a simple hash
  private generateShortHash(input: string, length: number = 4): string {
    return crypto.createHash("sha256").update(input).digest("hex").substring(0, length)
  }

  // Helper to split by underscore, camelCase, and numbers, then filter out empty strings
  private splitCombined(input: string): string[] {
    // Split by underscore first
    const underscoreParts = input.split("_")
    let combinedParts: string[] = []

    underscoreParts.forEach((part) => {
      // Add space before uppercase letters (camelCase) and before numbers
      const spacedPart = part
        .replace(/([A-Z]+)/g, " $1") // Handles sequences of uppercase like "MYID"
        .replace(/([A-Z][a-z])/g, " $1") // Handles regular camelCase like "MyIdentifier"
        .replace(/([a-z])([0-9])/g, "$1 $2") // Handles case like "word123"
        .replace(/([0-9])([A-Za-z])/g, "$1 $2") // Handles case like "123word"

      const splitParts = spacedPart.split(" ").filter((p) => p.length > 0)
      combinedParts = combinedParts.concat(splitParts)
    })
    return combinedParts.map((p) => p.trim()).filter((p) => p.length > 0)
  }

  private _initialSanitizeAndValidate(
    originalId: string,
    maxLength: number,
  ): { currentName: string; originalWasLong: boolean; errorName?: string } {
    if (!originalId || originalId.trim().length === 0)
      return { currentName: "", originalWasLong: false, errorName: "unnamed-tool" }

    const originalWasLong = originalId.length > maxLength
    let currentName = originalId.replace(/[^a-zA-Z0-9_]/g, "-")
    currentName = currentName.replace(/-+/g, "-").replace(/^-+|-+$/g, "")

    if (currentName.length === 0)
      return {
        currentName: "",
        originalWasLong,
        errorName: "tool-" + this.generateShortHash(originalId, 8),
      }

    return { currentName, originalWasLong }
  }

  private _performSemanticAbbreviation(name: string): string {
    let parts = this.splitCombined(name)
    parts = parts.filter((part) => {
      const cleanPartForCheck = part.toLowerCase().replace(/-+$/, "")
      return !REVISED_COMMON_WORDS_TO_REMOVE.includes(cleanPartForCheck)
    })

    parts = parts.map((part) => {
      const lowerPart = part.toLowerCase()
      if (WORD_ABBREVIATIONS[lowerPart]) {
        const abbr = WORD_ABBREVIATIONS[lowerPart]
        if (
          part.length > 0 &&
          part[0] === part[0].toUpperCase() &&
          part.slice(1) === part.slice(1).toLowerCase()
        ) {
          return abbr[0].toUpperCase() + abbr.substring(1).toLowerCase()
        } else if (part === part.toUpperCase() && part.length > 1 && abbr.length > 1) {
          return abbr.toUpperCase()
        } else if (part.length > 0 && part[0] === part[0].toUpperCase()) {
          return abbr[0].toUpperCase() + abbr.substring(1).toLowerCase()
        }
        return abbr.toLowerCase()
      }
      return part
    })
    return parts.join("-")
  }

  private _applyVowelRemovalIfOverLength(name: string, maxLength: number): string {
    let currentName = name
    if (currentName.length > maxLength) {
      const currentParts = currentName.split("-")
      const newParts = currentParts.map((part) => {
        const isAbbreviation = Object.values(WORD_ABBREVIATIONS).some(
          (abbr) => abbr.toLowerCase() === part.toLowerCase(),
        )
        if (part.length > 5 && !isAbbreviation) {
          const newPart = part[0] + part.substring(1).replace(/[aeiouAEIOU]/g, "")
          if (newPart.length < part.length && newPart.length > 1) return newPart
        }
        return part
      })
      currentName = newParts.join("-")
    }
    return currentName
  }

  private _truncateAndApplyHashIfNeeded(
    name: string,
    originalId: string,
    originalWasLong: boolean,
    maxLength: number,
  ): string {
    let currentName = name
    currentName = currentName.replace(/-+/g, "-").replace(/^-+|-+$/g, "") // Consolidate hyphens before length check for hashing

    const needsHash = originalWasLong || currentName.length > maxLength

    if (needsHash) {
      const hash = this.generateShortHash(originalId, 4)
      const maxLengthForBase = maxLength - hash.length - 1

      if (currentName.length > maxLengthForBase) {
        currentName = currentName.substring(0, maxLengthForBase)
        currentName = currentName.replace(/-+$/, "")
      }
      currentName = currentName + "-" + hash
    }
    return currentName
  }

  private _finalizeNameFormatting(name: string, originalId: string, maxLength: number): string {
    let finalName = name.toLowerCase()
    finalName = finalName
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")

    if (finalName.length > maxLength) {
      finalName = finalName.substring(0, maxLength)
      finalName = finalName.replace(/-+$/, "")
    }
    if (finalName.length === 0) {
      return "tool-" + this.generateShortHash(originalId, 8)
    }
    return finalName
  }

  public abbreviateOperationId(originalId: string, maxLength: number = 64): string {
    const {
      currentName: sanitizedName,
      originalWasLong,
      errorName,
    } = this._initialSanitizeAndValidate(originalId, maxLength)
    if (errorName) return errorName

    let processedName = this._performSemanticAbbreviation(sanitizedName)
    processedName = this._applyVowelRemovalIfOverLength(processedName, maxLength)
    processedName = this._truncateAndApplyHashIfNeeded(
      processedName,
      originalId,
      originalWasLong,
      maxLength,
    )
    processedName = this._finalizeNameFormatting(processedName, originalId, maxLength)

    return processedName
  }
}
