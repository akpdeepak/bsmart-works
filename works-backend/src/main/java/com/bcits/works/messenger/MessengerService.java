package com.bcits.works.messenger;

import com.bcits.works.auth.RbacService;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class MessengerService {
    private final ChannelRepository channels;
    private final MessageRepository messages;
    private final RbacService rbac;

    public MessengerService(ChannelRepository channels, MessageRepository messages, RbacService rbac) {
        this.channels = channels;
        this.messages = messages;
        this.rbac = rbac;
    }

    public Channel createChannel(String userId, String workspaceId, String name, boolean isPrivate) {
        // Re-using permission for channel creation, or should add a new one? Let's use workspace access.
        rbac.require(userId, workspaceId, "create_projects");
        Channel c = new Channel();
        c.setId("CH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        c.setWorkspaceId(workspaceId);
        c.setName(name);
        c.setPrivate(isPrivate);
        c.setCreatedAt(OffsetDateTime.now());
        return channels.save(c);
    }

    public List<Channel> getWorkspaceChannels(String userId, String workspaceId) {
        rbac.require(userId, workspaceId, "view_workspace");
        return channels.findByWorkspaceId(workspaceId);
    }

    public Message sendMessage(String userId, String workspaceId, String channelId, String content) {
        rbac.require(userId, workspaceId, "view_workspace"); // Minimal permission for now
        
        Message m = new Message();
        m.setId("MSG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        m.setChannelId(channelId);
        m.setSenderId(userId);
        m.setContent(content);
        m.setCreatedAt(OffsetDateTime.now());
        return messages.save(m);
    }

    public List<Message> getChannelMessages(String userId, String workspaceId, String channelId) {
        rbac.require(userId, workspaceId, "view_workspace");
        return messages.findByChannelIdOrderByCreatedAtAsc(channelId);
    }
}
