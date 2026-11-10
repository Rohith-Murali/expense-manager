const isProd = import.meta.env && import.meta.env.PROD;

function format(level, ...args) {
  const ts = new Date().toISOString();
  const msg = args
    .map((a) => {
      if (a instanceof Error) {
        return JSON.stringify({ name: a.name, message: a.message, stack: a.stack });
      }
      if (a && typeof a === 'object') {
        return JSON.stringify({
          ...a,
          response: a.response
            ? { status: a.response.status, data: a.response.data }
            : undefined,
        });
      }
      return String(a);
    })
    .join(' ');
  return `${ts} ${level.toUpperCase()}: ${msg}`;
}

export const logger = {
  info: (...args) => {
    if (!isProd) console.log(format('info', ...args));
  },
  warn: (...args) => {
    if (!isProd) console.warn(format('warn', ...args));
  },
  error: (...args) => {
    if (!isProd) console.error(format('error', ...args));
  },
  debug: (...args) => {
    if (!isProd) console.log(format('debug', ...args));
  },
  reportUnexpected: (message, error, errorInfo) => {
    if (isProd) {
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      console.error(format('error', message, errorName));
      return;
    }

    console.error(format('error', message, error, errorInfo));
  },
};

export default logger;
