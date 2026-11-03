// Independent v5 rehearsal rooms. All room objects and mechanisms are newly
// invented story props. Historical statements/URLs below reuse story-data.json.
export const ROOMS = {
  balestier: {
    title: '把失去的片尾接回来',
    en: 'THE MISSING CREDIT ROOM',
    kicker: '马里士他 / 修复室 / 03 道机关',
    hook: '一卷胶片缺了最后一段，画面里的人也失去了署名。登记簿还在，散片却锁进了柜子。你需要接回的，究竟是一格影像，还是一个被漏掉的名字？',
    mission: '读登记簿 → 打开片柜 → 接合散片 → 启动放映，把一条署名提醒带回年代谜题。',
    ending: '银幕终于出现片尾：“画面接好了，名字也要放对位置。”你收起署名便笺，回到两排店屋的资料前。这一次，开发者、设计者与电影参与者，都应该拥有各自的位置。',
    objects: [
      {id:'ledger',name:'修复登记簿',kind:'clue',description:'纸页边上压着三张库签。',detail:'硬纸封面的角已经磨白，最后一行的墨色却格外清楚。保管人把“卷号、片盘、格位”各写在一张库签上，下面又添了一句：“散片等着归卷，名字等着归位。”',clue:'登记行：卷号 2；片盘 6；格位 8。片柜的三个拨轮也依次写着“卷号／片盘／格位”，照这个顺序读取。'},
      {id:'cabinet',name:'三签片柜',kind:'mechanism',description:'三个拨轮分别对应登记簿上的库签。',detail:'柜门上有几道被反复擦亮的指痕。玻璃后压着几截卷曲的胶片，透明套纸正好盖住它们的断口。先按库签找回散片，才知道最后一格为什么没有归档。',afterText:'片柜里留下三个空纸槽。散片与透明定位套纸已经收进你的背包，等着在接片台上重新相遇。'},
      {id:'reel',name:'空胶片盘',kind:'prop',description:'轮缘留出了一小段没有胶片的空位。',detail:'卷盘比想象中轻，轴心还留着一圈浅浅的磨痕。纸签只写了半句话：“片尾不能空着。”你把它放回桌面，决定先找齐散片，再让卷盘转起来。',clue:'卷盘旁的纸条写着：“片孔完整、接边平直、张力合适，三项都对上再送入片门。”'},
      {id:'splicer',name:'三标接片台',kind:'mechanism',description:'三个标尺等着与透明套纸上的线重合。',detail:'台面上有三条细线，分别通向片孔、接边和张力标尺。透明套纸叠上去时，断开的画面终于靠在一起；还差一点，边缘的笔迹就能接成完整一句。',afterText:'散片已接成一卷。透明套纸留在台面，复原胶片卷已经装进盒子，可以带去放映。'},
      {id:'projector',name:'黄铜片门放映机',kind:'mechanism',description:'机身旁固定着四步试映纸条。',detail:'片门边缘泛着温暗的铜色，操作杆停在等待的位置。机旁的纸条没有催你快一点：先穿片，再固定，慢慢试转，最后才让光照过去。',afterText:'复原卷在片门里稳稳停住。银幕上的最后一行已经能够阅读，署名便笺也收进了你的背包。'},
      {id:'lightbox',name:'两页年代灯箱',kind:'prop',description:'1926 与 1928 的两张事实卡被并排照亮。',detail:'灯箱上的 URA 资料卡记载：Sim Cheng Neo 于1926年开发 Sim Kwong Ho 店屋；1928年的另一排店屋由她开发、Kwan Yow Luen 设计。两张卡之间，留着一条还没有贴上姓名的窄纸带。',clue:'开发与设计是不同的角色。接回片尾后，还要回到原有年代谜题核对署名。'},
      {id:'gramophone',name:'静音留声机',kind:'prop',description:'唱针旁有一张没有署名的纸条。',detail:'唱针抬着，房间里只有你翻动纸页的声音。喇叭口里藏着一张折起的便条：“听见一段故事，也要找出谁让它被讲述。”落款的位置空着。'},
      {id:'screen',name:'片尾银幕',kind:'prop',description:'一小块有织纹的幕布，等着承接修复结果。',detail:'幕布下角被缝补过一次，针脚一直延伸到暗处。你靠近时，看见边框上写着“请等片尾”。那行字像是在请求：不要在名字出现之前离开。'}
    ],
    mechanisms: [
      {id:'cabinet',objectId:'cabinet',type:'dial',title:'按库签打开片柜',instruction:'读取登记簿最后一行，按卷号、片盘、格位设置三个拨轮。',requires:[],answer:[2,6,8],labels:['卷号','片盘','格位'],min:0,max:9,step:1,rewardItems:[{id:'balestier-loose-film',name:'散片与定位套纸',description:'三段胶片夹在透明套纸中，三条定位线分别落在片孔40、接边65、张力55。把它铺到接片台，断开的画面就有了对齐的依据。'}],hint:'先看修复登记簿。三个数字按“卷号／片盘／格位”读，不需要把年代拆成密码。',successText:'锁舌退开，你取出了散片和定位套纸。现在可以去接片台。'},
      {id:'splicer',objectId:'splicer',type:'align',title:'让三个修复标记重合',instruction:'携带散片，参照定位套纸分别调整片孔、接边与张力。三个标尺都要落在目标附近。',requires:['cabinet'],toolId:'balestier-loose-film',answer:[40,65,55],labels:['片孔对位','接边位置','胶片张力'],min:0,max:100,step:1,tolerance:[3,4,4],consumes:['balestier-loose-film'],rewardItems:[{id:'balestier-restored-reel',name:'复原胶片卷',description:'散片已接合。卷盒上的试映顺序是：穿片 → 扣合片门 → 慢速试转 → 点亮检视灯。'}],hint:'随身的定位套纸已经给出三条线：40、65、55。对准后，散片会被安装成一卷。',successText:'片孔、接边与张力都对齐了。你把散片接成了复原卷。'},
      {id:'projector',objectId:'projector',type:'sequence',title:'让片尾通过片门',instruction:'带着复原卷，按卷盒上的工序依次选择四个动作。可以撤回一步或清空重排。',requires:['splicer'],toolId:'balestier-restored-reel',answer:['thread','gate','turn','lamp'],options:[{id:'lamp',label:'点亮检视灯',detail:'最后照亮已经平稳通过片门的胶片。'},{id:'thread',label:'穿入胶片',detail:'先把复原卷的片孔送上定位齿轮。'},{id:'turn',label:'慢速试转',detail:'片门固定后，确认胶片能够平顺通过。'},{id:'gate',label:'扣合片门',detail:'胶片就位后将它固定在正确位置。'}],consumes:['balestier-restored-reel'],rewardItems:[{id:'balestier-credit-note',name:'片尾署名便笺',description:'便笺上写着：“画面接好了，名字也要放对位置。”它与1926／1928两张事实卡并排时，署名的空位显得格外清楚。'}],hint:'工序已经印在复原卷的盒签上：穿片、扣门、试转、点灯。',successText:'复原卷留在片门中，银幕终于显出片尾。你收下了署名便笺。'}
    ],
    fictionNote:'修复室、登记号、胶片、影片内容、署名便笺与全部机关均为新创剧情道具，不是历史影院、真实馆藏或旧店室内的复原。1926／1928及相关人物角色只沿用既有地点事实卡。房间进度独立于原代表谜题与真实到访记录。',
    sourceUrls:['https://www.ura.gov.sg/conservation/find-a-building/conservation-portal/blstrd/','https://www.ura.gov.sg/conservation/find-a-building/conservation-portal/blstrd-00012/','https://www.ura.gov.sg/conservation/find-a-building/conservation-portal/blstrd-00021/']
  },
  'telok-ayer': {
    title:'把家书送回一张完整的地址',
    en:'THE LETTER AND THE TIDE',
    kicker:'直落亚逸 / 家书室 / 03 道机关',
    hook:'一封匿名家书失去了收信地址，只剩寄存号与三处方向记号。你要打开信箱，装上方向片，再把新拼出的地址封进信里。',
    mission:'读家书 → 开寄存箱 → 对齐罗盘 → 按工序封信，让来信重新拥有可以讲述的去向。',
    ending:'地址纸终于和家书收在一起。远行的人有了去向，守信的人有了交代。沿着这封信留下的问题走回街上，你会在寺庙、会馆与社群互助的资料里，看见更宽的一张网络。',
    objects: [
      {id:'letter',name:'匿名家书',kind:'clue',description:'折角里露出三段寄存记录。',detail:'信纸被展开又折回，地址那一栏已经洇成浅色。正文最后只剩一句清楚的话：“若一时找不到我，请先把信收好。”折角的三段寄存编号，像是寄件人留下的第二条路。',clue:'信角写着：“仓号 3，抽屉 1，信袋 7。”寄存箱的拨轮按仓号、抽屉、信袋排列。'},
      {id:'chest',name:'木质寄存箱',kind:'mechanism',description:'箱盖的三个库签与信角完全对应。',detail:'木纹里有淡淡的绳索压痕，铜扣被握得发亮。箱底的方向片属于这封信：看过家书的人，把另一半地址留在这里，等能读懂寄存号的人来取。',afterText:'箱盖打开，衬布上只剩方向片的浅印。你把它握在手里，准备找回信中的去向。'},
      {id:'compass',name:'三环地址罗盘',kind:'mechanism',description:'灯标、屋檐、码头各占一环。',detail:'三层铜环没有地名，只有灯标、屋檐与码头的小记号。方向片滑入侧面的细槽后，环上的半句地址便能逐段相接；每个记号都得朝向它自己的方向。',afterText:'方向片留在罗盘中，三个铜环合出一张地址纸。信里的去向，终于不再只是模糊的一行墨迹。'},
      {id:'seal',name:'封缄印台',kind:'mechanism',description:'印泥旁的凹槽正好容纳地址纸。',detail:'封绳整齐卷在印台边，印泥盖上压着一张工序签。守信的人把最后一件事留给你：将地址纸折进家书，系紧，再留下可以辨认的封缄。',afterText:'地址纸已经封进家书。封绳越过原来的折痕，一枚清楚的印记把这次交接留了下来。'},
      {id:'tidechart',name:'岸线示意图',kind:'prop',description:'三种图案被一条手绘岸线连接。',detail:'铅笔画出的岸线弯过灯标、屋檐与码头，三个记号都被轻轻圈过。它像是一张写给熟人的记忆图：有人记得灯，有人记得屋檐，地址便靠这些共同记忆重新拼起。'},
      {id:'model',name:'屋檐微缩',kind:'prop',description:'一段小屋檐承接了信中关于平安抵达的心愿。',detail:'檐下夹着天福宫的 NHB 资料卡：福建移民在此向妈祖祈求航海平安，现存大型庙宇建于1839—1842年。那封信里的“平安抵达”，由此有了街区历史的回声。'},
      {id:'lantern',name:'方向风灯',kind:'prop',description:'灯座下藏着罗盘刻度图例。',detail:'灯罩投下一圈暖光，恰好照亮灯座上的四个字：北、东、南、西。下方对应刻着0、1、2、3，三层铜环都沿用这张图例。',clue:'方向片要求：灯标向东、屋檐向北、码头向西。依照灯座图例，分别转动三个圆环。'},
      {id:'ledger',name:'互助摘记簿',kind:'prop',description:'一页摘记把家书放回社群生活的背景。',detail:'薄簿中夹着福德祠的 NHB 资料卡：1824年客家与广府移民设立小祠，并承担社群互助功能。旁边空出的纸页，等着你记录一封信如何依靠他人的照护继续前行。'}
    ],
    mechanisms: [
      {id:'chest',objectId:'chest',type:'dial',title:'按寄存记录开启木箱',instruction:'把家书里的仓号、抽屉、信袋三个编号依次拨到箱锁上。',requires:[],answer:[3,1,7],labels:['仓号','抽屉','信袋'],min:0,max:9,step:1,rewardItems:[{id:'telok-ayer-direction-insert',name:'黄铜方向片',description:'铜片的细小划痕之间刻着：灯标外环向东，屋檐中环向北，码头内环向西。罗盘图例为0北、1东、2南、3西。'}],hint:'家书折角提供的顺序是仓号3、抽屉1、信袋7。',successText:'箱盖松开，你取出了一枚带方位说明的黄铜方向片。'},
      {id:'compass',objectId:'compass',type:'align',title:'让地址的三处方向各就其位',instruction:'装入方向片，分别设置三个离散方位。图例：0北、1东、2南、3西；每一环都要准确对上。',requires:['chest'],toolId:'telok-ayer-direction-insert',answer:[1,0,3],labels:['外环：灯标','中环：屋檐','内环：码头'],min:0,max:3,step:1,tolerance:[0,0,0],consumes:['telok-ayer-direction-insert'],rewardItems:[{id:'telok-ayer-address-slip',name:'拼出的地址纸',description:'方向片留在罗盘里，拼出的地址纸被交给你。纸背记录封信顺序：折好家书 → 系好封绳 → 蘸取印泥 → 落下印记。'}],hint:'依次读方向片：东、北、西。用同一图例换成三环的刻度。',successText:'灯标、屋檐与码头分别归位。罗盘交出一张可以封入家书的地址纸。'},
      {id:'seal',objectId:'seal',type:'sequence',title:'把地址与家书一起封好',instruction:'带着地址纸，按纸背的封缄顺序选择四个动作。可以撤回或清空，再从第一步开始。',requires:['compass'],toolId:'telok-ayer-address-slip',answer:['fold','thread','ink','stamp'],options:[{id:'ink',label:'蘸取印泥',detail:'封绳就位以后，再准备印记。'},{id:'stamp',label:'落下印记',detail:'最后把封缄工序确认在纸面上。'},{id:'fold',label:'折好家书',detail:'先把地址纸与家书折在一起。'},{id:'thread',label:'系好封绳',detail:'纸页折好后，用封绳固定。'},{id:'reopen',label:'重新拆封',detail:'这会打断已经完成的封缄工序。'}],consumes:['telok-ayer-address-slip'],rewardItems:[{id:'telok-ayer-sealed-letter',name:'封好的剧情家书',description:'地址纸已经封在里面，绳结压住了几经展开的折痕。下一段故事，要从这封信回到街上的会馆、寺庙与互助网络。'}],hint:'顺序写在地址纸背面：折信、系绳、蘸印、落印。拆封不属于这次四步工序。',successText:'最后一枚印记落下，地址纸留在家书里。你收下了封好的剧情家书。'}
    ],
    fictionNote:'匿名来信、寄存编号、方向片、罗盘与封缄工序均为新创剧情。没有虚构真实移民的原信、具体旧店或历史原物。天福宫与福德祠的历史背景只复用既有地点事实卡和出处；房间完成不产生真实签到。',
    sourceUrls:['https://www.roots.gov.sg/places/places-landing/Places/national-monuments/thian-hock-keng','https://www.roots.gov.sg/places/places-landing/places/historic-sites/fuk-tak-chi']
  },
  'kampong-gelam': {
    title: '让最后一版保留每一个署名',
    en: 'THE UNPRINTED EDITION',
    kicker: '甘榜格南 / 校样室 / 03 道机关',
    hook: '街区报的标题已经排好，最后一栏的署名却迟迟没有落定。排字样条锁在抽屉里，纸托还空着。在这一版付印之前，你要弄清楚：谁的声音应该被留下？',
    mission: '读校样 → 按编辑工序开抽屉 → 找齐字格 → 校准压印，把带署名的校样交回故事。',
    ending: '一页新的街区校样出现在纸托上。你保住了标题、正文与署名之间的关系。带着它回到原路线，继续核对出版网络的真实地点与资料来源。',
    objects: [
      {id:'proof',name:'红笔校样',kind:'clue',description:'三道红线把阅读顺序连在一起。',detail:'红笔压得很重，纸背也透出浅浅的凹痕。编辑在页边留下交接话：“先看这一版要讲什么，再看它怎样讲，最后别漏掉是谁在讲。”三道红线顺着纸页连向抽屉。',clue:'开抽屉的编辑签核顺序：标题 → 正文 → 署名。先完成三项核对，还没有到“发布”那一步。'},
      {id:'typecase',name:'三签字格柜',kind:'mechanism',description:'字格、行宽与校样份数占据三个拨轮。',detail:'格柜边沿磨得光滑，每枚字块却仍有自己的空位。把样条平放在柜前，照作业签逐项找到字格、行宽与份数，散落的字才会成为可以送去压印的一版。',afterText:'样条留在格柜的交接槽里，锁版已经齐整。你托起它时，背面的试印记录也一起露了出来。'},
      {id:'press',name:'小型压印台',kind:'mechanism',description:'墨量、压程与送纸长度都还停在起始刻度。',detail:'纸托下压着几张浅淡的试印，最后一行总差一点清楚。锁版背面留着上次调整后的记录：按它重新校准三项标尺，让标题和署名一样清晰地落在纸上。',afterText:'锁版留在压印台上，一页完整校样从纸托里取出。你沿着最后一行看过去，署名终于清楚了。'},
      {id:'inkroller',name:'试墨辊',kind:'prop',description:'辊面旁的测试纸说明墨量标记的作用。',detail:'墨辊留下的三道痕迹，一道太淡，一道漫过边缘，最后一道才清楚。纸边的箭头指向锁版背面：那里保存着这次试印的墨量记录。'},
      {id:'drawer',name:'编辑抽屉',kind:'mechanism',description:'抽屉面板装着四枚工序签。',detail:'抽屉把手上系着细绳，绳头连到红笔校样。有人将排字样条妥善收在里面，并留下规矩：三项核对齐全，才能继续付印。',afterText:'工序签依次归位，抽屉松开。样条已交到你手里，纸槽中留下了一条窄窄的空白。'},
      {id:'noticeboard',name:'出版网络资料板',kind:'prop',description:'一张事实卡把工坊气氛连到真实街区。',detail:'资料板上的 URA 与 NHB 资料卡记载：101号曾为 Al-Ahmadiah 与 HARMY 印刷所，现为 The Sultan 酒店。几条细线从卡片伸向街区图，让你看到文字背后还有建筑、工人和传播网络。',clue:'房间里的作业编号与真实地址分开记录。完成房间后，再回原有地址谜题核对地点。'},
      {id:'radio',name:'安静的收音机',kind:'prop',description:'机旁的纸条比扬声器更值得留意。',detail:'扬声器安静着，旋钮边压着一张折过两次的便条：“传播得快，也要先让每一条来源说清楚。”稿纸从这里拿起，下一站才是排字柜。'},
      {id:'kettle',name:'茶壶与稿签',kind:'prop',description:'杯垫压着最后一项编辑提醒。',detail:'茶壶旁留下一个淡淡的杯圈，稿签被垫在杯底免得吹走。翻过来，背面只有一行字：“先核来源，再付印。”等校样的人，显然还没打算离开。'}
    ],
    mechanisms: [
      {id:'drawer',objectId:'drawer',type:'sequence',title:'完成三项编辑签核',instruction:'照红笔校样的阅读顺序，依次选出三道核对工序。这里还不执行发布。',requires:[],answer:['headline','body','signature'],options:[{id:'signature',label:'核对署名',detail:'最后确认谁在讲述、谁应被记录。'},{id:'publish',label:'立即发布',detail:'稿件完成核对前，不进入这一步。'},{id:'headline',label:'核对标题',detail:'先确认这一版要讲什么。'},{id:'body',label:'核对正文',detail:'标题确认后，再检查具体内容。'}],rewardItems:[{id:'kampong-gelam-type-strip',name:'排字样条',description:'样条上夹着三张作业签：字格2、行宽4、校样份数1。纸角的箭头指向字格柜，提醒你按柜上的标签顺序使用。'}],hint:'红线从标题连到正文，最后停在署名处。发布是后续动作。',successText:'三项签核相互衔接，抽屉交出了一条带作业编号的排字样条。'},
      {id:'typecase',objectId:'typecase',type:'dial',title:'按作业签找齐字格',instruction:'携带排字样条，依次设置字格、行宽与校样份数三个编号。',requires:['drawer'],toolId:'kampong-gelam-type-strip',answer:[2,4,1],labels:['字格','行宽','校样份数'],min:0,max:9,step:1,consumes:['kampong-gelam-type-strip'],rewardItems:[{id:'kampong-gelam-locked-forme',name:'带试印记录的锁版',description:'样条已经装进字格柜。锁版背面保存着试印记录：墨量45、压程60、送纸80。带去压印台，分别找回这三处刻度。'}],hint:'样条上的三个作业签依次是2、4、1，不需要借用真实街道门牌。',successText:'三个作业签找到了对应字格。你获得一块附有试印记录的锁版。'},
      {id:'press',objectId:'press',type:'align',title:'把这一版压印清楚',instruction:'带着锁版，对照版背记录分别设置墨量、压程与送纸。三项刻度都要在目标附近。',requires:['typecase'],toolId:'kampong-gelam-locked-forme',answer:[45,60,80],labels:['墨量','压程','送纸'],min:0,max:100,step:1,tolerance:[4,4,3],consumes:['kampong-gelam-locked-forme'],rewardItems:[{id:'kampong-gelam-signed-proof',name:'带署名的剧情校样',description:'标题、正文与署名终于在同一张纸上清楚相连。校样归档之后，还要回到街区资料，找出文字曾经从哪些门牌里走出来。'}],hint:'三个目标在锁版背面：45、60、80。逐项调准即可，不必同时拖动。',successText:'锁版留在压印台里，一页清楚的剧情校样落进纸托。署名没有再次被漏掉。'}
    ],
    fictionNote:'无名校样室、报纸、编辑纸条、作业签、收音机与机关都是新创内容，不对应具体旧店的原物或真实编辑手稿。关于101号与出版网络的事实，仅复用既有路线资料与出处。房间不会改变原代表谜题的成绩或库存。',
    sourceUrls:['https://www.ura.gov.sg/conservation/find-a-building/conservation-portal/kpgl-00075/','https://www.roots.gov.sg/stories-landing/stories/dichetak-oleh-a-walk-through-kampong-gelam/story']
  },
  'civic-f1': {
    title: '把两种城市时间分清楚',
    en: 'THE CITY TIMEKEEPER',
    kicker: '市政区 / 校时室 / 03 道机关',
    hook: '校时日志的两张年代签叠在一起，座钟也停住了。一次捐赠与后来的一座纪念物之间，究竟隔着多少年？先把它们分清，再让齿轮追上这段被遗漏的时间。',
    mission: '读日志 → 算出间隔并开柜 → 装配齿轮 → 按工序校时，把两件事各自放回正确的位置。',
    ending: '模型中的座钟重新走动。你写下的不是一段施工工期，而是两件事之间的25年。带着这张校时记录回到喷泉事实卡，继续读捐赠与纪念各自的意义。',
    objects: [
      {id:'journal',name:'两页校时日志',kind:'clue',description:'1857 与 1882 分别写在两张不同的资料签上。',detail:'日志中夹着陈金声喷泉的两张历史资料卡：陈金声于1857年捐款改善公共供水，纪念他的喷泉于1882年设立。两张卡被叠放太久，页边的铅笔提醒只剩“请分开记录”五个字。',clue:'用较晚年份减去较早年份，得到两件事的间隔。零件柜采用三位拨轮，不足百位时在前面补0；这个间隔不是施工工期。'},
      {id:'instrument',name:'基准检视仪',kind:'prop',description:'一条横线让你注意“参照”与“事件”不是同一回事。',detail:'检视镜下摆着加文纳桥的 NHB 资料卡：北桥台保存测量基准，用宽箭头与横线标示高度参照。镜边一条细线恰好与图上的横线平齐——有了参照，偏差才看得见。'},
      {id:'gears',name:'三轮校时架',kind:'mechanism',description:'动力轮、传动轮、定位轮各有一条安装线。',detail:'铜齿轮的边缘一明一暗，三条安装线却依然清楚。把柜里的组件带过来，逐只定位；一只轮错开，后面的指针就无法把时间接续下去。',afterText:'齿轮组件稳稳留在校时架上，钥匙从旁边的小托盘里取出。现在可以去完成座钟的最后工序。'},
      {id:'clock',name:'档案座钟',kind:'mechanism',description:'钟旁的纸签列出四步校时工序。',detail:'指针停着，底座却为两张年代卡各留了一个位置。工序签的第一步不是上弦，而是先放好记录；这只钟要重新走动，也要带着正确的事情一起走。',afterText:'校时钥匙归回座钟支架，你收下分别记录捐赠与纪念的纸页。两张卡终于各有自己的位置。'},
      {id:'map',name:'市政区参照图',kind:'prop',description:'桥、钟楼与喷泉被放在同一张概念图上。',detail:'纸图沿折痕泛白，桥、钟楼与喷泉分别被细线圈起。它们各自见证不同的城市时间。日志里的两件事理清之后，你便可以沿图上的名字，继续翻阅对应地点的资料。'},
      {id:'cabinet',name:'年代零件柜',kind:'mechanism',description:'百、十、个位的拨轮等着一个时间间隔。',detail:'柜内衬着深色绒布，齿轮组件已经排好。锁扣旁的便条把问题写得很明白：“等两件事各有位置，再告诉我它们相隔几年。”',afterText:'零件柜已开。你托起带安装标记的组件，绒布上留下了三圈相互靠近的齿痕。'},
      {id:'lantern',name:'校时检视灯',kind:'prop',description:'灯下的提示把两张资料签分开照亮。',detail:'灯臂被推向一旁，光线刚好分落在两张资料签上。压在灯座下的纸条写着：“让先后各有位置，再让齿轮追上时间。”'},
      {id:'fountain',name:'纪念喷泉微缩',kind:'prop',description:'模型底座留出两张资料签的位置。',detail:'底座的两个纸槽相隔一指宽，一个放捐赠，一个放纪念。旁边仍是陈金声喷泉的历史资料卡。你这才发现，纪念物可以让一个名字被看见，较早发生的贡献也需要自己的记录。'}
    ],
    mechanisms: [
      {id:'cabinet',objectId:'cabinet',type:'dial',title:'用时间间隔打开零件柜',instruction:'比较日志里的1857与1882，输入三位的年份间隔；不足百位补0。',requires:[],answer:[0,2,5],labels:['百位','十位','个位'],min:0,max:9,step:1,rewardItems:[{id:'civic-f1-gear-set',name:'带标记的齿轮组件',description:'组件刻着三条安装线：动力轮25、传动轮50、定位轮75。铜面上留下的浅痕对应校时架，三只齿轮各有要回去的位置。'}],hint:'1882减1857等于25。三位拨轮把这个数写作025；比较的是两件事，不是工期。',successText:'两张资料签的关系被分清，柜里交出了一组带装配标记的齿轮。'},
      {id:'gears',objectId:'gears',type:'align',title:'让三只齿轮各守一条安装线',instruction:'携带齿轮组件，对照它的标记设置动力、传动与定位三轮。',requires:['cabinet'],toolId:'civic-f1-gear-set',answer:[25,50,75],labels:['动力轮','传动轮','定位轮'],min:0,max:100,step:1,tolerance:[2,2,2],consumes:['civic-f1-gear-set'],rewardItems:[{id:'civic-f1-winding-key',name:'校时钥匙与工序签',description:'齿轮组件留在校时架。钥匙附签写着：放好年代卡 → 插入钥匙 → 轻转上弦 → 写下零点记录。'}],hint:'组件给出的三条安装线是25、50、75。每只轮只负责自己的刻度。',successText:'三只齿轮都就位了。你取得校时钥匙，以及完成座钟的四步工序。'},
      {id:'clock',objectId:'clock',type:'sequence',title:'让座钟带着正确的记录重新走动',instruction:'带着钥匙，按照工序签依次选择四个动作。年代资料必须保留在校时记录里。',requires:['gears'],toolId:'civic-f1-winding-key',answer:['place-dates','insert-key','wind','record'],options:[{id:'wind',label:'轻转上弦',detail:'钥匙插入以后，才执行这个动作。'},{id:'record',label:'写下零点记录',detail:'最后把两张年代卡的关系留在新纸页上。'},{id:'erase',label:'抹掉年代卡',detail:'这会丢失本次校时需要保留的证据。'},{id:'place-dates',label:'放好年代卡',detail:'先把捐赠与纪念分别放回记录位置。'},{id:'insert-key',label:'插入校时钥匙',detail:'资料就位后，让钥匙进入模型支架。'}],consumes:['civic-f1-winding-key'],rewardItems:[{id:'civic-f1-time-record',name:'两种城市时间记录',description:'纸页分别记下捐赠与纪念，相隔25年。夹回日志之前，你在两张年代签之间留出空隙，让每件事都拥有自己的时间。'}],hint:'工序签的四步是放卡、插匙、上弦、记录；抹掉年代卡不在其中。',successText:'钥匙归回模型支架，座钟重新走动。你得到一张把两种城市时间分开的新记录。'}
    ],
    fictionNote:'校时室、日志、零件柜、检视仪、齿轮、钥匙、座钟及所有动作均为新创剧情，不是城市古迹的内部修复模拟。1857、1882与测量基准的历史背景仅复用既有路线事实和出处。本房不含赛车，也不会完成原路线的真实到访。',
    sourceUrls:['https://artsandculture.google.com/asset/tan-kim-seng-fountain-at-its-current-location-on-the-esplanade/MgEpC3eZG3r0CQ','https://www.roots.gov.sg/-/media/Roots/Files/tiong-bahru-heritage-trail/nhb_tiong-bahru-heritage-trail_2018.pdf?hash=CEE127E71F15924212FACAB38A03F59D2492C132&la=en','https://www.roots.gov.sg/stories-landing/stories/all-around-us/Story']
  }
};
