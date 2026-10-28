CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE scores (
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  board TEXT NOT NULL,
  score INTEGER NOT NULL,
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY (profile_id, board)
);
CREATE INDEX scores_board_value ON scores(board, score, achieved_at);
CREATE TABLE limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX limits_expiry ON limits(expires_at);
