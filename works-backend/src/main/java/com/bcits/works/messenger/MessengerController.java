package com.bcits.works.messenger;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/messenger")
public class MessengerController {
    
    private final MessengerService messengerService;

    public MessengerController(MessengerService messengerService) {
        this.messengerService = messengerService;
    }

    @PostMapping("/channels")
    public Channel createChannel(@RequestHeader("X-Works-User") String userId,
                                 @PathVariable String workspaceId,
                                 @RequestBody ChannelRequest request) {
        return messengerService.createChannel(userId, workspaceId, request.name(), request.isPrivate());
    }

    @GetMapping("/channels")
    public List<Channel> getChannels(@RequestHeader("X-Works-User") String userId,
                                     @PathVariable String workspaceId) {
        return messengerService.getWorkspaceChannels(userId, workspaceId);
    }

    @PostMapping("/channels/{channelId}/messages")
    public Message sendMessage(@RequestHeader("X-Works-User") String userId,
                               @PathVariable String workspaceId,
                               @PathVariable String channelId,
                               @RequestBody MessageRequest request) {
        return messengerService.sendMessage(userId, workspaceId, channelId, request.content());
    }

    @GetMapping("/channels/{channelId}/messages")
    public List<Message> getMessages(@RequestHeader("X-Works-User") String userId,
                                     @PathVariable String workspaceId,
                                     @PathVariable String channelId) {
        return messengerService.getChannelMessages(userId, workspaceId, channelId);
    }

    public record ChannelRequest(String name, boolean isPrivate) {}
    public record MessageRequest(String content) {}
}
