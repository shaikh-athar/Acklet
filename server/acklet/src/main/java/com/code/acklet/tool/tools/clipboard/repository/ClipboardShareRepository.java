package com.code.acklet.tool.tools.clipboard.repository;

import com.code.acklet.tool.tools.clipboard.entity.ClipboardShareEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ClipboardShareRepository extends JpaRepository<ClipboardShareEntity, String> {

    List<ClipboardShareEntity> findByExpiresAtBefore(Instant now);

    @Modifying
    @Query("DELETE FROM ClipboardShareEntity s WHERE s.expiresAt < :now")
    int deleteExpiredShares(Instant now);
}
