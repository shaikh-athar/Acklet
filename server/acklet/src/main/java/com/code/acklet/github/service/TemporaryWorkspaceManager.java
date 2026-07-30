package com.code.acklet.github.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.UUID;

@Slf4j
@Service
public class TemporaryWorkspaceManager {

    private static final String TEMP_PREFIX = "acklet-analysis-";

    public Path createWorkspace() throws IOException {
        Path tempDir = Files.createTempDirectory(TEMP_PREFIX + UUID.randomUUID());
        log.info("Created temporary workspace at: {}", tempDir.toAbsolutePath());
        return tempDir;
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
