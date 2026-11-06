# Image Converter — System Specification & Architecture

## Overview
- **Tool Slug**: `image-converter`
- **Subdomain**: `image-converter.acklet.com` (locally: `image-converter.localhost:4200`)
- **Status**: Production Live
- **Requires Backend**: `false` (100% Client-Side)
- **Accent Color**: `indigo` (`#6366F1` dark / `#4F46E5` light, hue: 242)

## Storage & Privacy Rules
- **Execution**: 100% Client-Side in browser memory via HTML5 Canvas API and `OffscreenCanvas`.
- **Zero Server Uploads**: No user images, bytes, or filenames are ever transmitted to any backend API or external server.
- **Memory Safety**: Object URLs created for thumbnail previews are revoked upon clearing or completing conversions.
- **Storage**: No permanent storage. Memory clears automatically upon closing or reloading the tab.

## Architecture & Layout
Image Converter adheres to the two-state studio workflow:
1. **Empty State (`!hasJobs()`)**: Clean, distraction-free hero with a prominent `Select Images` button, drag/drop listener, format tags, and client-side privacy badges.
2. **Workspace State (`hasJobs()`)**:
   - **Left Gallery**: Grid of thumbnail studio cards with hover delete, format tags, progress overlay, and ready/savings metrics.
   - **Right Sidebar**: Structured settings panel for target format (WebP, JPG, PNG), quality preset (85%, 95%, 65%), and optional max width resize.

## Configuration & Constraints
Centralized in `client/apps/tool-file-converter/src/tool.config.ts`:
- **Max Batch Size**: 50 images
- **Max File Size**: 50 MB per file
- **Default Output**: WebP
- **Default Quality**: 0.85

## Related Documents
- [Implementation Vault](Acklet%20Vault/Acklet/Tools/File-Converter/README.md)
- [Requirements](Acklet%20Vault/Acklet/Tools/File-Converter/0-Requirements/requirements.md)
- [Implementation Log](Acklet%20Vault/Acklet/Tools/File-Converter/1-Progress/implementation-log.md)
- [Architecture & Design System](standalone-tool-architecture.md)

