"""
Login urinishlarini bloklash (Account Lockout).
IP va email bo'yicha — ikkalasini ham tekshiradi.
"""
import time
from collections import deque
from threading import Lock
from typing import Tuple


class AccountLockoutManager:
    """
    Sliding window lockout:
      - 5 ta noto'g'ri urinishdan so'ng 15 daqiqaga bloklash
      - Key: email yoki IP
    """

    MAX_ATTEMPTS = 5
    WINDOW_SECONDS = 900  # 15 daqiqa

    def __init__(self):
        self._hits: dict[str, deque] = {}
        self._lock = Lock()

    def record_failure(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            hits.append(now)

    def is_locked(self, key: str) -> Tuple[bool, int]:
        """(bloklangan?, qolgan_soniya)"""
        now = time.monotonic()
        with self._lock:
            hits = self._hits.get(key, deque())
            recent = deque(t for t in hits if now - t < self.WINDOW_SECONDS)
            self._hits[key] = recent
            if len(recent) >= self.MAX_ATTEMPTS:
                oldest = min(recent)
                retry_after = int(self.WINDOW_SECONDS - (now - oldest))
                return True, max(retry_after, 1)
            return False, 0

    def clear(self, key: str) -> None:
        """Muvaffaqiyatli logindan so'ng tozalash."""
        with self._lock:
            self._hits.pop(key, None)


# Global instance
lockout_manager = AccountLockoutManager()
