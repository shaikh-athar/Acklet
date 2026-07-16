package com.code.acklet.community.repository;

import com.code.acklet.community.entity.Reply;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReplyRepository extends JpaRepository<Reply, UUID> {
    List<Reply> findByDiscussionIdOrderByCreatedAtAsc(UUID discussionId);
}
