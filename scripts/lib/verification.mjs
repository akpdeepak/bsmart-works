const unique = (values) => [...new Set(values)];

export function classifyPaths(paths) {
  const domains = new Set();
  let integration = false;
  let frontendSecurity = false;
  let deploy = false;
  let jetbrains = false;
  let risk = 'trivial';

  for (const rawPath of paths) {
    const path = rawPath.replace(/\\/g, '/');
    const generatedInstruction =
      /(^|\/)(AGENTS|CLAUDE)\.md$/.test(path) ||
      path === '.windsurfrules' ||
      path.startsWith('.agents/') ||
      path.startsWith('.claude/rules/') ||
      path.startsWith('.cursor/rules/') ||
      path === '.github/copilot-instructions.md' ||
      path.startsWith('.github/instructions/');
    if (generatedInstruction) {
      domains.add('policy');
      continue;
    }
    if (path.startsWith('works-frontend/')) {
      domains.add('frontend');
      risk = risk === 'large' ? risk : 'standard';
      if (/package(-lock)?\.json$/.test(path)) frontendSecurity = true;
    }
    if (path.startsWith('works-backend/')) {
      domains.add('backend');
      risk = risk === 'large' ? risk : 'standard';
      if (
        path.includes('/db/migration/') ||
        /\/(auth|security)\//i.test(path) ||
        /(Security|Tenant|Rbac|Jwt|Mfa|WebAuthn)/.test(path)
      ) {
        integration = true;
        risk = 'large';
      }
    }
    if (path.startsWith('docs/') || path.endsWith('.md')) domains.add('docs');
    if (path.startsWith('tools/jetbrains-plugin/')) {
      domains.add('jetbrains');
      jetbrains = true;
      risk = risk === 'large' ? risk : 'standard';
    }
    if (
      path.startsWith('.github/workflows/deploy') ||
      path.startsWith('infra/') ||
      path === 'docker-compose.yml' ||
      path === 'Dockerfile'
    ) {
      domains.add('deploy');
      deploy = true;
      risk = 'large';
    }
    if (path.startsWith('ai-rules/') || path.startsWith('scripts/') || path.startsWith('.github/')) {
      domains.add('policy');
    }
  }

  return {
    domains: [...domains].sort(),
    integration,
    frontendSecurity,
    deploy,
    jetbrains,
    risk,
  };
}

export function selectStepIds(manifest, profile, paths = []) {
  if (!manifest.profiles?.[profile]) throw new Error(`Unknown verification profile: ${profile}`);
  if (profile !== 'changed') return [...manifest.profiles[profile]];

  const classification = classifyPaths(paths);
  const selected = [...manifest.profiles.changed];
  if (classification.domains.includes('frontend')) {
    selected.push('frontend-lint', 'frontend-test', 'frontend-build');
  }
  if (classification.domains.includes('backend')) selected.push('backend-unit');
  if (classification.integration) selected.push('backend-integration');
  if (classification.domains.includes('jetbrains')) selected.push('jetbrains-plugin');
  if (classification.deploy) selected.push('deploy-config');
  return unique(selected);
}
