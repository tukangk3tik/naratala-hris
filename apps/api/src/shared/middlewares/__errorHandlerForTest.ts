import type { ErrorRequestHandler } from 'express';
import { toHttp } from '../errors/index.js';

export const errorHandlerForTest: ErrorRequestHandler = (err, _req, res, _next) => {
  const http = toHttp(err);
  res.status(http.status).json(http.body);
};
