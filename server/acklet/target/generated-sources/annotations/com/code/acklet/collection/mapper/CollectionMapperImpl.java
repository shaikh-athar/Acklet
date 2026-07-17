package com.code.acklet.collection.mapper;

import com.code.acklet.collection.dto.CollectionResponse;
import com.code.acklet.collection.entity.Collection;
import com.code.acklet.tool.dto.ToolResponse;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.mapper.ToolMapper;
import com.code.acklet.user.entity.User;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-07-16T20:03:51+0530",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.9 (Oracle Corporation)"
)
@Component
public class CollectionMapperImpl implements CollectionMapper {

    @Autowired
    private ToolMapper toolMapper;

    @Override
    public CollectionResponse toCollectionResponse(Collection collection) {
        if ( collection == null ) {
            return null;
        }

        CollectionResponse.CollectionResponseBuilder collectionResponse = CollectionResponse.builder();

        collectionResponse.userId( collectionUserId( collection ) );
        collectionResponse.isPublic( collection.isPublic() );
        collectionResponse.id( collection.getId() );
        collectionResponse.name( collection.getName() );
        collectionResponse.description( collection.getDescription() );
        collectionResponse.tools( toolListToToolResponseList( collection.getTools() ) );

        return collectionResponse.build();
    }

    private UUID collectionUserId(Collection collection) {
        User user = collection.getUser();
        if ( user == null ) {
            return null;
        }
        return user.getId();
    }

    protected List<ToolResponse> toolListToToolResponseList(List<Tool> list) {
        if ( list == null ) {
            return null;
        }

        List<ToolResponse> list1 = new ArrayList<ToolResponse>( list.size() );
        for ( Tool tool : list ) {
            list1.add( toolMapper.toToolResponse( tool ) );
        }

        return list1;
    }
}
