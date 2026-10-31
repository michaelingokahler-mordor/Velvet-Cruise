-- Public driver identifiers are separate from authentication credentials.
-- Old Workers can keep writing profiles during a staged deployment or rollback.
CREATE TABLE driver_tags (
  profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL UNIQUE CHECK(length(tag) = 8 AND tag NOT GLOB '*[^0-9A-F]*')
);
INSERT INTO driver_tags(profile_id, tag)
  SELECT id, printf('%08X', rowid) FROM profiles;
