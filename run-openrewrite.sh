#!/bin/bash
cd works-backend
./mvnw org.openrewrite.maven:rewrite-maven-plugin:5.34.1:run \
  -Drewrite.recipeArtifactCoordinates=org.openrewrite.recipe:rewrite-spring:5.13.0 \
  -Drewrite.activeRecipes=org.openrewrite.java.spring.AutowiredFieldInjectionToConstructorInjection
