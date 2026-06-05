package `in`.bcits.works

import com.intellij.openapi.options.Configurable
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JTextField
import javax.swing.BoxLayout
import javax.swing.JLabel

/** Settings UI for the API base, token and workspace id (parity with the VS Code settings). */
class WorksSettingsConfigurable : Configurable {
    private val apiBase = JTextField()
    private val token = JTextField()
    private val workspace = JTextField()

    override fun getDisplayName(): String = "bSmart Works"

    override fun createComponent(): JComponent {
        val s = WorksSettings.get()
        apiBase.text = s.apiBase
        token.text = s.token
        workspace.text = s.workspaceId
        val panel = JPanel()
        panel.layout = BoxLayout(panel, BoxLayout.Y_AXIS)
        panel.add(JLabel("API base URL")); panel.add(apiBase)
        panel.add(JLabel("Token (JWT)")); panel.add(token)
        panel.add(JLabel("Workspace id")); panel.add(workspace)
        return panel
    }

    override fun isModified(): Boolean {
        val s = WorksSettings.get()
        return apiBase.text != s.apiBase || token.text != s.token || workspace.text != s.workspaceId
    }

    override fun apply() {
        val s = WorksSettings.get()
        s.apiBase = apiBase.text.trim()
        s.token = token.text.trim()
        s.workspaceId = workspace.text.trim()
    }
}
