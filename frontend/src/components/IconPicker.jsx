import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { ICON_GROUPS, ICON_FALLBACK, resolveIconName } from '../config/iconRegistry';

const IconPicker = ({ value, onChange, disabled = false, label = 'Choose icon' }) => {
  const [open, setOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const triggerRef = useRef(null);
  const selected = resolveIconName(value || ICON_FALLBACK);

  const updatePopoverPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 288;
    const height = 430;
    const gap = 8;
    const top = window.innerHeight - rect.bottom < height + gap
      ? Math.max(gap, rect.top - height - gap)
      : rect.bottom + gap;
    const left = Math.min(Math.max(gap, rect.left), window.innerWidth - width - gap);
    setPopoverPosition({ top, left });
  };

  useEffect(() => {
    if (!open) return undefined;
    updatePopoverPosition();
    const handleViewportChange = () => updatePopoverPosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  return (
    <div className='relative shrink-0'>
      <button
        type='button'
        ref={triggerRef}
        disabled={disabled}
        aria-label={`${label}. Selected ${selected}`}
        aria-expanded={open}
        title='Change icon'
        className={`flex h-10 w-10 items-center justify-center rounded-lg border bg-white transition hover:scale-105 hover:bg-gray-50 ${open ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'}`}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name={selected} size={21} className='text-primary-600' />
      </button>

      {open && popoverPosition && createPortal(
        <div
          className='fixed z-[1200] max-h-[min(430px,calc(100vh-16px))] w-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-xl'
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
        >
          <div className='mb-2 flex items-center justify-between'>
            <span className='text-xs font-semibold uppercase tracking-wide text-gray-500'>{label}</span>
            <button type='button' className='text-xs text-gray-400 hover:text-gray-700' onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className='space-y-3'>
            {ICON_GROUPS.map((group) => (
              <div key={group.label}>
                <div className='mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600'>
                  <span className='h-2 w-2 rounded-full' style={{ backgroundColor: group.color }} />
                  {group.label}
                </div>
                <div className='grid grid-cols-7 gap-1'>
                  {group.icons.map((name) => (
                    <button
                      key={name}
                      type='button'
                      aria-label={name}
                      title={name}
                      className={`flex h-8 items-center justify-center rounded-md transition hover:bg-gray-100 ${selected === name ? 'bg-gray-100 ring-2 ring-primary-400' : ''}`}
                      onClick={() => { onChange(name); setOpen(false); }}
                    >
                      <Icon name={name} size={18} style={{ color: group.color }} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default IconPicker;
