package com.code.acklet.collection.mapper;

import com.code.acklet.collection.dto.CollectionResponse;
import com.code.acklet.collection.entity.Collection;
import com.code.acklet.tool.mapper.ToolMapper;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {ToolMapper.class})
public interface CollectionMapper {

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "isPublic", source = "public")
    CollectionResponse toCollectionResponse(Collection collection);
}
