import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoadingSpinner } from './LoadingSpinner';

interface PageTransitionProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

// 页面过渡组件
export const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  isLoading = false 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // 进入时的动画
    setIsVisible(true);
    
    return () => {
      // 离开时的动画
      setIsVisible(false);
    };
  }, []);

  return (
    <div className="relative">
      {/* 主内容区域 */}
      <div 
        className={`transition-all duration-500 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        {children}
      </div>
      
      {/* 加载中遮罩 */}
      {isLoading && createPortal(
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600 font-medium">加载中...</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// 页面加载状态上下文
import { createContext, useContext, useReducer } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

type LoadingAction = { type: 'SET_LOADING'; payload: boolean };

const loadingReducer = (state: boolean, action: LoadingAction): boolean => {
  switch (action.type) {
    case 'SET_LOADING':
      return action.payload;
    default:
      return state;
  }
};

interface LoadingProviderProps {
  children: React.ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, dispatch] = useReducer(loadingReducer, false);

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading }}>
      {children}
    </LoadingContext.Provider>
  );
};