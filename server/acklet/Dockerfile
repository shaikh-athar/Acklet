# ==============================================================================
# Acklet Production Dockerfile with Headless LibreOffice Document Conversion Engine
# ==============================================================================

# ── Build stage ───────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && sh ./mvnw dependency:go-offline
COPY src src
RUN sh ./mvnw package -DskipTests

# ── Run stage ────────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Install headless LibreOffice, writer/calc/impress packages, and core typography fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-draw \
    fonts-dejavu-core \
    fonts-liberation \
    fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

# Environment variables for LibreOffice and Acklet File Converter
ENV LIBREOFFICE_PATH=/usr/lib/libreoffice
ENV CONVERTER_TEMP_DIR=/tmp/acklet-converter

COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
