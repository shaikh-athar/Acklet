package com.code.acklet.discovery.repository;

import com.code.acklet.discovery.entity.DiscoveryRankingWeight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DiscoveryRankingWeightRepository extends JpaRepository<DiscoveryRankingWeight, UUID> {
}
