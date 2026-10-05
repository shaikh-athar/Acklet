-- V38: Make user_id nullable on airvault_devices for unauthenticated / anonymous E2EE device pairing
ALTER TABLE airvault_devices ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE airvault_devices DROP CONSTRAINT IF EXISTS airvault_devices_user_id_fkey;
ALTER TABLE airvault_devices ADD CONSTRAINT airvault_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
