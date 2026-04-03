import openApiSpec from './openapi-public';
import { createError } from './error-handler';
import { isExternalApiEnabled } from './env';

export function assertExternalApiEnabled() {
  if (!isExternalApiEnabled) {
    throw createError.notFound('External API is disabled');
  }
}

export function getOpenApiSpecForOrigin(origin: string) {
  return {
    ...openApiSpec,
    servers: [
      {
        url: origin,
      },
    ],
  };
}
