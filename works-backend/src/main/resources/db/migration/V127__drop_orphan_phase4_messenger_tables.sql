-- GH-522: retire the orphaned phase4 messenger surface.
--
-- V125 created channels/messages for a /api/v1/messenger controller that no frontend ever called.
-- The messaging surface the UI actually uses is EPIC-9 internal messaging (chat_conversations /
-- chat_messages, V122), so two parallel "internal messaging" models existed with one of them dead.
-- The Java package is deleted in the same change; these tables go with it.
--
-- Forward-only (RB-10 §3). Both tables were created on 2026-07-21 and were never written to by any
-- shipped client, so there is no production data to preserve. To reinstate the surface, write a new
-- forward migration -- do not edit this one.
DROP INDEX IF EXISTS idx_messages_channel;
DROP INDEX IF EXISTS idx_channels_workspace;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS channels;
