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
      
      return data || [];
    } catch (error) {
      console.error('Error in getItems:', error);
      return [];
    }
  },

  async addItem(item: Item): Promise<void> {
    try {
      const { error } = await supabase
        .from('items')
        .insert(item);
      
      if (error) {
        console.error('Error adding item:', error);
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
      
      let updateData = { ...updates };
      
      // 特殊处理links字段，确保用户输入的链接不会被覆盖
      if (updates.links && currentItem.links && currentItem.links.length > 0) {
        // 合并链接：保留用户输入的链接，添加系统生成的平台链接
        const userLinks = currentItem.links;
        const platformLinks = updates.links;
        // 去重：避免重复的链接
        const combinedLinks = [...userLinks];
        platformLinks.forEach(platformLink => {
          if (!combinedLinks.some(userLink => userLink.url === platformLink.url)) {
            combinedLinks.push(platformLink);
          }
        });
        updateData = { ...updates, links: combinedLinks };
      }
      
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
      
      return data;
    } catch (error) {
      console.error('Error in getItemById:', error);
      return undefined;
    }
  },
};
