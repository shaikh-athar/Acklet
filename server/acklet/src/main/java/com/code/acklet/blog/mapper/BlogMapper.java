package com.code.acklet.blog.mapper;

import com.code.acklet.blog.dto.ArticleResponse;
import com.code.acklet.blog.entity.Article;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface BlogMapper {
    ArticleResponse toResponse(Article article);
}
