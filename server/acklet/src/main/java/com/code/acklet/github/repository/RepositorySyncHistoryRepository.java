package com.code.acklet.github.repository;

import com.code.acklet.github.entity.RepositorySyncHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RepositorySyncHistoryRepository extends JpaRepository<RepositorySyncHistory, UUID> {
    List<RepositorySyncHistory> findAllByRepositoryIdOrderBySyncedAtDesc(UUID repositoryId);
}
