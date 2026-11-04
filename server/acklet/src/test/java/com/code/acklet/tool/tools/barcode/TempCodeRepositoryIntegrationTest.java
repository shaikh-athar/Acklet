package com.code.acklet.tool.tools.barcode;

import com.code.acklet.tool.tools.barcode.entity.TempCodeEntity;
import com.code.acklet.tool.tools.barcode.repository.TempCodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:tempcodetest;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "spring.data.redis.repositories.enabled=false",
        "app.security.jwt.secret=Mzg1OTM4OTVhNzM5NDgzOTBhNzM5NDgzOTBhNzM5NDgzOTBhNzM9",
        "app.security.encryption.key=MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI="
})
class TempCodeRepositoryIntegrationTest {

    @Autowired
    private TempCodeRepository repository;

    private String ownerTokenHash;
    private Instant now;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        ownerTokenHash = "testhash_" + UUID.randomUUID();
        now = Instant.now();

        // 1. Active code
        repository.save(TempCodeEntity.builder()
                .id(UUID.randomUUID())
                .name("Alpha Barcode")
                .ownerTokenHash(ownerTokenHash)
                .token("tok1")
                .tokenHash("hash1")
                .payloadMode("LINK")
                .contentType("MESSAGE")
                .content("alpha message")
                .barcodeFormat("qrcode")
                .status("ACTIVE")
                .createdAt(now.minus(1, ChronoUnit.HOURS))
                .expiresAt(now.plus(1, ChronoUnit.HOURS))
                .purgeAt(now.plus(30, ChronoUnit.DAYS))
                .build());

        // 2. Expired code
        repository.save(TempCodeEntity.builder()
                .id(UUID.randomUUID())
                .name("Beta Barcode")
                .ownerTokenHash(ownerTokenHash)
                .token("tok2")
                .tokenHash("hash2")
                .payloadMode("LINK")
                .contentType("MESSAGE")
                .content("beta message")
                .barcodeFormat("code128")
                .status("EXPIRED")
                .createdAt(now.minus(5, ChronoUnit.HOURS))
                .expiresAt(now.minus(2, ChronoUnit.HOURS))
                .purgeAt(now.plus(28, ChronoUnit.DAYS))
                .build());

        // 3. Deactivated code
        repository.save(TempCodeEntity.builder()
                .id(UUID.randomUUID())
                .name("Gamma QR")
                .ownerTokenHash(ownerTokenHash)
                .token("tok3")
                .tokenHash("hash3")
                .payloadMode("CODE")
                .contentType("REFERENCE_ONLY")
                .content("gamma message")
                .barcodeFormat("datamatrix")
                .status("DEACTIVATED")
                .createdAt(now.minus(2, ChronoUnit.HOURS))
                .expiresAt(now.plus(2, ChronoUnit.HOURS))
                .purgeAt(now.plus(29, ChronoUnit.DAYS))
                .build());
    }

    @Test
    @DisplayName("findByOwnerWithFilters works when search is null (fixes lower(bytea) issue)")
    void testFindByOwnerWithFiltersNullSearch() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<TempCodeEntity> result = repository.findByOwnerWithFilters(
                ownerTokenHash,
                null,
                "ALL",
                now,
                pageable
        );

        assertNotNull(result);
        assertEquals(3, result.getTotalElements(), "All 3 codes should match when search is null");
    }

    @Test
    @DisplayName("findByOwnerWithFilters filters by search keyword case-insensitively")
    void testFindByOwnerWithFiltersWithSearch() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<TempCodeEntity> result = repository.findByOwnerWithFilters(
                ownerTokenHash,
                "alpha",
                "ALL",
                now,
                pageable
        );

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Alpha Barcode", result.getContent().get(0).getName());
    }

    @Test
    @DisplayName("findByOwnerWithFilters filters by status ACTIVE, EXPIRED, DEACTIVATED")
    void testFindByOwnerWithFiltersStatusFiltering() {
        Pageable pageable = PageRequest.of(0, 10);

        Page<TempCodeEntity> active = repository.findByOwnerWithFilters(
                ownerTokenHash,
                null,
                "ACTIVE",
                now,
                pageable
        );
        assertEquals(1, active.getTotalElements());
        assertEquals("Alpha Barcode", active.getContent().get(0).getName());

        Page<TempCodeEntity> expired = repository.findByOwnerWithFilters(
                ownerTokenHash,
                null,
                "EXPIRED",
                now,
                pageable
        );
        assertEquals(1, expired.getTotalElements());
        assertEquals("Beta Barcode", expired.getContent().get(0).getName());

        Page<TempCodeEntity> deactivated = repository.findByOwnerWithFilters(
                ownerTokenHash,
                null,
                "DEACTIVATED",
                now,
                pageable
        );
        assertEquals(1, deactivated.getTotalElements());
        assertEquals("Gamma QR", deactivated.getContent().get(0).getName());
    }
}

