# syntax=docker/dockerfile:1

# ---- build stage ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /build

# Copy the wrapper and POM first so the dependency layer is cached independently
# of source changes.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw

COPY src/ src/

# The BuildKit cache mount keeps the Maven repository between builds.
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -DskipTests package

# ---- runtime stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app

# curl is used by the Docker Compose healthcheck.
RUN apt-get update \
    && apt-get install --no-install-recommends -y curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 umai

COPY --from=build --chown=umai:umai /build/target/*.jar /app/app.jar

USER umai
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
