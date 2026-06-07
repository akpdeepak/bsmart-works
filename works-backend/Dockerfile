# syntax=docker/dockerfile:1.7
# ── Build stage: compile the Spring Boot fat JAR ──────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY . .
# Package only (tests + checkstyle + jacoco run in CI, not in the image build).
# --mount caches ~/.m2 across builds so only the first build downloads deps.
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -DskipTests -Djacoco.skip=true clean package

# ── Runtime stage: slim JRE with just the JAR ─────────────────────────────────
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
# curl is used by the container HEALTHCHECK below.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
# The app pins the JVM to UTC at startup (Postgres 16 connection requirement);
# keep the container OS in UTC too for consistent log timestamps.
ENV TZ=UTC
COPY --from=build /build/target/demo-*.jar app.jar
EXPOSE 8080
# Liveness probe. NOTE: /actuator/health currently sits behind Spring Security
# (SecurityConfig: .anyRequest().authenticated()), so an unauthenticated probe gets
# 401/403, not 200 — but any HTTP status proves the app is up and serving requests.
# Accept 200 (if health is later permitted for probes) OR 401/403 as "alive".
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=20 \
  CMD curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/actuator/health | grep -qE '^(200|401|403)$' || exit 1
ENTRYPOINT ["java","-jar","app.jar"]
