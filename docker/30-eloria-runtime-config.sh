#!/bin/sh
# Sinh /usr/share/nginx/html/config.js tu bien moi truong cua container.
#
# nginx:alpine tu chay moi script trong /docker-entrypoint.d/ luc khoi dong, theo thu tu ten
# => script nay chay sau 20-envsubst-on-templates.sh. Nho vay doi gia tri trong
# docker-compose.yml chi can tao lai container, KHONG phai build lai image.
#
# Chi ghi ra nhung khoa THUC SU duoc khai (ke ca khai rong). Khoa khong khai thi bo qua
# de src/config/app.ts dung gia tri mac dinh trong code.
set -eu

TARGET="${ELORIA_CONFIG_PATH:-/usr/share/nginx/html/config.js}"

# Danh sach phai khop `RuntimeEnvKey` o src/config/runtime-env.ts.
KEYS="VITE_APP_NAME
VITE_USE_HASH_ROUTE
VITE_API_BASE_URL
VITE_USE_MOCK
VITE_STORE_BRAND_MARK
VITE_STORE_HOTLINE
VITE_STORE_WEBSITE
VITE_STORE_EMAIL
VITE_STORE_RETURN_DAYS"

# Thoat dau backslash TRUOC roi toi dau nhay kep (dao thu tu la nhan doi sai).
# Bo ky tu xuong dong de mot gia tri nhieu dong khong lam vo file JS.
js_escape() {
    printf '%s' "$1" | tr -d '\r\n' | sed -e 's|\\|\\\\|g' -e 's|"|\\"|g'
}

{
    printf '/* Sinh tu dong luc container khoi dong - dung sua tay, sua docker-compose.yml. */\n'
    printf 'window.__ELORIA_CONFIG__ = {\n'
    for key in $KEYS; do
        # `${var+x}` phan biet "khai rong" voi "khong khai" - khai rong la gia tri hop le
        # (vd VITE_STORE_HOTLINE="" => hoa don lui ve SDT chi nhanh).
        eval "is_set=\${$key+yes}"
        [ "${is_set:-no}" = yes ] || continue
        eval "value=\$$key"
        printf '    "%s": "%s",\n' "$key" "$(js_escape "$value")"
    done
    printf '}\n'
} > "$TARGET"

echo "[eloria] da sinh $TARGET"
