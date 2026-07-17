package com.code.acklet.community.mapper;

import com.code.acklet.community.dto.DiscussionResponse;
import com.code.acklet.community.dto.ReplyResponse;
import com.code.acklet.community.entity.Discussion;
import com.code.acklet.community.entity.Reply;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.entity.UserProfile;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-07-16T20:03:51+0530",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.9 (Oracle Corporation)"
)
@Component
public class CommunityMapperImpl implements CommunityMapper {

    @Override
    public DiscussionResponse toDiscussionResponse(Discussion discussion) {
        if ( discussion == null ) {
            return null;
        }

        DiscussionResponse.DiscussionResponseBuilder discussionResponse = DiscussionResponse.builder();

        discussionResponse.authorName( discussionUserProfileDisplayName( discussion ) );
        discussionResponse.authorAvatarUrl( discussionUserProfileAvatarUrl( discussion ) );
        discussionResponse.isPinned( discussion.isPinned() );
        discussionResponse.id( discussion.getId() );
        discussionResponse.title( discussion.getTitle() );
        discussionResponse.content( discussion.getContent() );
        discussionResponse.slug( discussion.getSlug() );
        discussionResponse.viewCount( discussion.getViewCount() );
        discussionResponse.createdAt( discussion.getCreatedAt() );

        return discussionResponse.build();
    }

    @Override
    public ReplyResponse toReplyResponse(Reply reply) {
        if ( reply == null ) {
            return null;
        }

        ReplyResponse.ReplyResponseBuilder replyResponse = ReplyResponse.builder();

        replyResponse.discussionId( replyDiscussionId( reply ) );
        replyResponse.authorName( replyUserProfileDisplayName( reply ) );
        replyResponse.authorAvatarUrl( replyUserProfileAvatarUrl( reply ) );
        replyResponse.parentReplyId( replyParentReplyId( reply ) );
        replyResponse.id( reply.getId() );
        replyResponse.content( reply.getContent() );
        replyResponse.createdAt( reply.getCreatedAt() );

        return replyResponse.build();
    }

    private String discussionUserProfileDisplayName(Discussion discussion) {
        User user = discussion.getUser();
        if ( user == null ) {
            return null;
        }
        UserProfile profile = user.getProfile();
        if ( profile == null ) {
            return null;
        }
        return profile.getDisplayName();
    }

    private String discussionUserProfileAvatarUrl(Discussion discussion) {
        User user = discussion.getUser();
        if ( user == null ) {
            return null;
        }
        UserProfile profile = user.getProfile();
        if ( profile == null ) {
            return null;
        }
        return profile.getAvatarUrl();
    }

    private UUID replyDiscussionId(Reply reply) {
        Discussion discussion = reply.getDiscussion();
        if ( discussion == null ) {
            return null;
        }
        return discussion.getId();
    }

    private String replyUserProfileDisplayName(Reply reply) {
        User user = reply.getUser();
        if ( user == null ) {
            return null;
        }
        UserProfile profile = user.getProfile();
        if ( profile == null ) {
            return null;
        }
        return profile.getDisplayName();
    }

    private String replyUserProfileAvatarUrl(Reply reply) {
        User user = reply.getUser();
        if ( user == null ) {
            return null;
        }
        UserProfile profile = user.getProfile();
        if ( profile == null ) {
            return null;
        }
        return profile.getAvatarUrl();
    }

    private UUID replyParentReplyId(Reply reply) {
        Reply parentReply = reply.getParentReply();
        if ( parentReply == null ) {
            return null;
        }
        return parentReply.getId();
    }
}
