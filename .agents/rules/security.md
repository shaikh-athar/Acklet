# Security Rules: Sensitive File Exclusions

To prevent security breaches and accidental leakage of system configuration, credentials, and metadata files, the application must never scan, traverse, or expose sensitive files.

## Rule
Whenever implementing features that involve reading, scanning, listing, or traversing local/uploaded directories or files:
1. **Always use the unified `SecurityUtils` filter methods** to exclude sensitive files/directories.
   - For client-side code: Use [SecurityUtils](file:///Users/ayaz/Acklet/client/src/app/core/utils/security.utils.ts)
   - For server-side code: Use [SecurityUtils](file:///Users/ayaz/Acklet/server/ads/src/main/java/com/code/ads/util/SecurityUtils.java)
2. **Never expose the following patterns**:
   - Git folders (`.git`, `.github`) and files (`.gitignore`, `.gitattributes`)
   - Environment secret configurations (`.env`, `.env.*`)
   - Platform metadata/OS garbage (`.DS_Store`, `Thumbs.db`)
   - Agent config folders (`.agents`, `.gemini`)
   - Keystores, certificates, and credentials (`*.pem`, `*.key`, `*.jks`, `*.p12`, `*.pfx`, `secrets.*`, `credentials.*`)
   - Dependency or build outputs (`node_modules`, `build`, `target`, `dist`, `bin`, `out`, `.gradle`, `.idea`, `.vscode`)
