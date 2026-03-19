import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  X,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { storage } from '../utils/storage';
import { mockMatchItem, generateDetailedContent } from '../utils/mockData';
import { Item, ItemType } from '../types';
import { PageTransition } from '../components/PageTransition';

const typeLabels = {
  book: '书',
  movie: '影',
  series: '剧',
};

const typeColors = {
  book: 'bg-orange-50 text-orange-700',
  movie: 'bg-blue-50 text-blue-700',
  series: 'bg-purple-50 text-purple-700',
};

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedReason, setEditedReason] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [chapters, setChapters] = useState<Array<{ title: string; description: string }>>([]);
  const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadItem = async () => {
      setIsLoading(true);
      if (id) {
        const foundItem = await storage.getItemById(id);
        if (foundItem) {
          setItem(foundItem);
          setEditedReason(foundItem.reason);
          setChapters(foundItem.chapters || []);
        } else {
          navigate('/');
        }
      }
      setIsLoading(false);
    };

    loadItem();
  }, [id, navigate]);

  if (!item) {
    return <div>加载中...</div>;
  }

  const handleToggleStatus = async () => {
    const newStatus = item.status === 'watched' ? 'unwatched' : 'watched';
    await storage.updateItem(item.id, { status: newStatus });
    setItem({ ...item, status: newStatus });
  };

  const handleSaveReason = async () => {
    await storage.updateItem(item.id, { reason: editedReason });
    setItem({ ...item, reason: editedReason });
    setIsEditing(false);
  };

  const handleAddTag = async () => {
    if (newTag.trim()) {
      const newTags = [...item.tags, newTag.trim()];
      await storage.updateItem(item.id, { tags: newTags });
      setItem({ ...item, tags: newTags });
      setNewTag('');
      setShowAddTag(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = item.tags.filter((tag) => tag !== tagToRemove);
    await storage.updateItem(item.id, { tags: newTags });
    setItem({ ...item, tags: newTags });
  };

  const handleGenerateChapters = async () => {
    setIsGeneratingChapters(true);
    
    try {
      // 调用新的生成详细内容函数
      const generatedChapters = await generateDetailedContent(item.title, item.type, item.duration);
      setChapters(generatedChapters);
      
      // 保存生成的章节到storage
      await storage.updateItem(item.id, { chapters: generatedChapters });
      setItem({ ...item, chapters: generatedChapters });
    } catch (error) {
      console.error('生成详细内容失败:', error);
      // 失败时使用默认数据
      setChapters([]);
    } finally {
      setIsGeneratingChapters(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '未知';
    
    const formatTime = (totalMinutes: number) => {
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      
      if (item.type === 'book') {
        if (hours > 0) {
          return `${hours}h`;
        }
        return `${mins}m`;
      }
      
      if (hours > 0) {
        if (mins > 0) {
          return `${hours}h${mins}m`;
        }
        return `${hours}h`;
      }
      return `${mins}m`;
    };
    
    if (item.type === 'book') {
      return formatTime(minutes);
    }
    if (item.type === 'series') {
      // 检查是否为舞剧/音乐剧（通过标签判断）
      const isDanceOrMusical = item.tags.some(tag => 
        tag.includes('舞剧') || tag.includes('音乐剧')
      );
      
      if (isDanceOrMusical) {
        // 舞剧/音乐剧使用电影的时长格式
        return formatTime(minutes);
      } else {
        // 普通电视剧使用原来的格式
        const episodes = Math.floor(minutes / 50);
        const avgMinutes = Math.floor(minutes / episodes);
        return `约 ${episodes} 集 × ${formatTime(avgMinutes)}`;
      }
    }
    // 电影类型
    return formatTime(minutes);
  };

  const getMatchStatusDisplay = () => {
    switch (item.matchStatus) {
      case 'matched':
        return (
          <div className="text-sm text-gray-600">
            来源：{item.source?.name || '豆瓣'}
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-1.5 text-orange-600 text-sm">
            <AlertCircle size={16} />
            <span>作品确认，点此核对</span>
          </div>
        );
      case 'unidentified':
        return (
          <div className="flex items-center gap-1.5 text-gray-500 text-sm">
            <AlertCircle size={16} />
            <span>未识别，点此补充链接</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1.5 text-red-600 text-sm">
            <AlertCircle size={16} />
            <span>生成失败，点此重试</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <PageTransition isLoading={isLoading}>
      <div className="min-h-screen bg-gray-50">
        {/* 导航栏 */}
        <div className="bg-white border-b fixed top-0 left-0 right-0 z-10">
          <div className="px-4 py-4 flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1 hover:bg-gray-100 rounded-full">
              <ArrowLeft size={24} className="text-gray-700" />
            </button>
            <h1 className="text-lg font-medium">详情</h1>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6 pt-20">
        {/* 基础信息区 */}
        <div className="bg-white rounded-lg p-4 space-y-3 mb-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={item.status === 'watched'}
                onChange={handleToggleStatus}
                className="w-5 h-5 rounded border-2 border-gray-300 text-green-500 focus:outline-none cursor-pointer"
              />
            </label>
            <div className="flex-1 flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">{item.title}</h2>
              <span
                onClick={() => setShowTypeModal(true)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[item.type]}`}
              >
                {typeLabels[item.type]}
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-600 text-sm flex-shrink-0">
              <Clock size={14} />
              <span>{formatDuration(item.duration)}</span>
            </div>
          </div>
        </div>

        {/* 三件套区 */}
        {item.matchStatus === 'matched' && (
          <>
            {/* 1 分钟要点 */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">1 分钟要点</h3>
                <button
                  onClick={handleGenerateChapters}
                  disabled={isGeneratingChapters}
                  className="text-xs text-blue-500 hover:text-blue-600 disabled:opacity-50"
                >
                  {isGeneratingChapters ? '生成中...' : '生成更多'}
                </button>
              </div>
              <ul className="space-y-2">
                {(item.keyPoints || []).map((point, index) => (
                  <li key={index} className="flex gap-3 text-sm text-gray-700 pl-2">
                    <span className="text-gray-400">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 内容详情 */}
            {chapters.length > 0 && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {item.type === 'book' ? '章节详情' : item.type === 'movie' ? '剧情结构' : '剧集详情'}
                </h3>
                <div className="space-y-3">
                  {chapters.map((chapter, index) => (
                    <div key={index} className="border-l-2 border-blue-500 pl-3">
                      <h4 className="text-sm font-medium text-gray-900 mb-1">{chapter.title}</h4>
                      <p className="text-xs text-gray-600">{chapter.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 来源链接（书籍类型不显示） */}
            {item.source && item.type !== 'book' && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">来源链接</h3>
                <a
                  href={item.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm text-gray-700">{item.source.name}</span>
                  <ExternalLink size={16} className="text-gray-400" />
                </a>
              </div>
            )}
          </>
        )}

        {/* 可编辑内容区 */}
        {/* 一句话原因 */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">备注</h3>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editedReason}
                onChange={(e) => setEditedReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveReason}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setEditedReason(item.reason);
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 当只有文字时，只显示文字 */}
              {item.reason && (!item.links || item.links.length === 0) && (
                <p className="text-sm text-gray-700 whitespace-pre-line">{item.reason}</p>
              )}
              
              {/* 当只有链接时，只显示链接 */}
              {!item.reason && item.links && item.links.length > 0 && (
                <div className="space-y-2">
                  {item.links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm text-gray-700">{link.name}</span>
                      <ExternalLink size={16} className="text-gray-400" />
                    </a>
                  ))}
                </div>
              )}
              
              {/* 当文字和链接都有时，分开显示 */}
              {item.reason && item.links && item.links.length > 0 && (
                <>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{item.reason}</p>
                  <div className="mt-3 space-y-2">
                    {item.links.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <span className="text-sm text-gray-700">{link.name}</span>
                        <ExternalLink size={16} className="text-gray-400" />
                      </a>
                    ))}
                  </div>
                </>
              )}
              
              {/* 当没有备注和链接时，显示提示 */}
              {!item.reason && (!item.links || item.links.length === 0) && (
                <p className="text-sm text-gray-500">点击添加原因</p>
              )}
              
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                编辑
              </button>
            </div>
          )}
        </div>

        {/* 标签 */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">标签</h3>
            <button
              onClick={() => setShowAddTag(true)}
              className="flex items-center gap-1 text-blue-500 text-sm font-medium hover:text-blue-600"
            >
              <Plus size={16} />
              <span>添加</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <div
                key={tag}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
              >
                <span>{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X size={14} className="text-gray-500" />
                </button>
              </div>
            ))}
            {item.tags.length === 0 && (
              <p className="text-sm text-gray-500">暂无标签</p>
            )}
          </div>
          {showAddTag && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="输入标签名称"
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
              >
                添加
              </button>
              <button
                onClick={() => {
                  setShowAddTag(false);
                  setNewTag('');
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div className="flex gap-3 pb-6">
          <button
            onClick={() => {
              // 复制标题到剪贴板
              navigator.clipboard.writeText(item.title).then(() => {
                console.log('标题已复制到剪贴板:', item.title);
              }).catch(err => {
                console.error('复制失败:', err);
              });
              
              if (item.type === 'book') {
                // 书籍类型总是跳转到微信读书
                const encodedTitle = encodeURIComponent(item.title);
                // 使用微信读书的搜索链接
                window.open(`https://weread.qq.com/?q=${encodedTitle}`, '_blank');
              } else if (item.source?.url) {
                // 其他类型使用source链接
                window.open(item.source.url, '_blank');
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 h-11 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600"
          >
            <ExternalLink size={18} />
            <span>{item.type === 'book' ? '去读书' : item.type === 'movie' ? '去观影' : '去追剧'}</span>
          </button>
        </div>
      </div>

      {/* 类型修改模态框 */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-4/5 max-w-sm">
            <h3 className="text-lg font-medium mb-4">修改类型</h3>
            <div className="space-y-3">
              {(['book', 'movie', 'series'] as ItemType[]).map((type) => (
                <button
                  key={type}
                  onClick={async () => {
                    if (item) {
                      // 先更新类型
                      storage.updateItem(item.id, { type });
                      setItem({ ...item, type });
                      setShowTypeModal(false);
                      
                      // 重新生成内容
                      try {
                        const newContent = await mockMatchItem(item.title, type);
                        if (newContent) {
                          // 更新生成的内容
                          const updatedItem = {
                            ...item,
                            type,
                            matchStatus: newContent.matchStatus || item.matchStatus,
                            duration: newContent.duration || item.duration,
                            keyPoints: newContent.keyPoints || item.keyPoints,
                            tags: newContent.tags || item.tags,
                            source: newContent.source || item.source,
                            links: newContent.links || item.links,
                          };
                          storage.updateItem(item.id, updatedItem);
                          setItem(updatedItem);
                        }
                      } catch (error) {
                        console.error('重新生成内容失败:', error);
                      }
                    }
                  }}
                  className={`w-full px-4 py-3 rounded-lg flex items-center gap-2 ${item?.type === type ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}`}
                >
                  <span className={`w-5 h-5 rounded text-xs font-medium flex items-center justify-center ${typeColors[type]}`}>
                    {typeLabels[type]}
                  </span>
                  <span>{typeLabels[type]}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTypeModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        </div>
      )}
      </div>
    </PageTransition>
  );
}