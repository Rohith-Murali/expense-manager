import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { setIsMobile } from '../../store/slices/uiSlice';

const Layout = ({ children }) => {
  const dispatch = useDispatch();
  const { sidebarCollapsed } = useSelector((state) => state.ui);

  useEffect(() => {
    const handleResize = () => {
      dispatch(setIsMobile(window.innerWidth < 768));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  return (
    <div className='min-h-screen bg-background'>
      <Sidebar />
      <Topbar />

      <main
        className={`pt-16 transition-all duration-300 min-h-screen ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <div className='p-6'>{children}</div>
      </main>
    </div>
  );
};

export default Layout;
