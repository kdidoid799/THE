import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd())
  
  console.log('Vite env:', env);
  
  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    // 配置代理解决CORS问题
    server: {
      proxy: {
        // 代理ARK API请求
        '/api/ark': {
          target: 'https://ark.cn-beijing.volces.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ark/, ''),
          headers: {
            'Authorization': `Bearer ${env.VITE_ARK_API_KEY}`,
          },
        },
      },
    },

    // 配置构建输出目录为dist
    build: {
      outDir: 'dist',
    },
  }
})
