package com.bcits.works.messenger;

import com.bcits.works.auth.RbacService;
import com.bcits.works.shared.ApiException;
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
        requireChannelInWorkspace(workspaceId, channelId);

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
        requireChannelInWorkspace(workspaceId, channelId);
        return messages.findByChannelIdOrderByCreatedAtAsc(channelId);
    }

    /**
     * {@code workspaceId} and {@code channelId} arrive as independent path variables, so passing the
     * RBAC check on the claimed workspace says nothing about who owns the channel. Re-check ownership
     * before any message is read or written, or a member of one workspace can reach another's channel
     * by pairing their own workspace id with a foreign channel id (RB-40 §1).
     */
    private void requireChannelInWorkspace(String workspaceId, String channelId) {
        Channel channel = channels.findById(channelId)
            .orElseThrow(() -> ApiException.notFound("Channel", channelId));
        if (!channel.getWorkspaceId().equals(workspaceId)) {
            throw ApiException.forbidden("Channel belongs to a different workspace.");
        }
    }
}
