package com.bcits.works;
import com.bcits.works.knowledge.ArticleDiffService;

import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("unit")
class ArticleDiffServiceTest {

    private final ArticleDiffService service = new ArticleDiffService();

    @Test
    void identicalContent_isAllContext() {
        List<ArticleDiffService.DiffLine> lines = service.diff("alpha\nbeta", "alpha\nbeta");
        assertThat(lines).extracting(ArticleDiffService.DiffLine::type)
            .containsExactly("CONTEXT", "CONTEXT");
    }

    @Test
    void addedLine_isMarkedAdded() {
        List<ArticleDiffService.DiffLine> lines = service.diff("alpha", "alpha\nbeta");
        assertThat(lines).contains(new ArticleDiffService.DiffLine("ADDED", "beta"));
        assertThat(lines).contains(new ArticleDiffService.DiffLine("CONTEXT", "alpha"));
    }

    @Test
    void removedLine_isMarkedRemoved() {
        List<ArticleDiffService.DiffLine> lines = service.diff("alpha\nbeta", "alpha");
        assertThat(lines).contains(new ArticleDiffService.DiffLine("REMOVED", "beta"));
    }

    @Test
    void changedLine_isRemoveThenAdd() {
        List<ArticleDiffService.DiffLine> lines = service.diff("alpha", "omega");
        assertThat(lines).extracting(ArticleDiffService.DiffLine::type)
            .containsExactlyInAnyOrder("REMOVED", "ADDED");
    }

    @Test
    void nullInputs_areTreatedAsEmpty() {
        assertThat(service.diff(null, null)).extracting(ArticleDiffService.DiffLine::type)
            .containsExactly("CONTEXT"); // one empty line vs one empty line
        assertThat(service.diff(null, "new")).contains(new ArticleDiffService.DiffLine("ADDED", "new"));
    }
}
