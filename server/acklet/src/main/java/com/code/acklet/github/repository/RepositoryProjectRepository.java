package com.code.acklet.github.repository;

import com.code.acklet.github.entity.RepositoryProject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RepositoryProjectRepository extends JpaRepository<RepositoryProject, UUID> {
    List<RepositoryProject> findAllByRepositoryId(UUID repositoryId);
    Page<RepositoryProject> findAllByRepositoryId(UUID repositoryId, Pageable pageable);

    @Query("SELECT p FROM RepositoryProject p WHERE p.repository.id = :repositoryId AND p.path = '/'")
    Optional<RepositoryProject> findRootByRepositoryId(UUID repositoryId);
}

