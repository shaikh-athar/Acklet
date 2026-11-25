package com.code.acklet.docs.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthorProfileResponse {
    private UUID id;
    private String displayName;
    private String username;
    private String avatarUrl;
    private String bio;
    private Instant joinedAt;
    private long followerCount;
    private long followingCount;
    private boolean isFollowing;
    private List<DocumentResponse> publishedStories;
}
