
DO $$
DECLARE
  air uuid := '5e63928a-fd65-48e7-b52a-58221a4729a4';
  r record;
  fid uuid;
  did uuid;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('SM 0002/0003','CAI/SSH/CAI','Turnaround Security','04:45','05:30','04:20','05:25','03:30','05:25','T/A','BVB','MOHAMED FARID','AHMED HEMID','MOHAMED AHMED','NIL','NIL','MOSTAFA ATEF','MAHER ALI',''),
    ('SM 0004/0005','CAI/SSH/CAI','Turnaround Security','09:30','10:15','09:30','10:10','08:15','10:10','T/A','BVB','ABDLATIF HAMAD','MAHMOUD MOWAFY','OMAR SHAWKY','NIL','NIL','MOHAMED RASHAD','KHALID ABDALLAH',''),
    ('SM 0006/0007','CAI/SSH/CAI','Turnaround Security','14:15','15:00','14:25','15:10','13:00','15:20','T/A','BVB','MOHAMED KHALED','HASSAN KAMEL','MOHAMED MOSTAFA','NIL','NIL','IBRAHIM ESSAM','IBRAHIM MOHAMED','DL/0010'),
    ('SM 0183','SSH/CAI','Departure Security','','05:00','','04:35','03:00','04:35','DEP','BWE','AHMED HEMID','ABDALLAH FARGHAL','','HASSAN MOHAMED','NIL','MOSTAFA ATEF','MAHER ALI',''),
    ('SM 0802','BRI/SSH','Arrival Security','00:35','','00:10','','00:10','01:10','ARR','BVI','KARIM SALAMA','ABDALLAH FARGHAL','','NIL','NIL','NIL','MAHER ALI',''),
    ('SM 0884','NQZ/SSH','Arrival Security','10:55','','10:50','','10:50','11:50','ARR','BUL','MOHAMED RASHAD','MOHAMED ABDELAZIM','NIL','NIL','NIL','NIL','KHALID ABDALLAH',''),
    ('SM 0885','SSH/AKX','Departure Security','','22:35','19:35','22:35','19:35','22:35','DEP','BVK','ABDALLAH FARGHAL','ABDALLAH KHALED','','YOUSSEF ELHARITH','NIL','MOSTAFA ATEF','AHMED YOUSSEF',''),
    ('SM 0901','SSH/LED','Departure Security','','20:00','','20:00','17:00','20:00','DEP','BUK','MOHAMED SALAH','ROVEN ALBAIR','NIL','HASSAN KAMEL','NIL','MOHAMED ESSAM','IBRAHIM MOHAMED',''),
    ('SM 0904','SVO/SSH','Arrival Security','04:15','','05:00','','05:00','06:00','ARR','BUK','ABDALLAH FARGHAL','AHMED EFFAT','','NIL','NIL','NIL','MAHER ALI',''),
    ('SM 0908','KZN/SSH','Arrival Security','11:50','','11:35','','11:35','12:35','ARR','BVK','MOHAMED ABDELAZIM','MOHAMED ASHRAF','NIL','NIL','NIL','NIL','KHALID ABDALLAH','')
  ) AS t(flight_no,route,ctype,sta,std,ata,atd,ss,se,ad,reg,hbo,ado,aro,cat,cgo,bag,sup,rem)
  LOOP
    SELECT id INTO fid FROM flight_schedules
     WHERE flight_no=r.flight_no AND route=r.route AND clearance_type=r.ctype
       AND (departure_date='2026-06-08' OR arrival_date='2026-06-08')
     LIMIT 1;

    IF fid IS NULL THEN
      INSERT INTO flight_schedules (
        id, airline_id, flight_no, departure_flight, aircraft_type, registration, route, clearance_type,
        requested_date, status, sta, std, skd_type, departure_date, arrival_date, created_via
      ) VALUES (
        gen_random_uuid(), air, r.flight_no, r.flight_no, 'A320', r.reg, r.route, r.ctype,
        '2026-06-08', 'Approved', r.sta, r.std, 'Schedule',
        CASE WHEN r.ctype IN ('Departure Security','Turnaround Security') THEN '2026-06-08' ELSE NULL END,
        CASE WHEN r.ctype IN ('Arrival Security','Turnaround Security') THEN '2026-06-08' ELSE NULL END,
        'station'
      ) RETURNING id INTO fid;
    END IF;

    SELECT id INTO did FROM dispatch_assignments WHERE flight_schedule_id=fid LIMIT 1;

    IF did IS NULL THEN
      INSERT INTO dispatch_assignments (
        id, flight_schedule_id, flight_date, staff_names, staff_count,
        scheduled_start, scheduled_end, status, task_sheet_data, created_via
      ) VALUES (
        gen_random_uuid(), fid, '2026-06-08',
        trim(both ', ' FROM concat_ws(', ', NULLIF(NULLIF(r.hbo,''),'NIL'), NULLIF(NULLIF(r.ado,''),'NIL'), NULLIF(NULLIF(r.aro,''),'NIL'))),
        3, r.ss, r.se, 'Pending',
        jsonb_build_object(
          'sta',r.sta,'std',r.std,'ata',r.ata,'atd',r.atd,'route',r.route,'registration','SU-'||r.reg,
          'arr_dep',r.ad,'skd_type','Schedule','flight_type','Schedule',
          'shift_start',r.ss,'shift_end',r.se,'shift_start_date','2026-06-08','shift_end_date','2026-06-08',
          'hold_baggage_observer_1',r.hbo,'hold_baggage_observer_2','',
          'aircraft_door_observer_1',r.ado,'aircraft_door_observer_2','',
          'aircraft_ramp_observer_1',r.aro,'cargo_observer_1','','cargo_observer_2','','gate_door_observer_1','',
          'catering_accompanied',r.cat,'cargo_accompanied',r.cgo,'baggage_accompanied',r.bag,
          'supervisor_on_duty',r.sup,'remarks',r.rem,
          'accompanied_by', jsonb_build_object('catering',r.cat,'cargo',r.cgo,'baggage',r.bag)
        ),
        'station'
      );
    ELSE
      UPDATE dispatch_assignments SET
        staff_names = trim(both ', ' FROM concat_ws(', ', NULLIF(NULLIF(r.hbo,''),'NIL'), NULLIF(NULLIF(r.ado,''),'NIL'), NULLIF(NULLIF(r.aro,''),'NIL'))),
        scheduled_start = r.ss, scheduled_end = r.se,
        task_sheet_data = COALESCE(task_sheet_data,'{}'::jsonb) || jsonb_build_object(
          'sta',r.sta,'std',r.std,'ata',r.ata,'atd',r.atd,'route',r.route,'registration','SU-'||r.reg,
          'arr_dep',r.ad,'skd_type','Schedule','flight_type','Schedule',
          'shift_start',r.ss,'shift_end',r.se,'shift_start_date','2026-06-08','shift_end_date','2026-06-08',
          'hold_baggage_observer_1',r.hbo,'hold_baggage_observer_2','',
          'aircraft_door_observer_1',r.ado,'aircraft_door_observer_2','',
          'aircraft_ramp_observer_1',r.aro,'cargo_observer_1','','cargo_observer_2','','gate_door_observer_1','',
          'catering_accompanied',r.cat,'cargo_accompanied',r.cgo,'baggage_accompanied',r.bag,
          'supervisor_on_duty',r.sup,'remarks',r.rem,
          'accompanied_by', jsonb_build_object('catering',r.cat,'cargo',r.cgo,'baggage',r.bag)
        ),
        updated_at = now()
      WHERE id=did;
    END IF;
  END LOOP;
END $$;
