package com.code.acklet.tool.tools.clipboard.repository;

import com.code.acklet.tool.tools.clipboard.entity.ClipboardTextRevisionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClipboardTextRevisionRepository extends JpaRepository<ClipboardTextRevisionEntity, String> {

    List<ClipboardTextRevisionEntity> findByShare_CodeOrderByVersionDesc(String shareCode);

    @Modifying
    @Query("DELETE FROM ClipboardTextRevisionEntity r WHERE r.share.code = :shareCode")
    void deleteByShare_Code(String shareCode);
}
