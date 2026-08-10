package com.code.acklet.github.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class TemporaryWorkspaceManager {

    private static final String TEMP_PREFIX = "acklet-analysis-";
    /** Root directory where all persistent workspaces live. */
    private static final Path WORKSPACE_ROOT = Path.of("a:\\Acklet\\server\\acklet\\workspaces");

    /**
     * Returns a deterministic workspace path keyed by the repo's full name
     * (e.g. "athar-taj/Athar-Portfolio" → "athar-taj_Athar-Portfolio").
     * This guarantees the same folder is reused across re-imports of the same repo
     * and avoids stale UUID-based directories accumulating on disk.
     */
    public Path getWorkspacePath(String repoFullName) {
        // Replace '/' with '_' — both owner and repo name are safe path chars on every OS
        String dirName = repoFullName.replace('/', '_');
        return WORKSPACE_ROOT.resolve(dirName);
    }

    public Path createWorkspace() throws IOException {
        Path tempDir = Files.createTempDirectory(TEMP_PREFIX + UUID.randomUUID());
        log.info("Created temporary workspace at: {}", tempDir.toAbsolutePath());
        return tempDir;
    }

    public Path getOrCreateNamedWorkspace(String repositoryId) throws IOException {
        Path baseDir = Path.of(System.getProperty("java.io.tmpdir"), "acklet-workspaces");
        if (!Files.exists(baseDir)) {
            Files.createDirectories(baseDir);
        }
        Path repoWorkspace = baseDir.resolve(repositoryId);
        if (!Files.exists(repoWorkspace)) {
            Files.createDirectories(repoWorkspace);
            log.info("Created managed repository workspace at: {}", repoWorkspace.toAbsolutePath());
        } else {
            log.info("Reusing existing managed repository workspace at: {}", repoWorkspace.toAbsolutePath());
        }
        return repoWorkspace;
    }

    public boolean cloneOrFetchRepository(String cloneUrl, String branch, Path targetDir, String token) {
        try {
            boolean existsGit = Files.exists(targetDir.resolve(".git"));
            List<String> command = new java.util.ArrayList<>();
            command.add("git");

            if (existsGit) {
                log.info("Fetching latest commits for workspace: {}", targetDir.toAbsolutePath());
                command.add("-C");
                command.add(targetDir.toAbsolutePath().toString());
                command.add("fetch");
                command.add("origin");
                command.add(branch != null ? branch : "main");
            } else {
                log.info("Cloning repository into workspace: {}", targetDir.toAbsolutePath());
                command.add("clone");
                command.add("--depth");
                command.add("1");
                if (branch != null && !branch.isBlank()) {
                    command.add("--branch");
                    command.add(branch);
                }
                
                String authenticatedUrl = cloneUrl;
                if (token != null && !token.isBlank() && cloneUrl.startsWith("https://")) {
                    authenticatedUrl = "https://x-access-token:" + token + "@" + cloneUrl.substring("https://".length());
                }
                command.add(authenticatedUrl);
                command.add(targetDir.toAbsolutePath().toString());
            }

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process p = pb.start();
            int exit = p.waitFor();
            return exit == 0;
        } catch (Exception e) {
            log.error("Failed to clone/fetch repository at {}: {}", targetDir.toAbsolutePath(), e.getMessage());
            return false;
        }
    }

    public long getAvailableDiskSpaceMb(Path path) {
        try {
            File file = path.toFile();
            return file.getFreeSpace() / (1024 * 1024);
        } catch (Exception e) {
            return -1;
        }
    }

    public void cleanWorkspace(Path path) {
        if (path == null || !Files.exists(path)) return;
        try {
            Files.walk(path)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
            log.info("Cleaned temporary workspace at: {}", path.toAbsolutePath());
        } catch (IOException e) {
            log.error("Failed to cleanly delete temporary workspace at: {}", path.toAbsolutePath(), e);
        }
    }

    public boolean validatePath(Path baseDir, Path fileToExtract) {
        // Prevent path traversal vulnerability (e.g. "../../../etc/passwd")
        try {
            String canonicalBase = baseDir.toFile().getCanonicalPath();
            String canonicalFile = fileToExtract.toFile().getCanonicalPath();
            return canonicalFile.startsWith(canonicalBase);
        } catch (IOException e) {
            return false;
        }
    }
}
