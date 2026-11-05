---
name: cli-install
description: Use when the Postman CLI is missing or can't be installed, or when `postman` is "command not found". Installs the CLI globally so `postman` is on `PATH`, with a fallback to the hosted MCP server when installing is blocked. Use for requests such as "install the Postman CLI".
---

# Install the Postman CLI

Install it globally so `postman` is on `PATH`. If installing is blocked, use
**postman-mcp-server** for hosted operations.

```bash
# npm, any platform with Node
npm install -g postman-cli

# macOS, Linux, and WSL
curl -o- "https://dl-cli.pstmn.io/install/unix.sh" | sh
```

```powershell
# Windows
powershell.exe -NoProfile -InputFormat None -ExecutionPolicy AllSigned -Command "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://dl-cli.pstmn.io/install/win64.ps1'))"
```

## Verification

Report the installed version and the route it came from, and confirm `postman`
on `PATH` resolves to that copy.

Source: https://learning.postman.com/docs/postman-cli/postman-cli-installation/
