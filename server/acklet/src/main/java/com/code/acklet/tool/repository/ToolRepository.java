package com.code.acklet.tool.repository;

import com.code.acklet.tool.entity.Tool;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ToolRepository extends JpaRepository<Tool, UUID>, JpaSpecificationExecutor<Tool> {
    Optional<Tool> findBySlug(String slug);
    List<Tool> findByIsFeaturedTrue();
    List<Tool> findByIsTrendingTrue();
    Page<Tool> findByCategoryId(UUID categoryId, Pageable pageable);

    @Query("SELECT t FROM Tool t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(t.description) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Tool> searchTools(@Param("query") String query, Pageable pageable);

    @Query("SELECT t FROM Tool t ORDER BY t.createdAt DESC")
    List<Tool> findNewReleases(Pageable pageable);

    @Query("SELECT t.name FROM Tool t WHERE LOWER(t.name) LIKE LOWER(CONCAT(:prefix, '%')) ORDER BY t.usageCount DESC")
    List<String> findAutocompleteNames(@Param("prefix") String prefix, Pageable pageable);

    // Publisher & Moderation queries
    Page<Tool> findByStatus(Tool.ToolStatus status, Pageable pageable);
    Page<Tool> findByPublisherIdAndDeletedAtIsNull(UUID publisherId, Pageable pageable);
    long countByPublisherId(UUID publisherId);

    boolean existsBySlug(String slug);
    Optional<Tool> findByRepositoryId(UUID repositoryId);
}
