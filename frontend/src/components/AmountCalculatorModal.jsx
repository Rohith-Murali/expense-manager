import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const evaluateExpression = (expression) => {
  const input = expression.replace(/\s/g, '');
  const tokens = input.match(/\d*\.?\d+|[()+\-*/]/g) || [];
  if (!input || tokens.join('') !== input) return null;

  let position = 0;
  const parseFactor = () => {
    const token = tokens[position];
    if (token === '+' || token === '-') {
      position += 1;
      const value = parseFactor();
      return token === '-' ? -value : value;
    }
    if (token === '(') {
      position += 1;
      const value = parseExpression();
      if (tokens[position] !== ')') throw new Error('Invalid expression');
      position += 1;
      return value;
    }
    if (!token || !/^\d*\.?\d+$/.test(token)) throw new Error('Invalid expression');
    position += 1;
    return Number(token);
  };
  const parseTerm = () => {
    let value = parseFactor();
    while (tokens[position] === '*' || tokens[position] === '/') {
      const operator = tokens[position];
      position += 1;
      const right = parseFactor();
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  };
  const parseExpression = () => {
    let value = parseTerm();
    while (tokens[position] === '+' || tokens[position] === '-') {
      const operator = tokens[position];
      position += 1;
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  try {
    const result = parseExpression();
    if (position !== tokens.length || !Number.isFinite(result)) return null;
    return Number(result.toPrecision(12)).toString();
  } catch {
    return null;
  }
};

const AmountCalculatorModal = ({ initialValue, onApply, onClose }) => {
  const [expression, setExpression] = useState('0');
  const [error, setError] = useState('');

  useEffect(() => {
    setExpression(initialValue === '' || initialValue == null ? '0' : String(initialValue));
  }, [initialValue]);

  const append = (value) => {
    setExpression((current) => {
      if (/^\d$/.test(value)) {
        return current === '0' ? value : `${current}${value}`;
      }
      if (value === '.') {
        const currentNumber = current.split(/[+\-*/()]/).at(-1) || '';
        if (currentNumber.includes('.')) return current;
        if (currentNumber === '0' && current === '0') return '0.';
        return currentNumber ? `${current}.` : `${current}0.`;
      }
      if (value === '(') {
        if (current === '0') return '(';
        return `${current}${/[\d)]$/.test(current) ? '*' : ''}${value}`;
      }
      if (value === ')') return `${current}${value}`;
      if (/[+\-*/]$/.test(current)) {
        return `${current.slice(0, -1)}${value}`;
      }
      return `${current}${value}`;
    });
    setError('');
  };

  const applyResult = () => {
    const result = evaluateExpression(expression);
    if (result === null) {
      setError('Enter a valid calculation before applying.');
      return;
    }
    setExpression(result);
    setError('');
  };

  const confirm = () => {
    const result = evaluateExpression(expression);
    if (result === null) {
      setError('Enter a valid calculation before applying.');
      return;
    }
    onApply(result);
  };

  const buttons = [
    { label: 'C', action: () => setExpression('0'), style: 'text-red-600' },
    {
      label: 'Del',
      action: () => setExpression((current) => current.slice(0, -1) || '0'),
      name: 'Delete last character',
    },
    { label: '(', action: () => append('(') },
    { label: ')', action: () => append(')') },
    ...['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+'].map(
      (label) => ({
        label,
        action:
          label === '='
            ? applyResult
            : () => append(({ '÷': '/', '×': '*', '−': '-' })[label] || label),
        style: ['÷', '×', '−', '+'].includes(label) ? 'text-indigo-700' : '',
      }),
    ),
  ];

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
        aria-labelledby='amount-calculator-title'
        className='w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100'
      >
        <div className='mb-4 flex items-center justify-between'>
          <h2 id='amount-calculator-title' className='text-lg font-semibold'>
            Calculate amount
          </h2>
          <button type='button' onClick={onClose} aria-label='Close calculator' className='rounded p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'>
            <X size={20} />
          </button>
        </div>
        <label className='sr-only' htmlFor='amount-calculator-expression'>
          Calculation
        </label>
        <input
          id='amount-calculator-expression'
          autoFocus
          inputMode='decimal'
          value={expression}
          onChange={(event) => {
            setExpression(event.target.value);
            setError('');
          }}
          className='mb-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-right text-2xl text-gray-900 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100'
          aria-invalid={Boolean(error)}
        />
        <div className='grid grid-cols-4 gap-2'>
          {buttons.map((button, index) => (
            <button
              key={`${button.name || button.label}-${index}`}
              type='button'
              aria-label={button.name}
              onClick={() => {
                button.action();
                if (button.label === 'C') setError('');
              }}
              className={`flex h-12 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-lg font-medium hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 ${button.style || ''}`}
            >
              {button.label}
            </button>
          ))}
        </div>
        {error && <p className='mt-3 text-sm text-red-600' role='alert'>{error}</p>}
        <div className='mt-5 flex justify-end gap-2'>
          <button type='button' onClick={onClose} className='rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700'>
            Cancel
          </button>
          <button type='button' onClick={confirm} className='rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700'>
            Apply
          </button>
        </div>
      </section>
    </div>
  );
};

export default AmountCalculatorModal;
