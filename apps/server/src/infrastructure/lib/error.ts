import { z } from 'zod';

export const ErrorSchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
});

export const BadRequestErrorSchema = ErrorSchema;

export const NotFoundErrorSchema = ErrorSchema;

export const UnauthorizedErrorSchema = ErrorSchema;

export const ForbiddenErrorSchema = ErrorSchema;

export const InternalServerErrorSchema = ErrorSchema;

export const ConflictErrorSchema = ErrorSchema;
