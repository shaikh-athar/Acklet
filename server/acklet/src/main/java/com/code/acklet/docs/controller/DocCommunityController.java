package com.code.acklet.docs.controller;

import com.code.acklet.docs.dto.*;
import com.code.acklet.docs.service.DocCommunityService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/docs")
@RequiredArgsConstructor
@Tag(name = "Acklet Community", description = "Endpoints for following authors, bookmarks, reading history, and notifications")
public class DocCommunityController {

    private final DocCommunityService communityService;

    // ── Following ───────────────────────────────────────────────────────────────

    @PostMapping("/authors/{authorId}/follow")
    @Operation(summary = "Follow an author")
    public ResponseEntity<ApiResponse<FollowStatusResponse>> followAuthor(
            @PathVariable UUID authorId,
            @AuthenticationPrincipal User user) {
        FollowStatusResponse status = communityService.followAuthor(authorId, user);
        return ResponseEntity.ok(ApiResponse.success(status, "Author followed successfully"));
    }

    @DeleteMapping("/authors/{authorId}/follow")
    @Operation(summary = "Unfollow an author")
    public ResponseEntity<ApiResponse<FollowStatusResponse>> unfollowAuthor(
            @PathVariable UUID authorId,
            @AuthenticationPrincipal User user) {
        FollowStatusResponse status = communityService.unfollowAuthor(authorId, user);
        return ResponseEntity.ok(ApiResponse.success(status, "Author unfollowed successfully"));
    }

    @GetMapping("/authors/{authorId}/follow-status")
    @Operation(summary = "Get follow status for an author")
    public ResponseEntity<ApiResponse<FollowStatusResponse>> getFollowStatus(
            @PathVariable UUID authorId,
            @AuthenticationPrincipal User user) {
        FollowStatusResponse status = communityService.getFollowStatus(authorId, user);
        return ResponseEntity.ok(ApiResponse.success(status, "Follow status retrieved"));
    }

    @GetMapping("/following")
    @Operation(summary = "List followed authors")
    public ResponseEntity<ApiResponse<List<AuthorProfileResponse>>> listFollowing(
            @AuthenticationPrincipal User user) {
        List<AuthorProfileResponse> list = communityService.listFollowing(user);
        return ResponseEntity.ok(ApiResponse.success(list, "Following list retrieved"));
    }

    // ── Bookmarks ───────────────────────────────────────────────────────────────

    @PostMapping("/{docId}/bookmark")
    @Operation(summary = "Toggle bookmark for a document")
    public ResponseEntity<ApiResponse<Boolean>> toggleBookmark(
            @PathVariable UUID docId,
            @AuthenticationPrincipal User user) {
        boolean bookmarked = communityService.toggleBookmark(docId, user);
        String msg = bookmarked ? "Bookmark added" : "Bookmark removed";
        return ResponseEntity.ok(ApiResponse.success(bookmarked, msg));
    }

    @GetMapping("/{docId}/bookmark")
    @Operation(summary = "Check if document is bookmarked")
    public ResponseEntity<ApiResponse<Boolean>> isBookmarked(
            @PathVariable UUID docId,
            @AuthenticationPrincipal User user) {
        boolean bookmarked = communityService.isBookmarked(docId, user);
        return ResponseEntity.ok(ApiResponse.success(bookmarked, "Bookmark status retrieved"));
    }

    @GetMapping("/bookmarks")
    @Operation(summary = "List saved bookmarks for current user")
    public ResponseEntity<ApiResponse<Page<BookmarkResponse>>> listBookmarks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @AuthenticationPrincipal User user) {
        Page<BookmarkResponse> bookmarks = communityService.listBookmarks(user, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(bookmarks, "Bookmarks retrieved successfully"));
    }

    // ── Reading History ─────────────────────────────────────────────────────────

    @PostMapping("/public/{slug}/read")
    @Operation(summary = "Record reading history event")
    public ResponseEntity<ApiResponse<Void>> recordRead(
            @PathVariable String slug,
            @AuthenticationPrincipal User user) {
        communityService.recordReadingHistory(slug, user);
        return ResponseEntity.ok(ApiResponse.success(null, "Reading recorded"));
    }

    @GetMapping("/history")
    @Operation(summary = "List reading history for current user")
    public ResponseEntity<ApiResponse<Page<ReadingHistoryResponse>>> listHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {
        Page<ReadingHistoryResponse> history = communityService.listReadingHistory(user, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(history, "Reading history retrieved"));
    }

    @DeleteMapping("/history")
    @Operation(summary = "Clear reading history")
    public ResponseEntity<ApiResponse<Void>> clearHistory(
            @AuthenticationPrincipal User user) {
        communityService.clearReadingHistory(user);
        return ResponseEntity.ok(ApiResponse.success(null, "Reading history cleared"));
    }

    // ── Notifications ───────────────────────────────────────────────────────────

    @GetMapping("/notifications")
    @Operation(summary = "List notifications for current user")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> listNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal User user) {
        Page<NotificationResponse> notifications = communityService.listNotifications(user, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(notifications, "Notifications retrieved"));
    }

    @GetMapping("/notifications/unread-count")
    @Operation(summary = "Get unread notifications count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(
            @AuthenticationPrincipal User user) {
        long count = communityService.getUnreadNotificationCount(user);
        return ResponseEntity.ok(ApiResponse.success(count, "Unread count retrieved"));
    }

    @PutMapping("/notifications/{id}/read")
    @Operation(summary = "Mark notification as read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        communityService.markNotificationRead(id, user);
        return ResponseEntity.ok(ApiResponse.success(null, "Notification marked read"));
    }

    @PutMapping("/notifications/read-all")
    @Operation(summary = "Mark all notifications as read")
    public ResponseEntity<ApiResponse<Void>> markAllRead(
            @AuthenticationPrincipal User user) {
        communityService.markAllNotificationsRead(user);
        return ResponseEntity.ok(ApiResponse.success(null, "All notifications marked read"));
    }

    // ── Public Author Profile ───────────────────────────────────────────────────

    @GetMapping("/authors/{authorId}")
    @Operation(summary = "Get public author profile by ID")
    public ResponseEntity<ApiResponse<AuthorProfileResponse>> getAuthorProfile(
            @PathVariable UUID authorId,
            @AuthenticationPrincipal User user) {
        AuthorProfileResponse profile = communityService.getAuthorProfile(authorId, user);
        return ResponseEntity.ok(ApiResponse.success(profile, "Author profile retrieved"));
    }

    @GetMapping("/authors/username/{username}")
    @Operation(summary = "Get public author profile by username")
    public ResponseEntity<ApiResponse<AuthorProfileResponse>> getAuthorProfileByUsername(
            @PathVariable String username,
            @AuthenticationPrincipal User user) {
        AuthorProfileResponse profile = communityService.getAuthorProfileByUsername(username, user);
        return ResponseEntity.ok(ApiResponse.success(profile, "Author profile retrieved"));
    }
}
