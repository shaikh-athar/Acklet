# EXECUTION_ENGINE.md - Build Runner & Execution Engine Specification

## Execution Engine Architecture
`ProgressiveImportPipelineExecutor.java` acts as the process-based build engine.

## Command Execution & Environment Injection
- Executes commands via native OS shell (`cmd.exe /c` on Windows, `sh -c` on Linux/macOS).
- Injects user-provided key-value environment variables directly into `pb.environment()`.
- Captures stdout and stderr streams in real-time, storing logs in `Deployment.buildLogs` and `Deployment.runtimeLogs`.

## Security Warning & Future Sandbox Roadmap
> [!CAUTION]
> Build execution currently runs via native host `ProcessBuilder`. Untrusted code executes with host OS privileges.
> **Roadmap Target**: Migrate `runProcessCommand` to execute inside rootless Docker containers with CPU/RAM caps (`docker run --rm --network none ...`).
