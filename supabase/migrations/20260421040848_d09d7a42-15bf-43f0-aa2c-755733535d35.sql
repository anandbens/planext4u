-- Set Unsplash-curated images for top-level categories and active service categories that lack a real image URL.
-- Uses stable images.unsplash.com CDN URLs (royalty-free), sized 512x512 cropped.

UPDATE public.categories SET image = CASE id
  WHEN 'CAT0000209' THEN 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000210' THEN 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000003' THEN 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000220' THEN 'https://images.unsplash.com/photo-1522335789203-aaa28c3ee21f?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000332' THEN 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000179' THEN 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000325' THEN 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000272' THEN 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000320' THEN 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000362' THEN 'https://images.unsplash.com/photo-1599909533714-d8c158d4c75d?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000314' THEN 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000306' THEN 'https://images.unsplash.com/photo-1565608438257-fac3c27beb36?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000263' THEN 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000020' THEN 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000005' THEN 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000321' THEN 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000277' THEN 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000336' THEN 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000006' THEN 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000288' THEN 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000022' THEN 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000308' THEN 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000324' THEN 'https://images.unsplash.com/photo-1565374395542-0ce18882c857?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000258' THEN 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000303' THEN 'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000301' THEN 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000187' THEN 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000283' THEN 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000312' THEN 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000164' THEN 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000265' THEN 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000181' THEN 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000279' THEN 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000300' THEN 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000056' THEN 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000010' THEN 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000021' THEN 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000307' THEN 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=512&h=512&fit=crop&q=80&auto=format'
  WHEN 'CAT0000278' THEN 'https://images.unsplash.com/photo-1568667256549-094345857637?w=512&h=512&fit=crop&q=80&auto=format'
END
WHERE id IN ('CAT0000209','CAT0000210','CAT0000003','CAT0000220','CAT0000332','CAT0000179','CAT0000325','CAT0000272','CAT0000320','CAT0000362','CAT0000314','CAT0000306','CAT0000263','CAT0000020','CAT0000005','CAT0000321','CAT0000277','CAT0000336','CAT0000006','CAT0000288','CAT0000022','CAT0000308','CAT0000324','CAT0000258','CAT0000303','CAT0000301','CAT0000187','CAT0000283','CAT0000312','CAT0000164','CAT0000265','CAT0000181','CAT0000279','CAT0000300','CAT0000056','CAT0000010','CAT0000021','CAT0000307','CAT0000278');

UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1581275288578-bf3f0b6f6c0c?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('617','20','11');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('599','544','CAT0000320','72','CAT0000265','CAT0000056','18','605');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('1','23');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('17','CAT0000209');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('99');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('561','614');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1592839961834-fe93dc1b5a32?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('68');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1522335789203-aaa28c3ee21f?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('568','12','563','CAT0000220','646');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('615','564');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('550');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('100');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1519741497674-611481863552?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('562');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('648');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('653');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('493','200','CAT0000312','22','628','591');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('CAT0000179');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('576');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('CAT0000325','55');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('734','538','66','618');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('651');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1559737558-2f5a7d4ad81b?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('575');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('634');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1571266028243-d220c6a36c66?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('626');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('627','629');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1518604666860-9ed391f76460?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('619');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('543','21');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('529');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('535','623');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1599627446075-6b1d8c3f0f48?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('546');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('584');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('38','42');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1611781949024-9a4d4fa6f6f6?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('104');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1599909533714-d8c158d4c75d?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('701');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('CAT0000314','32','35','595');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1565608438257-fac3c27beb36?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('CAT0000306');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('CAT0000277','16','26');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('596');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('56','86');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('538');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('660');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('101');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1535190275019-eb8c1cd60bf6?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('574');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('15','43');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('571','645');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('473');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('566');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('633');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('622');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('248');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('551');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('60','549');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('715','40','45');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('13','10','CAT0000321','CAT0000279','318','528','621','559','583','552','582','58','48');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('547');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('600');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('478','CAT0000258','19');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1530319067432-f2a729c03db5?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('497');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('95');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('57');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('523');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('83','85','315');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('CAT0000301','106');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('102');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('567');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('537');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('484','486','522','607');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('539');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('624');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('577');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('CAT0000187','474');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('652');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('548');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1556122071-e404eaedb77f?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('73');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1583912267550-d6c2ac3d7e9b?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('107');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('CAT0000283');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1577017040065-650ee4d43339?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('14');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('711');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('103');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('44');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('606');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('CAT0000164');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('310');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1568667256549-094345857637?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('519','CAT0000278');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('49');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('84');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('50');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('545');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('CAT0000300','560');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1559757175-08d6a47f4d83?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('96');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('78');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('483');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('731');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('61');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('98');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('77');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('33');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('CAT0000010');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('62');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1562376552-0d160a2f238c?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('540');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('251');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('611','250','586');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('609');
UPDATE public.service_categories SET image = 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=512&h=512&fit=crop&q=80&auto=format' WHERE id IN ('CAT0000307');