const { execSync } = require('child_process');

try {
  console.log("\n🛡️ Startup Audit: Checking Fixture Freshness...");
  // Allow stale to prevent hard failure on startup, but show warnings
  execSync('npx ts-node scripts/fixture-audit.ts --allow-stale', { stdio: 'inherit' });
} catch (e) {
  // Ignore
  process.exit(0);
}

