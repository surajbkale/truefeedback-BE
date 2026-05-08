import type { Response } from "express";

interface ApiResponseOptions {
  success: boolean;
  message: string;
  data?: unknown;
  statusCode?: number;
}

export function sendResponse(
  res: Response,
  { success, message, data, statusCode = 200 }: ApiResponseOptions
): Response {
  return res.status(statusCode).json({
    success,
    message,
    ...(data !== undefined && { data }),
  });
}

export function sendSuccess(
  res: Response,
  message: string,
  data?: unknown,
  statusCode = 200
): Response {
  return sendResponse(res, { success: true, message, data, statusCode });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  data?: unknown
): Response {
  return sendResponse(res, { success: false, message, data, statusCode });
}
