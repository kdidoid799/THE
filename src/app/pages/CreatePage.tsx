import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { X, Mic } from 'lucide-react';
import { SegmentedControl } from '../components/SegmentedControl';
import { storage } from '../utils/storage';
import { mockMatchItem } from '../utils/mockData';
import { Item } from '../types';
import { inferItemType } from '../utils/inferItemType';

type InputMode = 'text' | 'voice';

export default function CreatePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<InputMode>('text');
  const [title, setTitle] = useState('');
  const [reasonOrLink, setReasonOrLink] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 从链接中提取标题的函数
  const extractTitleFromLink = (link: string): string => {
    // 简单的链接解析逻辑
    // 实际项目中可能需要更复杂的解析
    try {
      const url = new URL(link);
      // 从URL中提取可能的标题信息
      // 这里只是一个简单的实现，实际项目中可能需要根据不同网站的结构进行解析
      const pathParts = url.pathname.split('/').filter(part => part);
      if (pathParts.length > 0) {
        // 尝试从路径中提取标题
        const lastPart = pathParts[pathParts.length - 1];
        // 替换连字符或下划线为空格，并首字母大写
        return lastPart.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      return '';
    } catch (error) {
      return '';
    }
  };

  // 从URL中提取有意义信息的函数
  const extractInfoFromUrl = (url: string): { title: string; description: string } => {
    // 处理豆瓣电影链接
    const doubanMovieMatch = url.match(/https:\/\/movie\.douban\.com\/subject\/(\d+)\/?/);
    if (doubanMovieMatch) {
      return { title: '豆瓣电影', description: url };
    }
    
    // 处理小红书链接
    const xiaohongshuMatch = url.match(/https:\/\/www\.xiaohongshu\.com\/.*?\/(\w+)/);
    if (xiaohongshuMatch) {
      return { title: '小红书笔记', description: url };
    }
    
    // 处理其他链接
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, '');
      return { title: hostname, description: url };
    } catch {
      return { title: '', description: url };
    }
  };

  // 抓取网页内容的函数
  const fetchWebContent = async (url: string): Promise<{ title: string; description: string }> => {
    // 首先尝试从URL中提取信息作为备选
    const fallbackInfo = extractInfoFromUrl(url);
    
    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];
    
    for (const proxyUrl of proxies) {
      try {
        console.log('[fetchWebContent] 开始抓取网页内容', url, '使用代理', proxyUrl);
        const response = await fetch(proxyUrl, {
          timeout: 10000, // 10秒超时
        });
        
        if (!response.ok) {
          console.error('[fetchWebContent] 请求失败', response.status, '尝试下一个代理');
          continue;
        }
        
        const data = await response.json();
        const html = data.contents || data;
        
        // 提取标题
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : fallbackInfo.title;
        
        // 提取描述
        const descriptionMatch = html.match(/<meta name="description" content="(.*?)"/i);
        const description = descriptionMatch ? descriptionMatch[1].trim() : fallbackInfo.description;
        
        console.log('[fetchWebContent] 提取结果', { title, description });
        return { title, description };
      } catch (error) {
        console.error('[fetchWebContent] 抓取失败', error, '尝试下一个代理');
        // 继续尝试下一个代理
      }
    }
    
    // 所有代理都失败时，使用从URL提取的信息
    console.log('[fetchWebContent] 所有代理都失败，使用URL提取的信息', fallbackInfo);
    return fallbackInfo;
  };

  const handleSave = async () => {
    // 验证标题和原因/链接至少有一个
    if (!title.trim() && !reasonOrLink.trim()) {
      alert('请输入标题或原因/链接');
      return;
    }

    setIsSaving(true);

    // 从链接中提取标题和内容（如果输入的是链接）
    let finalTitle = title.trim();
    let finalReason = reasonOrLink.trim();
    let linkName = '链接';
    let webContent = null;
    
    // 检查是否是链接
    const isLink = /^https?:\/\//i.test(reasonOrLink.trim());
    
    // 如果是链接且没有输入标题，才从链接爬取信息
    if (isLink && !finalTitle) {
      console.log('[handleSave] 检测到链接且未输入标题，开始抓取网页内容');
      webContent = await fetchWebContent(reasonOrLink.trim());
      
      // 使用抓取到的标题
      if (webContent.title) {
        finalTitle = webContent.title;
        linkName = webContent.title;
        console.log('[handleSave] 使用抓取到的标题:', finalTitle);
      }
      
      // 如果抓取到了描述且不是链接本身，使用描述作为原因
      if (webContent.description && webContent.description !== reasonOrLink.trim()) {
        finalReason = webContent.description;
        console.log('[handleSave] 使用抓取到的描述:', finalReason);
      } else {
        finalReason = '';
      }
    } else if (!finalTitle) {
      // 如果不是链接且没有标题，使用链接提取逻辑
      finalTitle = extractTitleFromLink(reasonOrLink.trim()) || '未命名';
    }
    
    // 如果是链接且已输入标题，使用标题作为链接名称
    if (isLink && finalTitle) {
      linkName = finalTitle;
      // 链接不保存到备注字段
      finalReason = '';
    }

    // 使用大模型推断类型
    const inferredType = await inferItemType({
      title: finalTitle,
      reason: finalReason,
    });

    // 检查是否存在相同标题和类型的词条
    const existingItems = await storage.getItems();
    const duplicateItem = existingItems.find(item => item.title === finalTitle && item.type === inferredType);
    
    if (duplicateItem) {
      // 显示提示信息
      alert('该作品已经记录');
      setIsSaving(false);
      return;
    }

    // 创建新记录
    const newItem: Item = {
      id: Date.now().toString(),
      title: finalTitle,
      type: inferredType,
      status: 'unwatched',
      matchStatus: 'unidentified',
      duration: 0,
      keyPoints: [],
      reason: finalReason || '暂无原因',
      tags: [], // 初始为空数组，避免显示不必要的标签
      links: isLink ? [{ name: linkName, url: reasonOrLink.trim() }] : [],
      createdAt: Date.now(),
    };

    // 立即保存到Supabase
    await storage.addItem(newItem);

    // 模拟后台匹配
    try {
      const updates = await mockMatchItem(finalTitle, inferredType);
      await storage.updateItem(newItem.id, updates);
    } catch (error) {
      console.error('匹配失败:', error);
      storage.updateItem(newItem.id, { matchStatus: 'failed' });
    }

    setIsSaving(false);
    navigate('/');
  };

  // 语音识别相关状态
  const [recognition, setRecognition] = useState<any>(null);
  const [recognizedText, setRecognizedText] = useState(''); // 存储识别的原始文字
  
  const handleVoiceRecord = async () => {
    if (isRecording) {
      // 停止语音识别
      if (recognition) {
        recognition.stop();
      }
      setIsRecording(false);
    } else {
      try {
        // 检查浏览器是否支持语音识别
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          const newRecognition = new SpeechRecognition();
          
          newRecognition.lang = 'zh-CN';
          newRecognition.continuous = false;
          newRecognition.interimResults = true; // 启用实时识别
          
          // 实时识别结果处理
          newRecognition.onresult = async (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              console.log('实时语音识别结果:', transcript);
              
              // 实时显示识别的文字
              setRecognizedText(transcript);
              
              // 如果识别已完成
              if (event.results[i].isFinal) {
                // 调用AI总结生成标题和理由
                const summary = await summarizeVoiceContent(transcript);
                setTitle(summary.title);
                setReasonOrLink(summary.reason);
              }
            }
          };
          
          newRecognition.onerror = (event: any) => {
            console.error('语音识别错误:', event.error);
            setIsRecording(false);
          };
          
          newRecognition.onend = () => {
            setIsRecording(false);
          };
          
          // 保存识别实例
          setRecognition(newRecognition);
          
          // 开始语音识别
          newRecognition.start();
          setIsRecording(true);
        } else {
          // 浏览器不支持语音识别
          alert('您的浏览器不支持语音识别功能');
        }
      } catch (error) {
        console.error('语音识别错误:', error);
        alert('无法启动语音识别，请检查麦克风权限');
        setIsRecording(false);
      }
    }
  };
  
  // 根据语音识别内容生成标题和理由
  const summarizeVoiceContent = async (content: string): Promise<{ title: string; reason: string }> => {
    const apiKey = import.meta.env.VITE_ARK_API_KEY;

    // 没有配置 key 时，直接返回原始内容
    if (!apiKey) {
      console.warn('VITE_ARK_API_KEY 未配置，跳过AI总结');
      return { title: content, reason: '由语音识别生成' };
    }

    try {
      console.log('[summarizeVoiceContent] 开始生成标题和理由', { content, apiKey: !!apiKey });
      const response = await fetch('/api/ark/responses', {
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
                  text: `你是一个信息整理助手。根据用户提供的语音识别内容，分析并提取出作品的标题和推荐理由。标题应该只包含作品的名字，不要添加类型（如电视剧、电影、书等），也不要添加书名号《》。理由应该概括用户的主要想法。只返回JSON格式，包含title和reason两个字段。\n内容: ${content}`,

                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error('AI总结请求失败', response.status);
        return { title: content, reason: '由语音识别生成' };
      }

      const data = await response.json();
      let summaryContent: string | undefined;

      // 尝试从不同路径获取响应内容
      if (data.output?.text) {
        summaryContent = data.output.text.trim();
      } else if (data.choices?.[0]?.message?.content) {
        summaryContent = data.choices[0].message.content.trim();
      } else if (Array.isArray(data.content) && data.content[0]?.type === 'output_text' && data.content[0]?.text) {
        summaryContent = data.content[0].text.trim();
      } else if (Array.isArray(data.message?.content) && data.message.content[0]?.type === 'output_text' && data.message.content[0]?.text) {
        summaryContent = data.message.content[0].text.trim();
      } else if (Array.isArray(data.output)) {
        const messageOutput = data.output.find((item: any) => item.type === 'message');
        if (messageOutput && Array.isArray(messageOutput.content)) {
          const outputText = messageOutput.content.find((item: any) => item.type === 'output_text');
          if (outputText && outputText.text) {
            summaryContent = outputText.text.trim();
          }
        }
      }

      if (!summaryContent) {
        console.error('无法获取AI总结内容');
        return { title: content, reason: '由语音识别生成' };
      }

      // 清理响应内容中的多余反引号
      const cleanedContent = summaryContent.replace(/`/g, '');
      let parsed: any = null;

      try {
        parsed = JSON.parse(cleanedContent);
      } catch (e) {
        console.error('JSON解析失败', e);
        return { title: content, reason: '由语音识别生成' };
      }

      return {
        title: parsed.title || content,
        reason: parsed.reason || '由语音识别生成',
      };
    } catch (error) {
      console.error('AI总结错误', error);
      return { title: content, reason: '由语音识别生成' };
    }
  };

  // 处理音频文件识别（备用方案）


  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <div className="bg-white border-b fixed top-0 left-0 right-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-medium">新建作品</h1>
          <div className="w-8" /> {/* 占位，保持标题居中 */}
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 pt-20">
        {/* 模式切换 */}
        <SegmentedControl
          options={[
            { value: 'text', label: '文本' },
            { value: 'voice', label: '语音' },
          ]}
          value={mode}
          onChange={(value) => setMode(value as InputMode)}
        />

        {mode === 'text' ? (
          /* 文本模式 */
          <div className="space-y-4">
            {/* 标题输入 */}
            <div className="bg-white rounded-lg p-4">
              <label className="block font-medium text-gray-900 mb-2">
                标题
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入片名/书名（可选）"
                className="w-full h-12 px-4 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 原因或链接 */}
            <div className="bg-white rounded-lg p-4">
              <label className="block font-medium text-gray-900 mb-2">
                一句话原因或粘贴链接
              </label>
              <textarea
                value={reasonOrLink}
                onChange={(e) => setReasonOrLink(e.target.value)}
                placeholder="为什么想看？或粘贴小红书/豆瓣链接"
                className="w-full min-h-[120px] px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-2">
                支持粘贴小红书/豆瓣等链接，自动提取标题和原因
              </p>
            </div>
          </div>
        ) : (
          /* 语音模式 */
          <div className="space-y-4">
            {/* 录音按钮 */}
            <div className="bg-white rounded-lg p-8 flex flex-col items-center">
              <button
                onClick={handleVoiceRecord}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white shadow-lg`}
              >
                <Mic size={40} />
              </button>
              <p className="mt-4 text-sm text-gray-600">
                {isRecording ? '正在录音...' : '按住说话'}
              </p>
              <p className="mt-2 text-xs text-gray-500 text-center">
                {isRecording 
                  ? '请说出作品名称和想看的原因' 
                  : '例如："标题：流浪地球3，原因：想看看中国科幻的新高度"'}
              </p>
              {/* 显示识别的文字 */}
              {recognizedText && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md w-full max-w-sm">
                  <p className="text-sm text-gray-800">{recognizedText}</p>
                </div>
              )}
            </div>

            {/* 识别结果 */}
            {(title || reasonOrLink) && (
              <>
                <div className="bg-white rounded-lg p-4">
                  <label className="block font-medium text-gray-900 mb-2">
                    标题
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="由语音识别填入，可修改"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-white rounded-lg p-4">
                  <label className="block font-medium text-gray-900 mb-2">
                    一句话原因
                  </label>
                  <textarea
                    value={reasonOrLink}
                    onChange={(e) => setReasonOrLink(e.target.value)}
                    placeholder="由语音识别填入，可修改"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={isSaving || (!title.trim() && !reasonOrLink.trim())}
          className="w-full h-11 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}
