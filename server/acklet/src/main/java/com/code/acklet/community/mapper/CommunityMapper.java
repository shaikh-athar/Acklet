package com.code.acklet.community.mapper;

import com.code.acklet.community.dto.DiscussionResponse;
import com.code.acklet.community.dto.ReplyResponse;
import com.code.acklet.community.entity.Discussion;
import com.code.acklet.community.entity.Reply;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CommunityMapper {

    @Mapping(target = "authorName", source = "user.profile.displayName")
    @Mapping(target = "authorAvatarUrl", source = "user.profile.avatarUrl")
    @Mapping(target = "isPinned", source = "pinned")
    DiscussionResponse toDiscussionResponse(Discussion discussion);

    @Mapping(target = "discussionId", source = "discussion.id")
    @Mapping(target = "authorName", source = "user.profile.displayName")
    @Mapping(target = "authorAvatarUrl", source = "user.profile.avatarUrl")
    @Mapping(target = "parentReplyId", source = "parentReply.id")
    ReplyResponse toReplyResponse(Reply reply);
}
