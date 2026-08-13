import asyncio
import io
import unittest
from pathlib import Path

from fastapi import UploadFile

from utils.file_utils import UploadTooLargeError, save_upload_file


class FileUploadTests(unittest.TestCase):
    def test_upload_limit_is_enforced_while_streaming(self):
        upload = UploadFile(filename="sample.mp4", file=io.BytesIO(b"123456"))
        with self.assertRaises(UploadTooLargeError):
            asyncio.run(save_upload_file(upload, max_bytes=4))
        leftovers = list(Path("uploads").glob("sample_*.mp4"))
        self.assertEqual(leftovers, [])


if __name__ == "__main__":
    unittest.main()
