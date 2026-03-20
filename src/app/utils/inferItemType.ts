import { Item } from '../types';

export type InferredItemType = Item['type'];

interface InferParams {
  title: string;
  reason: string;
}

// 使用大模型根据标题和原因推断类型：book / movie / series
export async function inferItemType({ title, reason }: InferParams): Promise<InferredItemType> {
  const apiKey = import.meta.env.VITE_ARK_API_KEY;
  console.log('[inferItemType] API Key:', apiKey);
  console.log('[inferItemType] 环境变量:', import.meta.env);

  // 如果标题为"未命名链接"，直接返回默认类型，避免不必要的 API 调用
  if (title === '未命名链接') {
    console.log('[inferItemType] 标题为"未命名链接"，直接返回默认类型 book');
    return 'book';
  }
  
  // 检查是否为从URL提取的通用标题
  const urlBasedTitles = ['豆瓣电影', '小红书笔记'];
  if (urlBasedTitles.includes(title)) {
    console.log('[inferItemType] 标题为URL提取的通用标题，直接返回默认类型 book');
    return 'book';
  }
  
  // 检查是否为音乐剧或舞剧，归类到剧
  const musicalKeywords = ['音乐剧', '舞剧'];
  const hasMusicalKeyword = musicalKeywords.some(keyword => title.includes(keyword));
  if (hasMusicalKeyword) {
    console.log('[inferItemType] 标题包含音乐剧或舞剧关键词，归类到 series');
    return 'series';
  }

  // 如果没有配置 key，就默认按书处理，避免整个流程中断
  if (!apiKey) {
    // 打印当前可用的环境变量 key，帮助排查命名问题
    // 这里不会输出你的密钥内容
    // eslint-disable-next-line no-console
    console.warn('[inferItemType] VITE_ARK_API_KEY 未配置，当前 env keys:', JSON.stringify(Object.keys(import.meta.env)));
    console.warn('[inferItemType] VITE_ARK_API_KEY 未配置，使用默认类型 book');
    return 'book';
  }

  try {
    console.log('[inferItemType] 开始推断类型', { title, reason, apiKey: !!apiKey });
    // 构建请求数据
  const payload = {
    model: 'doubao-seed-2-0-pro-260215',
    messages: [
      {
        role: 'user',
        content: `你是一个分类助手。根据用户提供的标题和一句话原因/链接，判断它是"书籍、电影、剧集"中的哪一类。只输出一个英文单词：book、movie 或 series。\n标题: ${title}\n原因或链接: ${reason || '（无）'}`,
      },
    ],
  };

  // 使用代理路径调用API，Authorization头由代理处理
  const apiUrl = '/api/ark/api/v3/chat/completions';
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

    console.log('[inferItemType] Ark 响应状态', response.status);
    
    // 处理错误响应，避免 response.json() 抛出异常
    if (!response.ok) {
      try {
        const data = await response.json();
        console.error('[inferItemType] Ark 请求失败', response.status, data);
      } catch (e) {
        console.error('[inferItemType] Ark 请求失败，无法解析响应', response.status);
      }
      // 认证错误时返回默认值，确保应用正常运行
      if (response.status === 401) {
        console.warn('[inferItemType] API 认证失败，返回默认值');
      }
      return 'book';
    }
    
    const data = await response.json();
    console.log('[inferItemType] Ark 响应数据', JSON.stringify(data, null, 2));
    
    // 详细检查响应结构
    console.log('[inferItemType] 检查 output 存在:', !!data.output);
    console.log('[inferItemType] 检查 output.text 存在:', !!data.output?.text);
    console.log('[inferItemType] 检查 choices 存在:', !!data.choices);
    console.log('[inferItemType] 检查 content 存在:', !!data.content);
    console.log('[inferItemType] content 类型:', typeof data.content);
    console.log('[inferItemType] content 长度:', Array.isArray(data.content) ? data.content.length : 'N/A');
    console.log('[inferItemType] 检查 message 存在:', !!data.message);
    console.log('[inferItemType] 检查 message.content 存在:', !!data.message?.content);
    console.log('[inferItemType] message.content 类型:', typeof data.message?.content);
    console.log('[inferItemType] message.content 长度:', Array.isArray(data.message?.content) ? data.message.content.length : 'N/A');
    
    // 尝试从不同路径获取响应内容
    let raw: string | undefined;
    if (data.output?.text) {
      raw = data.output.text.trim().toLowerCase();
      console.log('[inferItemType] 从 output.text 获取响应:', raw);
    } else if (data.choices?.[0]?.message?.content) {
      raw = data.choices[0].message.content.trim().toLowerCase();
      console.log('[inferItemType] 从 choices 获取响应:', raw);
    } else if (Array.isArray(data.content) && data.content[0]?.type === 'output_text' && data.content[0]?.text) {
      raw = data.content[0].text.trim().toLowerCase();
      console.log('[inferItemType] 从 content[0].text 获取响应:', raw);
    } else if (Array.isArray(data.message?.content) && data.message.content[0]?.type === 'output_text' && data.message.content[0]?.text) {
      raw = data.message.content[0].text.trim().toLowerCase();
      console.log('[inferItemType] 从 message.content[0].text 获取响应:', raw);
    } else if (Array.isArray(data.output)) {
      // 查找 output 数组中 type 为 "message" 的对象
      const messageOutput = data.output.find(item => item.type === 'message');
      if (messageOutput && Array.isArray(messageOutput.content)) {
        // 查找 content 数组中 type 为 "output_text" 的对象
        const outputText = messageOutput.content.find(item => item.type === 'output_text');
        if (outputText && outputText.text) {
          raw = outputText.text.trim().toLowerCase();
          console.log('[inferItemType] 从 output[message].content[output_text].text 获取响应:', raw);
        }
      }
    } else {
      raw = undefined;
      console.log('[inferItemType] 无法获取响应内容');
    }
    console.log('[inferItemType] 原始响应', raw);

    if (raw === 'book' || raw === 'movie' || raw === 'series') {
      console.log('[inferItemType] 推断类型成功', raw);
      return raw;
    }

    // 简单兼容一下多余文字的情况
    // 如果同时包含书和剧集，优先判定为书
    if (raw?.includes('book')) {
      console.log('[inferItemType] 推断类型成功（兼容）', 'book');
      return 'book';
    }
    if (raw?.includes('movie')) {
      console.log('[inferItemType] 推断类型成功（兼容）', 'movie');
      return 'movie';
    }
    if (raw?.includes('series')) {
      console.log('[inferItemType] 推断类型成功（兼容）', 'series');
      return 'series';
    }

    console.log('[inferItemType] 推断类型失败，返回默认值 book');
    return 'book';
  } catch (e) {
    console.error('inferItemType error', e);
    return 'book';
  }
}

