package com.bcits.works;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ArticleEmailService {

    private static final Logger log = LoggerFactory.getLogger(ArticleEmailService.class);
    private static final String FROM = "noreply@bsmart.works";

    private final JavaMailSender mailSender;

    public ArticleEmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Send an article by email to a list of recipients.
     * Renders article blocks (or markdown) to a simple inline-CSS HTML email.
     */
    public void send(Article article, List<String> recipients, String subject, String message) {
        String html = buildHtml(article, message);
        for (String to : recipients) {
            try {
                MimeMessage mime = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mime, false, "UTF-8");
                helper.setFrom(FROM);
                helper.setTo(to);
                helper.setSubject(subject);
                helper.setText(html, true);
                mailSender.send(mime);
                log.info("[ARTICLE-EMAIL] Sent article '{}' to {}", article.getTitle(), to);
            } catch (Exception e) {
                log.warn("[ARTICLE-EMAIL] Failed to send to {}: {}", to, e.getMessage());
            }
        }
    }

    private String buildHtml(Article article, String personalMessage) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html><head><meta charset='UTF-8'></head>")
          .append("<body style='font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#222'>");

        // Title
        sb.append("<h1 style='font-size:22px;font-weight:bold;color:#0B2F5C;margin-bottom:16px'>")
          .append(escHtml(article.getTitle() != null ? article.getTitle() : "Untitled"))
          .append("</h1>");

        // Optional personal message
        if (personalMessage != null && !personalMessage.isBlank()) {
            sb.append("<p style='font-size:14px;color:#555;border-left:3px solid #E94E1B;")
              .append("padding-left:12px;margin-bottom:24px'>")
              .append(escHtml(personalMessage))
              .append("</p>");
        }

        // Article body — blocks or markdown fallback
        if ("blocks".equalsIgnoreCase(article.getContentFormat()) && article.getContentBlocks() != null) {
            sb.append(renderBlocks(article.getContentBlocks()));
        } else {
            String content = article.getContent() != null ? article.getContent() : "";
            sb.append("<div style='font-size:14px;line-height:1.7;white-space:pre-wrap'>")
              .append(escHtml(content))
              .append("</div>");
        }

        // Footer
        sb.append("<hr style='margin:32px 0;border:none;border-top:1px solid #e0e0e0'>")
          .append("<p style='font-size:12px;color:#999'>Shared from <strong>bSmart Works</strong>. ")
          .append("<a href='http://localhost:5173' style='color:#0B2F5C'>View in app</a></p>")
          .append("</body></html>");

        return sb.toString();
    }

    /** Render a JSON block array to inline-CSS HTML. Block types: paragraph, heading, code, checklist, divider. */
    String renderBlocks(String blocksJson) {
        StringBuilder out = new StringBuilder();
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            java.util.List<?> blocks = mapper.readValue(blocksJson, java.util.List.class);
            for (Object raw : blocks) {
                if (!(raw instanceof java.util.Map)) { continue; }
                @SuppressWarnings("unchecked")
                java.util.Map<String, Object> block = (java.util.Map<String, Object>) raw;
                String type = String.valueOf(block.getOrDefault("type", ""));
                Object content = block.get("content");
                String text = content != null ? content.toString() : "";

                switch (type) {
                    case "heading1":
                        out.append("<h2 style='font-size:18px;font-weight:bold;color:#0B2F5C;margin:16px 0 8px'>")
                           .append(escHtml(text)).append("</h2>");
                        break;
                    case "heading2":
                        out.append("<h3 style='font-size:16px;font-weight:bold;color:#0B2F5C;margin:14px 0 6px'>")
                           .append(escHtml(text)).append("</h3>");
                        break;
                    case "heading3":
                        out.append("<h4 style='font-size:14px;font-weight:bold;color:#0B2F5C;margin:12px 0 4px'>")
                           .append(escHtml(text)).append("</h4>");
                        break;
                    case "paragraph":
                        out.append("<p style='font-size:14px;line-height:1.7;margin:0 0 12px'>")
                           .append(escHtml(text)).append("</p>");
                        break;
                    case "code":
                        out.append("<pre style='background:#f5f5f5;border:1px solid #e0e0e0;border-radius:4px;")
                           .append("padding:12px;font-family:monospace;font-size:13px;overflow-x:auto;white-space:pre-wrap'>")
                           .append(escHtml(text)).append("</pre>");
                        break;
                    case "checklist":
                        out.append("<ul style='padding-left:20px;margin:0 0 12px'>");
                        @SuppressWarnings("unchecked")
                        java.util.List<Object> items =
                            (java.util.List<Object>) block.getOrDefault("items", java.util.List.of());
                        for (Object item : items) {
                            out.append("<li style='font-size:14px;line-height:1.7'>")
                               .append(escHtml(String.valueOf(item))).append("</li>");
                        }
                        out.append("</ul>");
                        break;
                    case "divider":
                        out.append("<hr style='margin:16px 0;border:none;border-top:1px solid #e0e0e0'>");
                        break;
                    default:
                        if (!text.isBlank()) {
                            out.append("<p style='font-size:14px;line-height:1.7;margin:0 0 12px'>")
                               .append(escHtml(text)).append("</p>");
                        }
                        break;
                }
            }
        } catch (Exception e) {
            out.append("<p style='color:#999;font-size:13px'>[Block content unavailable]</p>");
        }
        return out.toString();
    }

    private static String escHtml(String s) {
        if (s == null) { return ""; }
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
