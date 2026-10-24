import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarCollapsed: false,
  isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  mobileSidebarOpen: false,
  theme: typeof window !== 'undefined' ? localStorage.getItem('expenseManager.theme') || 'light' : 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action) => {
      state.sidebarCollapsed = action.payload;
    },
    setIsMobile: (state, action) => {
      state.isMobile = action.payload;
    },
    setMobileSidebarOpen: (state, action) => {
      state.mobileSidebarOpen = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') localStorage.setItem('expenseManager.theme', state.theme);
    },
  },
});

export const { toggleSidebar, setSidebarCollapsed, setIsMobile, setMobileSidebarOpen, toggleTheme } =
  uiSlice.actions;
export default uiSlice.reducer;
