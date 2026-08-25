package com.bcits.works.shared;

import java.util.ArrayList;
import java.util.List;

/**
 * Tokenizes a BQL string into a flat token stream for {@link BqlCompiler}'s recursive-descent
 * parser. Recognizes parentheses, commas, comparison operators, quoted strings (single or double),
 * and bare words (identifiers, numbers, keywords, function names). Whitespace separates tokens but
 * is otherwise discarded.
 *
 * <p>The lexer is deliberately dumb: it does not know fields, operators-vs-keywords, or functions —
 * that classification is the parser's job. It only knows lexical shape, so injection-relevant
 * characters end up inside {@link TokenType#STRING}/{@link TokenType#WORD} tokens that later become
 * bind parameters, never SQL syntax.
 */
final class BqlLexer {

    enum TokenType { WORD, STRING, OP, LPAREN, RPAREN, COMMA, EOF }

    record Token(TokenType type, String text, int pos) { }

    private final String src;
    private int i;

    BqlLexer(String src) {
        this.src = src == null ? "" : src;
    }

    List<Token> tokenize() {
        List<Token> out = new ArrayList<>();
        while (i < src.length()) {
            char c = src.charAt(i);
            if (Character.isWhitespace(c)) {
                i++;
                continue;
            }
            switch (c) {
                case '(' -> out.add(single(TokenType.LPAREN, "("));
                case ')' -> out.add(single(TokenType.RPAREN, ")"));
                case ',' -> out.add(single(TokenType.COMMA, ","));
                case '\'', '"' -> out.add(readString(c));
                case '~' -> out.add(single(TokenType.OP, "~"));
                case '=', '!', '<', '>' -> out.add(readOperator());
                default -> out.add(readWord());
            }
        }
        out.add(new Token(TokenType.EOF, "", src.length()));
        return out;
    }

    /** Emits a single-character structural token and advances past it. */
    private Token single(TokenType type, String text) {
        Token t = new Token(type, text, i);
        i++;
        return t;
    }

    private Token readString(char quote) {
        int start = i;
        i++; // opening quote
        StringBuilder sb = new StringBuilder();
        while (i < src.length() && src.charAt(i) != quote) {
            sb.append(src.charAt(i));
            i++;
        }
        if (i >= src.length()) {
            throw new BqlException("Unterminated string starting at position " + start);
        }
        i++; // closing quote
        return new Token(TokenType.STRING, sb.toString(), start);
    }

    private Token readOperator() {
        int start = i;
        char c = src.charAt(i);
        // Two-char operators: != <> >= <=
        if (i + 1 < src.length()) {
            String two = src.substring(i, i + 2);
            if (two.equals("!=") || two.equals("<>") || two.equals(">=") || two.equals("<=")) {
                i += 2;
                return new Token(TokenType.OP, two, start);
            }
        }
        if (c == '=' || c == '<' || c == '>') {
            i++;
            return new Token(TokenType.OP, String.valueOf(c), start);
        }
        throw new BqlException("Unexpected character '" + c + "' at position " + start);
    }

    /** A bare word runs until whitespace or a structural character. */
    private Token readWord() {
        int start = i;
        while (i < src.length()) {
            char c = src.charAt(i);
            if (Character.isWhitespace(c) || c == '(' || c == ')' || c == ','
                || c == '=' || c == '!' || c == '<' || c == '>' || c == '~') {
                break;
            }
            i++;
        }
        return new Token(TokenType.WORD, src.substring(start, i), start);
    }
}
