import { createClient } from '@supabase/supabase-js';

// 从环境变量获取Supabase配置（不带VITE_前缀）
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// 初始化Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function handler(req, res) {
  // 处理不同类型的请求
  if (req.method === 'POST') {
    const { action, data } = req.body;
    
    // 根据action执行不同的Supabase操作
    switch (action) {
      case 'signIn':
        return handleSignIn(req, res);
      case 'signUp':
        return handleSignUp(req, res);
      case 'signOut':
        return handleSignOut(req, res);
      case 'getUser':
        return handleGetUser(req, res);
      case 'getSession':
        return handleGetSession(req, res);
      case 'query':
        return handleQuery(req, res, data);
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// 处理登录
async function handleSignIn(req, res) {
  try {
    const { email, password } = req.body.data;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.status(200).json({ data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// 处理注册
async function handleSignUp(req, res) {
  try {
    const { email, password, options } = req.body.data;
    const { data, error } = await supabase.auth.signUp({ email, password, options });
    if (error) throw error;
    res.status(200).json({ data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// 处理获取会话
async function handleGetSession(req, res) {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    res.status(200).json({ data: session });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// 处理登出
async function handleSignOut(req, res) {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// 获取用户信息
async function handleGetUser(req, res) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

// 处理查询
async function handleQuery(req, res, data) {
  try {
    const { table, operation, ...params } = data;
    let result;
    
    switch (operation) {
      case 'select':
        result = await supabase.from(table).select(params.query);
        break;
      case 'insert':
        result = await supabase.from(table).insert(params.values);
        break;
      case 'update':
        result = await supabase.from(table).update(params.values).eq(params.key, params.value);
        break;
      case 'delete':
        result = await supabase.from(table).delete().eq(params.key, params.value);
        break;
      default:
        return res.status(400).json({ error: 'Unknown operation' });
    }
    
    if (result.error) throw result.error;
    res.status(200).json({ data: result.data });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}