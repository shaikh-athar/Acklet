package com.code.acklet.discovery.service;

import com.code.acklet.discovery.entity.HomepageSectionConfig;
import com.code.acklet.discovery.repository.HomepageSectionConfigRepository;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.ToolRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HomepageDiscoveryService {

    private final HomepageSectionConfigRepository sectionConfigRepository;
    private final ToolRepository toolRepository;

    @Getter @Setter @Builder
    public static class DynamicHomepageSectionDto {
        private String sectionKey;
        private String title;
        private String subtitle;
        private Integer displayOrder;
        private List<Tool> items;
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "homepage_discovery")
    public List<DynamicHomepageSectionDto> getHomepageDiscoverySections() {
        List<HomepageSectionConfig> configs = sectionConfigRepository.findByEnabledTrueOrderByDisplayOrderAsc();
        List<DynamicHomepageSectionDto> sections = new ArrayList<>();

        for (HomepageSectionConfig cfg : configs) {
            List<Tool> items = fetchSectionItems(cfg.getSectionKey(), cfg.getItemLimit());
            sections.add(DynamicHomepageSectionDto.builder()
                    .sectionKey(cfg.getSectionKey())
                    .title(cfg.getTitle())
                    .subtitle(cfg.getSubtitle())
                    .displayOrder(cfg.getDisplayOrder())
                    .items(items)
                    .build());
        }

        return sections;
    }

    private List<Tool> fetchSectionItems(String key, int limit) {
        PageRequest page = PageRequest.of(0, limit);
        return switch (key) {
            case "FEATURED" -> toolRepository.findByIsFeaturedTrue();
            case "TRENDING" -> toolRepository.findByIsTrendingTrue();
            case "NEW_RELEASES" -> toolRepository.findNewReleases(page);
            default -> toolRepository.findAll(page).getContent();
        };
    }
}
