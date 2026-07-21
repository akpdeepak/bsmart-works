package com.bcits.works.messenger;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChannelRepository extends JpaRepository<Channel, String> {
    List<Channel> findByWorkspaceId(String workspaceId);
}
