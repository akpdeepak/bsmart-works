package com.bcits.works.knowledge;

import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure line-level diff between two article-version bodies. Kept dependency-free
 * (standard LCS) and isolated here so it stays unit-testable, mirroring
 * {@link ArticleAnalyticsService}. Powers the version "diff view" (iteration 5).
 */
@Service
public class ArticleDiffService {

    /** One line of a diff. {@code type} is CONTEXT (unchanged), ADDED, or REMOVED. */
    public record DiffLine(String type, String text) {}

    public List<DiffLine> diff(String oldText, String newText) {
        String[] a = (oldText == null ? "" : oldText).split("\n", -1);
        String[] b = (newText == null ? "" : newText).split("\n", -1);
        int n = a.length, m = b.length;

        // lcs[i][j] = length of the longest common subsequence of a[i..] and b[j..]
        int[][] lcs = new int[n + 1][m + 1];
        for (int i = n - 1; i >= 0; i--) {
            for (int j = m - 1; j >= 0; j--) {
                lcs[i][j] = a[i].equals(b[j])
                    ? lcs[i + 1][j + 1] + 1
                    : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
            }
        }

        List<DiffLine> out = new ArrayList<>();
        int i = 0, j = 0;
        while (i < n && j < m) {
            if (a[i].equals(b[j])) {
                out.add(new DiffLine("CONTEXT", a[i]));
                i++;
                j++;
            } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
                out.add(new DiffLine("REMOVED", a[i]));
                i++;
            } else {
                out.add(new DiffLine("ADDED", b[j]));
                j++;
            }
        }
        while (i < n) out.add(new DiffLine("REMOVED", a[i++]));
        while (j < m) out.add(new DiffLine("ADDED", b[j++])); {
        return out;
        }
    }
}
