package com.code.acklet.github.repository;

import com.code.acklet.github.entity.RepositoryStatistics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RepositoryStatisticsRepository extends JpaRepository<RepositoryStatistics, UUID> {
    Optional<RepositoryStatistics> findByRepositoryId(UUID repositoryId);
}
