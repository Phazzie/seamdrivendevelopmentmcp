// Purpose: enforce mocks reference real fixtures.
import * as fs from 'fs';
import * as path from 'path';

const MOCKS_DIR = path.join(process.cwd(), 'src', 'lib', 'mocks');

interface MockReport {
  mockFile: string;
  fixtureRefs: string[];
  missingFixtures: string[];
  hasNoFixtures: boolean;
}

function getMockFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
    .map(f => path.join(dir, f));
}

function extractFixturePaths(content: string): string[] {
  // Look for strings that contain "fixtures/" or are built with path.join including "fixtures"
  // This regex is a heuristic: looks for string literals containing "fixtures"
  // It catches: "fixtures/foo.json", path.join(..., "fixtures", ...)
  
  const matches = new Set<string>();
  
  // Regex 1: Direct strings like "fixtures/foo/bar.json"
  const stringRegex = /['"]([^'"]*fixtures\/[^'"]+\.json)['"]/g;
  let match;
  while ((match = stringRegex.exec(content)) !== null) {
    matches.add(match[1]);
  }

  // Regex 2: specific pattern used in this codebase: path.join(process.cwd(), "fixtures", "dir", "file.json")
  // We'll look for the parts after "fixtures"
  // Example: path.join(process.cwd(), "fixtures", "locker", "capabilities.json")
  const pathJoinRegex = /path\.join\(\s*process\.cwd\(\)\s*,\s*["']fixtures["']\s*,\s*(.+?)\)/g;
  while ((match = pathJoinRegex.exec(content)) !== null) {
    // args might be '"locker", "capabilities.json"'
    // We need to clean them up and join them
    const args = match[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
    const fullPath = path.join('fixtures', ...args);
    matches.add(fullPath);
  }

  return Array.from(matches);
}

function checkMock(mockPath: string): MockReport {
  const content = fs.readFileSync(mockPath, 'utf8');
  const refs = extractFixturePaths(content);
  
  const missing: string[] = [];
  const validRefs: string[] = [];

  refs.forEach(ref => {
    // Normalize path. If it starts with 'fixtures/', it's relative to CWD.
    // If it is absolute, we leave it? No, our regex logic extracts relative-like paths.
    
    // We assume the regex extracted something starting with "fixtures/"
    let absolutePath = path.isAbsolute(ref) ? ref : path.resolve(process.cwd(), ref);
    
    // Fallback: if the regex caught just a filename but logic implies relative to fixtures?
    // The regex is strict about "fixtures/" being present.

    if (!fs.existsSync(absolutePath)) {
      missing.push(ref);
    } else {
      validRefs.push(ref);
    }
  });

  return {
    mockFile: path.relative(process.cwd(), mockPath),
    fixtureRefs: refs,
    missingFixtures: missing,
    hasNoFixtures: refs.length === 0
  };
}

function main() {
  console.log(`Scanning mocks in: ${MOCKS_DIR}`);
  
  if (!fs.existsSync(MOCKS_DIR)) {
    console.error(`ERROR: mocks directory not found at ${MOCKS_DIR}`);
    process.exit(1);
  }

  const mockFiles = getMockFiles(MOCKS_DIR);
  console.log(`Found ${mockFiles.length} mock files.`);

  let failureCount = 0;

  mockFiles.forEach(file => {
    const report = checkMock(file);

    if (report.missingFixtures.length > 0) {
      console.error(`[BROKEN LINK] ${report.mockFile}`);
      report.missingFixtures.forEach(missing => {
        console.error(`   - References missing file: ${missing}`);
      });
      failureCount++;
    } else if (report.hasNoFixtures) {
      console.error(`[NO FIXTURES] ${report.mockFile} references no fixtures.`);
      failureCount++;
    } else {
      // console.log(`✅ [OK]          ${report.mockFile} (${report.fixtureRefs.length} refs)`);
    }
  });

  console.log('\n--- Summary ---');
  if (failureCount > 0) {
    console.error(`FAILED: ${failureCount} mocks have missing or no fixtures.`);
    process.exit(1);
  } else {
    console.log('PASSED: all mocks reference fixtures.');
    process.exit(0);
  }
}

main();
