package com.code.acklet.discovery.repository;

import com.code.acklet.discovery.entity.HomepageSectionConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HomepageSectionConfigRepository extends JpaRepository<HomepageSectionConfig, UUID> {
    List<HomepageSectionConfig> findByEnabledTrueOrderByDisplayOrderAsc();
    Optional<HomepageSectionConfig> findBySectionKey(String sectionKey);
}
