package `in`.bcits.works

import com.intellij.openapi.components.Service
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.util.xmlb.XmlSerializerUtil
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

/** Persisted connection settings (API base, token, workspace). */
@Service(Service.Level.APP)
@State(name = "WorksSettings", storages = [Storage("bsmart-works.xml")])
class WorksSettings : PersistentStateComponent<WorksSettings> {
    var apiBase: String = "http://localhost:8080/api/v1"
    var token: String = ""
    var workspaceId: String = ""
    override fun getState() = this
    override fun loadState(s: WorksSettings) = XmlSerializerUtil.copyBean(s, this)
    companion object {
        fun get(): WorksSettings =
            com.intellij.openapi.application.ApplicationManager.getApplication().getService(WorksSettings::class.java)
    }
}

/**
 * Thin REST client over /api/v1 — the same surface the web UI, the VS Code extension and the
 * `works` CLI consume. No business logic lives here; the backend enforces RBAC, tenant scoping
 * and the AI Control Plane.
 */
object WorksApi {
    private val http: HttpClient = HttpClient.newHttpClient()

    private fun request(path: String, method: String, body: String?): String {
        val s = WorksSettings.get()
        val builder = HttpRequest.newBuilder()
            .uri(URI.create(s.apiBase + path))
            .header("Authorization", "Bearer ${s.token}")
            .header("Content-Type", "application/json")
        when (method) {
            "GET" -> builder.GET()
            "POST" -> builder.POST(HttpRequest.BodyPublishers.ofString(body ?: "{}"))
            "PUT" -> builder.PUT(HttpRequest.BodyPublishers.ofString(body ?: "{}"))
        }
        val res = http.send(builder.build(), HttpResponse.BodyHandlers.ofString())
        if (res.statusCode() >= 400) throw RuntimeException("Works API ${res.statusCode()}: ${res.body()}")
        return res.body()
    }

    fun get(path: String): String = request(path, "GET", null)
    fun post(path: String, body: String): String = request(path, "POST", body)

    fun home(): String = get("/developer-workspace?workspaceId=${WorksSettings.get().workspaceId}")
    fun standup(): String =
        post("/developer-workspace/standup?workspaceId=${WorksSettings.get().workspaceId}", "{}")
    fun linkCommit(workItemId: String, kind: String, ref: String, message: String): String =
        post("/code/links", """{"workItemId":"$workItemId","kind":"$kind","ref":"$ref","message":"$message"}""")
}
