# syntax=docker/dockerfile:1.7

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY . .
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -DskipTests -Djacoco.skip=true clean package

FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*
ENV TZ=UTC
COPY --from=build /build/target/works-*.jar app.jar
EXPOSE 8080

# Public liveness probe. Health endpoints expose status/components only, not sensitive details.
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=20 \
  CMD curl -fsS http://localhost:8080/actuator/health/liveness >/dev/null || exit 1

ENTRYPOINT ["java","-jar","app.jar"]
