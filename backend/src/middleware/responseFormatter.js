export function responseFormatter(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // If response already declares `success`, normalize fields to the canonical shape
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'success')) {
      const success = Boolean(body.success);

      // Prefer `data`, but allow `result` or `payload` as aliases
      const data = Object.prototype.hasOwnProperty.call(body, 'data')
        ? body.data
        : Object.prototype.hasOwnProperty.call(body, 'result')
          ? body.result
          : Object.prototype.hasOwnProperty.call(body, 'payload')
            ? body.payload
            : (success ? (body.data ?? null) : null);

      const message = body.message ?? body.msg ?? null;
      const errors = body.errors ?? body.error ?? null;

      // Collect any extra fields into `meta` to avoid losing useful info (e.g. timestamp)
      const meta = {};
      for (const key in body) {
        if (!['success', 'data', 'result', 'payload', 'message', 'msg', 'errors', 'error'].includes(key)) {
          meta[key] = body[key];
        }
      }

      const normalized = { success, data, message, errors };
      if (Object.keys(meta).length) normalized.meta = meta;
      return originalJson(normalized);
    }

    // For other shapes (primitives, arrays, objects without `success`) wrap as success:true
    const wrapped = {
      success: true,
      data: body,
      message: null,
      errors: null
    };

    return originalJson(wrapped);
  };

  next();
}

export default responseFormatter;