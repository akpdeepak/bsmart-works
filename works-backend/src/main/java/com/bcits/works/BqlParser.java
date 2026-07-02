package com.bcits.works;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Recursive-descent parser for BQL — tokens ({@link BqlLexer}) → {@link BqlAst}. Extracted verbatim
 * from {@link BqlCompiler} (Phase 2 / W2 god-class split); the grammar and behaviour are unchanged.
 * Package-private: the only entry point is {@link BqlCompiler#compileFor}.
 *
 * <p>Grammar (precedence low→high):
 * <pre>
 *   or        := and ( OR and )*
 *   and       := not ( AND not )*
 *   not       := NOT not | primary
 *   primary   := '(' or ')' | condition
 *   condition := field ( IN '(' values ')' | NOT IN '(' values ')' | BETWEEN value AND value
 *                       | IS [NOT] EMPTY | op value )
 * </pre>
 */
final class BqlParser {
    private final List<BqlLexer.Token> tokens;
    private int pos;

    BqlParser(List<BqlLexer.Token> tokens) {
        this.tokens = tokens;
    }

    BqlAst.Expr parse() {
        BqlAst.Expr e = parseOr();
        if (peek().type() != BqlLexer.TokenType.EOF) {
            throw new BqlException("Unexpected token '" + peek().text() + "'", peek().pos());
        }
        return e;
    }

    private BqlAst.Expr parseOr() {
        BqlAst.Expr left = parseAnd();
        while (isKeyword("OR")) {
            next();
            left = new BqlAst.Or(left, parseAnd());
        }
        return left;
    }

    private BqlAst.Expr parseAnd() {
        BqlAst.Expr left = parseNot();
        while (isKeyword("AND")) {
            next();
            left = new BqlAst.And(left, parseNot());
        }
        return left;
    }

    private BqlAst.Expr parseNot() {
        if (isKeyword("NOT")) {
            next();
            return new BqlAst.Not(parseNot());
        }
        return parsePrimary();
    }

    private BqlAst.Expr parsePrimary() {
        if (peek().type() == BqlLexer.TokenType.LPAREN) {
            next();
            BqlAst.Expr inner = parseOr();
            expect(BqlLexer.TokenType.RPAREN, ")");
            return inner;
        }
        return parseCondition();
    }

    private BqlAst.Expr parseCondition() {
        BqlLexer.Token fieldTok = next();
        if (fieldTok.type() != BqlLexer.TokenType.WORD) {
            throw new BqlException("Expected a field but found '" + fieldTok.text() + "'", fieldTok.pos());
        }
        String field = fieldTok.text();

        // field NOT IN (...)
        if (isKeyword("NOT") && isKeywordAt(pos + 1, "IN")) {
            next();
            next();
            return new BqlAst.InList(field, parseValueList(), true);
        }
        if (isKeyword("IN")) {
            next();
            return new BqlAst.InList(field, parseValueList(), false);
        }
        if (isKeyword("BETWEEN")) {
            next();
            BqlAst.Value low = parseValue();
            if (!isKeyword("AND")) {
                throw new BqlException("BETWEEN requires 'AND' between the two bounds");
            }
            next();
            BqlAst.Value high = parseValue();
            return new BqlAst.Between(field, low, high);
        }
        if (isKeyword("IS")) {
            next();
            boolean negated = false;
            if (isKeyword("NOT")) {
                next();
                negated = true;
            }
            if (!isKeyword("EMPTY")) {
                throw new BqlException("Expected EMPTY after IS [NOT]");
            }
            next();
            return new BqlAst.IsEmpty(field, negated);
        }
        // Historical operators over the event store (JQL-style).
        if (isKeyword("WAS")) {
            next();
            return new BqlAst.History(field, false, parseAtomicValue(), null, null, null, null);
        }
        if (isKeyword("CHANGED")) {
            next();
            BqlAst.Value from = null;
            BqlAst.Value to = null;
            String whenOp = null;
            BqlAst.Value when = null;
            if (isKeyword("FROM")) {
                next();
                from = parseAtomicValue();
            }
            if (isKeyword("TO")) {
                next();
                to = parseAtomicValue();
            }
            if (isKeyword("AFTER")) {
                next();
                whenOp = ">=";
                when = parseValue();
            } else if (isKeyword("BEFORE")) {
                next();
                whenOp = "<";
                when = parseValue();
            } else if (isKeyword("ON")) {
                next();
                whenOp = "ON";
                when = parseValue();
            }
            return new BqlAst.History(field, true, null, from, to, whenOp, when);
        }
        String op = parseOperator();
        return new BqlAst.Comparison(field, op, parseValue());
    }

    /** A single field value for history operators (a quoted string or one bareword; no multiword). */
    private BqlAst.Value parseAtomicValue() {
        BqlLexer.Token t = next();
        if (t.type() != BqlLexer.TokenType.STRING && t.type() != BqlLexer.TokenType.WORD) {
            throw new BqlException("Expected a value but found '" + t.text() + "'", t.pos());
        }
        return new BqlAst.Literal(t.text());
    }

    private String parseOperator() {
        BqlLexer.Token t = peek();
        if (t.type() == BqlLexer.TokenType.OP) {
            next();
            return t.text();
        }
        if (t.type() == BqlLexer.TokenType.WORD) {
            String up = t.text().toUpperCase(Locale.ROOT);
            if (up.equals("CONTAINS") || up.equals("STARTSWITH") || up.equals("ENDSWITH")) {
                next();
                return up;
            }
        }
        throw new BqlException("Expected an operator but found '" + t.text() + "'", t.pos());
    }

    private List<BqlAst.Value> parseValueList() {
        expect(BqlLexer.TokenType.LPAREN, "(");
        List<BqlAst.Value> values = new ArrayList<>();
        values.add(parseValue());
        while (peek().type() == BqlLexer.TokenType.COMMA) {
            next();
            values.add(parseValue());
        }
        expect(BqlLexer.TokenType.RPAREN, ")");
        return values;
    }

    private BqlAst.Value parseValue() {
        BqlLexer.Token t = next();
        if (t.type() == BqlLexer.TokenType.STRING) {
            return new BqlAst.Literal(t.text());
        }
        if (t.type() != BqlLexer.TokenType.WORD) {
            throw new BqlException("Expected a value but found '" + t.text() + "'", t.pos());
        }
        // function call: WORD immediately followed by '('
        if (peek().type() == BqlLexer.TokenType.LPAREN) {
            next();
            List<String> args = new ArrayList<>();
            if (peek().type() != BqlLexer.TokenType.RPAREN) {
                args.add(next().text());
                while (peek().type() == BqlLexer.TokenType.COMMA) {
                    next();
                    args.add(next().text());
                }
            }
            expect(BqlLexer.TokenType.RPAREN, ")");
            return new BqlAst.FunctionCall(t.text(), args);
        }
        // Bare value — may span multiple words (e.g. `status = In Progress`), mirroring a
        // quoted value without the quotes. Consume following words until a reserved keyword,
        // operator, comma, paren, or end — so connectors and the next condition still parse.
        StringBuilder sb = new StringBuilder(t.text());
        while (peek().type() == BqlLexer.TokenType.WORD && !isReserved(peek().text())) {
            sb.append(' ').append(next().text());
        }
        return new BqlAst.Literal(sb.toString());
    }

    private static final java.util.Set<String> RESERVED = java.util.Set.of(
        "AND", "OR", "NOT", "IN", "BETWEEN", "IS", "EMPTY", "CONTAINS", "STARTSWITH", "ENDSWITH");

    private boolean isReserved(String word) {
        return RESERVED.contains(word.toUpperCase(Locale.ROOT));
    }

    // token helpers
    private BqlLexer.Token peek() {
        return tokens.get(pos);
    }

    private BqlLexer.Token next() {
        return tokens.get(pos++);
    }

    private void expect(BqlLexer.TokenType type, String what) {
        if (peek().type() != type) {
            throw new BqlException("Expected '" + what + "' but found '" + peek().text() + "'", peek().pos());
        }
        next();
    }

    private boolean isKeyword(String kw) {
        return isKeywordAt(pos, kw);
    }

    private boolean isKeywordAt(int index, String kw) {
        if (index >= tokens.size()) {
            return false;
        }
        BqlLexer.Token t = tokens.get(index);
        return t.type() == BqlLexer.TokenType.WORD && t.text().equalsIgnoreCase(kw);
    }
}
