package com.code.acklet.tool.tools.clipboard.repository;

import com.code.acklet.tool.tools.clipboard.entity.ClipboardItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClipboardItemRepository extends JpaRepository<ClipboardItemEntity, String> {

    List<ClipboardItemEntity> findByShare_CodeOrderByCreatedAtDesc(String shareCode);

    Optional<ClipboardItemEntity> findByIdAndShare_Code(String id, String shareCode);

    List<ClipboardItemEntity> findByContentHash(String contentHash);

    @Modifying
    @Query("DELETE FROM ClipboardItemEntity i WHERE i.share.code = :shareCode AND (LOWER(i.itemType) = 'text' OR LOWER(i.itemType) = 'link')")
    void deleteTextItemsByShareCode(String shareCode);

    @Modifying
    @Query("DELETE FROM ClipboardItemEntity i WHERE i.share.code = :shareCode AND i.id = :itemId")
    int deleteByShareCodeAndItemId(String shareCode, String itemId);

    @Modifying
    @Query("DELETE FROM ClipboardItemEntity i WHERE i.share.code = :shareCode")
    void deleteByShare_Code(String shareCode);
}
