-- Event identity is per event, never per player. Retain 48h; accept event age <=24h.
CREATE TABLE IF NOT EXISTS statistics_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('game_loaded','run_start')),
  day TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS statistics_events_expiry ON statistics_events(expires_at);
CREATE TABLE IF NOT EXISTS statistics_daily (
  day TEXT PRIMARY KEY,
  game_loaded INTEGER NOT NULL DEFAULT 0,
  run_start INTEGER NOT NULL DEFAULT 0
);
-- The trigger and INSERT execute atomically in SQLite/D1, even across clients.
-- Ignored duplicate inserts never fire this trigger or increment a count.
CREATE TRIGGER IF NOT EXISTS statistics_count AFTER INSERT ON statistics_events
BEGIN
  INSERT INTO statistics_daily(day,game_loaded,run_start)
  VALUES(NEW.day,NEW.type='game_loaded',NEW.type='run_start')
  ON CONFLICT(day) DO UPDATE SET
    game_loaded=game_loaded+excluded.game_loaded,
    run_start=run_start+excluded.run_start;
END;
