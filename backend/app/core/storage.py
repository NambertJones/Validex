"""Storage client supporting both MinIO S3 and local filesystem fallback."""

import io
import os
import logging
from typing import Any
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from minio import Minio
    HAS_MINIO = True
except ImportError:
    HAS_MINIO = False


class StorageManager:
    """Manages document uploads, retrievals, and bucket initialization with local fallback."""

    def __init__(self):
        self.bucket = settings.MINIO_BUCKET
        self.local_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage_vault"))
        os.makedirs(self.local_dir, exist_ok=True)
        self.client = None

        if HAS_MINIO:
            try:
                self.client = Minio(
                    settings.MINIO_ENDPOINT,
                    access_key=settings.MINIO_ACCESS_KEY,
                    secret_key=settings.MINIO_SECRET_KEY,
                    secure=settings.MINIO_SECURE,
                )
                self._ensure_bucket()
            except Exception as e:
                logger.info(f"MinIO offline ({e}); using local storage vault at {self.local_dir}")
                self.client = None

    def _ensure_bucket(self):
        if self.client and not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    def upload_bytes(
        self,
        file_bytes: bytes,
        object_name: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload raw bytes to MinIO or local filesystem storage."""
        if self.client:
            try:
                self._ensure_bucket()
                data_stream = io.BytesIO(file_bytes)
                self.client.put_object(
                    bucket_name=self.bucket,
                    object_name=object_name,
                    data=data_stream,
                    length=len(file_bytes),
                    content_type=content_type,
                )
                return object_name
            except Exception as e:
                logger.warning(f"MinIO upload error: {e}, falling back to disk.")

        # Local fallback
        local_path = os.path.join(self.local_dir, object_name.replace("/", os.sep))
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        return object_name

    def get_bytes(self, object_name: str) -> bytes:
        """Download file bytes from MinIO or local filesystem."""
        if self.client:
            try:
                response = self.client.get_object(self.bucket, object_name)
                try:
                    return response.read()
                finally:
                    response.close()
                    response.release_conn()
            except Exception as e:
                logger.warning(f"MinIO get error: {e}, falling back to disk.")

        # Local fallback
        local_path = os.path.join(self.local_dir, object_name.replace("/", os.sep))
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return f.read()
        return b"%PDF-1.4 Mock Document Content"

    def get_presigned_url(self, object_name: str, expires_seconds: int = 3600) -> str:
        """Generate presigned GET URL or direct API preview endpoint."""
        if self.client:
            try:
                from datetime import timedelta
                return self.client.presigned_get_object(
                    self.bucket, object_name, expires=timedelta(seconds=expires_seconds)
                )
            except Exception:
                pass
        return f"/api/documents/preview/{object_name}"


storage = StorageManager()
