package `in`.bcits.works

import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.ui.components.JBList
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.content.ContentFactory
import javax.swing.DefaultListModel

/**
 * The "bSmart Works" tool window — a "My Work" list pulled from the developer-workspace home, the
 * IntelliJ-side counterpart of the VS Code sidebar. Parsing here is intentionally minimal (the
 * backend returns the shaped payload); a JSON lib (Gson/Jackson) is wired in the full build.
 */
class WorksToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val model = DefaultListModel<String>()
        runCatching {
            // The full build deserializes home.todaysWork; the scaffold shows the raw payload.
            model.addElement("My Work — open the Works settings to set token + workspace, then Refresh.")
            model.addElement(WorksApi.home().take(2000))
        }.onFailure { model.addElement("Error: ${it.message}") }

        val list = JBList(model)
        val content = ContentFactory.getInstance().createContent(JBScrollPane(list), "My Work", false)
        toolWindow.contentManager.addContent(content)
    }
}

/** Inline commit linking from the Git menu (parity with the VS Code `works.linkCommit` command). */
class LinkCommitAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val item = Messages.showInputDialog(project, "Work item id", "Works: Link Commit", null) ?: return
        val ref = Messages.showInputDialog(project, "Commit sha or branch", "Works: Link Commit", null) ?: return
        runCatching { WorksApi.linkCommit(item, "COMMIT", ref, "") }
            .onSuccess { Messages.showInfoMessage(project, "Linked $ref to $item", "bSmart Works") }
            .onFailure { Messages.showErrorDialog(project, it.message, "bSmart Works") }
    }
}

/** Draft a standup into a dialog (parity with the VS Code `works.standup` command). */
class StandupAction : AnAction() {
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        runCatching { WorksApi.standup() }
            .onSuccess { Messages.showInfoMessage(project, it.take(4000), "Standup draft") }
            .onFailure { Messages.showErrorDialog(project, it.message, "bSmart Works") }
    }
}
