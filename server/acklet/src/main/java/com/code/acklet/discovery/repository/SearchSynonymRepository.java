package com.code.acklet.discovery.repository;

import com.code.acklet.discovery.entity.SearchSynonym;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SearchSynonymRepository extends JpaRepository<SearchSynonym, UUID> {
    Optional<SearchSynonym> findByTermIgnoreCase(String term);
}
