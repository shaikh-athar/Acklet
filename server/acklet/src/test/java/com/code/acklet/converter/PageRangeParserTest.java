package com.code.acklet.converter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("PageRangeParser Tests")
class PageRangeParserTest {

    @Test
    @DisplayName("Should accept valid page range expressions")
    void testValidRanges() {
        assertTrue(PageRangeParser.isValid("1-3, 5"));
        assertTrue(PageRangeParser.isValid("1, 2, 3"));
        assertTrue(PageRangeParser.isValid("4-8"));
        assertTrue(PageRangeParser.isValid("10"));
        assertTrue(PageRangeParser.isValid("1-2, 4-6, 9"));
        assertTrue(PageRangeParser.isValid("all"));
        assertTrue(PageRangeParser.isValid(""));
        assertTrue(PageRangeParser.isValid(null));
    }

    @Test
    @DisplayName("Should reject invalid page range expressions")
    void testInvalidRanges() {
        assertFalse(PageRangeParser.isValid("5-2")); // inverted
        assertFalse(PageRangeParser.isValid("0")); // 0 is invalid 1-based page
        assertFalse(PageRangeParser.isValid("-1"));
        assertFalse(PageRangeParser.isValid("1-"));
        assertFalse(PageRangeParser.isValid(",1,2"));
        assertFalse(PageRangeParser.isValid("1,2,"));
        assertFalse(PageRangeParser.isValid("abc"));
        assertFalse(PageRangeParser.isValid("1-3, xyz"));
        assertFalse(PageRangeParser.isValid("1--3"));
    }

    @Test
    @DisplayName("Should parse ranges into set of page integers")
    void testParseRanges() {
        Set<Integer> pages = PageRangeParser.parse("1-3, 5");
        assertEquals(Set.of(1, 2, 3, 5), pages);

        Set<Integer> complex = PageRangeParser.parse("2, 4-6, 8");
        assertEquals(Set.of(2, 4, 5, 6, 8), complex);

        Set<Integer> empty = PageRangeParser.parse("");
        assertTrue(empty.isEmpty());

        Set<Integer> all = PageRangeParser.parse("all");
        assertTrue(all.isEmpty());
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException on invalid parse")
    void testParseException() {
        assertThrows(IllegalArgumentException.class, () -> PageRangeParser.parse("invalid-range"));
        assertThrows(IllegalArgumentException.class, () -> PageRangeParser.parse("6-3"));
    }
}

