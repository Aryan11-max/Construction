// Seed data for the demo. Replace with values from the JCR and inventory Excel files.
/* ---------- seed data (sample, replace with Arjun's Excel later) ---------- */
const TODAY = new Date('2026-10-24T10:00:00+05:30');
const d = (off,h=10)=>{const x=new Date(TODAY);x.setDate(x.getDate()+off);x.setHours(h,0,0,0);return x.toISOString()};
const ACTS = ['Site Setup','Pile Foundation','Substructure','Superstructure','Masonry','Finishes'];

function seed(){
  const locs=[
    {id:'WH-01',name:'Main Warehouse, Peenya',type:'Warehouse'},
    {id:'WH-02',name:'Yard, Hosur Road',type:'Warehouse'},
    {id:'S-101',name:'Whitefield Villas',type:'Site'},
    {id:'S-102',name:'Sarjapur Commercial',type:'Site'},
    {id:'S-103',name:'Hebbal Residence',type:'Site'},
    {id:'S-104',name:'E-City Factory Shed',type:'Site'},
    {id:'S-105',name:'Yelahanka School Block',type:'Site'},
  ];
  const mats=[
    ['CEM-001','OPC 53 Cement','bag',410,200],['STL-008','TMT Bar 8 mm','kg',68,1500],['STL-012','TMT Bar 12 mm','kg',66,2000],
    ['STL-016','TMT Bar 16 mm','kg',65,2000],['RMC-025','Ready-mix concrete M25','cum',5600,0],['AGG-020','Aggregate 20 mm','cum',1450,20],
    ['SND-001','M-Sand','cum',1300,20],['BLK-006','Solid block 6"','nos',48,1000],['PLY-012','Shuttering ply 12 mm','sheet',1650,40],
    ['SCF-003','Cuplock vertical 3 m','nos',950,60],['BND-001','Binding wire','kg',85,100],['WPF-001','Waterproofing compound','ltr',180,40],
    ['PVC-110','PVC pipe 110 mm × 6 m','nos',820,20],['NAI-075','Nails 3"','kg',95,30],['TRP-001','Tarpaulin 30×40 ft','nos',2400,6],
    ['SFT-001','Safety helmet','nos',220,40],['SFT-002','Safety shoes','pair',1200,20],['CNT-001','Site office container','nos',285000,1],
    ['DGS-025','DG set 25 kVA','nos',410000,0],['PRM-001','Wall primer','ltr',260,40],
  ].map(([code,name,unit,rate,reorder])=>({code,name,unit,rate,reorder}));
  const moves=[]; let mid=1;
  const mv=(date,code,qty,from,to,type,ref,act)=>moves.push({id:'MV-'+String(mid++).padStart(4,'0'),date,code,qty,from,to,type,ref:ref||'',act:act||''});
  // opening stock at warehouses
  [['CEM-001',420],['STL-008',3200],['STL-012',5400],['STL-016',2600],['AGG-020',35],['SND-001',30],['BLK-006',2600],['PLY-012',120],['SCF-003',340],
   ['BND-001',260],['WPF-001',90],['PVC-110',45],['NAI-075',70],['TRP-001',14],['SFT-001',110],['SFT-002',55],['CNT-001',3],['DGS-025',1],['PRM-001',120]]
   .forEach(([c,q])=>mv(d(-30),c,q,'VENDOR','WH-01','Inward','Opening stock'));
  [['CEM-001',150],['SCF-003',220],['PLY-012',60],['CNT-001',2],['TRP-001',8]].forEach(([c,q])=>mv(d(-30),c,q,'VENDOR','WH-02','Inward','Opening stock'));
  // past site issues (costed to activities)
  mv(d(-21),'CNT-001',1,'WH-01','S-101','Transfer','Mobilisation','Site Setup');
  mv(d(-21),'DGS-025',1,'WH-01','S-101','Transfer','Mobilisation','Site Setup');
  mv(d(-18),'RMC-025',42,'VENDOR','S-101','Inward','PR-0098 direct','Pile Foundation');
  mv(d(-18),'STL-016',2400,'VENDOR','S-101','Inward','PR-0098 direct','Pile Foundation');
  mv(d(-12),'CEM-001',180,'WH-01','S-101','Transfer','PR-0101','Substructure');
  mv(d(-12),'STL-012',1800,'WH-01','S-101','Transfer','PR-0101','Substructure');
  mv(d(-9),'CNT-001',1,'WH-01','S-102','Transfer','Mobilisation','Site Setup');
  mv(d(-9),'SCF-003',160,'WH-02','S-102','Transfer','PR-0103','Superstructure');
  mv(d(-8),'PLY-012',50,'WH-01','S-102','Transfer','PR-0103','Superstructure');
  mv(d(-7),'CEM-001',120,'WH-01','S-103','Transfer','PR-0104','Masonry');
  mv(d(-7),'BLK-006',1800,'WH-01','S-103','Transfer','PR-0104','Masonry');
  mv(d(-5),'CEM-001',95,'S-101','CONSUMED','Consumed','Daily log','Substructure');
  mv(d(-4),'SCF-003',40,'S-102','S-104','Transfer','Site-to-site','Superstructure');
  mv(d(-3),'CEM-001',60,'S-103','CONSUMED','Consumed','Daily log','Masonry');
  mv(d(-2),'CNT-001',1,'WH-02','S-104','Transfer','Mobilisation','Site Setup');

  const H=(status,off,by,note)=>({status,at:d(off,11),by,note:note||''});
  const reqs=[
    {id:'PR-0108',site:'S-101',act:'Superstructure',source:'Warehouse',from:'WH-01',items:[{code:'STL-012',qty:1200},{code:'BND-001',qty:40}],needBy:d(2),by:'Ravi (Site Eng.)',
      history:[H('Requested',-1,'Ravi (Site Eng.)','Slab 2 reinforcement')]},
    {id:'PR-0107',site:'S-103',act:'Finishes',source:'Vendor',vendor:'',items:[{code:'PRM-001',qty:60},{code:'WPF-001',qty:30}],needBy:d(5),by:'Meena (Site Eng.)',
      history:[H('Requested',-2,'Meena (Site Eng.)'),H('Approved',-1,'Arjun (Office)')]},
    {id:'PR-0106',site:'S-102',act:'Superstructure',source:'Vendor',vendor:'Shree Concrete Pvt Ltd',items:[{code:'RMC-025',qty:28}],needBy:d(1),by:'Imran (Site Eng.)',
      history:[H('Requested',-3,'Imran (Site Eng.)','Column pour, pump required'),H('Approved',-3,'Arjun (Office)'),H('PO Raised',-2,'Purchase','PO-2231 · ₹1,56,800')]},
    {id:'PR-0105',site:'S-104',act:'Site Setup',source:'Warehouse',from:'WH-01',items:[{code:'SFT-001',qty:30},{code:'SFT-002',qty:20},{code:'TRP-001',qty:4}],needBy:d(0),by:'Kiran (Site Eng.)',
      history:[H('Requested',-2,'Kiran (Site Eng.)'),H('Approved',-2,'Arjun (Office)'),H('Dispatched',-1,'Warehouse','Vehicle KA-05-AB-2231')],dispatched:true},
    {id:'PR-0104',site:'S-103',act:'Masonry',source:'Warehouse',from:'WH-01',items:[{code:'CEM-001',qty:120},{code:'BLK-006',qty:1800}],needBy:d(-7),by:'Meena (Site Eng.)',
      history:[H('Requested',-9,'Meena (Site Eng.)'),H('Approved',-9,'Arjun (Office)'),H('Dispatched',-8,'Warehouse'),H('Delivered',-7,'Meena (Site Eng.)','Received OK')]},
  ];
  // in-transit stock for PR-0105
  reqs[3].items.forEach(i=>mv(d(-1),i.code,i.qty,'WH-01','TRANSIT','Transfer','PR-0105 dispatched','Site Setup'));
  const jcr={
    'S-101':{client:'Prestige Homes',acts:{'Site Setup':[180000,120000,52000],'Pile Foundation':[1650000,1380000,690000],'Substructure':[2400000,1950000,410000],'Superstructure':[5200000,4300000,0],'Masonry':[1400000,1150000,0],'Finishes':[2100000,1700000,0]}},
    'S-102':{client:'Sarjapur Infra LLP',acts:{'Site Setup':[220000,140000,61000],'Pile Foundation':[2900000,2450000,2380000],'Substructure':[3100000,2600000,1900000],'Superstructure':[7800000,6500000,820000],'Masonry':[0,0,0],'Finishes':[0,0,0]}},
    'S-103':{client:'Mr. R. Natarajan',acts:{'Site Setup':[90000,60000,40000],'Pile Foundation':[0,0,0],'Substructure':[900000,760000,720000],'Superstructure':[1800000,1500000,1490000],'Masonry':[700000,560000,180000],'Finishes':[950000,780000,0]}},
    'S-104':{client:'Apex Components',acts:{'Site Setup':[150000,110000,30000],'Pile Foundation':[1200000,980000,0],'Substructure':[1600000,1300000,0],'Superstructure':[4100000,3300000,0],'Masonry':[0,0,0],'Finishes':[600000,480000,0]}},
    'S-105':{client:'Yelahanka Edu Trust',acts:{'Site Setup':[120000,90000,0],'Pile Foundation':[0,0,0],'Substructure':[1100000,900000,0],'Superstructure':[2600000,2100000,0],'Masonry':[900000,720000,0],'Finishes':[800000,650000,0]}},
  };
  return {locs,mats,moves,reqs,jcr,seq:{pr:109,mv:mid}};
}
