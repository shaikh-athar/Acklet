package com.code.acklet.tool.tools.shortener.repository;

import com.code.acklet.tool.tools.shortener.entity.ShortLinkDailyClickEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShortLinkDailyClickRepository extends JpaRepository<ShortLinkDailyClickEntity, UUID> {

    Optional<ShortLinkDailyClickEntity> findByLinkIdAndClickDate(UUID linkId, LocalDate clickDate);

    List<ShortLinkDailyClickEntity> findByLinkIdAndClickDateGreaterThanEqualOrderByClickDateAsc(UUID linkId, LocalDate fromDate);

    @Modifying
    @Query(value = """
        INSERT INTO short_link_daily_clicks (id, link_id, click_date, clicks)
        VALUES (:id, :linkId, :clickDate, 1)
        ON CONFLICT (link_id, click_date)
        DO UPDATE SET clicks = short_link_daily_clicks.clicks + 1
        """, nativeQuery = true)
    int upsertDailyClick(@Param("id") UUID id, @Param("linkId") UUID linkId, @Param("clickDate") LocalDate clickDate);
}

