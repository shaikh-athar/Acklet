package com.code.acklet.blog.mapper;

import com.code.acklet.blog.dto.ArticleResponse;
import com.code.acklet.blog.entity.Article;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-07-16T20:03:51+0530",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.9 (Oracle Corporation)"
)
@Component
public class BlogMapperImpl implements BlogMapper {

    @Override
    public ArticleResponse toResponse(Article article) {
        if ( article == null ) {
            return null;
        }

        ArticleResponse.ArticleResponseBuilder articleResponse = ArticleResponse.builder();

        articleResponse.id( article.getId() );
        articleResponse.title( article.getTitle() );
        articleResponse.content( article.getContent() );
        articleResponse.slug( article.getSlug() );
        articleResponse.readingTime( article.getReadingTime() );
        Map<String, Object> map = article.getSeoMetadata();
        if ( map != null ) {
            articleResponse.seoMetadata( new LinkedHashMap<String, Object>( map ) );
        }
        articleResponse.createdAt( article.getCreatedAt() );

        return articleResponse.build();
    }
}
