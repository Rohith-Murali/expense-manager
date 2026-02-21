const isProd = import.meta.env && import.meta.env.PROD;

function format(level, ...args) {
  const ts = new Date().toISOString();
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  return `${ts} ${level.toUpperCase()}: ${msg}`;
}

export const logger = {
  info: (...args) => console.log(format('info', ...args)),
  warn: (...args) => console.warn(format('warn', ...args)),
  error: (...args) => console.error(format('error', ...args)),
  debug: (...args) => { if (!isProd) console.debug(format('debug', ...args)); }
};

export default logger;
