#!/usr/bin/env bash
# اجرای API لاراول برای پیش‌نمایش محلی.
# PHP Portable در این محیط با -c صریح اجرا می‌شود چون PHPRC برای پروسهٔ فرزند
# سرور داخلی PHP اعمال نمی‌شد.
set -e
ROOT="/workspace/chats/f923e1dde5105d1611ec4332"
PHP_BIN="$HOME/php84/usr/bin/php8.4"
PHP_INI="$HOME/php84/ini/php.ini"

cd "$ROOT/backend"
exec "$PHP_BIN" -c "$PHP_INI" -S 127.0.0.1:8000 -t public public/index.php
