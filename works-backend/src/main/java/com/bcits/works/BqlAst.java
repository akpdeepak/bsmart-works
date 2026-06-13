package com.bcits.works;

import java.util.List;

/**
 * The BQL abstract syntax tree. A parsed query is a tree of {@link Expr} nodes; the compiler walks
 * it to emit a parameterized SQL {@code WHERE} fragment. Splitting parse from emit (vs. the former
 * single-pass regex translator) is what enables grouping, precedence, {@code NOT}, {@code BETWEEN},
 * {@code IS EMPTY} and relative-date functions.
 */
public final class BqlAst {

    private BqlAst() { }

    /** A boolean expression node. */
    public sealed interface Expr
        permits And, Or, Not, Comparison, InList, Between, IsEmpty, History { }

    public record And(Expr left, Expr right) implements Expr { }

    public record Or(Expr left, Expr right) implements Expr { }

    public record Not(Expr inner) implements Expr { }

    /** {@code field <op> value} — op is one of =, !=, >, <, >=, <=, CONTAINS, STARTSWITH, ENDSWITH. */
    public record Comparison(String field, String op, Value value) implements Expr { }

    /** {@code field IN (..)} / {@code field NOT IN (..)}. */
    public record InList(String field, List<Value> values, boolean negated) implements Expr { }

    /** {@code field BETWEEN low AND high}. */
    public record Between(String field, Value low, Value high) implements Expr { }

    /** {@code field IS EMPTY} / {@code field IS NOT EMPTY} — proper null check. */
    public record IsEmpty(String field, boolean negated) implements Expr { }

    /**
     * Historical query over the event store: {@code field WAS value} (held that value at some point)
     * or {@code field CHANGED [FROM a] [TO b] [AFTER|BEFORE|ON when]}. {@code changed} distinguishes
     * the two modes; {@code was} is the WAS value; {@code from}/{@code to}/{@code whenOp}/{@code when}
     * are the optional CHANGED qualifiers.
     */
    public record History(String field, boolean changed, Value was, Value from, Value to,
                          String whenOp, Value when) implements Expr { }

    /** A right-hand-side value: either a literal (quoted/bareword/number) or a function call. */
    public sealed interface Value permits Literal, FunctionCall { }

    public record Literal(String raw) implements Value { }

    /** e.g. {@code currentUser()}, {@code today()}, {@code daysAgo(7)}. */
    public record FunctionCall(String name, List<String> args) implements Value { }
}
