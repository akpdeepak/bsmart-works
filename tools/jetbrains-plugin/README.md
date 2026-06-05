# bSmart Works — JetBrains plugin

Feature parity with the VS Code extension for **IntelliJ / PyCharm / WebStorm** users (iteration 14,
Cap U): a "My Work" tool window, inline commit linking from the Git menu, and standup drafting —
all over the same `/api/v1` REST surface, so the backend keeps owning RBAC, tenant isolation and the
AI Control Plane.

## Status

This is a **buildable scaffold**, not yet a packaged Marketplace plugin. It contains the real
plumbing — Gradle IntelliJ build, `plugin.xml`, the persisted settings, the REST client, the tool
window and the two actions — so a JetBrains developer can `./gradlew runIde` and iterate. JSON
deserialization into typed models (Gson/Jackson) and richer panels are the remaining work, tracked
as the JetBrains client-port follow-up. The web app, VS Code extension and `works` CLI are the
fully-built iteration-14 clients; this guarantees the API contract a JetBrains client consumes is
already proven.

## Layout

```
build.gradle.kts                     IntelliJ Gradle plugin build (IC 2024.1, Git4Idea)
src/main/resources/META-INF/plugin.xml   tool window + actions + settings registration
src/main/kotlin/in/bcits/works/
  WorksApi.kt                        persisted settings + thin REST client
  WorksToolWindow.kt                 "My Work" tool window + LinkCommit / Standup actions
  WorksSettingsConfigurable.kt       settings UI (API base / token / workspace)
```

## Build / run

```bash
cd tools/jetbrains-plugin
./gradlew runIde      # launches a sandbox IDE with the plugin loaded
./gradlew buildPlugin # produces a distributable zip
```

Configure under **Settings → bSmart Works** (API base, token, workspace id). Bind shortcuts:
`Ctrl+Alt+L` link commit, `Ctrl+Alt+S` draft standup.
