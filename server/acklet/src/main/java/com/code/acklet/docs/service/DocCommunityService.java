package com.code.acklet.docs.service;

import com.code.acklet.docs.dto.*;
import com.code.acklet.docs.entity.*;
import com.code.acklet.docs.repository.*;
import com.code.acklet.shared.exception.BadRequestException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.entity.UserProfile;
import com.code.acklet.user.repository.UserProfileRepository;
import com.code.acklet.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocCommunityService {

    private final DocAuthorFollowRepository followRepository;
    private final DocBookmarkRepository bookmarkRepository;
    private final DocReadingHistoryRepository historyRepository;
    private final DocNotificationRepository notificationRepository;
    private final DocDocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    // ── Following ───────────────────────────────────────────────────────────────

    @Transactional
    public FollowStatusResponse followAuthor(UUID authorId, User follower) {
        if (follower == null) {
            throw new BadRequestException("Authentication required to follow authors");
        }
        if (authorId.equals(follower.getId())) {
            throw new BadRequestException("You cannot follow yourself");
        }

        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new ResourceNotFoundException("Author not found: " + authorId));

        if (!followRepository.existsByFollowerIdAndAuthorId(follower.getId(), authorId)) {
            DocAuthorFollow follow = DocAuthorFollow.builder()
                    .followerId(follower.getId())
                    .authorId(authorId)
                    .build();
            followRepository.save(follow);

            // Notify author
            String followerName = resolveUserDisplayName(follower);
            createNotification(
                    authorId,
                    follower.getId(),
                    "NEW_FOLLOWER",
                    "New Follower",
                    followerName + " is now following your stories.",
                    "/profile/" + follower.getId()
            );
        }

        long count = followRepository.countByAuthorId(authorId);
        return FollowStatusResponse.builder()
                .authorId(authorId)
                .isFollowing(true)
                .followerCount(count)
                .build();
    }

    @Transactional
    public FollowStatusResponse unfollowAuthor(UUID authorId, User follower) {
        if (follower == null) {
            throw new BadRequestException("Authentication required");
        }
        followRepository.findByFollowerIdAndAuthorId(follower.getId(), authorId)
                .ifPresent(followRepository::delete);

        long count = followRepository.countByAuthorId(authorId);
        return FollowStatusResponse.builder()
                .authorId(authorId)
                .isFollowing(false)
                .followerCount(count)
                .build();
    }

    @Transactional(readOnly = true)
    public FollowStatusResponse getFollowStatus(UUID authorId, User currentUser) {
        boolean isFollowing = currentUser != null && followRepository.existsByFollowerIdAndAuthorId(currentUser.getId(), authorId);
        long count = followRepository.countByAuthorId(authorId);
        return FollowStatusResponse.builder()
                .authorId(authorId)
                .isFollowing(isFollowing)
                .followerCount(count)
                .build();
    }

    @Transactional(readOnly = true)
    public List<AuthorProfileResponse> listFollowing(User currentUser) {
        if (currentUser == null) return Collections.emptyList();
        List<DocAuthorFollow> follows = followRepository.findByFollowerIdOrderByCreatedAtDesc(currentUser.getId());
        List<AuthorProfileResponse> list = new ArrayList<>();
        for (DocAuthorFollow f : follows) {
            userRepository.findById(f.getAuthorId()).ifPresent(author -> {
                list.add(toAuthorProfileResponse(author, currentUser));
            });
        }
        return list;
    }

    // ── Bookmarks ───────────────────────────────────────────────────────────────

    @Transactional
    public boolean toggleBookmark(UUID documentId, User user) {
        if (user == null) {
            throw new BadRequestException("Authentication required to bookmark stories");
        }
        DocDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));

        Optional<DocBookmark> existing = bookmarkRepository.findByUserIdAndDocumentId(user.getId(), documentId);
        if (existing.isPresent()) {
            bookmarkRepository.delete(existing.get());
            return false;
        } else {
            DocBookmark bookmark = DocBookmark.builder()
                    .userId(user.getId())
                    .document(doc)
                    .build();
            bookmarkRepository.save(bookmark);
            return true;
        }
    }

    @Transactional(readOnly = true)
    public boolean isBookmarked(UUID documentId, User user) {
        if (user == null) return false;
        return bookmarkRepository.existsByUserIdAndDocumentId(user.getId(), documentId);
    }

    @Transactional(readOnly = true)
    public Page<BookmarkResponse> listBookmarks(User user, Pageable pageable) {
        if (user == null) return Page.empty();
        Page<DocBookmark> page = bookmarkRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);
        return page.map(b -> BookmarkResponse.builder()
                .id(b.getId())
                .documentId(b.getDocument().getId())
                .title(b.getDocument().getTitle())
                .slug(b.getDocument().getSlug())
                .summary(b.getDocument().getSummary())
                .authorName(resolveAuthorName(b.getDocument().getOwnerId()))
                .bookmarkedAt(b.getCreatedAt())
                .build());
    }

    // ── Reading History ─────────────────────────────────────────────────────────

    @Transactional
    public void recordReadingHistory(String slug, User user) {
        if (user == null || slug == null || slug.isBlank()) return;
        documentRepository.findBySlugAndStatus(slug, DocStatus.PUBLISHED).ifPresent(doc -> {
            DocReadingHistory history = historyRepository.findByUserIdAndDocumentId(user.getId(), doc.getId())
                    .orElseGet(() -> DocReadingHistory.builder()
                            .userId(user.getId())
                            .document(doc)
                            .build());
            history.setLastReadAt(Instant.now());
            historyRepository.save(history);
        });
    }

    @Transactional(readOnly = true)
    public Page<ReadingHistoryResponse> listReadingHistory(User user, Pageable pageable) {
        if (user == null) return Page.empty();
        Page<DocReadingHistory> page = historyRepository.findByUserIdOrderByLastReadAtDesc(user.getId(), pageable);
        return page.map(h -> ReadingHistoryResponse.builder()
                .id(h.getId())
                .documentId(h.getDocument().getId())
                .title(h.getDocument().getTitle())
                .slug(h.getDocument().getSlug())
                .summary(h.getDocument().getSummary())
                .authorName(resolveAuthorName(h.getDocument().getOwnerId()))
                .lastReadAt(h.getLastReadAt())
                .build());
    }

    @Transactional
    public void clearReadingHistory(User user) {
        if (user == null) return;
        historyRepository.deleteByUserId(user.getId());
    }

    // ── Notifications ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<NotificationResponse> listNotifications(User user, Pageable pageable) {
        if (user == null) return Page.empty();
        Page<DocNotification> page = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);
        return page.map(n -> NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .link(n.getLink())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build());
    }

    @Transactional(readOnly = true)
    public long getUnreadNotificationCount(User user) {
        if (user == null) return 0;
        return notificationRepository.countByUserIdAndReadFalse(user.getId());
    }

    @Transactional
    public void markNotificationRead(UUID notificationId, User user) {
        if (user == null) return;
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUserId().equals(user.getId())) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    @Transactional
    public void markAllNotificationsRead(User user) {
        if (user == null) return;
        notificationRepository.markAllAsReadForUser(user.getId());
    }

    @Transactional
    public void notifyFollowersOfPublication(UUID authorId, DocDocument doc) {
        List<DocAuthorFollow> followers = followRepository.findByAuthorId(authorId);
        String authorName = resolveAuthorName(authorId);
        for (DocAuthorFollow f : followers) {
            createNotification(
                    f.getFollowerId(),
                    authorId,
                    "DOC_PUBLISHED",
                    "New Story Published",
                    authorName + " published a new story: \"" + doc.getTitle() + "\"",
                    "/p/" + doc.getSlug()
            );
        }
    }

    private void createNotification(UUID recipientId, UUID actorId, String type, String title, String message, String link) {
        DocNotification notif = DocNotification.builder()
                .userId(recipientId)
                .actorId(actorId)
                .type(type)
                .title(title)
                .message(message)
                .link(link)
                .read(false)
                .build();
        notificationRepository.save(notif);
    }

    // ── Author Profile ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AuthorProfileResponse getAuthorProfile(UUID authorId, User currentUser) {
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new ResourceNotFoundException("Author not found: " + authorId));
        return toAuthorProfileResponse(author, currentUser);
    }

    @Transactional(readOnly = true)
    public AuthorProfileResponse getAuthorProfileByUsername(String username, User currentUser) {
        UserProfile profile = userProfileRepository.findAll().stream()
                .filter(p -> username.equalsIgnoreCase(p.getUsername()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Author not found with username: " + username));
        return toAuthorProfileResponse(profile.getUser(), currentUser);
    }

    private AuthorProfileResponse toAuthorProfileResponse(User author, User currentUser) {
        UserProfile p = author.getProfile();
        long followerCount = followRepository.countByAuthorId(author.getId());
        long followingCount = followRepository.countByFollowerId(author.getId());
        boolean isFollowing = currentUser != null && followRepository.existsByFollowerIdAndAuthorId(currentUser.getId(), author.getId());

        List<DocDocument> published = documentRepository.findByOwnerIdAndStatusOrderByPublishedAtDesc(author.getId(), DocStatus.PUBLISHED);
        List<DocumentResponse> stories = published.stream().map(doc -> DocumentResponse.builder()
                .id(doc.getId())
                .title(doc.getTitle())
                .slug(doc.getSlug())
                .summary(doc.getSummary())
                .status(doc.getStatus())
                .publishedAt(doc.getPublishedAt())
                .updatedAt(doc.getUpdatedAt())
                .sectionCount(doc.getSections().size())
                .authorName(resolveUserDisplayName(author))
                .build()).collect(Collectors.toList());

        return AuthorProfileResponse.builder()
                .id(author.getId())
                .displayName(resolveUserDisplayName(author))
                .username(p != null ? p.getUsername() : null)
                .avatarUrl(p != null ? p.getAvatarUrl() : null)
                .bio(p != null ? p.getBio() : null)
                .joinedAt(author.getCreatedAt())
                .followerCount(followerCount)
                .followingCount(followingCount)
                .isFollowing(isFollowing)
                .publishedStories(stories)
                .build();
    }

    private String resolveUserDisplayName(User u) {
        if (u.getProfile() != null && u.getProfile().getDisplayName() != null && !u.getProfile().getDisplayName().isBlank()) {
            return u.getProfile().getDisplayName();
        }
        return u.getEmail().split("@")[0];
    }

    private String resolveAuthorName(UUID authorId) {
        return userRepository.findById(authorId)
                .map(this::resolveUserDisplayName)
                .orElse("Acklet Author");
    }
}
