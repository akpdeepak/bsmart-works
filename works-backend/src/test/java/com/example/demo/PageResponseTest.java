package com.example.demo;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class PageResponseTest {

    @Test
    void of_list_calculatesTotalPagesCorrectly() {
        PageResponse<String> r = PageResponse.of(List.of("a", "b", "c"), 10, 0, 3);
        assertThat(r.items()).containsExactly("a", "b", "c");
        assertThat(r.total()).isEqualTo(10);
        assertThat(r.page()).isEqualTo(0);
        assertThat(r.size()).isEqualTo(3);
        assertThat(r.totalPages()).isEqualTo(4); // ceil(10/3) = 4
    }

    @Test
    void of_list_exactDivision_noExtraPage() {
        PageResponse<Integer> r = PageResponse.of(List.of(1, 2), 6, 1, 2);
        assertThat(r.totalPages()).isEqualTo(3); // ceil(6/2) = 3
    }

    @Test
    void of_list_zeroSize_totalPagesIsZero() {
        PageResponse<String> r = PageResponse.of(List.of(), 0, 0, 0);
        assertThat(r.totalPages()).isEqualTo(0);
    }

    @Test
    void of_list_singlePage_totalPagesIsOne() {
        PageResponse<String> r = PageResponse.of(List.of("x"), 1, 0, 25);
        assertThat(r.totalPages()).isEqualTo(1);
    }

    @Test
    void of_list_emptyItems_totalNonZero() {
        PageResponse<String> r = PageResponse.of(List.of(), 5, 1, 5);
        assertThat(r.items()).isEmpty();
        assertThat(r.total()).isEqualTo(5);
        assertThat(r.totalPages()).isEqualTo(1);
    }
}
