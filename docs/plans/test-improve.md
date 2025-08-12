# Test Improvement Plan

## Overview

This document outlines the plan for improving test coverage and functionality in the MCP OpenAPI Server project.

## Completed Improvements

### ✅ Request Body Content Types
- Added tests for `application/x-www-form-urlencoded`, `multipart/form-data`, and multiple content type handling
- **✅ COMPLETED** - Add tests for `multipart/form-data`, especially how file uploads (`type: string, format: binary/byte`) are represented in `inputSchema`.
- **✅ COMPLETED** - Test behavior when multiple request content types are offered (e.g., which one is chosen for `inputSchema`).

### ✅ File Type Normalization
- **✅ COMPLETED** - Normalize file-like schemas (`type: "file"`, `format: "file"`, `type: "string" + format: "binary"/"byte") to `type: "string" + contentEncoding: "base64"` for OpenAI/MCP compatibility
- **✅ COMPLETED** - Add `contentMediaType` support for multipart/form-data fields and non-JSON request bodies
- **✅ COMPLETED** - Add comprehensive tests for file upload scenarios including multipart/form-data and application/octet-stream

### ✅ Header and Cookie Parameters
- **✅ COMPLETED** - Add explicit tests to ensure parameters `in: "header"` and `in: "cookie"` are correctly processed into `inputSchema` with appropriate `x-parameter-location`.
- **✅ COMPLETED** - Add comprehensive tests for parameters with `x-parameter-location`:
  - Path parameters with `x-parameter-location: "path"`
  - Query parameters with `x-parameter-location: "query"`
  - Header parameters with `x-parameter-location: "header"`
  - Cookie parameters with `x-parameter-location: "cookie"`
  - Mixed parameter locations in a single operation
- **✅ COMPLETED** - Add comprehensive tests to show arguments being correctly placed into request `headers` or `cookie` strings if `x-parameter-location` indicates this in a `ToolDefinition`.
- **✅ COMPLETED** - Add comprehensive tests for parameters with `x-parameter-location` set to "header" or "cookie", documenting current implementation behavior for future enhancement.

## Implementation Details

### File Type Normalization
The server now automatically converts OpenAPI file types to base64-encoded strings:

**Before (OpenAPI):**
```yaml
file:
  type: string
  format: binary
```

**After (MCP Tool):**
```json
file:
  type: "string"
  contentEncoding: "base64"
  contentMediaType: "image/jpeg"  # From encoding.contentType
```

**Supported conversions:**
- `type: "file"` → `type: "string", contentEncoding: "base64"`
- `format: "file"` → `type: "string", contentEncoding: "base64"`
- `type: "string", format: "binary"` → `type: "string", contentEncoding: "base64"`
- `type: "string", format: "byte"` → `type: "string", contentEncoding: "base64"`

### Content Media Type Support
- **Multipart fields**: `encoding[field].contentType` is mapped to `contentMediaType`
- **Non-JSON bodies**: Overall content type (e.g., `application/octet-stream`) is mapped to `body.contentMediaType`

## Benefits

1. **OpenAI Compatibility**: All generated schemas are now valid JSON Schema
2. **MCP Validation**: Tools no longer fail validation due to unsupported `type: "file"`
3. **API Flexibility**: Backend can handle both binary and base64-encoded content
4. **Type Safety**: Clear indication of expected content encoding and media types

## Future Enhancements

- Consider adding automatic description enhancement for file fields (e.g., "Base64 encoded file content")
- Support for additional binary formats if needed
- Enhanced error handling for malformed file specifications
