import { createBrowserRouter } from 'react-router';
import ListPage from './pages/ListPage';
import DetailPage from './pages/DetailPage';
import CreatePage from './pages/CreatePage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: ListPage,
  },
  {
    path: '/detail/:id',
    Component: DetailPage,
  },
  {
    path: '/create',
    Component: CreatePage,
  },
]);
