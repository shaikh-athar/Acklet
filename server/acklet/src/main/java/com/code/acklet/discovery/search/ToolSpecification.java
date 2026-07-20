package com.code.acklet.discovery.search;

import com.code.acklet.tool.entity.Tool;
import org.springframework.data.jpa.domain.Specification;

public class ToolSpecification {

    public static Specification<Tool> hasKeyword(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction();
            }
            String term = "%" + keyword.trim().toLowerCase() + "%";
            return cb.or(
                cb.like(cb.lower(root.get("name")), term),
                cb.like(cb.lower(root.get("description")), term),
                cb.like(cb.lower(root.get("author")), term)
            );
        };
    }

    public static Specification<Tool> hasCategorySlug(String categorySlug) {
        return (root, query, cb) -> {
            if (categorySlug == null || categorySlug.trim().isEmpty()) {
                return cb.conjunction();
            }
            return cb.equal(root.get("category").get("slug"), categorySlug.trim());
        };
    }

    public static Specification<Tool> isFeatured(Boolean isFeatured) {
        return (root, query, cb) -> {
            if (isFeatured == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("isFeatured"), isFeatured);
        };
    }

    public static Specification<Tool> isTrending(Boolean isTrending) {
        return (root, query, cb) -> {
            if (isTrending == null) {
                return cb.conjunction();
            }
            return cb.equal(root.get("isTrending"), isTrending);
        };
    }
}
