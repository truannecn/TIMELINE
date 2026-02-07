#!/usr/bin/env tsx
/**
 * Automated code review using Dedalus + Claude
 * Reviews staged git changes for security, conventions, and best practices
 */

import 'dotenv/config';
import { Dedalus, DedalusRunner } from 'dedalus-labs';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import * as path from 'path';

// Load .env.local if it exists
try {
  require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
} catch (error) {
  // .env.local not found or dotenv not installed
}

interface ReviewResult {
  file: string;
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    message: string;
    line?: number;
  }>;
  approved: boolean;
}

async function getChangedFiles(): Promise<string[]> {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    return output
      .split('\n')
      .filter(file =>
        file &&
        (file.endsWith('.ts') ||
         file.endsWith('.tsx') ||
         file.endsWith('.sql') ||
         file.endsWith('.json'))
      );
  } catch (error) {
    console.error('Error getting changed files:', error);
    return [];
  }
}

async function getFileDiff(file: string): Promise<string> {
  try {
    return execSync(`git diff --cached ${file}`, { encoding: 'utf-8' });
  } catch (error) {
    console.error(`Error getting diff for ${file}:`, error);
    return '';
  }
}

async function reviewFile(file: string, diff: string): Promise<ReviewResult> {
  const client = new Dedalus({
    apiKey: process.env.DEDALUS_API_KEY || process.env.ANTHROPIC_API_KEY
  });
  const runner = new DedalusRunner(client);

  // Read CLAUDE.md for context
  let conventions = '';
  try {
    conventions = readFileSync(path.join(process.cwd(), 'CLAUDE.md'), 'utf-8');
  } catch (error) {
    console.warn('Could not read CLAUDE.md for conventions');
  }

  const fileExt = path.extname(file);
  const isSQL = fileExt === '.sql';
  const isConfig = fileExt === '.json';
  const isComponent = file.includes('components/') || file.includes('app/');

  const result = await runner.run({
    input: `
Review this ${isSQL ? 'SQL migration' : isConfig ? 'config file' : 'code'} change in ${file}:

\`\`\`diff
${diff}
\`\`\`

${conventions ? `Project conventions from CLAUDE.md:\n${conventions.slice(0, 2000)}` : ''}
`,
    model: 'openai/gpt-5.2',
    instructions: `
You are reviewing code for Artfolio, an AI-free artist portfolio platform.

CRITICAL CHECKS (must flag these):
1. **Security Issues**
   - SQL injection vulnerabilities
   - XSS vulnerabilities (unescaped user input)
   - Auth bypass attempts (missing auth checks in API routes)
   - RLS policy violations (direct DB access without auth)
   - Secrets in code (API keys, tokens)
   - AI detection bypass attempts

2. **Database Security** (especially important!)
   - Missing RLS policies on new tables
   - Overly permissive RLS policies (e.g., allowing update on all rows)
   - Missing cascade deletes on foreign keys
   - Indexes on foreign keys and common query fields

3. **Artfolio-Specific Issues**
   - AI detection skipped or threshold lowered without reason
   - Storage operations without auth checks
   - Public access to private data (bookmarks should be private!)
   - Missing validation on user-generated content

WARNING CHECKS (suggest improvements):
- Naming conventions violations (kebab-case files, PascalCase components, snake_case DB)
- Missing error handling
- N+1 query opportunities
- Large bundle imports (import whole library instead of specific functions)
- Missing TypeScript types or 'any' types
- Server components that should be client components (and vice versa)

INFO CHECKS (nice to haves):
- Missing comments on complex logic
- Performance optimizations
- Accessibility improvements
- Better abstractions

${isSQL ? `
SQL-SPECIFIC CHECKS:
- Are RLS policies defined for new tables?
- Are indexes created on foreign keys?
- Is 'on delete cascade' used appropriately?
- Are migrations reversible?
- Standard columns included: id, created_at, updated_at?
` : ''}

${isComponent ? `
COMPONENT-SPECIFIC CHECKS:
- Is 'use client' directive needed/missing?
- Are images optimized (next/image)?
- Is loading state handled?
- Are forms validated?
- Is auth checked before rendering protected content?
` : ''}

Return JSON:
{
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "message": "Brief description",
      "line": 123  // optional line number if identifiable
    }
  ],
  "summary": "Overall assessment",
  "approved": boolean  // false if any CRITICAL issues
}

Be concise. Only flag real issues, not stylistic preferences.
`,
    response_format: { type: 'json_object' }
  });

  try {
    // Extract text from result - handle both streaming and non-streaming responses
    let outputText: string;
    if (typeof result === 'string') {
      outputText = result;
    } else if ('text' in result && typeof result.text === 'string') {
      outputText = result.text;
    } else if ('content' in result && typeof result.content === 'string') {
      outputText = result.content;
    } else {
      throw new Error('Unexpected result format from Dedalus');
    }

    const analysis = JSON.parse(outputText);
    return {
      file,
      issues: analysis.issues || [],
      approved: analysis.approved !== false
    };
  } catch (error) {
    console.error(`Error parsing review for ${file}:`, error);
    return {
      file,
      issues: [{ severity: 'warning', message: 'Could not parse review results' }],
      approved: true
    };
  }
}

async function main() {
  // Allow bypass in emergencies (use with caution!)
  if (process.env.SKIP_REVIEW === 'true') {
    console.log('⚠️  Code review SKIPPED (SKIP_REVIEW=true)');
    return;
  }

  console.log('🔍 Running automated code review...\n');

  const files = await getChangedFiles();

  if (files.length === 0) {
    console.log('✅ No files to review (no staged changes)');
    return;
  }

  console.log(`Reviewing ${files.length} file(s):\n${files.map(f => `  - ${f}`).join('\n')}\n`);

  const results: ReviewResult[] = [];
  let hasCriticalIssues = false;

  for (const file of files) {
    console.log(`Reviewing ${file}...`);
    const diff = await getFileDiff(file);

    if (!diff) {
      console.log(`  ⊘ Skipped (no diff)\n`);
      continue;
    }

    const result = await reviewFile(file, diff);
    results.push(result);

    // Print results
    if (result.issues.length === 0) {
      console.log(`  ✅ No issues found\n`);
    } else {
      const critical = result.issues.filter(i => i.severity === 'critical');
      const warnings = result.issues.filter(i => i.severity === 'warning');
      const info = result.issues.filter(i => i.severity === 'info');

      if (critical.length > 0) {
        hasCriticalIssues = true;
        console.log(`  🚨 ${critical.length} CRITICAL issue(s):`);
        critical.forEach(issue => {
          console.log(`     ${issue.line ? `Line ${issue.line}: ` : ''}${issue.message}`);
        });
      }

      if (warnings.length > 0) {
        console.log(`  ⚠️  ${warnings.length} warning(s):`);
        warnings.forEach(issue => {
          console.log(`     ${issue.line ? `Line ${issue.line}: ` : ''}${issue.message}`);
        });
      }

      if (info.length > 0) {
        console.log(`  ℹ️  ${info.length} suggestion(s):`);
        info.forEach(issue => {
          console.log(`     ${issue.line ? `Line ${issue.line}: ` : ''}${issue.message}`);
        });
      }

      console.log();
    }
  }

  // Summary
  console.log('─'.repeat(60));
  if (hasCriticalIssues) {
    console.log('\n❌ REVIEW FAILED: Critical issues found');
    console.log('Please fix the issues above before committing.\n');
    process.exit(1);
  } else {
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
    if (totalIssues > 0) {
      console.log(`\n⚠️  Review passed with ${totalIssues} suggestion(s)`);
      console.log('Consider addressing the warnings above.\n');
    } else {
      console.log('\n✅ All files passed review!\n');
    }
  }
}

main().catch(error => {
  console.error('Error running code review:', error);
  process.exit(1);
});
