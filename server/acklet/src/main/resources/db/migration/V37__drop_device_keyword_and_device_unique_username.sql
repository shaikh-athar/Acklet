-- V37: Drop plain-text device_keyword and remove unique username constraint from airvault_devices
-- (Username uniqueness is strictly enforced on airvault_identities table)

ALTER TABLE airvault_devices DROP CONSTRAINT IF EXISTS airvault_devices_username_key;
ALTER TABLE airvault_devices DROP CONSTRAINT IF EXISTS uq_airvault_devices_username;

ALTER TABLE airvault_devices DROP COLUMN IF EXISTS device_keyword;
