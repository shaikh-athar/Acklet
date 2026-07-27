package com.code.acklet.auth.repository;

import com.code.acklet.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findAllByUserIdAndIsRevokedFalse(UUID userId);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.isRevoked = true WHERE r.familyId = :familyId")
    void revokeFamily(UUID familyId);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.isRevoked = true WHERE r.user.id = :userId AND r.id != :activeId")
    void revokeAllUserTokensExcept(UUID userId, UUID activeId);

    @Modifying
    @Query("UPDATE RefreshToken r SET r.isRevoked = true WHERE r.user.id = :userId")
    void revokeAllUserTokens(UUID userId);
}
