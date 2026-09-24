import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../../config/app.constants';
import { isSafeRequestId } from '../utils/request-id.util';

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.header(REQUEST_ID_HEADER);
  const requestId = isSafeRequestId(incoming) ? incoming : randomUUID();

  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
