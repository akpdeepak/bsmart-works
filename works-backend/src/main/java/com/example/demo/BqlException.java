package com.example.demo;

/** Thrown when a BQL query cannot be parsed or references an invalid field. */
public class BqlException extends RuntimeException {
    public BqlException(String message) {
        super(message);
    }
}
