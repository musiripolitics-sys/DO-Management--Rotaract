-- ═══════════════════════════════════════════════════════════════════════
-- VIBE — Attendance + 100 pts each, mapped to EXISTING events
-- Maps to event rows ALREADY in public.events (does NOT create events).
-- Idempotent: safe to re-run (existing check-ins are skipped, points not doubled).
-- Run in the Supabase SQL editor (service role -> bypasses RLS).
--   Installation: 82 attendees   |   Learning Seminar: 61 attendees
--
-- Step 1 — confirm the exact event names (or copy their UUIDs):
--     SELECT id, name, event_date, category FROM public.events ORDER BY start_time DESC;
-- Step 2 — if the names below are not an EXACT match, edit them (or hardcode
--          the UUIDs: see the two commented lines in the body). Then run.
-- ═══════════════════════════════════════════════════════════════════════
BEGIN;
DO $$
DECLARE
  install_name TEXT := 'Pradhinidhi - District Installation';         -- <- exact public.events.name
  seminar_name TEXT := 'District Official Learning Seminar - Pulse';  -- <- exact public.events.name
  pts INT := 100;
  ev_install UUID; ev_seminar UUID;
  em TEXT; uid UUID; missing TEXT := '';
  install_emails TEXT[] := ARRAY[
    'rtrvaseemakram@gmail.com',  -- Rtr. PP. Vaseem Akram -> Rtr. PP. Vaseem Akram
    'yukta.28.devanand@gmail.com',  -- Rtr. Dr. Yukta Devanand -> Rtr. Dr. Yukta Devanand
    '3233drr2526@gmail.com',  -- Rtr. PHF. PP. Dinesh Kumar M. -> Rtr. PHF. PP. Dinesh Kumar M
    'rithikaelangovan07@gmail.com',  -- Rtr.Rithika EJ -> Rtr. Rithika EJ
    'kaaviyasathya@gmail.com',  -- Rtr. Kaaviyapriya B -> Rtr. Kaaviyapriya B
    'suryanot007@gmail.com',  -- Rtr. PP. Surya A -> Rtr. PP. Surya A
    'vijayrambornleader@gmail.com',  -- Rtr. PP. Vijay Ram -> Rtr. PP. Vijay Ram
    'rtrmaniyazhagan@gmail.com',  -- Rtr. Maniyazhagan A -> Rtr. IPP. Maniyazhagan A
    'msvicky8056@gmail.com',  -- Rtr. Vignesh -> Rtr. Vignesh
    'jainandhika59@gmail.com',  -- Rtr. Jai Nandhika BM -> Rtr. Jai Nandhika BM
    'hpremkumar1099@gmail.com',  -- Rtr. Premkumar -> Rtr. Premkumar
    '3233drr2627@gmail.com',  -- Rtr. PHF. PP Harivignesh M -> Rtr. PHF. PP Harivignesh M
    'abdurrawoofa@gmail.com',  -- Rtr. Mohamed Abdur Rawoof -> Rtr. Mohamed Abdur Rawoof
    'vigneshbalaji0021@gmail.com',  -- Rtr. PP. Vignesh Balaji -> Rtr. PP. Vignesh Balaji
    'aswinpramoth2004@gmail.com',  -- Rtr. Aswin Pramoth AR -> Rtr. IPP. Aswin Pramoth AR
    'murali-e-k.do@vibetemp.in',  -- Rtr. PP. Murali -> Rtr. PP. Murali E K
    'mk67.seenu@gmail.com',  -- Rtr. Mithun Kailash -> Rtr. PP. Mithun Kailash
    'kumaresankriss@gmail.com',  -- Rtr. Kumaresan -> Rtr. IPP. Kumaresan
    'poojasaritha2004@gmail.com',  -- Rtr. IPP. Pooja Sreevalsan -> Rtr. PP. Pooja Sreevalsan
    'kshriram1626@gmail.com',  -- Rtr. Shriram. K -> Rtr. Shriram K
    'ramcatherinee24@gmail.com',  -- Rtr. Ramya -> Rtr. Ramya
    'sureshkrishna39@gmail.com',  -- Rtr. PP. Suresh Krishna -> Rtr. PP. Suresh Krishna
    'kiranashwath.do@vibetemp.in',  -- Rtr.Kirenaswanth -> Rtr. IPP. Kiranashwath
    'monishavenkatesan24@gmail.com',  -- Rtr. Monisha Venkatesan -> Rtr. Monisha Venkatesan
    'dhanush-ram-t-p.do@vibetemp.in',  -- Rtr. PP. Dhanush Ram T -> Rtr. PP. Dhanush Ram T P
    'priyasrm3116@gmail.com',  -- Rtr. Shanmuga Priya S -> Rtr. Shanmuga Priya S
    'rtrswathilakshmi@gmail.com',  -- Rtr. Swathi lakshmi G -> Rtr. Swathi lakshmi G
    'k.krishnaranga24@gmail.com',  -- Rtr. Krishnaranga K -> Rtr. IPP. Krishnaranga K
    'karthibalaji2507@gmail.com',  -- Rtr. Karthik balaji -> Rtr. Karthik balaji
    'gokulakrishnan-s.do@vibetemp.in',  -- Rtr. PP. Gokulakrishnan -> Rtr. PP. Gokulakrishnan S
    'manispace10@gmail.com',  -- Rtr. Manikandhan -> Rtr. IPP. Manikandhan
    'varshasriram19@gmail.com',  -- Varsha Sriram -> Varsha Sriram
    'shanmugasundara35@gmail.com',  -- Rtr. Shanmuga Sundaram V -> Rtr. Shanmuga Sundaram V
    'deenadhayalanrtr@gmail.com',  -- Rtr. Deenadhayalan U -> Rtr. Deenadhayalan U
    'adhithyan549@gmail.com',  -- Rtr Adhithyan -> Rtr Adhithyan
    'mythilimurthy29@gmail.com',  -- Rtr. Mythili -> Rtr. IPP. Mythili
    'akashmohana3116@gmail.com',  -- Rtr. AKASH Ganeshan -> Rtr. Akash Ganeshan
    'samnazu29@gmail.com',  -- Rtr. Sameer -> Rtr. IPP. Sameer
    'madhumithaj54@gmail.com',  -- Rtr. IPP. Madhumitha -> Rtr. PP. Madhumitha
    'varunpriyan03@gmail.com',  -- Rtr. Varun Priyan -> Rtr. PP. Varun Priyan
    'naveen-kumar-a.do@vibetemp.in',  -- Rtr. PP. Naveen Kumar -> Rtr. PP. Naveen Kumar A
    'sriramprodblegends@gmail.com',  -- Rtr. Jaiharish A -> Rtr. Jaiharish A
    'gowtham001.official@gmail.com',  -- Rtr. Gowtham B -> Rtr. Gowtham B
    'jaganjagan585@gmail.com',  -- Rtr. Jagan -> Rtr. Jagan
    'gpriyadharshini777@gmail.com',  -- Rtr. Priyadharshini G -> Rtr. Priyadharshini G
    'sadhithyan06@gmail.com',  -- Rtr. Adhithyan S -> Rtr. Adhithyan S
    'rtrdak3233@gmail.com',  -- Rtr. IPP. Dharsan Arunkumar V P -> Rtr. PP. Dharsan Arunkumar V P
    'dhivyadharini07@gmail.com',  -- Rtr. Dhivya Dharini -> Rtr. IPP. Dhivya Dharini
    'keerthigakeer15@gmail.com',  -- Rtr. Krithika -> Rtr. Krithika
    'inieabh24@gmail.com',  -- Rtr. Bharath D -> Rtr. Bharath D
    'manojbcom453@gmail.com',  -- Rtr. Manoj A -> Rtr. Manoj A
    'sakthiviscomsa@gmail.com',  -- Rtr. M. Sakthi -> Rtr. M. Sakthi
    'roshitkumar2000@gmail.com',  -- Rtr. PP. Roshit Kumar -> Rtr. PP. Roshit Kumar
    'logasreebhaskaran@gmail.com',  -- Rtr. Logasree B -> Rtr. Logasree B
    'rtr.gouravjoel@gmail.com',  -- Rtr. Gourav Joel -> Rtr. Gourav Joel
    'gomathypanneerselvam208@gmail.com',  -- Rtr. Gomathy -> Rtr. Gomathy
    'dazzledani22@gmail.com',  -- Rtr. Daniel -> Rtr. Daniel
    'jeevithadevanandh09@gmail.com',  -- Rtr Varsha -> Rtr. Varsha
    'anwershaheinsha@gmail.com',  -- Rtr. H SHAHEINSHA -> Rtr. H Shaheinsha
    'poojamurugesan2626@gmail.com',  -- Rtr. Pooja Murugesan -> Rtr. Pooja Murugesan
    'snehapreetha23@gmail.com',  -- Rtr. B. Sneha preetha -> Rtr. B. Sneha preetha
    'rtr.christopherdanielecc@gmail.com',  -- Rtr.Christopher Daniel.J -> Rtr.Christopher Daniel J
    'sowmyaraghu1811@gmail.com',  -- Rtr. Sowmya -> Rtr. IPP. Sowmya
    'vishnupriyanmv5@gmail.com',  -- Rtr. Vishnu priyan -> Rtr. PP. Vishnu Priyan
    'kcsriganesh592005@gmail.com',  -- Rtr. Sriganesh KC -> Rtr. Sriganesh KC
    'adarshg1502@gmail.com',  -- Rtr. Adarsh G -> Rtr. Adarsh G
    'hariharanm122365@gmail.com',  -- Rtr. Hariharan M -> Rtr. Hariharan M
    'desiganjr@gmail.com',  -- Rtr. Desigan -> Rtr. Desigan
    'vkvenkat111540@gmail.com',  -- Rtr Venkatesh Kamaraj -> Rtr Venkatesh Kamaraj
    'aahaas2413@gmail.com',  -- Rtr. PP. Aahaas -> Rtr. PP. Aahaas
    'rtr.praveenvijay@gmail.com',  -- Rtr. PP. Praveen -> Rtr. PP. Praveen
    'deekshaya2005@gmail.com',  -- Rtr. Deekshaya -> Rtr. IPP. Deekshaya
    'anuj-s-krishnan.do@vibetemp.in',  -- Rtr. Anuj -> Rtr. IPP. Anuj S Krishnan
    'shameer2793@gmail.com',  -- Rtr. Shameer Hussain R -> Rtr. IPP. Shameer Hussain R
    'prithivi.be.eee@gmail.com',  -- Rtr. Prithivi Raj -> Rtr. Prithivi Raj
    'john-tarun-b-j.do@vibetemp.in',  -- Rtr.John Tarun -> Rtr. PP. John Tarun B J
    'mukeshmugi1114@gmail.com',  -- Rtr. Mukesh M -> Rtr. Mukesh M
    'priyankaloganathan09@gmail.com',  -- Rtr. Priyanka -> Rtr. Priyanka
    'vishva17102004@gmail.com',  -- Rtr. Srinivasan -> Rtr. Srinivasan
    'bsathya2000@gmail.com',  -- Rtr. Sathyapriya B -> Rtr. IPP. Sathyapriya B
    'anbuviscom@gmail.com',  -- PDRR. Rtr.. PP. Anbarasu B -> PDRR. Rtr. PP. Anbarasu B
    'madhumathiramajayam10@gmail.com'  -- Rtr. Madhumathi -> Rtr. Madhumathi
  ];
  seminar_emails TEXT[] := ARRAY[
    'vigneshbalaji0021@gmail.com',  -- Rtr. PP. Vignesh Balaji -> Rtr. PP. Vignesh Balaji
    'sureshkrishna39@gmail.com',  -- Rtr. PP. Suresh Krishna -> Rtr. PP. Suresh Krishna
    'gowtham001.official@gmail.com',  -- Rtr. Gowtham B -> Rtr. Gowtham B
    'sowmyaraghu1811@gmail.com',  -- Rtr. Sowmya -> Rtr. IPP. Sowmya
    'kumaresankriss@gmail.com',  -- Rtr. Kumaresan -> Rtr. IPP. Kumaresan
    'anbuviscom@gmail.com',  -- PDRR. Rtr.. PP. Anbarasu B -> PDRR. Rtr. PP. Anbarasu B
    'madhumithaj54@gmail.com',  -- Rtr. IPP. Madhumitha -> Rtr. PP. Madhumitha
    'adarshg1502@gmail.com',  -- Rtr. Adarsh G -> Rtr. Adarsh G
    'bsathya2000@gmail.com',  -- Rtr. Sathyapriya B -> Rtr. IPP. Sathyapriya B
    'dharshinidurai2608@gmail.com',  -- Rtr. PP. Saraswathy -> Rtr. PP. Saraswathy
    'msvicky8056@gmail.com',  -- Rtr. Vignesh -> Rtr. Vignesh
    'vijayrambornleader@gmail.com',  -- Rtr. PP. Vijay Ram -> Rtr. PP. Vijay Ram
    'prxveen43@gmail.com',  -- Rtr. Praveen R -> Rtr. Praveen R
    'mukeshmugi1114@gmail.com',  -- Rtr. Mukesh M -> Rtr. Mukesh M
    'rtr.praveenvijay@gmail.com',  -- Rtr. PP. Praveen -> Rtr. PP. Praveen
    'adhithyan549@gmail.com',  -- Rtr Adhithyan -> Rtr Adhithyan
    'john-tarun-b-j.do@vibetemp.in',  -- Rtr.John Tarun -> Rtr. PP. John Tarun B J
    'akashmohana3116@gmail.com',  -- Rtr. AKASH Ganeshan -> Rtr. Akash Ganeshan
    'deenadhayalanrtr@gmail.com',  -- Rtr. Deenadhayalan U -> Rtr. Deenadhayalan U
    'jeevithadevanandh09@gmail.com',  -- Rtr Varsha -> Rtr. Varsha
    'kcsriganesh592005@gmail.com',  -- Rtr. Sriganesh KC -> Rtr. Sriganesh KC
    'shanmugasundara35@gmail.com',  -- Rtr. Shanmuga Sundaram V -> Rtr. Shanmuga Sundaram V
    'veeratamila27@gmail.com',  -- Rtr. Veera Balan -> Rtr. PP. Veera Balan
    'ramcatherinee24@gmail.com',  -- Rtr. Ramya -> Rtr. Ramya
    'snehapreetha23@gmail.com',  -- Rtr. B. Sneha preetha -> Rtr. B. Sneha preetha
    'kaaviyasathya@gmail.com',  -- Rtr. Kaaviyapriya B -> Rtr. Kaaviyapriya B
    'vkvenkat111540@gmail.com',  -- Rtr Venkatesh Kamaraj -> Rtr Venkatesh Kamaraj
    'varunpriyan03@gmail.com',  -- Rtr. Varun Priyan -> Rtr. PP. Varun Priyan
    'monishavenkatesan24@gmail.com',  -- Rtr. Monisha Venkatesan -> Rtr. Monisha Venkatesan
    'priyasrm3116@gmail.com',  -- Rtr. Shanmuga Priya S -> Rtr. Shanmuga Priya S
    'sriramprodblegends@gmail.com',  -- Rtr. Jaiharish A -> Rtr. Jaiharish A
    'deekshaya2005@gmail.com',  -- Rtr. Deekshaya -> Rtr. IPP. Deekshaya
    'dazzledani22@gmail.com',  -- Rtr. Daniel -> Rtr. Daniel
    'elangovankayalvizhi01@gmail.com',  -- Rtr. Kayalvizhi J E -> Rtr. Kayalvizhi J E
    'mk67.seenu@gmail.com',  -- Rtr. Mithun Kailash -> Rtr. PP. Mithun Kailash
    'hpremkumar1099@gmail.com',  -- Rtr. Premkumar -> Rtr. Premkumar
    'murali-e-k.do@vibetemp.in',  -- Rtr. PP. Murali -> Rtr. PP. Murali E K
    'jaganjagan585@gmail.com',  -- Rtr. Jagan -> Rtr. Jagan
    'gomathypanneerselvam208@gmail.com',  -- Rtr. Gomathy -> Rtr. Gomathy
    'rtr.christopherdanielecc@gmail.com',  -- Rtr.Christopher Daniel.J -> Rtr.Christopher Daniel J
    'abdurrawoofa@gmail.com',  -- Rtr. Mohamed Abdur Rawoof -> Rtr. Mohamed Abdur Rawoof
    'rtrdak3233@gmail.com',  -- Rtr. IPP. Dharsan Arunkumar V P -> Rtr. PP. Dharsan Arunkumar V P
    'kshriram1626@gmail.com',  -- Rtr. Shriram. K -> Rtr. Shriram K
    'shameer2793@gmail.com',  -- Rtr. Shameer Hussain R -> Rtr. IPP. Shameer Hussain R
    'dhivyadharini07@gmail.com',  -- Rtr. Dhivya Dharini -> Rtr. IPP. Dhivya Dharini
    'sadhithyan06@gmail.com',  -- Rtr. Adhithyan S -> Rtr. Adhithyan S
    'rtrvaseemakram@gmail.com',  -- Rtr. PP. Vaseem Akram -> Rtr. PP. Vaseem Akram
    'gpriyadharshini777@gmail.com',  -- Rtr. Priyadharshini G -> Rtr. Priyadharshini G
    'rindhyavarsha1407@gmail.com',  -- Rtr. Sandhya K -> Rtr. IPP. Sandhya K
    'gokulakrishnan-s.do@vibetemp.in',  -- Rtr. PP. Gokulakrishnan -> Rtr. PP. Gokulakrishnan S
    'inieabh24@gmail.com',  -- Rtr. Bharath D -> Rtr. Bharath D
    'mythilimurthy29@gmail.com',  -- Rtr. Mythili -> Rtr. IPP. Mythili
    'rithikaelangovan07@gmail.com',  -- Rtr.Rithika EJ -> Rtr. Rithika EJ
    'prithivi.be.eee@gmail.com',  -- Rtr. Prithivi Raj -> Rtr. Prithivi Raj
    'roshitkumar2000@gmail.com',  -- Rtr. PP. Roshit Kumar -> Rtr. PP. Roshit Kumar
    'hariharanm122365@gmail.com',  -- Rtr. Hariharan M -> Rtr. Hariharan M
    'aahaas2413@gmail.com',  -- Rtr. PP. Aahaas -> Rtr. PP. Aahaas
    'rtrswathilakshmi@gmail.com',  -- Rtr. Swathi lakshmi G -> Rtr. Swathi lakshmi G
    'manispace10@gmail.com',  -- Rtr. Manikandhan -> Rtr. IPP. Manikandhan
    'anuj-s-krishnan.do@vibetemp.in',  -- Rtr. Anuj -> Rtr. IPP. Anuj S Krishnan
    'priyankaloganathan09@gmail.com'  -- Rtr. Priyanka -> Rtr. Priyanka
  ];
BEGIN
  -- 1) Map to the EXISTING event rows (no creation). Hard-fails if not found,
  --    so a name typo can never silently create a duplicate event.
  --    Prefer UUIDs? Replace each SELECT line with, e.g.:
  --      ev_install := '00000000-0000-0000-0000-000000000000'::uuid;
  SELECT id INTO ev_install FROM public.events WHERE name = install_name ORDER BY start_time DESC LIMIT 1;
  IF ev_install IS NULL THEN
    RAISE EXCEPTION 'Event not found: "%" — check the exact name: SELECT id,name FROM public.events;', install_name;
  END IF;

  SELECT id INTO ev_seminar FROM public.events WHERE name = seminar_name ORDER BY start_time DESC LIMIT 1;
  IF ev_seminar IS NULL THEN
    RAISE EXCEPTION 'Event not found: "%" — check the exact name: SELECT id,name FROM public.events;', seminar_name;
  END IF;

  -- 2) District Installation attendance (+{pts})
  FOREACH em IN ARRAY install_emails LOOP
    SELECT id INTO uid FROM public.profiles WHERE lower(email) = lower(em);
    IF uid IS NULL THEN missing := missing || 'INSTALL  '||em||E'\n'; CONTINUE; END IF;
    INSERT INTO public.attendance (user_id, event_id, points_awarded, status, check_in_time)
    VALUES (uid, ev_install, pts, 'manual', now())
    ON CONFLICT (user_id, event_id) DO NOTHING;
    IF FOUND THEN
      UPDATE public.profiles SET total_points = COALESCE(total_points,0) + pts WHERE id = uid;
    END IF;
  END LOOP;

  -- 3) District Learning Seminar attendance (+{pts})
  FOREACH em IN ARRAY seminar_emails LOOP
    SELECT id INTO uid FROM public.profiles WHERE lower(email) = lower(em);
    IF uid IS NULL THEN missing := missing || 'SEMINAR  '||em||E'\n'; CONTINUE; END IF;
    INSERT INTO public.attendance (user_id, event_id, points_awarded, status, check_in_time)
    VALUES (uid, ev_seminar, pts, 'manual', now())
    ON CONFLICT (user_id, event_id) DO NOTHING;
    IF FOUND THEN
      UPDATE public.profiles SET total_points = COALESCE(total_points,0) + pts WHERE id = uid;
    END IF;
  END LOOP;

  IF missing <> '' THEN RAISE NOTICE E'⚠️  Emails NOT found in profiles (skipped):\n%', missing;
  ELSE RAISE NOTICE '✅  Every attendee email matched a profile.'; END IF;
END $$;

-- 4) Verify
SELECT e.name, count(a.*) AS attendees, COALESCE(sum(a.points_awarded),0) AS points
FROM public.events e
LEFT JOIN public.attendance a ON a.event_id = e.id
WHERE e.name IN ('District Installation','District Learning Seminar')
GROUP BY e.name ORDER BY e.name;

COMMIT;
