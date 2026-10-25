import { DatabaseSync } from 'node:sqlite';

// D1's SQL surface backed by real SQLite. Network and Worker deployment are
// checked separately; this adapter keeps ordering/upsert tests deterministic.
export function testDatabase(schema) {
  const db = new DatabaseSync(':memory:');
  db.exec(schema);
  return {
    prepare(sql) {
      let values = [];
      return {
        bind(...next) { values = next; return this; },
        async first() { return db.prepare(sql).get(...values) ?? null; },
        async all() { return { results: db.prepare(sql).all(...values) }; },
        async run() { return db.prepare(sql).run(...values); },
      };
    },
    close() { db.close(); },
  };
}
