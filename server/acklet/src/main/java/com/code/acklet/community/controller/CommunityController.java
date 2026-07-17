package com.code.acklet.community.controller;

import com.code.acklet.community.dto.DiscussionRequest;
import com.code.acklet.community.dto.DiscussionResponse;
import com.code.acklet.community.dto.ReplyRequest;
import com.code.acklet.community.dto.ReplyResponse;
import com.code.acklet.community.entity.Discussion;
import com.code.acklet.community.entity.Reply;
import com.code.acklet.community.mapper.CommunityMapper;
import com.code.acklet.community.service.CommunityService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/community")
@RequiredArgsConstructor
@Tag(name = "Community Discussions", description = "Endpoints for posting forum discussions and threaded replies")
public class CommunityController {

    private final CommunityService communityService;
    private final CommunityMapper communityMapper;

    @GetMapping("/discussions")
    @Operation(summary = "List forum discussions", description = "Retrieves a paginated list of community forum discussions")
    public ResponseEntity<ApiResponse<Page<DiscussionResponse>>> getDiscussions(Pageable pageable) {
        Page<DiscussionResponse> response = communityService.getAllDiscussions(pageable)
                .map(communityMapper::toDiscussionResponse);
        return ResponseEntity.ok(ApiResponse.success(response, "Discussions retrieved successfully"));
    }

    @GetMapping("/discussions/{slug}")
    @Operation(summary = "Get discussion by slug", description = "Retrieves details and increments view count of a discussion thread")
    public ResponseEntity<ApiResponse<DiscussionResponse>> getDiscussion(@PathVariable String slug) {
        Discussion discussion = communityService.getDiscussionBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(communityMapper.toDiscussionResponse(discussion), "Discussion retrieved successfully"));
    }

    @PostMapping("/discussions")
    @Operation(summary = "Create forum discussion thread", description = "Creates a new community forum discussion")
    public ResponseEntity<ApiResponse<DiscussionResponse>> createDiscussion(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody DiscussionRequest request
    ) {
        Discussion created = communityService.createDiscussion(currentUser, request);
        return ResponseEntity.ok(ApiResponse.success(communityMapper.toDiscussionResponse(created), "Discussion created successfully"));
    }

    @DeleteMapping("/discussions/{id}")
    @Operation(summary = "Delete discussion thread", description = "Soft-deletes a forum discussion thread by its ID")
    public ResponseEntity<ApiResponse<Void>> deleteDiscussion(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        communityService.deleteDiscussion(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(null, "Discussion deleted successfully"));
    }

    @GetMapping("/discussions/{id}/replies")
    @Operation(summary = "List thread replies", description = "Retrieves all replies for the specified discussion thread")
    public ResponseEntity<ApiResponse<List<ReplyResponse>>> getReplies(@PathVariable UUID id) {
        List<ReplyResponse> replies = communityService.getRepliesForDiscussion(id).stream()
                .map(communityMapper::toReplyResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(replies, "Replies retrieved successfully"));
    }

    @PostMapping("/discussions/{id}/replies")
    @Operation(summary = "Post reply to thread", description = "Appends a new reply or nested comment to a discussion thread")
    public ResponseEntity<ApiResponse<ReplyResponse>> createReply(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ReplyRequest request
    ) {
        Reply created = communityService.createReply(currentUser, id, request);
        return ResponseEntity.ok(ApiResponse.success(communityMapper.toReplyResponse(created), "Reply posted successfully"));
    }

    @DeleteMapping("/replies/{id}")
    @Operation(summary = "Delete thread reply", description = "Soft-deletes a reply or comment by its ID")
    public ResponseEntity<ApiResponse<Void>> deleteReply(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        communityService.deleteReply(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(null, "Reply deleted successfully"));
    }
}
