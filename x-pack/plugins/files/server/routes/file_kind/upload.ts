/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { ReplaySubject } from 'rxjs';
import type { Ensure } from '@kbn/utility-types';
import { Readable } from 'stream';
import type { FileKind } from '../../../common/types';
import type { UploadFileKindHttpEndpoint } from '../../../common/api_routes';
import { FILES_API_ROUTES } from '../api_routes';
import { fileErrors } from '../../file';
import { getById } from './helpers';
import type { FileKindRouter, FileKindsRequestHandler } from './types';

export const method = 'put' as const;

export const bodySchema = schema.stream();
type Body = TypeOf<typeof bodySchema>;

export const querySchema = schema.object({
  selfDestructOnAbort: schema.maybe(schema.boolean()),
});
type Query = Ensure<UploadFileKindHttpEndpoint['inputs']['query'], TypeOf<typeof querySchema>>;

export const paramsSchema = schema.object({
  id: schema.string(),
});
type Params = Ensure<UploadFileKindHttpEndpoint['inputs']['params'], TypeOf<typeof paramsSchema>>;

type Response = UploadFileKindHttpEndpoint['output'];

export const handler: FileKindsRequestHandler<Params, Query, Body> = async (
  { files, fileKind },
  req,
  res
) => {
  // Ensure that we are listening to the abort stream as early as possible.
  // In local testing I found that there is a chance for us to miss the abort event
  // if we subscribe too late.
  const abort$ = new ReplaySubject();
  const sub = req.events.aborted$.subscribe(abort$);

  const { fileService } = await files;
  const { logger } = fileService;
  const {
    body: stream,
    params: { id },
  } = req;
  const { error, result: file } = await getById(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  try {
    await file.uploadContent(stream as Readable, abort$);
  } catch (e) {
    if (
      e instanceof fileErrors.ContentAlreadyUploadedError ||
      e instanceof fileErrors.UploadInProgressError
    ) {
      return res.badRequest({ body: { message: e.message } });
    } else if (e instanceof fileErrors.AbortedUploadError) {
      fileService.usageCounter?.('UPLOAD_ERROR_ABORT');
      fileService.logger.error(e);
      if (req.query.selfDestructOnAbort) {
        logger.info(
          `File (id: ${file.id}) upload aborted. Deleting file due to self-destruct flag.`
        );
        file.delete(); // fire and forget
      }
      return res.customError({ body: { message: e.message }, statusCode: 499 });
    }
    throw e;
  } finally {
    sub.unsubscribe();
  }
  const body: Response = { ok: true, size: file.data.size! };
  return res.ok({ body });
};

const fourMiB = 4 * 1024 * 1024;

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.create) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getUploadRoute(fileKind.id),
        validate: {
          body: bodySchema,
          params: paramsSchema,
        },
        options: {
          tags: fileKind.http.create.tags,
          body: {
            output: 'stream',
            parse: false,
            accepts: fileKind.allowedMimeTypes ?? 'application/octet-stream',
            maxBytes: fileKind.maxSizeBytes ?? fourMiB,
          },
        },
      },
      handler
    );
  }
}
