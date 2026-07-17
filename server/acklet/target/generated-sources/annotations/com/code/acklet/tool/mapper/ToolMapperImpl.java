package com.code.acklet.tool.mapper;

import com.code.acklet.tool.dto.CategoryResponse;
import com.code.acklet.tool.dto.ToolResponse;
import com.code.acklet.tool.entity.Category;
import com.code.acklet.tool.entity.Tool;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-07-16T20:03:51+0530",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.9 (Oracle Corporation)"
)
@Component
public class ToolMapperImpl implements ToolMapper {

    @Override
    public CategoryResponse toCategoryResponse(Category category) {
        if ( category == null ) {
            return null;
        }

        CategoryResponse.CategoryResponseBuilder categoryResponse = CategoryResponse.builder();

        categoryResponse.id( category.getId() );
        categoryResponse.name( category.getName() );
        categoryResponse.slug( category.getSlug() );
        categoryResponse.icon( category.getIcon() );
        categoryResponse.description( category.getDescription() );

        return categoryResponse.build();
    }

    @Override
    public ToolResponse toToolResponse(Tool tool) {
        if ( tool == null ) {
            return null;
        }

        ToolResponse.ToolResponseBuilder toolResponse = ToolResponse.builder();

        toolResponse.categoryId( toolCategoryId( tool ) );
        toolResponse.categoryName( toolCategoryName( tool ) );
        toolResponse.isFeatured( tool.isFeatured() );
        toolResponse.isTrending( tool.isTrending() );
        toolResponse.id( tool.getId() );
        toolResponse.name( tool.getName() );
        toolResponse.slug( tool.getSlug() );
        toolResponse.description( tool.getDescription() );
        toolResponse.version( tool.getVersion() );
        toolResponse.url( tool.getUrl() );
        toolResponse.icon( tool.getIcon() );
        toolResponse.author( tool.getAuthor() );
        toolResponse.usageCount( tool.getUsageCount() );

        return toolResponse.build();
    }

    private UUID toolCategoryId(Tool tool) {
        Category category = tool.getCategory();
        if ( category == null ) {
            return null;
        }
        return category.getId();
    }

    private String toolCategoryName(Tool tool) {
        Category category = tool.getCategory();
        if ( category == null ) {
            return null;
        }
        return category.getName();
    }
}
