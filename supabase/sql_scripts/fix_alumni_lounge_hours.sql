-- Fix Alumni Lounge opening hours
-- Vollsemester: Mo/Di 08:00–20:00, Mi–Fr 08:00–22:00, Sa/So closed
-- Slot format: each slot = 30 min from midnight
--   08:00 = slot 16, 20:00 = slot 40, 22:00 = slot 44
-- Day index: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

UPDATE public.venues
SET
    hours = '{
        "0": null,
        "1": {"start": 16, "end": 40},
        "2": {"start": 16, "end": 40},
        "3": {"start": 16, "end": 44},
        "4": {"start": 16, "end": 44},
        "5": {"start": 16, "end": 44},
        "6": null
    }'::jsonb,
    hours_full = '{
        "0": null,
        "1": {"start": 16, "end": 40},
        "2": {"start": 16, "end": 40},
        "3": {"start": 16, "end": 44},
        "4": {"start": 16, "end": 44},
        "5": {"start": 16, "end": 44},
        "6": null
    }'::jsonb
WHERE name ILIKE '%alumni%lounge%';
