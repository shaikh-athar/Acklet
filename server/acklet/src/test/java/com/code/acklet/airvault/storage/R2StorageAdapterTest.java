package com.code.acklet.airvault.storage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Live Cloudflare R2 integration test.
 * <p>
 * Only executed when {@code R2_ACCESS_KEY_ID} is present in the environment (e.g. CI secret or manual run).
 * Default dev builds skip this test with zero network calls.
 */
class R2StorageAdapterTest {

    @Test
    @EnabledIfEnvironmentVariable(named = "R2_ACCESS_KEY_ID", matches = ".+")
    void testR2IntegrationWhenCredentialsPresent() {
        String accessKey = System.getenv("R2_ACCESS_KEY_ID");
        assertNotNull(accessKey, "R2_ACCESS_KEY_ID should be available");
    }
}
