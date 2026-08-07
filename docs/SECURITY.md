# SECURITY.md - Security Audit & Vulnerability Analysis

## Verified Security Controls
- **Authentication**: JWT stateless authentication with bearer tokens, password hashing via `BCryptPasswordEncoder`.
- **API Authorization**: Endpoint security rules defined in `SecurityConfig.java`.
- **Path Traversal Prevention**: `TemporaryWorkspaceManager.java` validates resolved child paths to prevent `../` traversal attacks.

## Critical Vulnerabilities & Remediation
1. **Host Execution Vulnerability**:
   - **Issue**: `ProgressiveImportPipelineExecutor.java` executes build commands directly on the host machine.
   - **Remediation**: Wrap all command execution in disposable, rootless Docker containers with network isolation.
2. **Hardcoded Secrets Check**:
   - **Issue**: JWT secret key in `application.yml` should be supplied via environment variable in production (`JWT_SECRET`).
