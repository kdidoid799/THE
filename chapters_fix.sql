DROP TABLE IF EXISTS items;
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('book', 'movie', 'series')) NOT NULL,
  status TEXT CHECK (status IN ('unwatched', 'watched')) NOT NULL,
  "matchStatus" TEXT CHECK ("matchStatus" IN ('matched', 'pending', 'unidentified', 'failed')) NOT NULL,
  duration INTEGER NOT NULL,
  "keyPoints" JSONB DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  source JSONB,
  links JSONB DEFAULT '[]'::jsonb,
  chapters JSONB DEFAULT '[]'::jsonb,
  "createdAt" timestamptz DEFAULT now() NOT NULL
);