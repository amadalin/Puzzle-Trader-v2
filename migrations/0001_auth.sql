-- Puzzle Trader V2 AUTH_DB: Cloudflare D1 EU.
-- Schema only: no users or credentials inserted by migration.
-- Private exchange keys must be encrypted by trusted server before storage.
-- Encryption master key must never be stored in D1 or the public repository.

CREATE TABLE IF NOT EXISTS users (
 user_id TEXT PRIMARY KEY CHECK(length(user_id) = 36),
 username TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(username) BETWEEN 3 AND 32),
 password_hash TEXT NOT NULL CHECK(length(password_hash) >= 20),
 exchange_id TEXT NOT NULL CHECK(exchange_id IN ('KUCOIN_FUTURES','BINANCE_FUTURES')),
 account_state TEXT NOT NULL DEFAULT 'PENDING_API' CHECK(account_state IN ('PENDING_API','ACTIVE','SUSPENDED')),
 created_at INTEGER NOT NULL DEFAULT(unixepoch()),
 updated_at INTEGER NOT NULL DEFAULT(unixepoch()),
 last_login_at INTEGER
);

CREATE TRIGGER IF NOT EXISTS users_max_five
BEFORE INSERT ON users
WHEN (SELECT count(*) FROM users) >= 5
BEGIN SELECT RAISE(ABORT, 'MAX_FIVE_USERS'); END;

CREATE TRIGGER IF NOT EXISTS users_exchange_immutable
BEFORE UPDATE OF exchange_id ON users
WHEN NEW.exchange_id <> OLD.exchange_id
BEGIN SELECT RAISE(ABORT, 'EXCHANGE_CHANGE_REQUIRES_RECONNECT'); END;

CREATE TABLE IF NOT EXISTS user_sessions (
 session_hash TEXT PRIMARY KEY CHECK(length(session_hash) = 64),
 user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
 created_at INTEGER NOT NULL DEFAULT(unixepoch()),
 expires_at INTEGER NOT NULL,
 last_seen_at INTEGER,
 revoked_at INTEGER,
 CHECK(expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_expiry ON user_sessions(user_id, expires_at);

CREATE TABLE IF NOT EXISTS exchange_credentials (
 user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
 exchange_id TEXT NOT NULL CHECK(exchange_id IN ('KUCOIN_FUTURES','BINANCE_FUTURES')),
 encrypted_payload BLOB NOT NULL CHECK(length(encrypted_payload) > 16),
 nonce BLOB NOT NULL CHECK(length(nonce) = 12),
 key_version INTEGER NOT NULL CHECK(key_version >= 1),
 created_at INTEGER NOT NULL DEFAULT(unixepoch()),
 updated_at INTEGER NOT NULL DEFAULT(unixepoch()),
 last_verified_at INTEGER
);

CREATE TRIGGER IF NOT EXISTS credentials_exchange_match_insert
BEFORE INSERT ON exchange_credentials
WHEN NOT EXISTS (SELECT 1 FROM users WHERE user_id = NEW.user_id AND exchange_id = NEW.exchange_id)
BEGIN SELECT RAISE(ABORT, 'EXCHANGE_PROFILE_MISMATCH'); END;

CREATE TRIGGER IF NOT EXISTS credentials_exchange_match_update
BEFORE UPDATE OF user_id, exchange_id ON exchange_credentials
WHEN NOT EXISTS (SELECT 1 FROM users WHERE user_id = NEW.user_id AND exchange_id = NEW.exchange_id)
BEGIN SELECT RAISE(ABORT, 'EXCHANGE_PROFILE_MISMATCH'); END;

CREATE TABLE IF NOT EXISTS auth_rate_limits (
 subject_hash TEXT PRIMARY KEY CHECK(length(subject_hash) = 64),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
 window_started_at INTEGER NOT NULL,
 locked_until INTEGER,
 updated_at INTEGER NOT NULL DEFAULT(unixepoch())
);

CREATE TABLE IF NOT EXISTS schema_migrations (
 version INTEGER PRIMARY KEY,
 applied_at INTEGER NOT NULL DEFAULT(unixepoch())
);

INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);
