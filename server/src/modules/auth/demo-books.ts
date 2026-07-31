// ============================================
// 示例书目（162 本）
// ★ 社区馆藏种子：全社区共享一套示例库（无 userId）
// ★ 分类覆盖（14 个）：文学 / 计算机 / 历史 / 哲学 / 科学 / 艺术 / 社科
//                    + 经济 / 心理 / 医学 / 传记 / 教育 / 旅行 / 漫画
// ★ 状态混合：15 本 BORROWED + 147 本 AVAILABLE，让任何用户登录都能立刻看到全部功能
// ============================================
export interface DemoBook {
  title: string;
  author: string;
  category: string;
  summary: string;
  status?: 'AVAILABLE' | 'BORROWED';
  borrowerName?: string;
  borrowerPhone?: string;
  daysAgoBorrowed?: number;
  dueInDays?: number;
}

const CATS = {
  文学: '文学',
  计算机: '计算机',
  历史: '历史',
  哲学: '哲学',
  科学: '科学',
  艺术: '艺术',
  社科: '社科',
  经济: '经济',
  心理: '心理',
  医学: '医学',
  传记: '传记',
  教育: '教育',
  旅行: '旅行',
  漫画: '漫画',
} as const;

// 借阅人样本（避免每次都看到同一批名字）
const BORROWERS = [
  { name: '李雷',   phone: '13800138001' },
  { name: '王芳',   phone: '13900139002' },
  { name: '张伟',   phone: '13700137003' },
  { name: '陈静',   phone: '13600136004' },
  { name: '刘洋',   phone: '13500135005' },
  { name: '赵敏',   phone: '13400134006' },
  { name: '周强',   phone: '13300133007' },
  { name: '吴丽',   phone: '13200132008' },
  { name: '黄磊',   phone: '13100131009' },
  { name: '徐婷',   phone: '13000130010' },
  { name: '孙浩',   phone: '15900159011' },
  { name: '马晓',   phone: '15800158012' },
  { name: '朱琳',   phone: '15700157013' },
  { name: '胡军',   phone: '15600156014' },
];

export const DEMO_BOOKS: DemoBook[] = [
  // ============================================
  // 文学（14 本）
  // ============================================
  { title: '百年孤独', author: '加西亚·马尔克斯', category: CATS.文学, summary: '布恩迪亚家族七代人的兴衰，马孔多小镇的史诗。' },
  { title: '红楼梦', author: '曹雪芹', category: CATS.文学, summary: '贾府荣枯，宝黛爱情，中国古典小说的巅峰。' },
  { title: '活着', author: '余华', category: CATS.文学, summary: '福贵的一生，中国普通人在时代洪流中的悲欢。' },
  { title: '挪威的森林', author: '村上春树', category: CATS.文学, summary: '青春、孤独与告别，村上的代表作之一。' },
  { title: '月亮与六便士', author: '毛姆', category: CATS.文学, summary: '一个证券经纪人抛弃一切去画画的故事。' },
  { title: '三体', author: '刘慈欣', category: CATS.文学, summary: '地球文明与三体文明的宇宙级博弈。' },
  { title: '围城', author: '钱钟书', category: CATS.文学, summary: '婚姻如围城，外面的人想进去，里面的人想出来。' },
  { title: '平凡的世界', author: '路遥', category: CATS.文学, summary: '孙少平孙少安兄弟的奋斗，平凡人的不平凡。' },
  { title: '骆驼祥子', author: '老舍', category: CATS.文学, summary: '人力车夫祥子的悲剧，旧社会底层人物的写照。', status: 'BORROWED', borrowerName: '李雷', borrowerPhone: '13800138001', daysAgoBorrowed: 5, dueInDays: 25 },
  { title: '边城', author: '沈从文', category: CATS.文学, summary: '湘西边城翠翠的故事，田园牧歌的绝唱。' },
  { title: '霍乱时期的爱情', author: '马尔克斯', category: CATS.文学, summary: '跨越半个多世纪的爱情史诗。' },
  { title: '了不起的盖茨比', author: '菲茨杰拉德', category: CATS.文学, summary: '美国梦的幻灭，一曲爵士时代的挽歌。' },
  { title: '追风筝的人', author: '卡勒德·胡赛尼', category: CATS.文学, summary: '阿富汗少年阿米尔的成长与救赎。' },
  { title: '白鹿原', author: '陈忠实', category: CATS.文学, summary: '关中平原白、鹿两家三代人的恩怨情仇。' },

  // ============================================
  // 计算机（14 本）
  // ============================================
  { title: '深入理解计算机系统', author: 'Randal E. Bryant', category: CATS.计算机, summary: '从程序员视角讲解计算机系统的经典教材。' },
  { title: '算法导论', author: 'Thomas H. Cormen', category: CATS.计算机, summary: '算法的圣经，MIT 教材，覆盖广泛且严谨。' },
  { title: '设计模式', author: 'Erich Gamma', category: CATS.计算机, summary: '23 种经典面向对象设计模式，可复用面向对象软件的基础。' },
  { title: '重构', author: 'Martin Fowler', category: CATS.计算机, summary: '改善既有代码的结构，而不改变其外部行为。' },
  { title: '代码整洁之道', author: 'Robert C. Martin', category: CATS.计算机, summary: '编写可读、可维护代码的实践准则。' },
  { title: '你不知道的 JavaScript', author: 'Kyle Simpson', category: CATS.计算机, summary: '深入 JS 核心机制的三卷本系列。' },
  { title: 'JavaScript 高级程序设计', author: 'Nicholas C. Zakas', category: CATS.计算机, summary: '"红宝书"，前端工程师常备参考。', status: 'BORROWED', borrowerName: '王芳', borrowerPhone: '13900139002', daysAgoBorrowed: 3, dueInDays: 27 },
  { title: 'Vue.js 设计与实现', author: '霍春阳', category: CATS.计算机, summary: '从源码角度剖析 Vue 3 的设计与实现。' },
  { title: '鸟哥的 Linux 私房菜', author: '鸟哥', category: CATS.计算机, summary: '中文 Linux 入门经典，覆盖基础到服务器。' },
  { title: '高性能 MySQL', author: 'Baron Schwartz', category: CATS.计算机, summary: 'MySQL 性能优化与架构实践。' },
  { title: 'Clean Architecture', author: 'Robert C. Martin', category: CATS.计算机, summary: '软件架构的整洁之道，依赖与边界的设计。' },
  { title: '计算机网络：自顶向下方法', author: 'James F. Kurose', category: CATS.计算机, summary: '从应用层到链路层的网络协议经典教材。' },
  { title: 'Effective Java', author: 'Joshua Bloch', category: CATS.计算机, summary: '90 条 Java 最佳实践，JDK 设计师亲著。' },
  { title: 'Python 编程：从入门到实践', author: 'Eric Matthes', category: CATS.计算机, summary: 'Python 入门的口碑之作，案例丰富。' },

  // ============================================
  // 历史（12 本）
  // ============================================
  { title: '史记', author: '司马迁', category: CATS.历史, summary: '中国第一部纪传体通史，二十四史之首。' },
  { title: '全球通史', author: '斯塔夫里阿诺斯', category: CATS.历史, summary: '从史前到 21 世纪的人类文明全景。' },
  { title: '万历十五年', author: '黄仁宇', category: CATS.历史, summary: '以大历史视角剖析明代社会的深层困境。', status: 'BORROWED', borrowerName: '张伟', borrowerPhone: '13700137003', daysAgoBorrowed: 10, dueInDays: 20 },
  { title: '人类简史', author: '尤瓦尔·赫拉利', category: CATS.历史, summary: '从动物到上帝，智人征服世界的故事。' },
  { title: '明朝那些事儿', author: '当年明月', category: CATS.历史, summary: '用现代语言讲述明朝三百年历史。' },
  { title: '中国大历史', author: '黄仁宇', category: CATS.历史, summary: '技术角度看中国历史的大历史观。' },
  { title: '东京梦华录', author: '孟元老', category: CATS.历史, summary: '北宋汴京的繁华与市井生活的第一手记录。' },
  { title: '二战风云录', author: '安东尼·比弗', category: CATS.历史, summary: '二战全史的权威叙事。' },
  { title: '伯罗奔尼撒战争史', author: '修昔底德', category: CATS.历史, summary: '古希腊两大城邦之间 27 年战争的历史经典。' },
  { title: '近代中国社会的新陈代谢', author: '陈旭麓', category: CATS.历史, summary: '从传统到近代中国社会结构的深层变迁。' },
  { title: '罗马帝国衰亡史', author: '爱德华·吉本', category: CATS.历史, summary: '西方史学的巅峰之作，理性审视罗马的衰亡。' },
  { title: '长安的荔枝', author: '马伯庸', category: CATS.历史, summary: '唐朝小吏为皇帝运送新鲜荔枝的艰难历程。', status: 'BORROWED', borrowerName: '周强', borrowerPhone: '13300133007', daysAgoBorrowed: 6, dueInDays: 24 },

  // ============================================
  // 哲学（11 本）
  // ============================================
  { title: '苏菲的世界', author: '乔斯坦·贾德', category: CATS.哲学, summary: '一位少女的哲学入门课，西方哲学史的童话。' },
  { title: '中国哲学简史', author: '冯友兰', category: CATS.哲学, summary: '海外最知名的中国哲学入门读物。' },
  { title: '存在与时间', author: '海德格尔', category: CATS.哲学, summary: '20 世纪哲学的里程碑，"此在"的分析。', status: 'BORROWED', borrowerName: '陈静', borrowerPhone: '13600136004', daysAgoBorrowed: 2, dueInDays: 28 },
  { title: '理想国', author: '柏拉图', category: CATS.哲学, summary: '西方政治哲学的源头，正义与善的探讨。' },
  { title: '尼采文集', author: '尼采', category: CATS.哲学, summary: '"上帝已死"——查拉图斯特拉如是说。' },
  { title: '作为意志和表象的世界', author: '叔本华', category: CATS.哲学, summary: '意志本体论的奠基之作。' },
  { title: '查拉图斯特拉如是说', author: '尼采', category: CATS.哲学, summary: '诗化哲学的巅峰，"超人"概念的诞生。' },
  { title: '庄子今注今译', author: '陈鼓应', category: CATS.哲学, summary: '庄子内七篇的现代汉语注解与翻译。' },
  { title: '论语译注', author: '杨伯峻', category: CATS.哲学, summary: '儒家经典《论语》最权威的现代注解。' },
  { title: '第一哲学沉思集', author: '笛卡尔', category: CATS.哲学, summary: '"我思故我在"——近代主体性哲学的开端。' },
  { title: '善恶的彼岸', author: '尼采', category: CATS.哲学, summary: '颠覆传统道德的哲学檄文。' },

  // ============================================
  // 科学（12 本）
  // ============================================
  { title: '时间简史', author: '史蒂芬·霍金', category: CATS.科学, summary: '从大爆炸到黑洞，宇宙学的科普经典。' },
  { title: '自私的基因', author: '理查德·道金斯', category: CATS.科学, summary: '基因是自然选择的基本单位，进化论的通俗阐释。' },
  { title: '从一到无穷大', author: '乔治·伽莫夫', category: CATS.科学, summary: '数学、物理、生物、天文的综合科普。' },
  { title: '物种起源', author: '达尔文', category: CATS.科学, summary: '自然选择学说的奠基之作。' },
  { title: '哥德尔、艾舍尔、巴赫', author: '侯世达', category: CATS.科学, summary: 'GEB——一条永恒的金带，关于自指与意识。' },
  { title: '数学之美', author: '吴军', category: CATS.科学, summary: '用生活案例讲解数学原理的科普书。' },
  { title: '宇宙的尺度', author: '达纳·麦肯齐', category: CATS.科学, summary: '从无穷大到无穷小的宇宙图景。' },
  { title: '时间之旅', author: '卡洛·罗韦利', category: CATS.科学, summary: '物理学家笔下的时间本质。' },
  { title: '生命的未来', author: '爱德华·威尔逊', category: CATS.科学, summary: '生物多样性保护的科普与呼唤。' },
  { title: '量子物理史话', author: '曹天元', category: CATS.科学, summary: '量子力学发展史的中文科普杰作。', status: 'BORROWED', borrowerName: '吴丽', borrowerPhone: '13200132008', daysAgoBorrowed: 8, dueInDays: 22 },
  { title: '复杂', author: '梅拉妮·米歇尔', category: CATS.科学, summary: '复杂系统科学的入门导读。' },
  { title: '细胞生命的礼赞', author: '刘易斯·托马斯', category: CATS.科学, summary: '医学与生物学的诗意科普。' },

  // ============================================
  // 艺术（11 本）
  // ============================================
  { title: '艺术的故事', author: 'E.H. 贡布里希', category: CATS.艺术, summary: '西方艺术史的最经典入门读物。' },
  { title: '美的历程', author: '李泽厚', category: CATS.艺术, summary: '中国古典美学的发展历程。' },
  { title: '加德纳艺术通史', author: '弗雷德·S·克莱纳', category: CATS.艺术, summary: '全球视野下的艺术史百科。' },
  { title: '观看之道', author: '约翰·伯格', category: CATS.艺术, summary: '改变了我们观看艺术的方式。', status: 'BORROWED', borrowerName: '刘洋', borrowerPhone: '13500135005', daysAgoBorrowed: 7, dueInDays: 23 },
  { title: '中国书法史', author: '华人德', category: CATS.艺术, summary: '中国书法艺术的发展与演变。' },
  { title: '色彩与光线', author: '詹姆斯·格尼', category: CATS.艺术, summary: '画家视角的光影与色彩指南。' },
  { title: '艺术与视知觉', author: '鲁道夫·阿恩海姆', category: CATS.艺术, summary: '格式塔心理学在视觉艺术中的应用。' },
  { title: '中国绘画史', author: '高居翰', category: CATS.艺术, summary: '海外学者眼中的中国绘画传统。' },
  { title: '电影剧本写作基础', author: '悉德·菲尔德', category: CATS.艺术, summary: '好莱坞编剧教父的三幕剧结构指南。' },
  { title: '乐之本事', author: '焦元溥', category: CATS.艺术, summary: '古典音乐欣赏的入门佳作。' },
  { title: '设计中的设计', author: '原研哉', category: CATS.艺术, summary: '无印良品艺术总监的设计哲学。' },

  // ============================================
  // 社科（13 本）
  // ============================================
  { title: '乡土中国', author: '费孝通', category: CATS.社科, summary: '中国乡村社会的经典社会学分析。' },
  { title: '社会契约论', author: '卢梭', category: CATS.社科, summary: '"人生而自由，却无往不在枷锁之中。"' },
  { title: '乌合之众', author: '古斯塔夫·勒庞', category: CATS.社科, summary: '群体心理学的开创之作。' },
  { title: '经济学原理', author: '曼昆', category: CATS.社科, summary: '经济学入门的全球最畅销教材。' },
  { title: '资本主义、社会主义与民主', author: '约瑟夫·熊彼特', category: CATS.社科, summary: '资本主义向社会主义过渡的经典分析。', status: 'BORROWED', borrowerName: '赵敏', borrowerPhone: '13400134006', daysAgoBorrowed: 12, dueInDays: 18 },
  { title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', category: CATS.社科, summary: '不同大陆文明发展差异的深度解释。' },
  { title: '失控', author: '凯文·凯利', category: CATS.社科, summary: '全书的总倾向，是造出一个新词：蜂群。' },
  { title: '第三次浪潮', author: '阿尔文·托夫勒', category: CATS.社科, summary: '未来学三部曲之一，预言信息时代的到来。' },
  { title: '娱乐至死', author: '尼尔·波兹曼', category: CATS.社科, summary: '媒介即认识论——电视时代的公共话语批判。' },
  { title: '菊与刀', author: '鲁思·本尼迪克特', category: CATS.社科, summary: '解读日本民族文化的经典人类学著作。' },
  { title: '文明的冲突', author: '塞缪尔·亨廷顿', category: CATS.社科, summary: '冷战后的世界秩序与文明格局。' },
  { title: '江村经济', author: '费孝通', category: CATS.社科, summary: '中国江南一个村庄的人类学田野调查。' },
  { title: '思考，快与慢', author: '丹尼尔·卡尼曼', category: CATS.社科, summary: '诺贝尔奖得主对人类决策机制的深度剖析。', status: 'BORROWED', borrowerName: '黄磊', borrowerPhone: '13100131009', daysAgoBorrowed: 4, dueInDays: 26 },

  // ============================================
  // 经济（12 本）
  // ============================================
  { title: '国富论', author: '亚当·斯密', category: CATS.经济, summary: '古典经济学的开山之作，"看不见的手"的概念起源。' },
  { title: '资本论', author: '卡尔·马克思', category: CATS.经济, summary: '政治经济学的奠基巨著，剩余价值理论。' },
  { title: '就业、利息和货币通论', author: '凯恩斯', category: CATS.经济, summary: '现代宏观经济学奠基之作。' },
  { title: '穷查理宝典', author: '彼得·考夫曼', category: CATS.经济, summary: '芒格演讲集，多元思维模型的智慧。' },
  { title: '漫步华尔街', author: '伯顿·马尔基尔', category: CATS.经济, summary: '个人投资策略的入门经典。' },
  { title: '非理性繁荣', author: '罗伯特·席勒', category: CATS.经济, summary: '行为金融学视角下的资产泡沫。' },
  { title: '小狗钱钱', author: '博多·舍费尔', category: CATS.经济, summary: '理财入门的童话读物。' },
  { title: '门口的野蛮人', author: '布赖恩·伯勒', category: CATS.经济, summary: 'RJR 纳贝斯克收购战的经典商战实录。' },
  { title: '涛动周期论', author: '周金涛', category: CATS.经济, summary: '康波周期与人生财富的宿命。' },
  { title: '八次危机', author: '温铁军', category: CATS.经济, summary: '1949 以来中国乡村经济的危机史。' },
  { title: '规模', author: '杰弗里·韦斯特', category: CATS.经济, summary: '复杂系统视角下的城市与企业增长规律。' },
  { title: '长期主义', author: '吉姆·柯林斯', category: CATS.经济, summary: '企业基业长青的可持续经营哲学。', status: 'BORROWED', borrowerName: '徐婷', borrowerPhone: '13000130010', daysAgoBorrowed: 9, dueInDays: 21 },

  // ============================================
  // 心理（11 本）
  // ============================================
  { title: '梦的解析', author: '西格蒙德·弗洛伊德', category: CATS.心理, summary: '精神分析学的奠基之作。' },
  { title: '自卑与超越', author: '阿尔弗雷德·阿德勒', category: CATS.心理, summary: '个体心理学的核心思想。' },
  { title: '被讨厌的勇气', author: '岸见一郎', category: CATS.心理, summary: '阿德勒心理学的对话体入门。' },
  { title: '蛤蟆先生去看心理医生', author: '罗伯特·戴博德', category: CATS.心理, summary: '用童话讲心理咨询的入门小说。' },
  { title: '亲密关系', author: '罗兰·米勒', category: CATS.心理, summary: '社会心理学视角下的两性关系研究。' },
  { title: '人性的弱点', author: '戴尔·卡耐基', category: CATS.心理, summary: '人际关系处理的长销经典。' },
  { title: '少有人走的路', author: 'M·斯科特·派克', category: CATS.心理, summary: '心智成熟的旅程——自律、爱与信仰。' },
  { title: '情商', author: '丹尼尔·戈尔曼', category: CATS.心理, summary: 'EQ 比 IQ 更重要的论证。', status: 'BORROWED', borrowerName: '孙浩', borrowerPhone: '15900159011', daysAgoBorrowed: 1, dueInDays: 29 },
  { title: '心流', author: '米哈里·契克森米哈赖', category: CATS.心理, summary: '最优体验心理学的奠基之作。' },
  { title: '影响力', author: '罗伯特·西奥迪尼', category: CATS.心理, summary: '说服与顺从的六大心理学原理。' },
  { title: '为何家会伤人', author: '武志红', category: CATS.心理, summary: '中国家庭关系中的心理动力分析。' },

  // ============================================
  // 医学（10 本）
  // ============================================
  { title: '人体的故事', author: '丹尼尔·利伯曼', category: CATS.医学, summary: '人类身体进化的全景图。' },
  { title: '病者生存', author: '沙龙·莫勒姆', category: CATS.医学, summary: '疾病如何塑造了人类的进化。' },
  { title: '肠子的小心思', author: '朱莉娅·恩德斯', category: CATS.医学, summary: '肠道菌群与人体健康的趣味科普。' },
  { title: '当呼吸化为空气', author: '保罗·卡拉尼什', category: CATS.医学, summary: '神经外科医生面对绝症的生死沉思。' },
  { title: '最好的告别', author: '阿图·葛文德', category: CATS.医学, summary: '关于衰老与死亡的医学人文思考。' },
  { title: '上帝的手术刀', author: '王立铭', category: CATS.医学, summary: '基因编辑技术的科普与社会思考。' },
  { title: '众病之王', author: '悉达多·穆克吉', category: CATS.医学, summary: '癌症的传记，一部人类抗癌的史诗。' },
  { title: '阿图医生第一季', author: '阿图·葛文德', category: CATS.医学, summary: '医生修炼的手记——不确定性、失败与成长。' },
  { title: '本草纲目', author: '李时珍', category: CATS.医学, summary: '中医药学的百科全书式著作。' },
  { title: 'DK 家庭医生', author: 'DK 出版社', category: CATS.医学, summary: '权威的家庭医疗保健百科。', status: 'BORROWED', borrowerName: '马晓', borrowerPhone: '15800158012', daysAgoBorrowed: 11, dueInDays: 19 },

  // ============================================
  // 传记（12 本）
  // ============================================
  { title: '史蒂夫·乔布斯传', author: '沃尔特·艾萨克森', category: CATS.传记, summary: '苹果创始人的官方授权传记。' },
  { title: '活着本来单纯', author: '丰子恺', category: CATS.传记, summary: '散文体自传与生活美学。' },
  { title: '苏东坡传', author: '林语堂', category: CATS.传记, summary: '宋代文豪苏轼的诗意人生。' },
  { title: '曾国藩家书', author: '曾国藩', category: CATS.传记, summary: '晚晴名臣的家训与处世哲学。' },
  { title: '富兰克林自传', author: '本杰明·富兰克林', category: CATS.传记, summary: '美国国父之一的人生回忆与美德清单。' },
  { title: '假如给我三天光明', author: '海伦·凯勒', category: CATS.传记, summary: '盲聋作家的成长与心灵告白。' },
  { title: '我与地坛', author: '史铁生', category: CATS.传记, summary: '轮椅上的作家对生命与地坛的沉思。' },
  { title: '维特根斯坦传', author: '瑞·蒙克', category: CATS.传记, summary: '20 世纪最神秘哲学家的传奇一生。' },
  { title: '爱因斯坦传', author: '沃尔特·艾萨克森', category: CATS.传记, summary: '相对论之父的科学人生与时代背景。' },
  { title: '居里夫人传', author: '艾芙·居里', category: CATS.传记, summary: '两次诺奖得主的女儿为她写的传记。' },
  { title: '人生由我', author: '梅耶·马斯克', category: CATS.传记, summary: '埃隆·马斯克之母的硬核人生。', status: 'BORROWED', borrowerName: '朱琳', borrowerPhone: '15700157013', daysAgoBorrowed: 13, dueInDays: 17 },
  { title: '我们仨', author: '杨绛', category: CATS.传记, summary: '钱钟书杨绛一家的温情回忆录。' },

  // ============================================
  // 教育（10 本）
  // ============================================
  { title: '爱弥儿', author: '卢梭', category: CATS.教育, summary: '现代教育思想的奠基之作。' },
  { title: '民主主义与教育', author: '约翰·杜威', category: CATS.教育, summary: '实用主义教育哲学的经典。' },
  { title: '给教师的建议', author: '苏霍姆林斯基', category: CATS.教育, summary: '苏联教育家的一线教学经验汇编。' },
  { title: '正面管教', author: '简·尼尔森', category: CATS.教育, summary: '不惩罚不骄纵的儿童教育方法。' },
  { title: '好妈妈胜过好老师', author: '尹建莉', category: CATS.教育, summary: '中国家庭教育领域的口碑之作。' },
  { title: '园丁与木匠', author: '艾莉森·高普尼克', category: CATS.教育, summary: '从父母到教养观的儿童发展心理学。' },
  { title: '自卑与超越', author: '阿尔弗雷德·阿德勒', category: CATS.教育, summary: '儿童自卑与成长的心理学解读。' },
  { title: '卡尔·威特的教育', author: '卡尔·威特', category: CATS.教育, summary: '19 世纪德国神童父亲的教育手记。' },
  { title: '如何阅读一本书', author: '莫提默·艾德勒', category: CATS.教育, summary: '阅读的层次与方法的经典指南。' },
  { title: 'PISA 迷思', author: '赵勇', category: CATS.教育, summary: '国际学生评估项目的批判性解读。' },

  // ============================================
  // 旅行（10 本）
  // ============================================
  { title: '徐霞客游记', author: '徐霞客', category: CATS.旅行, summary: '明代地理学家的山水考察日记。' },
  { title: '夜航船', author: '张岱', category: CATS.旅行, summary: '明末小品文的代表作,船上的杂学小百科。' },
  { title: '撒哈拉的故事', author: '三毛', category: CATS.旅行, summary: '三毛与荷西在撒哈拉的生活散文。' },
  { title: '万水千山走遍', author: '三毛', category: CATS.旅行, summary: '三毛游历中南美的旅行随笔。' },
  { title: '旅行的艺术', author: '阿兰·德波顿', category: CATS.旅行, summary: '哲学视角下的旅行体验与意义。' },
  { title: '孤独星球', author: 'Lonely Planet', category: CATS.旅行, summary: '全球最知名的旅行指南系列。' },
  { title: '在路上', author: '杰克·凯鲁亚克', category: CATS.旅行, summary: '垮掉的一代横跨美国的公路文学。' },
  { title: '荒野生存', author: '乔恩·克拉考尔', category: CATS.旅行, summary: '阿拉斯加荒野的真实求生故事。' },
  { title: '东京一年', author: '蒋方舟', category: CATS.旅行, summary: '一位中国作家在东京的生活观察。' },
  { title: '草原、森林和山', author: '比尔·麦克基本', category: CATS.旅行, summary: '生态视角下的北美自然之旅。', status: 'BORROWED', borrowerName: '胡军', borrowerPhone: '15600156014', daysAgoBorrowed: 14, dueInDays: 16 },

  // ============================================
  // 漫画（10 本）
  // ============================================
  { title: '海贼王', author: '尾田荣一郎', category: CATS.漫画, summary: '少年路飞追寻海贼王梦想的航海冒险。' },
  { title: '火影忍者', author: '岸本齐史', category: CATS.漫画, summary: '鸣人与佐助的忍者成长与羁绊。' },
  { title: '灌篮高手', author: '井上雄彦', category: CATS.漫画, summary: '湘北篮球队冲击全国大赛的青春物语。' },
  { title: '名侦探柯南', author: '青山刚昌', category: CATS.漫画, summary: '高中生侦探柯南破解无数案件的推理长篇。' },
  { title: '鬼灭之刃', author: '吾峠呼世晴', category: CATS.漫画, summary: '灶门炭治郎为变鬼的妹妹踏上斩鬼之路。' },
  { title: '进击的巨人', author: '谏山创', category: CATS.漫画, summary: '人类与城墙外的巨人之间的史诗。' },
  { title: '阿衰', author: '猫小乐', category: CATS.漫画, summary: '中国校园幽默漫画的代表作。' },
  { title: '一人之下', author: '米二', category: CATS.漫画, summary: '中国都市异能题材的现代漫画。' },
  { title: '镖人', author: '许先哲', category: CATS.漫画, summary: '隋末江湖镖客的硬派武侠漫画。' },
  { title: '龙猫', author: '宫崎骏', category: CATS.漫画, summary: '吉卜力经典动画的原作绘本。', status: 'BORROWED', borrowerName: '李雷', borrowerPhone: '13800138001', daysAgoBorrowed: 15, dueInDays: 15 },
];

/**
 * 检查社区馆藏是否为空；为空时把示例书批量插入。
 * 调用时机：应用启动时（index.ts 在 app.listen 之前）。
 *          注册流程不再触发种子——避免每注册一个用户就多一份 162 本。
 *
 * 失败时：抛出的错误会冒泡到启动流程 → 直接进程退出；
 *         由于种子数据相对稳定，这里不强行回滚（启动失败最直接）。
 */
export async function seedDemoBooksIfEmpty(
  count: () => Promise<number>,
  create: (data: any) => Promise<unknown>,
) {
  const existing = await count();
  if (existing > 0) {
    return { skipped: true, existing };
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  for (const b of DEMO_BOOKS) {
    const isBorrowed = (b.status ?? 'AVAILABLE') === 'BORROWED';
    const borrowedAt = isBorrowed && b.daysAgoBorrowed != null ? new Date(now - b.daysAgoBorrowed * day) : null;
    const dueAt = isBorrowed && b.dueInDays != null ? new Date(now + b.dueInDays * day) : null;

    await create({
      title: b.title,
      author: b.author,
      category: b.category,
      summary: b.summary,
      status: b.status ?? 'AVAILABLE',
      borrowerName: isBorrowed ? b.borrowerName ?? null : null,
      borrowerPhone: isBorrowed ? b.borrowerPhone ?? null : null,
      borrowedAt,
      dueAt,
    });
  }

  return { skipped: false, inserted: DEMO_BOOKS.length };
}