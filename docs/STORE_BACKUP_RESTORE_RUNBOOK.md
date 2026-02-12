# Store Backup and Restore Runbook

## Scope
This runbook covers backup and restore for the MCP collaboration state file (`store.json` + shards).

## Preconditions
- MCP server process is stopped.
- `MCP_STORE_PATH` is known.
- Operator has write access to store directory.

## Backup Procedure
1. Resolve store path:
   - `echo "$MCP_STORE_PATH"`
2. Create timestamped backup directory:
   - `mkdir -p backups/$(date -u +%Y%m%dT%H%M%SZ)`
3. Copy manifest and shard directory:
   - `cp "$MCP_STORE_PATH" backups/<ts>/store.json`
   - `cp -R "$(dirname "$MCP_STORE_PATH")/shards" backups/<ts>/shards`
4. Verify backup integrity:
   - `test -f backups/<ts>/store.json`
   - `test -d backups/<ts>/shards`

## Restore Procedure
1. Stop MCP server process.
2. Restore files:
   - `cp backups/<ts>/store.json "$MCP_STORE_PATH"`
   - `rm -rf "$(dirname "$MCP_STORE_PATH")/shards"`
   - `cp -R backups/<ts>/shards "$(dirname "$MCP_STORE_PATH")/shards"`
3. Start server and verify:
   - `npm start`
   - Run status check (`get_status`) and confirm expected revision/data.

## Rollback Verification
- Confirm server starts without schema errors.
- Confirm state revision and key collections are readable.
- Confirm lock/audit/task operations succeed.

