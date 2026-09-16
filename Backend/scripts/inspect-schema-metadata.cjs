const fs = require('fs');
const { Client } = require('pg');

const queries = {
  COLUMNS: `
    select table_name, column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public'
    order by table_name, ordinal_position
  `,
  CONSTRAINTS: `
    select conrelid::regclass::text as table_name, conname,
      pg_get_constraintdef(oid) as definition
    from pg_constraint
    where connamespace = 'public'::regnamespace
    order by 1, 2
  `,
  POLICIES: `
    select tablename, policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  `,
  FUNCTIONS: `
    select routine_name, data_type
    from information_schema.routines
    where routine_schema = 'public'
    order by routine_name
  `,
  TRIGGERS: `
    select event_object_table, trigger_name, event_manipulation
    from information_schema.triggers
    where trigger_schema = 'public'
    order by event_object_table, trigger_name
  `,
  BUCKETS: `
    select id, name, public, file_size_limit
    from storage.buckets
    order by id
  `,
};

async function main() {
  const connectionString = fs.readFileSync('supabase/.temp/pooler-url', 'utf8').trim();
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  for (const [label, query] of Object.entries(queries)) {
    console.log(`---${label}---`);
    const result = await client.query(query);
    for (const row of result.rows) console.log(JSON.stringify(row));
  }

  await client.end();
}

main().catch(error => {
  const safeMessage = String(error.message ?? 'Unknown error')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[database-url-redacted]')
    .replace(/password=[^\s]+/gi, 'password=[redacted]');
  console.error('Schema metadata query failed:', error.code ?? error.name, safeMessage);
  process.exitCode = 1;
});
