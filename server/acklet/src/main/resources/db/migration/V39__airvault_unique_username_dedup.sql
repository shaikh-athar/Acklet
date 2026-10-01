-- V39: Deduplicate any legacy duplicate usernames, normalize to lowercase, and enforce strict UNIQUE constraint on airvault_identities (lower(username))

-- Step 1: Normalize all existing usernames to lower(trim(username))
UPDATE airvault_identities
SET username = LOWER(TRIM(username))
WHERE username IS NOT NULL;

UPDATE airvault_devices
SET username = LOWER(TRIM(username))
WHERE username IS NOT NULL;

-- Step 2: Resolve any existing duplicate usernames across airvault_identities by assigning clean readable suffixes (_2, _3, ...)
WITH ranked_identities AS (
    SELECT 
        id,
        username,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(username)) ORDER BY created_at ASC, id ASC) AS rn
    FROM airvault_identities
    WHERE username IS NOT NULL AND deleted_at IS NULL
),
duplicates_to_rename AS (
    SELECT id, username, rn,
           username || '_' || rn AS new_username
    FROM ranked_identities
    WHERE rn > 1
)
UPDATE airvault_identities i
SET username = d.new_username,
    updated_at = CURRENT_TIMESTAMP
FROM duplicates_to_rename d
WHERE i.id = d.id;

-- Step 3: Synchronize updated usernames to linked airvault_devices
UPDATE airvault_devices d
SET username = i.username,
    updated_at = CURRENT_TIMESTAMP
FROM airvault_identities i
WHERE d.identity_id = i.id;

-- Step 4: Drop old indexes and enforce strict unique constraint / index on LOWER(TRIM(username))
DROP INDEX IF EXISTS idx_airvault_identities_username;
DROP INDEX IF EXISTS idx_airvault_identities_lower_username;

-- Enforce UNIQUE constraint on lowercase username
CREATE UNIQUE INDEX IF NOT EXISTS uq_airvault_identities_lower_username 
    ON airvault_identities (LOWER(TRIM(username)))
    WHERE deleted_at IS NULL;
