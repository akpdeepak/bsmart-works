package com.example.demo;

import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Team-health composite scoring (iteration 12, Cap L). Composes three dimensions into a single
 * health picture over time: <b>predictability</b> (do we deliver what we commit?), <b>scope
 * stability</b> (does the plan hold mid-sprint?), and <b>flow efficiency</b> (how much of an item's
 * life is active vs waiting?). Pure arithmetic — no I/O — so the scoring is unit-tested directly;
 * {@link KpiComputationService} feeds it real aggregated inputs. Always team-level: never an
 * individual breakdown (RB-40 §1).
 */
@Service
public class TeamHealthService {

    /** A single 0-100 dimension score plus its band. */
    public record DimensionScore(double score, String band) {}

    /** The composite team-health picture. */
    public record TeamHealth(double predictability, double scopeStability, double flowEfficiency,
                             double composite, String band) {}

    static final double HEALTHY_THRESHOLD = 80.0;
    static final double WATCH_THRESHOLD = 65.0;

    /** Predictability = mean commitment accuracy across recent sprints, clamped to 0..100. */
    public double predictability(List<Double> commitmentAccuracies) {
        if (commitmentAccuracies == null || commitmentAccuracies.isEmpty()) {
            return 0.0;
        }
        double mean = commitmentAccuracies.stream().filter(java.util.Objects::nonNull)
            .mapToDouble(Double::doubleValue).average().orElse(0.0);
        return clamp(mean);
    }

    /**
     * Scope stability = how little the committed scope grew mid-sprint. No commitment → 100
     * (nothing to destabilise). Adding work equal to the whole commitment → 0.
     */
    public double scopeStability(int committedPoints, int addedAfterStartPoints) {
        if (committedPoints <= 0) {
            return 100.0;
        }
        double churn = (double) addedAfterStartPoints / committedPoints;
        return clamp(100.0 * (1.0 - churn));
    }

    /** Flow efficiency = active time / total time, as a percentage. */
    public double flowEfficiency(double activeSeconds, double totalSeconds) {
        if (totalSeconds <= 0) {
            return 0.0;
        }
        return clamp(100.0 * activeSeconds / totalSeconds);
    }

    /** Equal-weighted composite of the three dimensions. */
    public TeamHealth compose(double predictability, double scopeStability, double flowEfficiency) {
        double composite = clamp((predictability + scopeStability + flowEfficiency) / 3.0);
        return new TeamHealth(round(predictability), round(scopeStability), round(flowEfficiency),
            round(composite), band(composite));
    }

    /** HEALTHY ≥ 80, WATCH ≥ 65, else AT_RISK. */
    public String band(double score) {
        if (score >= HEALTHY_THRESHOLD) return "HEALTHY";
        if (score >= WATCH_THRESHOLD) return "WATCH";
        return "AT_RISK";
    }

    public DimensionScore dimension(double score) {
        return new DimensionScore(round(score), band(score));
    }

    private double clamp(double v) {
        return Math.max(0.0, Math.min(100.0, v));
    }

    private double round(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
