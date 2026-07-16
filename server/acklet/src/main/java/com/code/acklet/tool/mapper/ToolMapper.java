package com.code.acklet.tool.mapper;

import com.code.acklet.tool.dto.CategoryResponse;
import com.code.acklet.tool.dto.ToolResponse;
import com.code.acklet.tool.entity.Category;
import com.code.acklet.tool.entity.Tool;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ToolMapper {

    CategoryResponse toCategoryResponse(Category category);

    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "isFeatured", source = "featured")
    @Mapping(target = "isTrending", source = "trending")
    ToolResponse toToolResponse(Tool tool);
}
