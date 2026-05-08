import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

/**
 * Validate req.body against a Zod schema.
 * Returns 400 with the first validation error if invalid.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors[0]?.message ?? "Validation error";
      res.status(400).json({ success: false, message });
      return;
    }
    req.body = result.data; // replace with parsed + sanitized data
    next();
  };
}
