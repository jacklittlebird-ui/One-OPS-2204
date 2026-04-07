ALTER TYPE overfly_status ADD VALUE IF NOT EXISTS 'Cancelled';
ALTER TABLE overfly_schedules ADD COLUMN IF NOT EXISTS valid_from date;
ALTER TABLE overfly_schedules ADD COLUMN IF NOT EXISTS valid_to date;