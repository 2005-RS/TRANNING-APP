#!/usr/bin/env bash
# Starts a throwaway MinIO on localhost:9100 with one private bucket, using the
# OBJECT_STORAGE_* variables of the calling job.
set -euo pipefail

: "${MINIO_IMAGE:?}" "${OBJECT_STORAGE_ACCESS_KEY_ID:?}" "${OBJECT_STORAGE_SECRET_ACCESS_KEY:?}"
: "${OBJECT_STORAGE_BUCKET:?}" "${OBJECT_STORAGE_REGION:?}"

docker run -d --name minio -p 9100:9000 \
  -e MINIO_ROOT_USER="$OBJECT_STORAGE_ACCESS_KEY_ID" \
  -e MINIO_ROOT_PASSWORD="$OBJECT_STORAGE_SECRET_ACCESS_KEY" \
  "$MINIO_IMAGE" server /tmp/minio-data

if ! timeout 60 bash -c 'until curl -sf http://localhost:9100/minio/health/live > /dev/null; do sleep 2; done'; then
  docker logs minio
  exit 1
fi

# New buckets are private; no anonymous policy is added.
AWS_ACCESS_KEY_ID="$OBJECT_STORAGE_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$OBJECT_STORAGE_SECRET_ACCESS_KEY" \
AWS_DEFAULT_REGION="$OBJECT_STORAGE_REGION" \
  aws --endpoint-url http://localhost:9100 s3api create-bucket --bucket "$OBJECT_STORAGE_BUCKET"
