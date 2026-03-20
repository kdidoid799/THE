import { createClient } from '@supabase/supabase-js';

// 从环境变量获取Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 初始化Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase };