import source from '../../story-data.json';

// Every task begins at an existing outdoor route stop. Models and props are
// phone-based interpretations, never objects hidden in or attached to a monument.
const choice=(prompt,options,answer,success,wrong)=>({kind:'choice',prompt,options:options.map(([id,label,detail])=>({id,label,...(detail?{detail}:{})})),answer,success,wrong});
const sequence=(prompt,options,answer,success,wrong)=>({kind:'sequence',prompt,options:options.map(([id,label,detail])=>({id,label,...(detail?{detail}:{})})),answer,success,wrong});
const align=(prompt,answer,success,wrong)=>({kind:'align',prompt,options:[],answer,success,wrong});
const make=(routeId,theme,intro,ending,items)=>{
 const original=source.stories.find(s=>s.route_id===routeId);
 return {routeId,theme,intro,ending,stops:items.map((item,index)=>{
  const base=original.stops[index];
  return {
   id:base.id,title:item.title,spot:item.spot,lookFor:item.lookFor,
   arrivalPrompt:item.arrivalPrompt||`确认你已到达${base.name}附近适合驻足的公共位置，再开始观察。`,
   evidenceTitle:item.evidenceTitle,evidence:item.evidence,
   propName:item.propName,propDescription:item.propDescription,modelKind:item.modelKind,
   task:item.task,
   reward:{id:`${base.id}-field-discovery`,title:item.rewardTitle,text:item.rewardText,type:item.rewardType||'fact'},
   nextClue:item.nextClue||base.next_hint,
   sourceUrls:item.sourceUrls||base.source_urls,
   accessNote:item.accessNote||base.access_note
  };
 })};
};

const civic=make('civic-f1','沿河找回被省略的城市时间',
 '沿着真实街道，从一扇门、一排窗和一件礼物开始。每到一处，观察现场，再把手机中的证据放到正确的位置。最后那座喷泉，藏着“城市漏记了什么”的答案。',
 '你已把城市的照护、居住、交流、测量与公共贡献接回同一条路线。1857年的捐赠与1882年的纪念相隔25年；结束后可在收藏册里重看这一路的证据。',[
 {
  title:'一扇门，为什么留下这个名字？',spot:'CHIJMES 的 Victoria Street 一侧公共步道',
  lookFor:'先确认街侧的 Gate of Hope。观察门与围墙的关系；若说明牌不清楚，直接阅读下方馆方资料卡。',
  evidenceTitle:'先有照护，后有门名',evidence:'CHIJMES 的馆方历史记载，修道院自1854年起照护被遗弃的女婴；这道门在1996年获名 Gate of Hope。两年分别描述照护的开始与门的命名。',
  propName:'双层年代签',propDescription:'手机里的两张年代签分别贴在“人的经历”和“建筑的名字”上。门的概念模型帮助你辨认位置，不需要推开真实的门。',modelKind:'gate',
  task:sequence('按时间先后，把两张资料签放回街道记忆。',[
   ['named','1996 · 希望之门获名'],['care','1854 · 修道院开始相关照护']
  ],['care','named'],'门名被放回了正确年代。第一张校准页保留下来的，是发生在门后的照护。','先区分“照护开始”和“门获名”。资料卡给出了两者各自的年份。'),
  rewardTitle:'门后的照护',rewardText:'1854年的照护与1996年的命名，是同一地点的两种时间。',
  nextClue:'下一站的外墙有成排彩色窗户。它曾处理警务，也曾住着警员的家人。打开步行导航，去140 Hill Street寻找这两种生活。'
 },
 {
  title:'彩色窗后，也曾有人生活',spot:'140 Hill Street 外适合停留的公共步道',
  lookFor:'观察彩色窗列与建筑体量，确认旧禧街警署外观。你不需要数完全部窗户，也不需要进入办公楼。',
  evidenceTitle:'警署与家庭在同一栋楼里',evidence:'国家文物局记载，这座1934年完成的建筑除了警务设施，还设有警员及家属住所、儿童游乐场。今天的外观不能单独说明过去的所有用途。',
  propName:'窗后生活卡',propDescription:'在手机立面模型旁，给这排窗补上过去发生的生活。彩色窗仅作为观察线索，不能由颜色推断具体住户。',modelKind:'shophouse',
  task:choice('哪一张用途卡，最完整地说明资料中的旧禧街警署？',[
   ['office','只有警务办公'],['home','警务设施与家庭生活共存'],['hotel','对外经营的旅馆']
  ],'home','你给窗后补回了“家庭生活”。数据库里只写“办公楼”的那一行，被扩展成了人的日常。','资料提到了家属住所和儿童游乐场，再看哪张卡同时包含这些用途。'),
  rewardTitle:'警署也是家',rewardText:'观察一栋楼时，立面只是入口；用途档案会揭示它曾容纳的生活。',
  nextClue:'沿开放人行道路走向1 Old Parliament Lane。下一件线索来自一位暹罗国王：它有象鼻，却不会离开基座。'
 },
 {
  title:'一件礼物，经过了几次时间？',spot:'The Arts House 外铜象附近的开放公共通道',
  lookFor:'确认铜象及其基座，在允许驻足的位置观察轮廓。不必走到每一面去读字；下方资料提供事件顺序。',
  evidenceTitle:'来访、立像、迁移是三个事件',evidence:'铜象纪念暹罗国王拉玛五世1871年的来访，1872年立于市政厅前，1919年移至今天艺术之家前的位置。礼物的记忆可以延续，物件的位置却会改变。',
  propName:'铜象迁移签',propDescription:'转看手机上的铜象概念模型，把三张年代签排成它的路线。手机模型不是对实物铭文的逐字复刻。',modelKind:'elephant',
  task:sequence('把铜象的三段经历排成时间线。',[
   ['move','1919 · 移至艺术之家前'],['visit','1871 · 国王来访'],['stand','1872 · 立于市政厅前']
  ],['visit','stand','move'],'礼物的三个时间重新分开了。你收下一张提醒：地点改变，不等于记忆消失。','先发生来访，再立像，最后才迁移到当前地点。'),
  rewardTitle:'移动过的礼物',rewardText:'1871、1872、1919对应来访、立像与迁移，不能合并成一个建造年份。',
  nextClue:'从艺术之家走向加文纳桥北端的公众步道。那里的一条横线与宽箭头，在测量者眼里有特定含义。'
 },
 {
  title:'桥头的箭头，并不指向宝藏',spot:'加文纳桥北端、靠近亚洲文明博物馆的公共步道',
  lookFor:'先确认桥头位置，观察桥与河岸的高低关系。原测量刻记是否能从步道看清尚未核验；找不到也可用下方符号卡完成。',
  evidenceTitle:'标记的是参照高度',evidence:'国家文物局介绍，加文纳桥北桥台的历史测量基准约可追溯至1882年。传统符号由宽箭头与上方横线组成，横线中点用于表示相对基准面的高度。它不是给行人的方向箭头。',
  propName:'测量符号透片',propDescription:'在手机桥梁模型旁检视重绘的宽箭头与横线，选择它表达的意义。无需到桥下寻找、触摸或拓印刻记。',modelKind:'bridge',
  task:choice('这组“宽箭头＋横线”主要为测量者提供什么？',[
   ['direction','前往下一站的方向'],['height','一个已知高度的参照'],['water','当天水深的实时数值']
  ],'height','共同参照恢复了。城市的记录终于可以比较，而不是把不同类型的数值混在一起。','横线中点与高度参照有关，不是方向指示，也不是当天水深读数。'),
  rewardTitle:'先找共同参照',rewardText:'测量基准帮助比较高度；本关的符号是数字重绘，不要求现场找见原刻记。',
  nextClue:'沿北岸开放步道前往Dalhousie方尖碑。留意高而细的尖顶轮廓，下一张人物卡与支持城市发展的本地商人有关。'
 },
 {
  title:'纪念碑，也是一种公共表达',spot:'Empress Place 的 Dalhousie 方尖碑外部公共步道',
  lookFor:'找到尖顶方柱的轮廓，比较模型中的基座与碑身。公开说明若被遮挡，使用本页的文物局资料。',
  evidenceTitle:'1850年的来访与商人的立场',evidence:'方尖碑纪念1850年的总督来访。本地商人参与筹资，并借此表达支持自由贸易的立场；参与者包括陈金声。纪念物既记录事件，也承载捐建者的公共表达。',
  propName:'人物与立场卡',propDescription:'把“纪念来访”和“支持自由贸易”两层意思连到手机中的碑身。新获得的陈金声人物卡会用于后面的滨水线索。',modelKind:'obelisk',
  task:choice('哪种解释同时保留了这座碑的两个层次？',[
   ['only','仅记录当天的准确时间'],['both','纪念来访，也表达商人的贸易立场'],['water','它本身就是公共供水设施']
  ],'both','碑上的事件与捐建者的立场都留下了。陈金声人物卡加入你的这段街区记忆。','这一站的资料说的是来访与自由贸易；供水贡献将在后续地点展开。'),
  rewardTitle:'人物卡 · 陈金声',rewardText:'本地商人陈金声参与公共事务。他与公共供水的关系，将帮助你识别终点。',
  nextClue:'往维多利亚剧院与音乐厅方向走，寻找连接两座建筑的中央钟楼。下一次要分开的，是旧名称与新名称。'
 },
 {
  title:'钟楼旁，旧名字还在说话',spot:'9 Empress Place 钟楼前开放的公共区域',
  lookFor:'观察中央钟楼如何连接左右两座建筑。再看可辨认的建筑名称；不需要爬钟楼或等待整点钟声。',
  evidenceTitle:'纪念堂成为音乐厅',evidence:'Victoria Memorial Hall 于1979年改称 Victoria Concert Hall。官方介绍指出，旧名称仍保留在外墙上。一个地方可以有新的用途，同时留下较早的名称。',
  propName:'新旧名称叠片',propDescription:'给钟楼旁的建筑概念模型叠上新、旧两张名字卡，找到正确的先后关系。模型只辅助比对建筑组织与名称。',modelKind:'clock',
  task:sequence('先放旧名，再放1979年后的名称。',[
   ['concert','Victoria Concert Hall'],['memorial','Victoria Memorial Hall']
  ],['memorial','concert'],'两个名字都有了各自的位置。旧称没有因为新用途而被抹掉。','Memorial Hall 是旧名，Concert Hall 是1979年改称后的名称。'),
  rewardTitle:'名字的两层时间',rewardText:'建筑用途与名称会改变，外观中保留的旧名可成为观察历史的入口。',
  nextClue:'前往Esplanade Park南端邻近Queen Elizabeth Walk的开放行人区域。手机里有一组“水／捐助者／喷泉”线索，能把人物卡带到真正的终点。'
 },
 {
  title:'从滨水线索，找到那位捐助者',spot:'Queen Elizabeth Walk／Jubilee Bridge 附近当前开放、适合驻足的行人区域',
  lookFor:'观察滨水步道与桥梁的关系，确认你在行人空间。这里的任务发生在手机上；现场围挡时可在合法休息地点完成线上版本。',
  evidenceTitle:'把人物卡带到下一座纪念物',evidence:'前一段路线已取得陈金声人物卡。本关新增三张虚构线索：WATER（水）、DONOR（捐助者）、FOUNTAIN（喷泉）。结合人物卡，它们指向纪念陈金声公共供水贡献的喷泉。',
  propName:'三词线索卡',propDescription:'把三张线索读成一个地点。本关直接通过线索判断目的地；赛车可作为后续的可选奖励设计，不是当前任务的入口或通关条件。',modelKind:'letter',
  task:choice('把 WATER、DONOR、FOUNTAIN 与陈金声人物卡放在一起，下一站是谁？',[
   ['victoria','维多利亚钟楼'],['kim-seng','陈金声喷泉'],['elephant','艺术之家铜象']
  ],'kim-seng','下一站已确定。沿公园开放行人路径去看真实的喷泉，再核对它纪念的是哪一次贡献。','需要同时匹配“水、捐助者、喷泉”与陈金声。仅靠外观或一张卡还不够。'),
  rewardTitle:'目的地线索 · 水与捐助者',rewardText:'三张虚构线索把陈金声人物卡连接到真实的陈金声喷泉。',rewardType:'prop',
  nextClue:'沿Esplanade Park开放人行路径前往陈金声喷泉。到了之后，比较“捐赠发生”和“纪念物设立”这两个年份。',
  accessNote:'使用当前开放且适合停留的公共步道。赛事或活动围挡优先；不进入车道、看台、围场或闸口。具体驻足点仍待踏勘，不把手机任务标为赛事现场入场。'
 },
 {
  title:'喷泉记住的，是哪一年的贡献？',spot:'Esplanade Park 内陈金声喷泉外的开放步道',
  lookFor:'先确认喷泉名称，再观察上下层水盆与纪念物轮廓。两个答案年份由来源卡提供，不要求它们同时出现在现场铭牌上。',
  evidenceTitle:'捐赠1857，纪念1882',evidence:'国家文物局资料记载，陈金声在1857年捐出13,000元改善公共供水，纪念其贡献的喷泉于1882年设立。这两个年份记录不同事件；相减得到本集缺失的时间间隔。',
  propName:'双事件时间尺',propDescription:'在手机喷泉模型旁移动时间尺，算出捐赠与纪念之间的间隔。只操作数字模型，不接触真实水池或雕塑。',modelKind:'fountain',
  task:align('把时间尺调到1882 − 1857的结果（单位：年）。',25,'25年找回来了。贡献先发生，纪念物后来出现；城市的时间不该只剩建筑落成的那一刻。','先把1882归到“纪念物设立”，1857归到“捐赠”，再用较晚年份减去较早年份。'),
  rewardTitle:'城市计时员 · 找回25年',rewardText:'1857年的公共贡献与1882年的纪念物相隔25年。它们属于同一故事的不同事件。',
  nextClue:'本条路线完成。找一个适合休息的地方打开结算收藏册；无需再寻找一间房间，也没有必须前往的第九站。'
 }
]);

const telok=make('telok-ayer','沿一条街，读完三代人的家书',
 '一封家书把“海边”写成地址。沿直落亚逸走过会馆、纪念建筑、庙宇与教育空间，把每一站的观察放回信中，看看不同社群怎样在同一条街上生活。',
 '你已经用八个真实地点的资料读完家书。海岸、社群、教育与庇护串成了一条街的记忆；三代人的虚构落款也各自找到了位置。',[
 {
  title:'信上写着海边，海在哪里？',spot:'76 Telok Ayer Street 福德祠博物馆外的公共通行区域',
  lookFor:'确认福德祠馆名与街名，观察今天建筑前的街道。旧海岸的位置来自数字资料，不能仅凭今天的街景推断。',
  evidenceTitle:'地址与海岸不是同一种记录',evidence:'福德祠始于1824年客家、广府移民建立的小祠，后来也承担社群互助功能，1998年改为博物馆。直落亚逸的旧海岸记忆与今天的街道地理需要分开阅读。',
  propName:'家书地址叠片',propDescription:'用手机里的家书与旧海岸概念叠片，对照眼前街道。旧海岸示意不用于实时导航，也不要求找到实体藏信。',modelKind:'letter',
  task:choice('家书中的“海边”与眼前街景不同，哪种读法更合理？',[
   ['fake','因此可以认定家书地址造假'],['change','地点记忆可以保留，海岸位置会改变'],['temple','因此可以认定福德祠已迁到另一条街']
  ],'change','“海边”成为一条旧地理线索。信封上的五个乡名，指向下一站的社群网络。','今天看不到海，不足以证明旧地址造假或建筑迁移；要比较不同时期的地理记录。'),
  rewardTitle:'没有海的海边',rewardText:'从同一街道读取不同时期的地理记忆，是理解家书的第一步。',
  nextClue:'信里出现梅县、兴宁、五华、平远、蕉岭。沿街去98 Telok Ayer Street，寻找服务这五县客家人的应和会馆。',
  accessNote:'核心任务在公共街道与数字档案中完成。博物馆开放情况以现场为准；馆本体76号与馆外历史标记80号不可混用。'
 },
 {
  title:'五个乡名，怎样变成一张网？',spot:'98 Telok Ayer Street 应和会馆外公共步道',
  lookFor:'确认会馆名称及沿街立面。五县名单由会馆官网提供，不假定外墙一定刻有全部乡名。',
  evidenceTitle:'五县客家的联系',evidence:'应和会馆成立于1822年，为来自梅县、兴宁、五华、平远、蕉岭的客家移民建立联系。会馆并非家书里的私人收件房间，而是把同乡连接起来的社群组织。',
  propName:'五县联系卡',propDescription:'在手机会馆立面示意旁整理五个乡名，辨认它们共同指向的社群联系。',modelKind:'shophouse',
  task:choice('这五个乡名在家书里，最可能帮助收信人找到什么？',[
   ['postal','五个同一天使用的邮政编码'],['network','与应和会馆相关的同乡联系网'],['architects','五位建筑师的名字']
  ],'network','五个乡名连成了同乡网络。另一种语言的批注，开始指向这条街上的南印度社群。','名单是来源地名称，资料把它们与客家社群联系起来，并非邮编或建筑师名。'),
  rewardTitle:'五县如何成为一张网',rewardText:'梅县、兴宁、五华、平远、蕉岭在应和会馆的社群历史中彼此连接。',
  nextClue:'沿街到140号，寻找Nagore Dargah的双塔立面。新批注提醒你：纪念一位圣者，与安葬一位圣者并不是同一件事。',
  accessNote:'以外观完成；办公时间不等于游客可自由进入会馆。室内访问须另行征询。'
 },
 {
  title:'双塔之下，纪念的是什么？',spot:'140 Telok Ayer Street Nagore Dargah 外部公共步道',
  lookFor:'观察正面双塔轮廓，与手机模型比对。判断建筑的意义时，再阅读下方文物局资料。',
  evidenceTitle:'纪念建筑与墓葬的区别',evidence:'这座建筑与南印度Chulia社群有关，是圣者纪念建筑；圣者遗体并未安葬在这里。2011年起，这里设印度穆斯林文化中心。',
  propName:'双塔轮廓卡',propDescription:'旋转数字双塔示意，匹配眼前建筑的轮廓，再给它选择正确的用途解释。',modelKind:'tower',
  task:choice('哪张说明卡符合此处的官方资料？',[
   ['tomb','圣者遗体埋葬于此'],['memorial','纪念圣者的建筑，未安葬圣者遗体'],['fort','与社群无关的军事瞭望塔']
  ],'memorial','你保留了纪念与墓葬的区别。家书批注接着交出一页写有“三十六人”的互助记录。','资料明确区分纪念建筑与埋葬地；不要仅凭外形推断用途。'),
  rewardTitle:'有纪念建筑，没有圣者墓葬',rewardText:'建筑轮廓可以帮助定位；建筑意义需要与社群和史料一起理解。',
  nextClue:'再往150号走，寻找方形下层上承托八角上层的建筑。它的旧身份与1831年成立、36名商人组成的庆德会有关。',
  accessNote:'主线在外观完成；修复、活动和入馆安排以现场或运营方公布为准。'
 },
 {
  title:'方与八角，拼回建筑的两层',spot:'150 Telok Ayer Street 原庆德会大楼／玉皇宫外部公共步道',
  lookFor:'观察建筑上下层轮廓。在手机中对照方形下层与八角上层，不要求绕到所有面，也不要求从街上数出八个面。',
  evidenceTitle:'建筑外形与组织历史分开读',evidence:'庆德会由36名商人于1831年成立，承担私人互助功能。建筑的方形下层与八角上层可在模型中帮助识别；1831是组织成立年，不能直接当作现存建筑落成年。',
  propName:'两层建筑拼片',propDescription:'在手机模型中由下往上选择建筑层次，完成后取得航海愿望卡。所有拼合只发生在屏幕里。',modelKind:'temple',
  task:sequence('按从下到上的顺序，排列两层建筑轮廓。',[
   ['octagon','八角上层'],['square','方形下层']
  ],['square','octagon'],'建筑的两层接好了。你也把组织成立与建筑落成这两类信息分开了。','先放方形下层，再放八角上层；无需在现场绕建筑寻找每一个面。'),
  rewardTitle:'三十六人的互助',rewardText:'方与八角帮助认建筑；1831记录庆德会的成立，不能替代建筑本身的年代。',
  nextClue:'下一张愿望写着“先谢平安抵岸”。沿街到158号寻找天福宫，再追问一个抵达者怎样在这里开始生活。',
  accessNote:'现为运作中的宗教场所。公共外观与获准开放区域即可完成，入殿不是任务要求。'
 },
 {
  title:'平安抵岸之后，人们还需要什么？',spot:'158 Telok Ayer Street 天福宫外公共通行区域',
  lookFor:'确认天福宫名称，观察屋顶与临街入口。可比较建筑轮廓，不需要拍摄神像、礼拜者或进入内殿。',
  evidenceTitle:'从航海愿望到落地生活',evidence:'福建移民在天福宫向妈祖祈求航海平安。现存大型庙宇建于1839至1842年，也与会馆及教育活动相关。家书因此从“平安抵达”写到“如何在这里生活”。',
  propName:'渡海愿望卡',propDescription:'把家书的第一代愿望与地点资料连接。建筑模型用于观察屋顶层次，故事愿望卡为创作。',modelKind:'temple',
  task:choice('哪一组关系，符合天福宫资料与家书的转折？',[
   ['arrival','祈求航海平安，并逐渐建立在地社群生活'],['shipping','只处理货船订票，与社群无关'],['palace','仅是王室居住的宫殿']
  ],'arrival','抵达不再是结尾。另一种笔迹出现，开始询问怎样亲手写完这封信。','资料同时提到航海平安、会馆和教育，要保留这几者的联系。'),
  rewardTitle:'从渡海到落地',rewardText:'祈求平安抵岸的场所，也参与社群在新地点建立生活的过程。',
  nextClue:'沿街寻找168号的崇文阁。家书下一页问：“什么时候，我也能亲手把信写完？”',
  accessNote:'主线用外观和数字资料；祭祀与现场摄影要求优先。入殿、拍摄或参与仪式均不是完成条件。'
 },
 {
  title:'相邻的教育空间，有不同的年代',spot:'168 Telok Ayer Street 崇文阁外公共步道',
  lookFor:'确认崇文阁的位置与名称，注意不要把它与相邻崇福阁、崇福女校直接合并为同一个名称。',
  evidenceTitle:'1849与1915，各有自己的事件',evidence:'陈金声于1849年推动建设崇文阁，并获不同社群支持。相邻崇福阁于1915年开办崇福女校。两个年份属于不同的建设与办学事件。',
  propName:'两代教育签',propDescription:'在手机屋顶概念模型旁，把两份教育记录按年代放好。你取得的是证据顺序，不是进入校园的任务。',modelKind:'roof',
  task:sequence('从较早到较晚，排列两份教育记录。',[
   ['girls','1915 · 崇福女校开办'],['wen','1849 · 崇文阁建设']
  ],['wen','girls'],'第二代的落款有了来处。你保留了相邻空间之间的联系，也没有抹平它们的区别。','1849早于1915；崇文阁与崇福女校是这两份记录中的不同对象。'),
  rewardTitle:'谁能亲手写信',rewardText:'教育的延续由不同建筑、机构与事件共同组成，不应只留下一个模糊年份。',
  nextClue:'下一页写着“从茅屋到砖墙”。沿街走到192号Al-Abrar清真寺，比较1827与1855分别意味着什么。',
  accessNote:'外观即可完成。商户营业时间不等于全部历史空间开放时间；未预约不进入非公开区域。'
 },
 {
  title:'同一地点，为什么有两个起点？',spot:'192 Telok Ayer Street Al-Abrar 清真寺外公共步道',
  lookFor:'观察窄立面及双塔式构件，确认建筑位置。现场说明读不清时，直接使用本页两张年代资料。',
  evidenceTitle:'1827开始，1855建成正式建筑',evidence:'Al-Abrar清真寺在1827年始于茅屋，1855年建成正式建筑，服务南印度Chulia社群。这两个年份并不互相矛盾：它们描述不同阶段。',
  propName:'起点与成形时间尺',propDescription:'在手机上计算两个阶段之间的年数。时间尺是阅读历史关系的工具，不是清真寺内的机关。',modelKind:'tower',
  task:align('从1827到1855，相隔多少年？移动时间尺填写年数。',28,'28年的阶段差留下了。你纠正了把“开始建立”和“正式建筑完成”当成同一事件的误读。','用1855减去1827。两个日期分别对应场所开始与正式建筑完成。'),
  rewardTitle:'同一地点，两种起点',rewardText:'1827与1855可以同时正确，因为它们记录了不同阶段。',
  nextClue:'最后一站在235号：西式建筑上有中式亭阁屋顶。家书给出1889与1925，等你再次区分社群与建筑。',
  accessNote:'在公共道路完成，不占用礼拜动线。入内参观须遵循现场安排，与游戏完成无关。'
 },
 {
  title:'屋顶留下的，是怎样的相遇？',spot:'235 Telok Ayer Street 直落亚逸卫理堂外公共步道',
  lookFor:'从可安全停留的角度观察中式亭阁屋顶与下方建筑的组合。不要为取全景而进入车道或非公开区域。',
  evidenceTitle:'社群1889，建筑1925',evidence:'教会社群始于1889年，现存建筑在1925年落成。中式亭阁置于西式建筑上。不同年代与建筑语言共同保留在这个地点。',
  propName:'家书终章时间尺',propDescription:'对照手机中的屋顶概念模型，计算社群开始与现存建筑落成之间的间隔，为三代家书完成最后一张证据。',modelKind:'roof',
  task:align('1925年现存建筑落成，距1889年社群开始相隔多少年？',36,'36年的间隔完成了最后一行。家书里不同人的年代各归其位，八站证据可以收进同一本收藏册。','将1925与1889相减；不要把社群开始的年份直接当作现存建筑落成年。'),
  rewardTitle:'这封信终于送达',rewardText:'1889与1925相隔36年；一条街的记忆由多个社群与多代人的生活接续。',
  nextClue:'家书路线完成。可以在适合休息的位置打开终章收藏册，或开始前往地铁站的步行导航。无需进入教堂寻找额外房间。',
  accessNote:'仍是运作中的教堂。主线从外观完成，礼拜堂内部访问与导览另行确认。'
 }
]);

const kampong=make('kampong-gelam','带着七份现场报道，重做一张街区报',
 '虚构排字学徒阿明拿到一张缺页的街区报。你沿Bussorah Street、Sultan Gate、Aliwal Street和Jalan Sultan走访，把每座建筑对应的人和生活补回报道，再把下一份投递地址找出来。',
 '七份报道已经收齐。旅人、商人、学校、印刷者与不同来源的社群，共同构成了这张报纸。结算可以整理标题与收藏卡，街区本身才是故事发生的地方。',[
 {
  title:'这条街，曾为谁准备远行？',spot:'Bussorah Street 靠近苏丹回教堂的开放公共街段',
  lookFor:'确认Bussorah Street街名，观察临街店屋与步行街空间。今天的商铺不能直接代表旧时每栋店屋的用途。',
  evidenceTitle:'Kampong Kaji的旅人',evidence:'国家文物局资料介绍，靠近苏丹回教堂的一段曾称Kampong Kaji，是区域朝觐者候船、住宿和准备旅程的地方。朝觐是宗教旅程，不应被改写为普通节日活动。',
  propName:'虚构船票与街段卡',propDescription:'把手机中的船票与真实街段的历史用途连接。虚构船票不是可兑换车船票，也不会在街上出现实体藏点。',modelKind:'shophouse',
  task:choice('旧名Kampong Kaji与哪种生活网络相关？',[
   ['travel','朝觐者的候船、住宿与旅程准备'],['race','赛车场的维修与比赛'],['military','只供驻军使用的营房']
  ],'travel','第一份报道有了主角：正在准备远行的人。船票背面显出下一份投递地址。','资料把这一街段与朝觐者的旅程准备联系起来。'),
  rewardTitle:'朝觐者的中转街',rewardText:'同一条街道，曾连接住宿、候船与宗教远行的准备。',
  nextClue:'下一份虚构投递单写着73 Sultan Gate。去找Gedung Kuning——名字与黄色有关的一栋老住宅。'
 },
 {
  title:'同一栋房屋，为什么被买回？',spot:'73 Sultan Gate Gedung Kuning 外公共可达位置',
  lookFor:'确认黄屋名称及外观，观察住宅体量与临街关系。家族和族群信息要读资料，不能从外表自行猜测。',
  evidenceTitle:'离开与返回也会写进房屋历史',evidence:'Gedung Kuning曾长期作为住宅。爪哇裔商人Haji Yusoff于1912年购入，后来售出，再次买回。记录中重复出现同一栋房屋，并不必然是错误。',
  propName:'三段产权签',propDescription:'用手机里的三张事件签重排购入、售出和再次购入，让房屋模型承接不同时间的生活。',modelKind:'shophouse',
  task:sequence('按资料给出的经历，排列黄屋的三张事件签。',[
   ['buy-again','再次购入'],['buy','1912 · 购入'],['sell','后来售出']
  ],['buy','sell','buy-again'],'离开与返回都被保留下来。下一份报道把你带向两所共用礼堂的学校。','先购入，再售出，最后再次购入；不要把两次购入误合并成一次。'),
  rewardTitle:'一栋房子的多次归来',rewardText:'同一房屋在一段生活中反复出现，可能记录真实的离开与返回。',
  nextClue:'订报单指向28 Aliwal Street。那里曾有两所学校，左右两翼之间共享一个空间。',
  accessNote:'外观与数字档案足以完成，不要求消费或进入当前餐饮、活动空间。'
 },
 {
  title:'两翼之间，什么把学校连起来？',spot:'28 Aliwal Street 的 Aliwal Arts Centre 外部公共区域',
  lookFor:'比较建筑左右两翼与中间部分，结合官方资料理解原学校布局。实际礼堂入口、题记可见性不作为必答条件。',
  evidenceTitle:'两所学校，共用礼堂',evidence:'这座建筑曾容纳崇正学校与崇本女校。两校分处两翼，共用礼堂。今天这里是Aliwal Arts Centre，过去的教育与今天的文化用途可在同一建筑上被读到。',
  propName:'两翼一厅拼片',propDescription:'对照手机建筑示意，把两份校刊的共同空间找出来。模型是帮助理解两翼关系的简化图，不是室内导览。',modelKind:'arch',
  task:choice('两份旧校刊都指向的共同空间是什么？',[
   ['dorm','每位学生各自的宿舍'],['hall','两校共用的礼堂'],['press','每翼独立的地下印刷厂']
  ],'hall','两份校刊在共同礼堂相遇。印刷地址把读者的故事，接到下一站的出版者。','资料明确说两校位于两翼，并共用礼堂。'),
  rewardTitle:'两翼一厅',rewardText:'两所学校的生活可在一个共同礼堂连接；同一建筑也可以延续出新的文化用途。',
  nextClue:'两份虚构校刊的印制栏都写着101 Jalan Sultan。到The Sultan外观处，找回这里曾经的印刷身份。'
 },
 {
  title:'眼前是酒店，旧地址却通向印刷所',spot:'101 Jalan Sultan 的 The Sultan 外部公共通行区域',
  lookFor:'确认101号与The Sultan所在建筑，观察临街立面。过去的印刷用途要从档案读取，不要求寻找仍在运作的旧机器。',
  evidenceTitle:'同一个地址，改变的用途',evidence:'101 Jalan Sultan曾为Al-Ahmadiah与HARMY印刷所，今天是The Sultan酒店。这处旧建筑是甘榜格南出版网络的遗存。',
  propName:'随身数字排字板',propDescription:'到站后在手机上展开小型排字板，依序放入下一张订阅地址“111 JALAN SULTAN”。排字板是本故事的数字道具，现场没有待操作的印刷机。',modelKind:'press',
  task:sequence('按门牌号 → 街名第一词 → 街名第二词，排好下一张订阅地址。',[
   ['sultan','SULTAN'],['number','111'],['jalan','JALAN']
  ],['number','jalan','sultan'],'地址印好了：111 JALAN SULTAN。报纸沿同一条街，把印刷者与下一站的读者连接起来。','先放门牌111，再放JALAN，最后是SULTAN。'),
  rewardTitle:'印出的下一站地址',rewardText:'手机排字板印出111 Jalan Sultan，指向下一站Madrasah Alsagoff。',rewardType:'prop',
  nextClue:'下一张订阅单写着111 Jalan Sultan，学校成立于1912年。沿公共步道寻找Madrasah Alsagoff。',
  accessNote:'酒店正常经营中；只在公共外部位置使用手机道具，不进入客房区或占用酒店设施。'
 },
 {
  title:'一本书怎样找到读者？',spot:'111 Jalan Sultan 学校外不阻挡通行的公共位置',
  lookFor:'确认学校名称与门牌。观察只限公共外观，不进入校园，也不以拍摄学生或询问师生为任务。',
  evidenceTitle:'资助、教育与阅读的联系',evidence:'Madrasah Alsagoff于1912年建立，与来自也门Hadhramaut的Alsagoff家族及其慈善支持有关。学校的历史让“谁能阅读、谁的声音被传播”成为街区报的一部分。',
  propName:'读者关系卡',propDescription:'用手机人物关系卡，将慈善支持与教育空间连接，再把上一站的出版线索带进来。',modelKind:'shophouse',
  task:choice('这份学校资料帮助报纸补上哪一层关系？',[
   ['support','慈善支持与教育，帮助形成读者和传播网络'],['closed','印刷与教育从来没有关系'],['all','同一街区的所有居民都来自同一个地方']
  ],'support','读者被补回报纸。下一份报道会提醒你：同属一个街区，并不等于有同一种迁徙经历。','资料提到慈善支持与办学；它没有说所有居民都来自同一地方。'),
  rewardTitle:'教育让声音被阅读',rewardText:'来自Hadhramaut的家族支持与街区教育，构成消息传播背后的生活网络。',
  nextClue:'前往471 Victoria Street的Malabar Mosque。新报道来自Kerala社群，并给出1963这个年份。'
 },
 {
  title:'1938年的学徒，遇见1963年的建筑',spot:'Victoria Street 与 Jalan Sultan 路口附近的公共步道',
  lookFor:'确认Malabar Mosque位置，观察当前蓝色外墙与金色圆顶。不要把今天的配色当成1938年的街景。',
  evidenceTitle:'街区在不同年代继续生长',evidence:'Malabar Mosque由来自Kerala的马拉巴穆斯林社群推动，于1963年开幕；蓝色外墙与金色圆顶是后来增饰。阿明来自1938年是本故事的虚构设定。',
  propName:'跨年代报道卡',propDescription:'把手机里的1938年人物设定，与真实建筑的1963年资料分开。建筑模型展示当前外形的概念，不假装是1938年复原。',modelKind:'tower',
  task:choice('1938年的虚构阿明不认识1963年开幕的清真寺，最合理的解释是什么？',[
   ['fraud','1963年的建筑资料一定造假'],['later','街区后来继续发展，出现了他尚未经历的新故事'],['same','两个年份必然指同一事件']
  ],'later','时间差成为新报道。街区的故事没有在阿明的年代结束。','1938早于1963；不同年代可以有不同建筑与经历，不构成资料矛盾。'),
  rewardTitle:'后来继续生长的街区',rewardText:'Kerala社群与1963年开幕的清真寺，为街区增添新的时间层。',
  nextClue:'最后一份报道送到85 Sultan Gate。寻找原Istana Kampong Gelam——今天马来文化馆所在的建筑。'
 },
 {
  title:'把七份报道，交给街区记忆',spot:'85 Sultan Gate 马来文化馆外当前开放、可合法停留的位置',
  lookFor:'确认原王宫与今天文化馆的名称，对照建筑外观。入展厅是另行安排的参观，不是终章必要条件。',
  evidenceTitle:'旧王宫与新的文化叙事',evidence:'Istana Kampong Gelam原为王宫建筑，后来成为马来文化馆。一路上的建筑与社群历史有资料来源；阿明的对白、订阅单及缺页小报则属于本故事创作。',
  propName:'随身街区报合页',propDescription:'在手机中整理七份报道，选择同时保留史实与创作边界的编辑方式。结算时可再打开收藏册，无需寻找实体编辑室。',modelKind:'letter',
  task:choice('哪种编辑方式，能把一路的发现正确保存？',[
   ['fiction-fact','把阿明的虚构对白直接当作历史证词'],['separate','保留事实卡出处，并给人物对白与故事道具标明创作'],['erase','为了故事连贯，删掉不符合1938年的建筑']
  ],'separate','共同头版完成了。街区的不同时间与不同人的生活，都得到了各自的位置。','真实建筑资料要保留出处；剧情对白与道具要标明创作，不应改动年代来迁就故事。'),
  rewardTitle:'我带回的一张街区报',rewardText:'七站发现汇成共同头版：真实资料保留出处，阿明的旅程保留创作标记。',
  nextClue:'本集完成。可以在休憩处整理收藏与标题。直落亚逸的教育故事可留作另一天的路线，不额外追加远距离必达点。',
  accessNote:'从合法可达的外部位置完成；当天展厅开放、票务与现场活动安排另行确认。'
 }
]);

const balestier=make('balestier','沿街找回七个镜头的署名',
 '片尾被剪去以后，街景只剩建筑，没有人的名字。走访真实的庙宇、店屋、咖啡店与施水亭，把每一站的角色和证据接成七格胶片，最后在旧片场外收束故事。',
 '七个真实地点的发现已经接成片尾：劳工与观众、建设者、商人、互助者、迁徙社群和电影幕后协作者都留下署名。你可以在安全休息处打开胶片收藏，不必进入片场或专门的放映室。',[
 {
  title:'庙与戏台，属于两个不同年代',spot:'249 Balestier Road 庙宇与戏台外公共可达位置',
  lookFor:'观察寺庙与独立戏台的空间关系。被遮挡时看数字示意，不需要登台、入庙或等到演出开始。',
  evidenceTitle:'1847的庙，1906的永久戏台',evidence:'梧槽大伯公庙于1847年由福建劳工创立；旁边的永久戏台由Tan Boo Liat于1906年兴建。两者共同承接街区活动，但不是同一年出现。',
  propName:'第一格舞台胶片',propDescription:'在手机里对照庙与戏台的概念轮廓，用时间尺为第一格镜头补上两个事件的间隔。',modelKind:'temple',
  task:align('1906年的永久戏台，比1847年建庙晚多少年？',59,'59年的间隔保留下来。你收下的第一格镜头，属于聚集在这里的劳工与观众。','用1906减去1847；这两张年代签描述不同的建筑事件。'),
  rewardTitle:'署名01 · 劳工与观众',rewardText:'庙宇与戏台在不同年代出现，共同承接街区的聚集与观看。',
  nextClue:'下一格字幕写着“1926，转角的名字不是全部署名”。打开地图去292–312 Balestier Road，寻找Sim Kwong Ho店屋。'
 },
 {
  title:'楼上的名字，就是开发者吗？',spot:'Balestier Road 与 Kim Keat Road 路口附近适合驻足的公共步道',
  lookFor:'确认Sim Kwong Ho店屋的转角与窗列。高处名称看不清时使用资料卡，不为拍全景走入车道。',
  evidenceTitle:'建筑名与开发者分开记录',evidence:'这组店屋由Sim Cheng Neo于1926年开发。Sim Kwong Ho是转角立面上的楼名。建筑名与开发者是不同角色，不能仅凭楼名替人署名。',
  propName:'立面署名签',propDescription:'转看手机店屋概念模型，为“开发者”选择正确的姓名签。名字的依据来自URA档案。',modelKind:'shophouse',
  task:choice('1926年开发这组店屋的人是谁？',[
   ['building','Sim Kwong Ho'],['developer','Sim Cheng Neo'],['film','P. Ramlee']
  ],'developer','Sim Cheng Neo回到了开发者的位置。楼名依然保留，但不再替代人的角色。','资料明确说Sim Cheng Neo开发；Sim Kwong Ho是楼名。'),
  rewardTitle:'署名02 · 建设者',rewardText:'Sim Cheng Neo于1926年开发店屋；楼名不是开发者姓名的替代。',
  nextClue:'下一格报纸慢慢变成咖啡包装，只留下“南洋”与328 Balestier Road。去Lam Yeo Coffee Powder Factory门外找回这段职业转变。'
 },
 {
  title:'从报纸到咖啡，哪个名字留下来了？',spot:'328 Balestier Road 南洋咖啡粉厂外公共步道',
  lookFor:'确认店名与地址，观察店面和现有经营形式。闻到咖啡、购买商品或获得店员回答都不是完成条件。',
  evidenceTitle:'一段职业变化的时间线',evidence:'创办人曾任《南洋商报》助理编辑，1959年沿街卖咖啡，1960年与妻子开店。Lam Yeo意为“南洋”，把名字与更早的职业经历联系起来。',
  propName:'报纸与包装胶片',propDescription:'在手机胶片里依次放入报纸工作、沿街卖咖啡与开店。三格内容来自档案，包装画面只是故事示意。',modelKind:'film',
  task:sequence('按先后顺序，排列这段职业经历。',[
   ['shop','1960 · 与妻子开店'],['editor','曾任报纸助理编辑'],['sell','1959 · 沿街卖咖啡']
  ],['editor','sell','shop'],'报纸、街头生意和店铺接成同一段生活。人的过去，没有因职业改变而消失。','先是报纸工作，1959年沿街卖咖啡，1960年开店。'),
  rewardTitle:'署名03 · 生意与生活',rewardText:'“南洋”把创办人的报业经历与后来的咖啡生意连接起来。',
  nextClue:'下一张分镜写着“1928，同一位开发者，另一位设计者”。前往412–418 Balestier Road，比较另一组转角店屋。',
  accessNote:'不要求消费、入店或堂饮；闭店时仍可通过地址、外观与数字档案完成。现行营业时段以经营方为准。'
 },
 {
  title:'两排店屋，共同署名是谁？',spot:'412–418 Balestier Road 店屋外合适的公共位置',
  lookFor:'比较转角、窗列与可见装饰，与第二站的手机记录对照。装饰被遮挡时不需要绕行到危险位置。',
  evidenceTitle:'同一开发者，不同设计者',evidence:'这排店屋于1928年由Sim Cheng Neo开发、Kwan Yow Luen设计。第二站Sim Kwong Ho店屋的开发者同样是Sim Cheng Neo。街道上的不同建筑由人物关系串联起来。',
  propName:'双立面对照胶片',propDescription:'把两站店屋的概念立面并置，为它们连接共同的开发者。数字对照不假装是精确建筑测绘。',modelKind:'shophouse',
  task:choice('把这一站连回第二站，两组店屋共同的开发者是谁？',[
   ['kwan','Kwan Yow Luen'],['sim','Sim Cheng Neo'],['name','Sim Kwong Ho']
  ],'sim','两组店屋之间的关系接好了。设计者各有署名，共同开发者也没有被楼名遮住。','Kwan Yow Luen是这排的设计者；两站资料都将Sim Cheng Neo列为开发者。'),
  rewardTitle:'署名04 · 街景的参与者',rewardText:'Sim Cheng Neo连接1926与1928两组店屋；建筑名、开发者、设计者应分别记录。',
  nextClue:'胶片边缘出现一张金额为空的虚构账单。去Boon Teck Road与Balestier Road路口的施水亭，寻找一笔本来就不收钱的照顾。'
 },
 {
  title:'这张账单，为什么没有金额？',spot:'Boon Teck Road 与 Balestier Road 路口的公共步道',
  lookFor:'确认施水亭所在路口，观察当前可见的设施。当天有无饮品、杯具或水桶都不影响任务，也不需要饮用。',
  evidenceTitle:'免费供水与社区互助',evidence:'文物局介绍，相关善堂长期免费向劳工与过路人提供水和苏茶。剧情中的空白账单因此可以被理解为互助的提示，而不是遗失价格。',
  propName:'没有金额的账单',propDescription:'在手机里把账单连接到“出售、赠予、借贷”中的一种关系。真实施水设施用于定位，不是要操作的机关。',modelKind:'fountain',
  task:choice('依据免费供水的资料，空白账单最适合对应哪种关系？',[
   ['sell','出售'],['give','赠予'],['lend','借贷']
  ],'give','金额空白有了解释。这一格片尾属于维持日常生活的互助。','资料说“免费提供”，应选择无需付款、无需归还的关系。'),
  rewardTitle:'署名05 · 路上的照顾',rewardText:'免费供水与苏茶是公共互助的线索；实物当天是否正在使用不影响读懂历史。',
  nextClue:'下一条迁移轨迹指向14 Tai Gin Road，并留下1991这个年份。到缅甸玉佛寺外，核对它到底描述哪一个事件。',
  accessNote:'设施状态与具体位置仍待踏勘。不要移动或占用供水设施；如暂不在位，以路口及数字档案完成，主线不要求入善堂。'
 },
 {
  title:'镜头里的1991，推翻了什么？',spot:'14 Tai Gin Road 缅甸玉佛寺外公共可达位置',
  lookFor:'确认现址寺院，观察外观。年份与迁移关系从资料卡读取，不需要进入主殿检查佛像。',
  evidenceTitle:'原寺、佛像与现址的三段时间',evidence:'原寺1878年设于Kinta Road；大理石佛像1921年已供奉于旧寺；现址寺院于1991年完成。不同年代属于社群、物件与现址建筑的不同经历。',
  propName:'迁移时间胶片',propDescription:'在手机里排列三段年代，判断这不是一卷全部拍摄于1967年前的普通历史影片。时间摄影机是本故事的虚构设定。',modelKind:'temple',
  task:sequence('按先后顺序，把三个事件各归其位。',[
   ['current','1991 · 现址寺院完成'],['old','1878 · 原寺设于Kinta Road'],['statue','1921 · 佛像已供奉于旧寺']
  ],['old','statue','current'],'年代排好了。1991的现址建筑说明，这段剧情胶片不能被当作全部拍于1967年前的史料。','先是1878年的原寺，再到1921年的佛像记录，最后是1991年的现址寺院。'),
  rewardTitle:'署名06 · 迁徙社群',rewardText:'地点会迁移，社群与物件的记忆会延续；原寺成立年不能直接代替现址建筑年代。',
  nextClue:'场记板显出“8 Jalan Ampas”。前往旧马来电影制片厂外的公共位置，完成这段街道片尾；院内参观不在任务中。',
  accessNote:'外观与数字档案足够。宗教活动优先，入内参观自愿并遵从现场安排。'
 },
 {
  title:'最后一格，给幕后的人署名',spot:'8 Jalan Ampas 旧片场外可合法驻足的公共街道；空间不足时到附近安全休息处',
  lookFor:'用街名、地址与地图确认旧片场外围，不要求看见院内设备或敲门入场。',
  evidenceTitle:'电影来自跨社群协作',evidence:'惹兰安拔片场1947年恢复制作，1967年关闭。制作活动汇聚华人制片、印度导演与马来演员，也依赖幕后的协作。Mariam的留言与失去署名的胶片属于创作。',
  propName:'七格街道片尾',propDescription:'在手机中收齐此前各站的角色与证据，为片尾选择能包容这些参与者的写法。可在结算页重看胶片，无需进入一间虚拟房间才能完成路线。',modelKind:'film',
  task:choice('哪种片尾写法，最能回应一路收集的证据？',[
   ['star','只保留明星，其余角色全部删去'],['all','让劳工、建设者、商人、互助者、迁徙社群和幕后协作者各有位置'],['fiction','把虚构留言当作真实历史证词']
  ],'all','片尾完成了。七个地点把原本被省略的人重新连接起来，街道本身成为你的故事。','一路证据来自不同的生活参与者；片尾应保留他们，并区分史实与创作。'),
  rewardTitle:'我为这条街写的片尾',rewardText:'七站角色与证据接成一段街道记忆。剧情胶片不是历史影片，真实资料仍保留出处。',
  nextClue:'路线完成。找一处安全休息点打开片尾与收藏册，没有必须进入的片场内部，也没有额外的第八站。',
  accessNote:'未确认公众入场安排，只规划外部公共停留。不要联系看守人、敲门或跨越门禁；外围不适合停留时，到附近合法休息位置完成线上收尾。'
 }
]);

export const FIELD_ROUTES={
 'telok-ayer':telok,
 'kampong-gelam':kampong,
 'balestier':balestier,
 'civic-f1':civic
};

export const FIELD_ROUTE_ORDER=['telok-ayer','kampong-gelam','balestier','civic-f1'];
export const getFieldRoute=routeId=>FIELD_ROUTES[routeId]||telok;
export const getFieldStop=(routeId,stopId)=>getFieldRoute(routeId).stops.find(s=>s.id===stopId)||getFieldRoute(routeId).stops[0];
