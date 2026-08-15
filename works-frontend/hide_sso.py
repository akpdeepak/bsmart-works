import re

with open('src/app/AuthScreens.jsx', 'r') as f:
    content = f.read()

block_to_remove = """            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
              <span className="text-xs text-neutral-400">or continue with</span>
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {['Google', 'Microsoft'].map((p) => (
                <button key={p} type="button" disabled title="Single sign-on is coming soon"
                  className="cursor-not-allowed rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {p}
                </button>
              ))}
            </div>
            <button type="button" disabled title="Single sign-on is coming soon"
              className="mt-3 w-full cursor-not-allowed rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              Sign in with SAML SSO
            </button>
            <p className="mt-2 text-center text-xs text-neutral-400">Single sign-on is coming soon — use your work email for now.</p>"""

content = content.replace(block_to_remove, '')

with open('src/app/AuthScreens.jsx', 'w') as f:
    f.write(content)
