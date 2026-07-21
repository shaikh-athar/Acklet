package com.code.acklet.tool.repository;

import com.code.acklet.tool.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TagRepository extends JpaRepository<Tag, UUID> {
    Optional<Tag> findBySlug(String slug);
    List<Tag> findByNameContainingIgnoreCase(String name);
}
