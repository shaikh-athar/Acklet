package com.code.acklet.publisher.service;

import com.code.acklet.shared.exception.ConflictException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PublisherService {

    private final UserRepository userRepository;
    private final ToolRepository toolRepository;

    /**
     * Upgrades a USER-role account to PUBLISHER.
     * Idempotent: calling again if already PUBLISHER is a no-op.
     */
    @Transactional
    public User becomePublisher(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() == User.Role.PUBLISHER) {
            throw new ConflictException("You are already a publisher");
        }
        if (user.getRole() == User.Role.ADMIN || user.getRole() == User.Role.MODERATOR) {
            throw new ConflictException("Admin/Moderator accounts do not need the publisher role");
        }

        user.setRole(User.Role.PUBLISHER);
        User saved = userRepository.save(user);
        log.info("User {} upgraded to PUBLISHER", userId);
        return saved;
    }

    /** Quick stats for the publisher dashboard. */
    public PublisherStats getStats(UUID publisherId) {
        long total     = toolRepository.countByPublisherId(publisherId);
        return new PublisherStats(total);
    }

    public record PublisherStats(long totalTools) {}
}
