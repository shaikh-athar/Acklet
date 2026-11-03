package com.code.acklet.tool.tools.shortener.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "short_link_daily_clicks", uniqueConstraints = {
        @UniqueConstraint(name = "uq_short_link_daily_clicks", columnNames = {"link_id", "click_date"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class ShortLinkDailyClickEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "link_id", nullable = false)
    private UUID linkId;

    @Column(name = "click_date", nullable = false)
    private LocalDate clickDate;

    @Column(nullable = false)
    private long clicks;
}

