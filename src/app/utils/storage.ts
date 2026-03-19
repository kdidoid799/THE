import { Item } from '../types';
import { supabase } from './supabase';

export const storage = {
  async getItems(): Promise<Item[]> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Error fetching items:', error);
        return [];
      }
      
      // 确保使用正确的字段名和所有必填字段
      return (data || []).map(item => ({
        id: item.id,
        title: item.title || '',
        type: item.type || 'movie',
        status: item.status || 'unwatched',
        matchStatus: item.matchStatus || 'unidentified',
        duration: item.duration || 0,
        keyPoints: item.keyPoints || [],
        reason: item.reason || '',
        tags: item.tags || [],
        source: item.source,
        links: item.links || [],
        chapters: item.chapters || [],
        createdat: item.createdAt ? new Date(item.createdAt).getTime() : Date.now()
      }));
    } catch (error) {
      console.error('Error in getItems:', error);
      return [];
    }
  },

  async addItem(item: Item): Promise<void> {
    try {
      // 确保只插入数据库中存在的字段
      const itemWithCorrectField = {
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        matchStatus: item.matchStatus,
        duration: item.duration,
        keyPoints: item.keyPoints,
        reason: item.reason,
        tags: item.tags,
        source: item.source,
        links: item.links,
        chapters: item.chapters || []
        // 不需要指定createdAt，数据库会自动设置默认值
      };
      
      console.log('Adding item:', itemWithCorrectField);
      
      const { error } = await supabase
        .from('items')
        .insert(itemWithCorrectField);
      
      if (error) {
        console.error('Error adding item:', error);
      } else {
        console.log('Item added successfully');
      }
    } catch (error) {
      console.error('Error in addItem:', error);
    }
  },

  async updateItem(id: string, updates: Partial<Item>): Promise<void> {
    try {
      // 先获取当前项目
      const { data: currentItem, error: fetchError } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching item for update:', fetchError);
        return;
      }
      
      // 确保项目存在
      if (!currentItem) {
        console.error('Item not found for update:', id);
        return;
      }
      
      // 准备更新数据，确保包含所有需要的字段
      let updateData = { ...updates };
      
      // 特殊处理links字段，确保用户输入的链接不会被覆盖
      if (updateData.links && currentItem.links && currentItem.links.length > 0) {
        // 合并链接：保留用户输入的链接，添加系统生成的平台链接
        const userLinks = currentItem.links;
        const platformLinks = updateData.links;
        // 去重：避免重复的链接
        const combinedLinks = [...userLinks];
        platformLinks.forEach(platformLink => {
          if (!combinedLinks.some(userLink => userLink.url === platformLink.url)) {
            combinedLinks.push(platformLink);
          }
        });
        updateData = { ...updateData, links: combinedLinks };
      }
      
      // 移除createdat字段，因为数据库会自动处理
      delete updateData.createdat;
      
      const { error } = await supabase
        .from('items')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('Error updating item:', error);
      }
    } catch (error) {
      console.error('Error in updateItem:', error);
    }
  },

  async deleteItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting item:', error);
      }
    } catch (error) {
      console.error('Error in deleteItem:', error);
    }
  },

  async getItemById(id: string): Promise<Item | undefined> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching item by id:', error);
        return undefined;
      }
      
      // 确保使用正确的字段名和所有必填字段
      if (data) {
        return {
          id: data.id,
          title: data.title || '',
          type: data.type || 'movie',
          status: data.status || 'unwatched',
          matchStatus: data.matchStatus || 'unidentified',
          duration: data.duration || 0,
          keyPoints: data.keyPoints || [],
          reason: data.reason || '',
          tags: data.tags || [],
          source: data.source,
          links: data.links || [],
          chapters: data.chapters || [],
          createdat: data.createdAt ? new Date(data.createdAt).getTime() : Date.now()
        };
      }
      
      return data;
    } catch (error) {
      console.error('Error in getItemById:', error);
      return undefined;
    }
  },
};
