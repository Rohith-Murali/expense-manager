import React, { useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, X } from 'lucide-react';

const parseLocalDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const formatLocalDateTime = (date) => {
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const Dial = ({ type, value, onSelect }) => {
  const labels =
    type === 'hour'
      ? Array.from({ length: 12 }, (_, index) => String(index === 0 ? 12 : index))
      : Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));
  const numericValue = Number(value);
  const selectedPosition = type === 'hour' ? numericValue % 12 : numericValue;
  const angle = ((selectedPosition * (type === 'hour' ? 30 : 6) - 90) * Math.PI) / 180;
  const selectedX = 120 + 78 * Math.cos(angle);
  const selectedY = 120 + 78 * Math.sin(angle);

  const selectFromDial = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 240 - 120;
    const y = ((event.clientY - bounds.top) / bounds.height) * 240 - 120;
    let degrees = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (degrees < 0) degrees += 360;
    if (type === 'hour') {
      const position = Math.round(degrees / 30) % 12;
      onSelect(position === 0 ? 12 : position);
    } else {
      onSelect(Math.round(degrees / 6) % 60);
    }
  };

  return (
    <svg
      viewBox='0 0 240 240'
      role='slider'
      aria-label={type === 'hour' ? 'Select hour on clock' : 'Select minute on clock'}
      aria-valuenow={numericValue}
      aria-valuetext={type === 'hour' ? String(value) : String(value).padStart(2, '0')}
      tabIndex={0}
      onClick={selectFromDial}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowRight' && event.key !== 'ArrowDown' && event.key !== 'ArrowLeft') {
          return;
        }
        event.preventDefault();
        const increment = event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1 : -1;
        if (type === 'hour') onSelect(((numericValue - 1 + increment + 12) % 12) + 1);
        else onSelect((numericValue + increment + 60) % 60);
      }}
      className='mx-auto block h-60 w-60 max-w-full cursor-pointer touch-manipulation rounded-full outline-none focus:ring-2 focus:ring-indigo-500'
    >
      <circle cx='120' cy='120' r='108' className='fill-gray-100 dark:fill-slate-700' />
      {type === 'minute' &&
        Array.from({ length: 60 }, (_, minute) => {
          const tickAngle = ((minute * 6 - 90) * Math.PI) / 180;
          const innerRadius = minute % 5 === 0 ? 99 : 103;
          return (
            <line
              key={minute}
              x1={120 + innerRadius * Math.cos(tickAngle)}
              y1={120 + innerRadius * Math.sin(tickAngle)}
              x2={120 + 106 * Math.cos(tickAngle)}
              y2={120 + 106 * Math.sin(tickAngle)}
              className={minute % 5 === 0 ? 'stroke-gray-400 dark:stroke-slate-400' : 'stroke-gray-300 dark:stroke-slate-500'}
              strokeWidth={minute % 5 === 0 ? 2 : 1}
            />
          );
        })}
      <line x1='120' y1='120' x2={selectedX} y2={selectedY} className='stroke-indigo-500' strokeWidth='3' />
      <circle cx={selectedX} cy={selectedY} r='18' className='fill-indigo-600' />
      <circle cx='120' cy='120' r='5' className='fill-indigo-600' />
      {labels.map((label, index) => {
        const labelAngle = ((index * 30 - 90) * Math.PI) / 180;
        const x = 120 + 78 * Math.cos(labelAngle);
        const y = 120 + 78 * Math.sin(labelAngle);
        const isSelected = index === selectedPosition;
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor='middle'
            dominantBaseline='central'
            className={isSelected ? 'fill-white text-sm font-semibold' : 'fill-gray-800 text-sm dark:fill-gray-100'}
            pointerEvents='none'
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
};

const DateTimePickerModal = ({ initialValue, onApply, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(() => parseLocalDate(initialValue));
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const [stage, setStage] = useState('date');
  const [hour, setHour] = useState(((selectedDate.getHours() + 11) % 12) + 1);
  const [minute, setMinute] = useState(selectedDate.getMinutes());
  const [meridiem, setMeridiem] = useState(selectedDate.getHours() >= 12 ? 'PM' : 'AM');
  const days = useMemo(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [visibleMonth]);

  const updateDate = (day) => {
    setSelectedDate((current) => {
      const updated = new Date(current);
      updated.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
      return updated;
    });
    setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    setStage('hour');
  };
  const selectedIsSameDay = (day) =>
    selectedDate.getFullYear() === day.getFullYear() &&
    selectedDate.getMonth() === day.getMonth() &&
    selectedDate.getDate() === day.getDate();
  const selectedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${meridiem}`;
  const confirm = () => {
    const updated = new Date(selectedDate);
    const hour24 = hour % 12 + (meridiem === 'PM' ? 12 : 0);
    updated.setHours(hour24, minute, 0, 0);
    onApply(formatLocalDateTime(updated));
  };

  return (
    <div
      className='fixed inset-0 z-[1040] flex items-center justify-center bg-black/50 p-4'
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role='dialog'
        aria-modal='true'
        aria-labelledby='transaction-date-time-title'
        className='w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100'
      >
        <div className='mb-4 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            {stage !== 'date' && (
              <button type='button' onClick={() => setStage('date')} aria-label='Back to calendar' className='rounded p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'>
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 id='transaction-date-time-title' className='text-lg font-semibold'>
              {stage === 'date' ? 'Choose a date' : 'Choose a time'}
            </h2>
          </div>
          <button type='button' onClick={onClose} aria-label='Close date and time picker' className='rounded p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'>
            <X size={20} />
          </button>
        </div>
        {stage === 'date' ? (
          <>
            <div className='mb-3 flex items-center justify-between'>
              <button type='button' onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label='Previous month' className='rounded p-2 hover:bg-gray-100 dark:hover:bg-slate-700'>
                <ChevronLeft size={20} />
              </button>
              <h3 className='font-medium'>{visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
              <button type='button' onClick={() => setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label='Next month' className='rounded p-2 hover:bg-gray-100 dark:hover:bg-slate-700'>
                <ChevronRight size={20} />
              </button>
            </div>
            <div className='grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400' aria-hidden='true'>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day} className='py-2'>{day}</span>)}
            </div>
            <div className='grid grid-cols-7 gap-1'>
              {days.map((day) => (
                <button
                  type='button'
                  key={day.toISOString()}
                  onClick={() => updateDate(day)}
                  aria-pressed={selectedIsSameDay(day)}
                  aria-label={day.toLocaleDateString()}
                  className={`h-10 rounded-full text-sm ${
                    selectedIsSameDay(day)
                      ? 'bg-indigo-600 font-semibold text-white'
                      : day.getMonth() !== visibleMonth.getMonth()
                        ? 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                        : 'hover:bg-indigo-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {day.getDate()}
                </button>
              ))}
            </div>
            <div className='mt-4 flex items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-slate-700'>
              <span className='text-sm text-gray-600 dark:text-gray-300'>
                {selectedDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </span>
              <span className='inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
                <Clock3 size={16} /> Select a date to choose the time
              </span>
            </div>
          </>
        ) : (
          <>
            <p className='mb-3 text-center text-sm text-gray-500 dark:text-gray-400'>
              {selectedDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </p>
            <div className='mb-4 text-center text-3xl font-semibold tabular-nums'>
              {selectedTime}
            </div>
            <p className='mb-2 text-center text-sm text-gray-600 dark:text-gray-300'>
              {stage === 'hour' ? 'Select hour' : 'Select minute'}
            </p>
            <Dial
              type={stage === 'hour' ? 'hour' : 'minute'}
              value={stage === 'hour' ? hour : minute}
              onSelect={(value) => {
                if (stage === 'hour') {
                  setHour(value);
                  setStage('minute');
                } else {
                  setMinute(value);
                }
              }}
            />
            {stage === 'hour' ? (
              <div className='mt-3 flex justify-center gap-2'>
                {['AM', 'PM'].map((value) => (
                  <button
                    key={value}
                    type='button'
                    aria-pressed={meridiem === value}
                    onClick={() => setMeridiem(value)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      meridiem === value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            ) : (
              <button type='button' onClick={() => setStage('hour')} className='mx-auto mt-3 block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-300'>
                Change hour
              </button>
            )}
            <div className='mt-5 flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-slate-700'>
              <button type='button' onClick={onClose} className='rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700'>Cancel</button>
              <button type='button' onClick={confirm} disabled={stage !== 'minute'} className='rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50'>Apply</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default DateTimePickerModal;
