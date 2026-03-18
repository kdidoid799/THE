import React, { useState, useRef } from 'react';
import { Clock, AlertCircle, HelpCircle, XCircle, Trash2 } from 'lucide-react';
import { Item, ItemType } from '../types';
import { useNavigate } from 'react-router';
import { storage } from '../utils/storage';

interface ItemCardProps {
  item: Item;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

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

export function ItemCard({ item, onToggleStatus, onDelete }: ItemCardProps) {
  const navigate = useNavigate();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    // 阻止事件冒泡到ListPage
    e.stopPropagation();
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
  };

  // 处理触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    // 阻止事件冒泡到ListPage
    e.stopPropagation();
    if (!isDraggingRef.current) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    
    // 只在水平滑动时阻止页面滚动
    if (Math.abs(diff) > 5) {
      e.preventDefault();
    }
    
    // 允许左右滑动，最大滑动距离为60px
    if (diff < 0) {
      // 向左滑动
      setSwipeOffset(Math.max(diff, -60));
    } else if (swipeOffset < 0) {
      // 向右滑动（只有在已经向左滑动的情况下）
      setSwipeOffset(Math.min(diff + swipeOffset, 0));
    }
  };

  // 处理触摸结束
  const handleTouchEnd = (e: React.TouchEvent) => {
    // 阻止事件冒泡到ListPage
    e.stopPropagation();
    isDraggingRef.current = false;
    // 如果滑动距离超过30px，保持打开状态
    if (swipeOffset < -30) {
      setSwipeOffset(-60);
    } else {
      setSwipeOffset(0);
    }
  };

  // 处理删除
  const handleDelete = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  // 点击卡片时重置滑动状态
  const handleCardClick = () => {
    if (swipeOffset < 0) {
      setSwipeOffset(0);
    } else {
      navigate(`/detail/${item.id}`);
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

  const getMatchStatusBadge = () => {
    switch (item.matchStatus) {
      case 'pending':
      case 'unidentified':
        return (
          <div className="flex items-center text-orange-600">
            <AlertCircle size={14} />
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center text-red-600">
            <XCircle size={14} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* 删除按钮 */}
      <div className="absolute top-2 right-2 bottom-2 w-16 bg-red-500 flex items-center justify-center rounded-lg">
        <button 
          onClick={handleDelete}
          className="text-white p-1"
        >
          <Trash2 size={18} />
        </button>
      </div>
      
      {/* 卡片内容 */}
      <div
        ref={cardRef}
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow transition-transform relative z-10"
      >
      {/* 上行：checkbox、标题和时长 */}
      <div className="flex items-center gap-3 mb-3">
        <label
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="flex items-center cursor-pointer w-5 flex-shrink-0"
        >
          <input
            type="checkbox"
            checked={item.status === 'watched'}
            onChange={() => onToggleStatus(item.id)}
            className="w-5 h-5 rounded border-2 border-gray-300 text-green-500 focus:outline-none cursor-pointer"
          />
        </label>
        <h3 className="flex-1 font-medium text-gray-900">{item.title}</h3>
        <div className="flex items-center gap-1 text-gray-600 text-sm flex-shrink-0">
          <Clock size={14} />
          <span>{formatDuration(item.duration)}</span>
        </div>
      </div>

      {/* 下行：类型、要点和状态 */}
      <div className="flex items-start gap-3">
        <span
          onClick={(e) => {
            e.stopPropagation();
            setShowTypeModal(true);
          }}
          className={`w-5 flex-shrink-0 h-5 rounded text-xs font-medium flex items-center justify-center ${typeColors[item.type]} cursor-pointer hover:opacity-80`}
        >
          {typeLabels[item.type]}
        </span>
        <div className="flex-1 flex items-end justify-between gap-2">
          <div className="text-sm text-gray-600">
            {item.keyPoints.length > 0 ? item.keyPoints.join('；') : '暂无要点'}
          </div>
          <div className="flex-shrink-0 self-end">
            {getMatchStatusBadge()}
          </div>
        </div>
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
                  onClick={() => {
                    storage.updateItem(item.id, { type });
                    setShowTypeModal(false);
                    // 触发父组件的状态更新
                    window.location.reload();
                  }}
                  className={`w-full px-4 py-3 rounded-lg flex items-center gap-2 ${item.type === type ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}`}
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
  );
}