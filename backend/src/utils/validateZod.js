export function validateZod(schema) {
  return (req, res, next) => {
    try {
      const result = schema.parse({ body: req.body, query: req.query, params: req.params });
      req.validated = result;
      next();
    } catch (err) {
      next(err);
    }
  };
}
