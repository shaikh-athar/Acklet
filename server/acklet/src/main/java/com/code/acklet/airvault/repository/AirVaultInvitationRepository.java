package com.code.acklet.airvault.repository;

import com.code.acklet.airvault.entity.AirVaultInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AirVaultInvitationRepository extends JpaRepository<AirVaultInvitation, String> {

    List<AirVaultInvitation> findByTargetUsernameAndStatusOrderByCreatedAtDesc(String targetUsername, String status);

    List<AirVaultInvitation> findByClipboardIdOrderByCreatedAtDesc(String clipboardId);

    List<AirVaultInvitation> findByInviterUserIdOrderByCreatedAtDesc(String inviterUserId);

    Optional<AirVaultInvitation> findByClipboardIdAndTargetUsernameAndStatus(String clipboardId, String targetUsername, String status);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE AirVaultInvitation i SET i.clipboardId = :newId WHERE i.clipboardId = :oldId")
    void updateClipboardId(@org.springframework.data.repository.query.Param("oldId") String oldId, @org.springframework.data.repository.query.Param("newId") String newId);
}
