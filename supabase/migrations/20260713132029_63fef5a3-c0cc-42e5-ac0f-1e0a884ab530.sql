
DO $$
DECLARE
  r record;
  fid uuid;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('SM 0002/0003','CAI/SSH/CAI','Turnaround Security','04:30','05:30','04:30','05:15','03:30','05:15','T/A','BVI',
      'MOHAMED ASHRAF','MOHAMED AHMED','OMAR SHAWKY','NIL','NIL','AHMED MOSLLAM','MAHER ALI',''),
    ('SM 0004/0005','CAI/SSH/CAI','Turnaround Security','09:00','10:00','09:15','10:15','08:00','10:15','T/A','BVI',
      'EBRAHIM MOHAMED','MOHAMED ELSAYED','MOMEN ANWAR','NIL','NIL','MOHAMED RASHAD','AHMED YOUSSEF',''),
    ('SM 0006/0801','CAI/SSH/BRI','Arrival Security','13:00','16:50','13:40','16:50','13:50','16:50','ARR','BVI',
      'MOHAMED MONIR','MOHMAED SALAH','NIL','MOATAZ ELTOPGY','NIL','MOHAMED SALAH','IBRAHIM MOHAMED',''),
    ('SM 0008/0009','CAI/SSH/CAI','Turnaround Security','19:00','19:45','19:00','19:45','17:45','19:45','T/A','BVC',
      'MOHAMED MONIR','MOHAMED WAGEH','MOHAMED NAGAH','NIL','NIL','HASSAN RAWASH','IBRAHIM MOHAMED',''),
    ('SM 0010/0034','CAI/SSH/HBE','Turnaround Security','05:15','06:00','05:10','05:55','04:00','05:55','T/A','BVF',
      'MOHAMED WAHDAN','MAHMOUD HABIB','','MAHMOED ABDELSHAKOUR','NIL','AHMED MOSLLAM','MAHER ALI',''),
    ('SM 0015/0011','HRG/SSH/CAI','Turnaround Security','13:25','14:55','13:50','14:55','12:55','14:55','T/A','BVF',
      'MOHAMED HAMED','MOHAMED MOSTAFA','NIL','HASSAN KAMAL','NIL','HASSAN RAWASH','IBRAHIM MOHAMED',''),
    ('SM 0035/0014','HBE/SSH/HRG','Turnaround Security','10:35','11:20','10:35','11:20','09:20','11:20','T/A','BVF',
      'ABDALLAH ANDER','ALAA MOHAMED','MOHAMED AHMED','HASSAN KAMAL','NIL','MOHAMED ESSAM','IBRAHIM MOHAMED',''),
    ('SM 0807','SSH/FCO','Departure Security','00:00','13:30','00:00','13:25','10:30','13:25','DEP','BUS',
      'MOHAMED KHALED','MAHMOUD MOWAFY','NIL','HASSAN KAMAL','NIL','MOHAMAED SALAH','IBRAHIM MOHAMED',''),
    ('SM 0820/0809','NAP/SSH/NAP','Turnaround Security','14:00','15:00','14:35','15:20','12:00','15:20','T/A','BVK',
      'MOHAMED NAGAH','MOHMAED MONIR','NIL','HASSAN KAMAL','NIL','ROVEN ALBER','IBRAHIM MOHAMED','DL/0020'),
    ('SM 0902','LED/SSH','Arrival Security','23:35','','23:15','','23:15','00:15','ARR','BUN',
      'MOHAMED FARID','AHMED HEMID','','NIL','NIL','NIL','MAHER ALI','')
  ) AS t(flight_no,route,ctype,sta,std,ata,atd,ss,se,ad,reg,hbo,ado,aro,cat,cgo,bag,sup,rem)
  LOOP
    SELECT id INTO fid FROM flight_schedules
     WHERE flight_no=r.flight_no AND route=r.route AND clearance_type=r.ctype
       AND (departure_date='2026-06-07' OR arrival_date='2026-06-07')
     LIMIT 1;
    IF fid IS NULL THEN CONTINUE; END IF;

    UPDATE dispatch_assignments SET
      staff_names = trim(both ', ' FROM concat_ws(', ',
        NULLIF(NULLIF(r.hbo,''),'NIL'),
        NULLIF(NULLIF(r.ado,''),'NIL'),
        NULLIF(NULLIF(r.aro,''),'NIL')
      )),
      scheduled_start = r.ss,
      scheduled_end = r.se,
      task_sheet_data = COALESCE(task_sheet_data,'{}'::jsonb) || jsonb_build_object(
        'sta',r.sta,'std',r.std,'ata',r.ata,'atd',r.atd,
        'route',r.route,'registration','SU-'||r.reg,
        'arr_dep',r.ad,'skd_type','Schedule','flight_type','Schedule',
        'shift_start',r.ss,'shift_end',r.se,
        'shift_start_date','2026-06-07','shift_end_date','2026-06-07',
        'hold_baggage_observer_1',r.hbo,'hold_baggage_observer_2','',
        'aircraft_door_observer_1',r.ado,'aircraft_door_observer_2','',
        'aircraft_ramp_observer_1',r.aro,
        'cargo_observer_1','','cargo_observer_2','',
        'gate_door_observer_1','',
        'catering_accompanied',r.cat,'cargo_accompanied',r.cgo,'baggage_accompanied',r.bag,
        'supervisor_on_duty',r.sup,'remarks',r.rem,
        'accompanied_by', jsonb_build_object('catering',r.cat,'cargo',r.cgo,'baggage',r.bag)
      ),
      updated_at = now()
    WHERE flight_schedule_id = fid;
  END LOOP;
END $$;
