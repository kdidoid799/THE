import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import { PageTransition } from '../components/PageTransition';
import { storage } from '../utils/storage';
import { mockMatchItem } from '../utils/mockData';
import { Item } from '../types';
import { inferItemType } from '../utils/inferItemType';

export default function CreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [reasonOrLink, setReasonOrLink] = useState('');
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
        // 使用AbortController实现超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        const response = await fetch(proxyUrl, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
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
    let webContent: { title: string; description: string } = { title: '', description: '' };
    
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
      }
      // 不需要else分支，因为webContent始终有值
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
      createdat: Date.now(),
    };

    // 立即保存到Supabase
    try {
      await storage.addItem(newItem);
      console.log('保存成功');

      // 模拟后台匹配
      try {
        const updates = await mockMatchItem(finalTitle, inferredType);
        await storage.updateItem(newItem.id, updates);
        console.log('匹配成功');
      } catch (error) {
        console.error('匹配失败:', error);
        await storage.updateItem(newItem.id, { matchStatus: 'failed' });
      }

      setIsSaving(false);
      navigate('/');
    } catch (error) {
      console.error('保存失败:', error);
      alert(`保存失败: ${error.message || '未知错误'}`);
      setIsSaving(false);
    }
  };




  return (
    <PageTransition>
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
        {/* 文本输入区域 */}
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
              placeholder="输入片名/书名"
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
              placeholder="为什么想看？"
              className="w-full min-h-[120px] px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={4}
            />
          </div>
        </div>

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
    </PageTransition>
  );
}
