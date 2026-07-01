import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { setIsMobile, setMobileSidebarOpen } from '../../store/slices/uiSlice';

const Layout = ({ children }) => {
  const dispatch = useDispatch();
  const { sidebarCollapsed, isMobile, mobileSidebarOpen } = useSelector((state) => state.ui);

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 768;
      dispatch(setIsMobile(nextIsMobile));

      if (!nextIsMobile) {
        dispatch(setMobileSidebarOpen(false));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  const mainMarginClass = isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-20' : 'ml-64';

  return (
    <div className='min-h-screen bg-background overflow-x-hidden'>
      <Sidebar />
      <Topbar />

      {isMobile && mobileSidebarOpen && (
        <button
          type='button'
          aria-label='Close navigation'
          onClick={() => dispatch(setMobileSidebarOpen(false))}
          className='fixed inset-0 z-30 bg-black/40 md:hidden'
        />
      )}

      <main className={`pt-16 transition-all duration-300 min-h-screen ${mainMarginClass}`}>
        <div className='p-3 pb-8 sm:p-6'>{children}</div>
      </main>
    </div>
  );
};

export default Layout;
