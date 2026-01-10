// Purpose: audit fixture freshness and captured_at fields.
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const DEFAULT_MAX_AGE_DAYS = 7;
const FIXTURES_DIR = path.join(process.cwd(), 'fixtures');

interface AuditConfig {
  maxAgeDays: number;
  allowStale: boolean;
}

interface AuditResult {
  file: string;
  status: 'ok' | 'missing_field' | 'invalid_date' | 'stale';
  ageDays?: number;
  message?: string;
}

function parseArgs(): AuditConfig {
  const args = process.argv.slice(2);
  let maxAgeDays = DEFAULT_MAX_AGE_DAYS;
  let allowStale = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--max-age-days') {
      const val = parseInt(args[i + 1], 10);
      if (!isNaN(val)) {
        maxAgeDays = val;
        i++; // Skip next arg
      }
    } else if (args[i] === '--allow-stale') {
      allowStale = true;
    }
  }

  return { maxAgeDays, allowStale };
}

function getFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath));
    } else {
      if (file.endsWith('.json')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

function auditFile(filePath: string, config: AuditConfig): AuditResult {
  const relativePath = path.relative(process.cwd(), filePath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    if (!('captured_at' in data)) {
      return { file: relativePath, status: 'missing_field', message: 'Missing "captured_at" field' };
    }

    const capturedAt = new Date(data.captured_at);
    if (isNaN(capturedAt.getTime())) {
      return { file: relativePath, status: 'invalid_date', message: `Invalid date format: "${data.captured_at}"` };
    }

    const now = new Date();
    const diffMs = now.getTime() - capturedAt.getTime();
    const ageDays = diffMs / (1000 * 60 * 60 * 24);

    if (ageDays > config.maxAgeDays) {
      return { 
        file: relativePath, 
        status: 'stale', 
        ageDays,
        message: `Fixture is ${ageDays.toFixed(1)} days old (limit: ${config.maxAgeDays})` 
      };
    }

    return { file: relativePath, status: 'ok', ageDays };

  } catch (err: any) {
    return { file: relativePath, status: 'invalid_date', message: `JSON parse error: ${err.message}` };
  }
}

function main() {
  console.log(`Scanning fixtures in: ${FIXTURES_DIR}`);
  const config = parseArgs();
  console.log(`Config: max-age=${config.maxAgeDays} days, allow-stale=${config.allowStale}`);

  if (!fs.existsSync(FIXTURES_DIR)) {
    console.error(`ERROR: fixtures directory not found at ${FIXTURES_DIR}`);
    process.exit(1);
  }

  const files = getFiles(FIXTURES_DIR);
  console.log(`Found ${files.length} fixture files.`);

  let errorCount = 0;
  let staleCount = 0;

  files.forEach(file => {
    const result = auditFile(file, config);
    
    switch (result.status) {
      case 'missing_field':
        console.error(`[MISSING] ${result.file}: ${result.message}`);
        errorCount++;
        break;
      case 'invalid_date':
        console.error(`[INVALID] ${result.file}: ${result.message}`);
        errorCount++;
        break;
      case 'stale':
        if (config.allowStale) {
          console.warn(`[STALE] ${result.file}: ${result.message}`);
          staleCount++;
        } else {
          console.error(`[STALE] ${result.file}: ${result.message}`);
          errorCount++;
        }
        break;
      case 'ok':
        // console.log(`✅ [OK]      ${result.file} (${result.ageDays?.toFixed(1)}d)`);
        break;
    }
  });

  console.log('\n--- Summary ---');
  if (errorCount > 0) {
    console.error(`FAILED: ${errorCount} errors found.`);
    process.exit(1);
  } else if (staleCount > 0) {
    console.log(`PASSED WITH WARNINGS: ${staleCount} stale fixtures ignored.`);
    process.exit(0);
  } else {
    console.log('PASSED: all fixtures are fresh and valid.');
    process.exit(0);
  }
}

main();
