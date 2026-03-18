import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Filter, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { SegmentedControl } from '../components/SegmentedControl';
import { ItemCard } from '../components/ItemCard';
import { FilterModal, TagFilter, DurationFilter } from '../components/FilterModal';
import { storage } from '../utils/storage';
import { initialMockData } from '../utils/mockData';
import { Item, ItemType, DurationFilter as DurationFilterType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Button, Box } from '@mui/material';

export default function ListPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // 检查用户是否登录
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // 如果用户未登录，显示加载状态
  if (!user) {
    return null;
  }
  const [items, setItems] = useState<Item[]>([]);
  const [selectedType, setSelectedType] = useState<ItemType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [durationFilter, setDurationFilter] = useState<DurationFilterType>('all');
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [showDurationFilter, setShowDurationFilter] = useState(false);
  
  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    // 存储触摸起始位置
    (e.touches[0] as any).startX = e.touches[0].clientX;
    (e.touches[0] as any).startY = e.touches[0].clientY;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    // 获取触摸起始位置
    const startX = (e.touches[0] as any).startX;
    const startY = (e.touches[0] as any).startY;
    
    if (startX === undefined || startY === undefined) return;
    
    // 计算滑动距离
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = Math.abs(currentX - startX);
    const diffY = Math.abs(currentY - startY);
    
    // 如果是水平滑动且滑动距离大于5px，阻止默认行为
    if (diffX > diffY && diffX > 5) {
      e.preventDefault();
    }
  };

  // 初始化数据
  useEffect(() => {
    const initData = async () => {
      const storedItems = await storage.getItems();
      if (storedItems.length === 0) {
        // 如果没有数据，使用模拟数据初始化
        for (const item of initialMockData) {
          await storage.addItem(item);
        }
        setItems(initialMockData);
      } else {
        setItems(storedItems);
      }
    };
    
    initData();
  }, []);

  // 切换观看状态
  const handleToggleStatus = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      const newStatus = item.status === 'watched' ? 'unwatched' : 'watched';
      await storage.updateItem(id, { status: newStatus });
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
      );
    }
  };

  // 删除记录
  const handleDeleteItem = async (id: string) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      await storage.deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  // 获取所有可用标签
  const availableTags = Array.from(
    new Set(items.flatMap((item) => item.tags))
  ).filter(Boolean);

  // 过滤项目
  const filteredItems = items.filter((item) => {
    // 类型筛选
    if (selectedType !== 'all' && item.type !== selectedType) {
      return false;
    }

    // 搜索
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchKeyPoints = item.keyPoints.some((point) =>
        point.toLowerCase().includes(query)
      );
      const matchReason = item.reason.toLowerCase().includes(query);
      if (!matchTitle && !matchKeyPoints && !matchReason) {
        return false;
      }
    }

    // 标签筛选
    if (selectedTags.length > 0) {
      const hasTag = selectedTags.some((tag) => item.tags.includes(tag));
      if (!hasTag) {
        return false;
      }
    }

    // 时长筛选
    if (durationFilter !== 'all') {
      if (durationFilter === 'short' && item.duration >= 60) {
        return false;
      }
      if (durationFilter === 'medium' && (item.duration < 60 || item.duration >= 120)) {
        return false;
      }
      if (durationFilter === 'long' && item.duration < 120) {
        return false;
      }
    }

    return true;
  });

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div 
      className="min-h-screen bg-gray-50 pb-20"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* 导航栏 */}
      <div className="bg-white border-b fixed top-0 left-0 right-0 z-10">
        <div className="px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl text-[#000000] font-[Kumbh_Sans]">Which <span>next</span></h1>
          <Button 
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            startIcon={<LogOut size={16} />}
            variant="outlined"
            size="small"
            sx={{ borderRadius: '9999px' }}
          >
            登出
          </Button>
        </div>
      </div>

      {/* 筛选区 */}
      <div className="bg-white px-4 py-4 space-y-3 border-b pt-20">
        {/* Segmented Control */}
        <SegmentedControl
          options={[
            { value: 'all', label: '全部' },
            { value: 'book', label: '书' },
            { value: 'movie', label: '影' },
            { value: 'series', label: '剧' },
          ]}
          value={selectedType}
          onChange={(value) => setSelectedType(value as ItemType)}
        />

        {/* 搜索栏 */}
        <div className="flex items-center gap-2 w-full h-11 px-3 bg-gray-50 rounded-lg">
          <Search className="text-gray-400 flex-shrink-0" size={18} />
          <input
            type="text"
            placeholder="搜索标题、要点或原因"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0"
          />
        </div>

        {/* 筛选按钮 */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowTagFilter(true)}
            className="flex items-center justify-center gap-1.5 h-10 px-4 min-w-[96px] bg-gray-100 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Filter size={16} className="flex-shrink-0" />
            <span>标签{selectedTags.length > 0 && ` (${selectedTags.length})`}</span>
          </button>
          <button
            onClick={() => setShowDurationFilter(true)}
            className="flex items-center justify-center gap-1.5 h-10 px-4 min-w-[96px] bg-gray-100 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Clock size={16} className="flex-shrink-0" />
            <span>时长</span>
          </button>
        </div>
      </div>

      {/* 列表区域 */}
      <div className="px-4 py-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {items.length === 0 ? '暂无记录，点击下方 + 号添加' : '没有找到匹配的记录'}
          </div>
        ) : (
          filteredItems
            .sort((a, b) => {
              // 已打勾的排在后面
              if (a.status === 'watched' && b.status !== 'watched') return 1;
              if (a.status !== 'watched' && b.status === 'watched') return -1;
              // 按照创建时间倒序排序（最近的在前）
              return b.createdat - a.createdat;
            })
            .map((item) => (
              <ItemCard key={item.id} item={item} onToggleStatus={handleToggleStatus} onDelete={handleDeleteItem} />
            ))
        )}
      </div>

      {/* 悬浮按钮 */}
      <button
        onClick={() => navigate('/create')}
        className="fixed bottom-6 right-6 w-14 h-14 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors bg-[#000000] z-50"
      >
        <Plus size={24} strokeWidth={3} />
      </button>

      {/* 标签筛选模态框 */}
      <FilterModal
        isOpen={showTagFilter}
        onClose={() => setShowTagFilter(false)}
        title="筛选标签"
      >
        {availableTags.length === 0 ? (
          <p className="text-center text-gray-500 py-4">暂无可用标签</p>
        ) : (
          <TagFilter
            availableTags={availableTags}
            selectedTags={selectedTags}
            onToggleTag={handleToggleTag}
          />
        )}
      </FilterModal>

      {/* 时长筛选模态框 */}
      <FilterModal
        isOpen={showDurationFilter}
        onClose={() => setShowDurationFilter(false)}
        title="筛选时长"
      >
        <DurationFilter
          selected={durationFilter}
          onSelect={(value) => {
            setDurationFilter(value as DurationFilterType);
            setShowDurationFilter(false);
          }}
        />
      </FilterModal>
    </div>
  );
}