// bSmart Works — JetBrains plugin (iteration 14, Cap U). Feature parity with the VS Code extension
// for IntelliJ / PyCharm / WebStorm users, over the same /api/v1 REST surface.
plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.24"
    id("org.jetbrains.intellij") version "1.17.3"
}

group = "in.bcits.works"
version = "0.1.0"

repositories { mavenCentral() }

intellij {
    version.set("2024.1")
    type.set("IC") // IntelliJ Community — also loads in PyCharm / WebStorm
    plugins.set(listOf("Git4Idea"))
}

tasks {
    patchPluginXml {
        sinceBuild.set("241")
        untilBuild.set("243.*")
    }
}

kotlin { jvmToolchain(17) }
