type Level = 'debug' | 'info' | 'warn' | 'error';

const levelPriority: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold: Level = process.env.LOG_LEVEL as Level ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function emit(level: Level, message: string, meta?: unknown) {
  if (levelPriority[level] < levelPriority[threshold]) return;
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...(meta !== undefined ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => emit('debug', message, meta),
  info: (message: string, meta?: unknown) => emit('info', message, meta),
  warn: (message: string, meta?: unknown) => emit('warn', message, meta),
  error: (message: string, meta?: unknown) => emit('error', message, meta),
};
