package com.bcits.works.messaging;
import com.bcits.works.messaging.api.ChatConversation;
import com.bcits.works.messaging.api.ChatConversationRepository;
import com.bcits.works.messaging.api.ChatMessage;
import com.bcits.works.messaging.api.ChatMessageRepository;

import com.bcits.works.shared.AuthenticatedUser;
import com.bcits.works.shared.RbacGate;
import com.bcits.works.shared.ApiException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/internal-messaging")
public class InternalMessagingController {

    private final ChatConversationRepository conversationRepo;
    private final ChatMessageRepository messageRepo;
    private final AuthenticatedUser authenticatedUser;
    private final RbacGate rbac;
    private final MessageArtifactService messageArtifacts;

    public InternalMessagingController(ChatConversationRepository conversationRepo,
                                       ChatMessageRepository messageRepo,
                                       AuthenticatedUser authenticatedUser,
                                       RbacGate rbac,
                                       MessageArtifactService messageArtifacts) {
        this.conversationRepo = conversationRepo;
        this.messageRepo = messageRepo;
        this.authenticatedUser = authenticatedUser;
        this.rbac = rbac;
        this.messageArtifacts = messageArtifacts;
    }

    @GetMapping("/conversations")
    public List<ChatConversation> list(@RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_read");
        // Narrow in the query, not after the read (RB-40 §1): an unscoped findAll here returned every
        // tenant's internal threads to any caller holding work_read in a single workspace.
        return conversationRepo.findByWorkspaceIdAndTypeNotOrderByLastMessageAtDesc(
                workspaceId, ConversationType.SUPPORT);
    }

    @PostMapping("/conversations")
    public ChatConversation create(@RequestParam String workspaceId, @RequestBody Map<String, String> body) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_write");
        
        ChatConversation c = new ChatConversation();
        c.setId(UUID.randomUUID().toString());
        c.setWorkspaceId(workspaceId);
        c.setSubject(body.getOrDefault("subject", "New Conversation"));
        c.setType(ConversationType.valueOf(body.getOrDefault("type", "DIRECT")));
        c.setCreatedAt(OffsetDateTime.now());
        c.setUpdatedAt(OffsetDateTime.now());
        c.setStatus("OPEN");
        return conversationRepo.save(c);
    }

    @GetMapping("/conversations/{id}")
    public Map<String, Object> get(@PathVariable String id, @RequestParam String workspaceId) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_read");
        
        ChatConversation c = conversationRepo.findById(id)
                .orElseThrow(() -> new ApiException(org.springframework.http.HttpStatus.NOT_FOUND, "NOT_FOUND", "not found"));
        if (!c.getWorkspaceId().equals(workspaceId)) {
            throw new ApiException(org.springframework.http.HttpStatus.NOT_FOUND, "NOT_FOUND", "not found");
        }
        
        List<ChatMessage> messages = messageRepo.findByConversationIdOrderByCreatedAtAsc(id);
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("conversation", c);
        res.put("messages", messages);
        return res;
    }

    @PostMapping("/conversations/{id}/messages")
    public ChatMessage sendMessage(@PathVariable String id, @RequestParam String workspaceId, @RequestBody Map<String, String> body) {
        rbac.require(authenticatedUser.id(), workspaceId, "work_write");
        
        ChatConversation c = conversationRepo.findById(id)
                .orElseThrow(() -> new ApiException(org.springframework.http.HttpStatus.NOT_FOUND, "NOT_FOUND", "not found"));
        if (!c.getWorkspaceId().equals(workspaceId)) {
            throw new ApiException(org.springframework.http.HttpStatus.NOT_FOUND, "NOT_FOUND", "not found");
        }
        
        ChatMessage msg = new ChatMessage();
        msg.setId(UUID.randomUUID().toString());
        msg.setWorkspaceId(workspaceId);
        msg.setConversationId(id);
        msg.setSenderType("AGENT");
        msg.setSenderId(authenticatedUser.id());
        msg.setBody(body.get("body"));
        msg.setCreatedAt(OffsetDateTime.now());

        // Message-to-artifact conversion: a "/task" or "/decision" message creates a real, workspace-
        // scoped artifact and links the message to it (its actual id), rather than a throwaway ref.
        MessageArtifactService.Artifact artifact =
                messageArtifacts.convert(workspaceId, authenticatedUser.id(), msg.getBody());
        if (artifact != null) {
            msg.setArtifactType(artifact.type());
            msg.setArtifactRef(artifact.ref());
        }
        
        c.setUpdatedAt(OffsetDateTime.now());
        c.setLastMessageAt(OffsetDateTime.now());
        conversationRepo.save(c);
        
        return messageRepo.save(msg);
    }
}
