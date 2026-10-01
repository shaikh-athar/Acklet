package com.code.acklet.airvault.repository;

import com.code.acklet.airvault.entity.AirVaultCollaborator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AirVaultCollaboratorRepository extends JpaRepository<AirVaultCollaborator, Long> {

    Optional<AirVaultCollaborator> findByClipboardIdAndUserId(String clipboardId, String userId);

    List<AirVaultCollaborator> findByClipboardIdOrderByJoinedAtAsc(String clipboardId);

    List<AirVaultCollaborator> findByUserIdOrderByJoinedAtDesc(String userId);

    boolean existsByClipboardIdAndUserId(String clipboardId, String userId);

    void deleteByClipboardIdAndUserId(String clipboardId, String userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE AirVaultCollaborator c SET c.clipboardId = :newId WHERE c.clipboardId = :oldId")
    void updateClipboardId(@org.springframework.data.repository.query.Param("oldId") String oldId, @org.springframework.data.repository.query.Param("newId") String newId);
}
