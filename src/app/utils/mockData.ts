import { Item } from '../types';

export const initialMockData: Item[] = [
  {
    id: '1',
    title: '百年孤独',
    type: 'book',
    status: 'unwatched',
    matchStatus: 'matched',
    duration: 480,
    keyPoints: [
      '魔幻现实主义巅峰之作，马尔克斯代表作',
      '讲述布恩迪亚家族七代人的传奇故事',
      '探讨拉美文化、孤独与命运的主题',
    ],
    reason: '想了解拉美文学的代表作品',
    tags: ['魔幻现实主义', '经典文学', '诺贝尔文学奖'],
    source: {
      name: '豆瓣',
      url: 'https://book.douban.com/subject/6082808/',
    },
    links: [],
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: '2',
    title: '奥本海默',
    type: 'movie',
    status: 'watched',
    matchStatus: 'matched',
    duration: 180,
    keyPoints: [
      '诺兰执导，基里安·墨菲主演',
      '讲述原子弹之父的传记故事，探讨科学与道德',
      '2024年奥斯卡最佳影片',
    ],
    reason: '朋友强烈推荐诺兰的新作',
    tags: ['传记', '历史', '诺兰'],
    source: {
      name: '豆瓣',
      url: 'https://movie.douban.com/subject/35593344/',
    },
    links: [],
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: '3',
    title: '鱿鱼游戏 第二季',
    type: 'series',
    status: 'unwatched',
    matchStatus: 'pending',
    duration: 440, // 约8集 × 55分钟
    keyPoints: [
      '延续第一季的生存游戏设定',
      '奇勋回归，新角色加入对抗',
      '探讨人性、资本与阶级',
    ],
    reason: '第一季太精彩了，必须追',
    tags: ['韩剧', '悬疑', '生存游戏'],
    source: {
      name: '豆瓣',
      url: 'https://movie.douban.com/',
    },
    links: [],
    createdAt: Date.now() - 86400000,
  },
  {
    id: '4',
    title: '一本不知名的书',
    type: 'book',
    status: 'unwatched',
    matchStatus: 'unidentified',
    duration: 0,
    keyPoints: [],
    reason: '朋友提到的，听起来不错',
    tags: [],
    links: [],
    createdat: Date.now() - 86400000 * 3,
  },
  {
    id: '5',
    title: '沙丘2',
    type: 'movie',
    status: 'unwatched',
    matchStatus: 'failed',
    duration: 166,
    keyPoints: [],
    reason: '第一部很震撼，期待续集',
    tags: ['科幻', '史诗'],
    links: [],
    createdat: Date.now() - 86400000 * 4,
  },
];

// 使用大模型丰富条目信息
export async function mockMatchItem(title: string, type: string): Promise<Partial<Item>> {
  const apiKey = import.meta.env.VITE_ARK_API_KEY;

  // 如果标题为"未命名链接"，直接返回失败状态，避免不必要的 API 调用
  if (title === '未命名链接') {
    console.log('[mockMatchItem] 标题为"未命名链接"，直接返回失败状态');
    return {
      matchStatus: 'failed',
      duration: 0,
      keyPoints: [],
      tags: [],
      source: {
        name: '',
        url: ''
      }
    };
  }
  
  // 检查是否为从URL提取的通用标题
  const urlBasedTitles = ['豆瓣电影', '小红书笔记'];
  if (urlBasedTitles.includes(title)) {
    console.log('[mockMatchItem] 标题为URL提取的通用标题，直接返回失败状态');
    return {
      matchStatus: 'failed',
      duration: 0,
      keyPoints: [],
      tags: [],
      source: {
        name: '',
        url: ''
      }
    };
  }

  // 没有配置 key 时，保持原有流程但不丰富数据
  if (!apiKey) {
    console.warn('[mockMatchItem] VITE_ARK_API_KEY 未配置，跳过富化');
    return {
      matchStatus: 'unidentified',
    };
  }

  try {
    console.log('[mockMatchItem] 开始生成匹配信息', { title, type, apiKey: !!apiKey });
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'doubao-seed-2-0-pro-260215',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `你是一个信息整理助手。根据用户提供的作品标题和类型（book、movie、series），生成一个 JSON，对应字段：matchStatus（matched、failed、pending 之一）、duration（估算总时长，单位分钟，整数）、keyPoints（字符串数组，3~5 条要点）、tags（字符串数组，2~6 个标签）、source（包含 name 和 url 两个字段，可以用常见中文内容平台）。只返回 JSON，不要多余文字。\n标题: ${title}\n类型: ${type}`,
              },
            ],
          },
        ],
      }),
    });

    console.log('[mockMatchItem] Ark 响应状态', response.status);
    
    // 处理错误响应，避免 response.json() 抛出异常
    if (!response.ok) {
      try {
        const data = await response.json();
        console.error('[mockMatchItem] Ark 请求失败', response.status, data);
      } catch (e) {
        console.error('[mockMatchItem] Ark 请求失败，无法解析响应', response.status);
      }
      return { matchStatus: 'failed' };
    }
    
    const data = await response.json();
    console.log('[mockMatchItem] Ark 响应数据', JSON.stringify(data, null, 2));
    
    // 详细检查响应结构
    console.log('[mockMatchItem] 检查 output 存在:', !!data.output);
    console.log('[mockMatchItem] 检查 output.text 存在:', !!data.output?.text);
    console.log('[mockMatchItem] 检查 choices 存在:', !!data.choices);
    console.log('[mockMatchItem] 检查 content 存在:', !!data.content);
    console.log('[mockMatchItem] content 类型:', typeof data.content);
    console.log('[mockMatchItem] content 长度:', Array.isArray(data.content) ? data.content.length : 'N/A');
    console.log('[mockMatchItem] 检查 message 存在:', !!data.message);
    console.log('[mockMatchItem] 检查 message.content 存在:', !!data.message?.content);
    console.log('[mockMatchItem] message.content 类型:', typeof data.message?.content);
    console.log('[mockMatchItem] message.content 长度:', Array.isArray(data.message?.content) ? data.message.content.length : 'N/A');
    
    // 尝试从不同路径获取响应内容
    let content: string | undefined;
    if (data.output?.text) {
      content = data.output.text.trim();
      console.log('[mockMatchItem] 从 output.text 获取响应:', content);
    } else if (data.choices?.[0]?.message?.content) {
      content = data.choices[0].message.content.trim();
      console.log('[mockMatchItem] 从 choices 获取响应:', content);
    } else if (Array.isArray(data.content) && data.content[0]?.type === 'output_text' && data.content[0]?.text) {
      content = data.content[0].text.trim();
      console.log('[mockMatchItem] 从 content[0].text 获取响应:', content);
    } else if (Array.isArray(data.message?.content) && data.message.content[0]?.type === 'output_text' && data.message.content[0]?.text) {
      content = data.message.content[0].text.trim();
      console.log('[mockMatchItem] 从 message.content[0].text 获取响应:', content);
    } else if (Array.isArray(data.output)) {
      // 查找 output 数组中 type 为 "message" 的对象
      const messageOutput = data.output.find(item => item.type === 'message');
      if (messageOutput && Array.isArray(messageOutput.content)) {
        // 查找 content 数组中 type 为 "output_text" 的对象
        const outputText = messageOutput.content.find(item => item.type === 'output_text');
        if (outputText && outputText.text) {
          content = outputText.text.trim();
          console.log('[mockMatchItem] 从 output[message].content[output_text].text 获取响应:', content);
        }
      }
    } else {
      content = undefined;
      console.log('[mockMatchItem] 无法获取响应内容');
    }
    console.log('[mockMatchItem] 原始响应', content);

    let parsed: any = null;
    try {
      // 清理响应内容中的多余反引号
      const cleanedContent = content ? content.replace(/`/g, '') : '';
      console.log('[mockMatchItem] 清理后的响应', cleanedContent);
      parsed = cleanedContent ? JSON.parse(cleanedContent) : null;
      console.log('[mockMatchItem] 解析后的 JSON', parsed);
    } catch (e) {
      console.error('[mockMatchItem] JSON 解析失败', e);
      parsed = null;
    }

    if (!parsed) {
      console.log('[mockMatchItem] 解析失败，返回 failed');
      return { matchStatus: 'failed' };
    }

    const matchStatus: Item['matchStatus'] =
      parsed.matchStatus === 'matched' ||
      parsed.matchStatus === 'pending' ||
      parsed.matchStatus === 'unidentified' ||
      parsed.matchStatus === 'failed'
        ? parsed.matchStatus
        : 'matched';

    const duration = Number.isFinite(parsed.duration) ? Math.max(0, Math.floor(parsed.duration)) : 0;

    const keyPoints = Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.filter((p: unknown) => typeof p === 'string').slice(0, Math.ceil(parsed.keyPoints.length / 2))
      : [];

    let tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown) => typeof t === 'string')
      : [];

    // 匹配失败时不返回标签
    if (matchStatus === 'failed') {
      tags = [];
    }

    // 为剧集类型生成多个视频平台的搜索链接
    let source = parsed.source && typeof parsed.source === 'object'
      ? {
          name: typeof parsed.source.name === 'string' ? parsed.source.name : '网络信息',
          url: typeof parsed.source.url === 'string' ? parsed.source.url : 'https://www.douban.com',
        }
      : undefined;

    // 为不同类型生成平台链接
    const platformLinks = [];
    const encodedTitle = encodeURIComponent(title);
    
    // 优先添加小红书链接
    platformLinks.push(
      { name: '小红书', url: `https://www.xiaohongshu.com/search_result?keyword=${encodedTitle}` }
    );
    
    if (type === 'series') {
      // 生成多个主流视频平台的搜索链接
      platformLinks.push(
        { name: '腾讯视频', url: `https://v.qq.com/x/search/?q=${encodedTitle}&stag=0&smartbox_ab=` },
        { name: '爱奇艺', url: `https://www.iqiyi.com/search/${encodedTitle}.html?fid=1460&channel_id=1&pos=1&page=1&qyid=0&source=suggest&sr=1&site=iqiyi` },
        { name: '优酷', url: `https://so.youku.com/search_video/q_${encodedTitle}` },
        { name: '芒果TV', url: `https://so.mgtv.com/so?k=${encodedTitle}&lastp=ch_home` },
        { name: 'B站', url: `https://search.bilibili.com/all?keyword=${encodedTitle}&from_source=webtop_search` }
      );
    } else if (type === 'movie') {
      // 为电影添加相关平台链接
      platformLinks.push(
        { name: '豆瓣电影', url: `https://movie.douban.com/subject_search?search_text=${encodedTitle}&cat=1002` },
        { name: '猫眼电影', url: `https://maoyan.com/search/${encodedTitle}` }
      );
    } else if (type === 'book') {
      // 为书籍添加相关平台链接
      platformLinks.push(
        { name: '豆瓣读书', url: `https://book.douban.com/subject_search?search_text=${encodedTitle}&cat=1001` },
        { name: '微信读书', url: `https://weread.qq.com/?q=${encodedTitle}` }
      );
    }

    // 根据类型设置默认source
    if (!source) {
      if (type === 'series' && platformLinks.length > 0) {
        source = platformLinks[0]; // 使用第一个视频平台作为默认source
      }
    }

    const result = {
      matchStatus,
      duration,
      keyPoints,
      tags,
      source,
      // 只在有平台链接时返回，避免覆盖用户输入的链接
      ...(platformLinks.length > 0 && { links: platformLinks }),
    };
    console.log('[mockMatchItem] 生成结果', result);
    return result;
  } catch (error) {
    console.error('mockMatchItem LLM error', error);
    return {
      matchStatus: 'failed',
      tags: [],
    };
  }
}

// 使用大模型生成详细内容（章节、剧集等）
export async function generateDetailedContent(title: string, type: string, duration: number): Promise<Array<{ title: string; description: string }>> {
  const apiKey = import.meta.env.VITE_ARK_API_KEY;

  // 没有配置 key 时，返回模拟数据
  if (!apiKey) {
    console.warn('[generateDetailedContent] VITE_ARK_API_KEY 未配置，返回模拟数据');
    return generateMockContent(type);
  }

  try {
    console.log('[generateDetailedContent] 开始生成详细内容', { title, type, duration, apiKey: !!apiKey });
    
    let prompt = '';
    let expectedEpisodes = 0;
    
    switch (type) {
      case 'book':
        // 估算章节数，假设每章30分钟
        const expectedChapters = Math.max(3, Math.floor(duration / 30));
        prompt = `你是一个内容生成助手。根据书籍标题 "${title}"，生成 ${expectedChapters} 个章节的名称和内容简介。每个章节包含 title（章节名称）和 description（章节内容简介，50-100字）。返回一个 JSON 数组，不要多余文字。`;
        break;
      case 'movie':
        prompt = `你是一个内容生成助手。根据电影标题 "${title}"，生成电影的剧情结构，包括开场、发展、高潮、结局四个部分。每个部分包含 title（部分名称）和 description（内容简介，50-100字）。返回一个 JSON 数组，不要多余文字。`;
        break;
      case 'series':
        // 估算集数，假设每集45分钟
        expectedEpisodes = Math.max(3, Math.floor(duration / 45));
        prompt = `你是一个内容生成助手。根据剧集标题 "${title}"，生成 ${expectedEpisodes} 集的名称和剧情简介。每集包含 title（集数和名称，如"第1集：初次相遇"）和 description（剧情简介，50-100字）。返回一个 JSON 数组，不要多余文字。`;
        break;
      default:
        return [];
    }
    
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'doubao-seed-2-0-pro-260215',
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    console.log('[generateDetailedContent] Ark 响应状态', response.status);
    
    // 处理错误响应
    if (!response.ok) {
      try {
        const data = await response.json();
        console.error('[generateDetailedContent] Ark 请求失败', response.status, data);
      } catch (e) {
        console.error('[generateDetailedContent] Ark 请求失败，无法解析响应', response.status);
      }
      return generateMockContent(type);
    }
    
    const data = await response.json();
    console.log('[generateDetailedContent] Ark 响应数据', JSON.stringify(data, null, 2));
    
    // 尝试从不同路径获取响应内容
    let content: string | undefined;
    if (data.output?.text) {
      content = data.output.text.trim();
      console.log('[generateDetailedContent] 从 output.text 获取响应:', content);
    } else if (data.choices?.[0]?.message?.content) {
      content = data.choices[0].message.content.trim();
      console.log('[generateDetailedContent] 从 choices 获取响应:', content);
    } else if (Array.isArray(data.content) && data.content[0]?.type === 'output_text' && data.content[0]?.text) {
      content = data.content[0].text.trim();
      console.log('[generateDetailedContent] 从 content[0].text 获取响应:', content);
    } else if (Array.isArray(data.message?.content) && data.message.content[0]?.type === 'output_text' && data.message.content[0]?.text) {
      content = data.message.content[0].text.trim();
      console.log('[generateDetailedContent] 从 message.content[0].text 获取响应:', content);
    } else if (Array.isArray(data.output)) {
      // 查找 output 数组中 type 为 "message" 的对象
      const messageOutput = data.output.find(item => item.type === 'message');
      if (messageOutput && Array.isArray(messageOutput.content)) {
        // 查找 content 数组中 type 为 "output_text" 的对象
        const outputText = messageOutput.content.find(item => item.type === 'output_text');
        if (outputText && outputText.text) {
          content = outputText.text.trim();
          console.log('[generateDetailedContent] 从 output[message].content[output_text].text 获取响应:', content);
        }
      }
    } else {
      content = undefined;
      console.log('[generateDetailedContent] 无法获取响应内容');
    }
    console.log('[generateDetailedContent] 原始响应', content);

    let parsed: any = null;
    try {
      // 清理响应内容中的多余反引号
      const cleanedContent = content ? content.replace(/`/g, '') : '';
      console.log('[generateDetailedContent] 清理后的响应', cleanedContent);
      parsed = cleanedContent ? JSON.parse(cleanedContent) : null;
      console.log('[generateDetailedContent] 解析后的 JSON', parsed);
    } catch (e) {
      console.error('[generateDetailedContent] JSON 解析失败', e);
      parsed = null;
    }

    if (!Array.isArray(parsed)) {
      console.log('[generateDetailedContent] 解析失败，返回模拟数据');
      return generateMockContent(type);
    }

    // 验证解析结果
    const validContent = parsed.filter((item: any) => 
      typeof item === 'object' && 
      typeof item.title === 'string' && 
      typeof item.description === 'string'
    );

    if (validContent.length === 0) {
      console.log('[generateDetailedContent] 解析结果无效，返回模拟数据');
      return generateMockContent(type);
    }

    console.log('[generateDetailedContent] 生成结果', validContent);
    return validContent;
  } catch (error) {
    console.error('generateDetailedContent LLM error', error);
    return generateMockContent(type);
  }
}

// 生成模拟内容（当API调用失败时使用）
function generateMockContent(type: string): Array<{ title: string; description: string }> {
  switch (type) {
    case 'book':
      return [
        { 
          title: '第一章：开篇', 
          description: '本章详细介绍故事发生的时代背景和社会环境，刻画主要人物的性格特征和成长经历。通过精心设计的场景和对话，让读者快速进入故事情境，为后续情节发展奠定坚实基础。' 
        },
        { 
          title: '第二章：转折', 
          description: '主人公的日常生活被突如其来的事件打破，遇到第一个重大挑战。这个转折点不仅考验着主人公的应变能力，也让他开始重新审视自己的价值观和人生目标。' 
        },
        { 
          title: '第三章：探索', 
          description: '主人公踏上探索真相的旅程，深入探讨作品的核心主题。通过大量的调查和思考，揭示更多细节和背景信息，引入多个关键角色，使故事变得更加立体丰满。' 
        },
        { 
          title: '第四章：冲突', 
          description: '矛盾全面激化，各方力量开始正面交锋，立场对立日益明显。主人公陷入两难境地，必须在理想和现实之间做出艰难抉择，情节发展跌宕起伏，充满张力。' 
        },
        { 
          title: '第五章：突破', 
          description: '在最绝望的时刻，主人公找到解决问题的关键线索，情节出现重大转机。通过巧妙的布局和前后呼应，早前埋下的伏笔在此得到解答，展现人性的光辉和坚韧。' 
        },
        { 
          title: '第六章：收尾', 
          description: '故事走向尾声，主要矛盾得到合理解决，各个人物的命运也有了明确的归属。全书核心观点在此得到升华和总结，给人以深刻的启示和感悟，余音绕梁。' 
        },
      ];
    case 'movie':
      return [
        { 
          title: '第一幕：开场', 
          description: '影片以引人入胜的场景开场，迅速建立故事背景和主要人物关系，通过视觉语言和音乐营造氛围，为后续剧情发展埋下伏笔。' 
        },
        { 
          title: '第二幕：发展', 
          description: '剧情逐渐展开，主人公面临一系列挑战和冲突，人物性格和动机得到深入刻画，情节走向变得复杂多变，观众的情绪被逐步调动。' 
        },
        { 
          title: '第三幕：高潮', 
          description: '矛盾冲突达到顶点，主人公必须做出关键抉择，影片节奏加快，视觉效果和音乐达到高潮，观众情绪被推向顶峰。' 
        },
        { 
          title: '第四幕：结局', 
          description: '故事收尾，所有线索得到合理收束，人物命运尘埃落定，主题思想得到升华，给观众留下深刻印象和思考空间。' 
        },
      ];
    case 'series':
      return [
        { 
          title: '第1集：初次相遇', 
          description: '主要角色首次登场，故事背景和基本设定介绍，核心冲突初现端倪，为整个系列奠定基调。' 
        },
        { 
          title: '第2集：矛盾升级', 
          description: '角色之间的关系变得复杂，新的挑战出现，剧情开始深入发展，观众对人物命运产生更多关注。' 
        },
        { 
          title: '第3集：关键转折', 
          description: '出现重大事件或发现，剧情方向发生改变，角色面临重要抉择，为后续发展埋下重要伏笔。' 
        },
        { 
          title: '第4集：危机处理', 
          description: '角色应对突发危机，展现各自的能力和性格特点，团队合作或个人成长成为重点，剧情紧张刺激。' 
        },
        { 
          title: '第5集：真相渐明', 
          description: '之前的谜团逐渐解开，隐藏的真相浮出水面，角色之间的关系发生变化，剧情进入新的阶段。' 
        },
        { 
          title: '第6集：最终对决', 
          description: '主要矛盾全面爆发，角色们面临终极挑战，胜负成败在此一举，剧情达到高潮。' 
        },
        { 
          title: '第7集：收尾与伏笔', 
          description: '本季故事基本收尾，主要冲突得到解决，同时为下一季埋下伏笔，给观众留下期待。' 
        },
      ];
    default:
      return [];
  }
}

