package com.code.acklet.community.service;

import com.code.acklet.community.dto.DiscussionRequest;
import com.code.acklet.community.dto.ReplyRequest;
import com.code.acklet.community.entity.Discussion;
import com.code.acklet.community.entity.Reply;
import com.code.acklet.community.repository.DiscussionRepository;
import com.code.acklet.community.repository.ReplyRepository;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private final DiscussionRepository discussionRepository;
    private final ReplyRepository replyRepository;

    public Page<Discussion> getAllDiscussions(Pageable pageable) {
        return discussionRepository.findAll(pageable);
    }

    public Discussion getDiscussionBySlug(String slug) {
        Discussion discussion = discussionRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Discussion not found with slug: " + slug));
        
        // Increment view count
        discussion.setViewCount(discussion.getViewCount() + 1);
        return discussionRepository.save(discussion);
    }

    @Transactional
    public Discussion createDiscussion(User user, DiscussionRequest request) {
        String slug = generateSlug(request.getTitle());
        Discussion discussion = Discussion.builder()
                .user(user)
                .title(request.getTitle())
                .content(request.getContent())
                .slug(slug)
                .build();
        return discussionRepository.save(discussion);
    }

    @Transactional
    public void deleteDiscussion(User user, UUID id) {
        Discussion discussion = discussionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Discussion not found"));

        if (!discussion.getUser().getId().equals(user.getId()) && user.getRole() != User.Role.ADMIN) {
            throw new ForbiddenException("You do not have permission to delete this discussion");
        }

        discussion.setDeletedAt(Instant.now());
        discussionRepository.save(discussion);
    }

    public List<Reply> getRepliesForDiscussion(UUID discussionId) {
        return replyRepository.findByDiscussionIdOrderByCreatedAtAsc(discussionId);
    }

    @Transactional
    public Reply createReply(User user, UUID discussionId, ReplyRequest request) {
        Discussion discussion = discussionRepository.findById(discussionId)
                .orElseThrow(() -> new ResourceNotFoundException("Discussion not found"));

        Reply parentReply = null;
        if (request.getParentReplyId() != null) {
            parentReply = replyRepository.findById(request.getParentReplyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent reply not found"));
        }

        Reply reply = Reply.builder()
                .user(user)
                .discussion(discussion)
                .parentReply(parentReply)
                .content(request.getContent())
                .build();

        return replyRepository.save(reply);
    }

    @Transactional
    public void deleteReply(User user, UUID replyId) {
        Reply reply = replyRepository.findById(replyId)
                .orElseThrow(() -> new ResourceNotFoundException("Reply not found"));

        if (!reply.getUser().getId().equals(user.getId()) && user.getRole() != User.Role.ADMIN) {
            throw new ForbiddenException("You do not have permission to delete this reply");
        }

        reply.setDeletedAt(Instant.now());
        replyRepository.save(reply);
    }

    private String generateSlug(String title) {
        return title.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", "")
                .replaceAll("\\s+", "-")
                + "-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
