# CONVENTIONS — Eloria Admin (Frontend)

> Tài liệu quy ước chung cho **mọi agent / mọi phiên làm việc**.
> **Đọc file này TRƯỚC khi viết code.** Nếu một thay đổi mâu thuẫn với tài liệu này,
> phải hỏi lại người dùng thay vì tự quyết định.

Stack hiện tại: React 19 + TypeScript + Vite + React Router 7 + TailwindCSS 4 + shadcn/ui (Radix).

---

## 1. Nguồn sự thật cho API & DTO

- API doc (OpenAPI/Swagger JSON): **http://localhost:8080/v3/api-docs/api**
  — khảo sát gần nhất: **2026-08-06**. Kết quả đã chắt lọc vào [CLAUDE.md](CLAUDE.md) (danh sách endpoint,
  quy ước dữ liệu) và [PLAN.md](PLAN.md) mục A/B.
- **Mọi DTO, endpoint, tên field, kiểu dữ liệu, enum ở frontend PHẢI khớp 100% với tài liệu này.**
  Không được tự bịa field, tự đổi tên field, tự thêm field "cho tiện".
- Nếu tài liệu thiếu thứ gì frontend cần → **báo lại người dùng**, không tự chế API giả.
- URL trên **có thể thay đổi**. Khi thay đổi, người dùng sẽ ra lệnh đọc lại.
  Agent **không tự ý fetch lại** trừ khi được yêu cầu, và **không hardcode** URL này vào code
  (chỉ dùng biến môi trường `VITE_API_BASE_URL` cho base URL runtime).
- Khi được yêu cầu đọc lại api-docs: đồng bộ lại type/DTO trong `src/types` (hoặc `src/api/**/types.ts`)
  và cập nhật lại tài liệu ở mục 9 nếu có thay đổi kiến trúc.

---

## 2. Chiến lược xác thực (KHÔNG được tự đổi)

| Thành phần | Nơi lưu | Ai quản lý |
|---|---|---|
| **Access token** | **In-memory** (biến trong module/state, KHÔNG localStorage / sessionStorage) | Frontend |
| **Refresh token** | **HttpOnly Cookie** | **Backend** |

Quy tắc bắt buộc:

- Access token **chỉ nằm trong bộ nhớ**. Reload trang ⇒ mất token ⇒ gọi refresh để lấy lại.
- Refresh token do backend set/xoá qua cookie. Frontend **không đọc, không ghi, không parse** cookie này.
- ⚠️ **Backend chỉ set cookie `refresh_token` khi request login có `rememberMe: true`** (đã kiểm chứng thực tế).
  Với `rememberMe: false` không có cookie ⇒ F5 là mất phiên, không refresh được.
  ⇒ Form đăng nhập **luôn gửi `rememberMe: true`** và **không hiển thị checkbox "Ghi nhớ đăng nhập"**
  (user đã chốt). Không tự đổi thành `false` hay thêm checkbox.
- Cookie thực tế backend trả: `path=/v1.0/api/refresh; HttpOnly; Max-Age=864000` (10 ngày),
  **không có `SameSite`/`Secure`** ⇒ trình duyệt mặc định `Lax`, bắt buộc same-origin.
- Mọi request gọi API phải bật `credentials: 'include'` (fetch) / `withCredentials: true` (axios)
  để cookie refresh được gửi kèm.
- Khi access token hết hạn (401) → gọi endpoint refresh **một lần**, dùng cơ chế
  **single-flight** (nhiều request 401 cùng lúc chỉ sinh **một** lần refresh, các request còn lại xếp hàng chờ),
  sau đó **retry** request gốc. Refresh thất bại → xoá state auth → điều hướng `/login`.
- **Agent KHÔNG được tự đổi chiến lược này** (ví dụ: chuyển token sang localStorage, tự lưu refresh token ở FE,
  đổi sang scheme khác) nếu chưa có yêu cầu rõ ràng từ người dùng.
- **Tài khoản test dev** cho 3 role (`superadmin` / `adminbranch` / `staffone`) khai báo tại
  [CLAUDE.md](CLAUDE.md#tài-khoản-test-môi-trường-dev-local). Chỉ dùng để gọi thử API local —
  **không hardcode vào code**, không đặt làm giá trị mặc định của form đăng nhập.

---

## 3. Định dạng response của Backend

> Backend **đã chuẩn hoá toàn bộ response** (khảo sát ngày 2026-08-06 trên `/v3/api-docs/api`):
> **mọi** endpoint đều bọc `BaseResponse<T>`, kể cả `/authenticate` và `/refresh`. Không còn ngoại lệ.

### 3.1 Thành công

```json
{
  "code": 1,
  "message": "Thành công",
  "data": { }
}
```

- **`code === 1` ⇒ thành công** (`ResponseCode.TRANSACTION_SUCCESSFUL`), **không phải `0`**.
  Các mã khác là mã lỗi nghiệp vụ (3 = đã tồn tại, 4 = không tồn tại, 15 = xác thực thất bại, 24 = không đủ quyền…).
- Dữ liệu nghiệp vụ **luôn nằm trong `data`**; `data` có thể là object, mảng, chuỗi hoặc `null`.
- API danh sách trả `data` dạng bao ngoài:
  `{ total, data: [...] }` — riêng `staff/search` và `branch/search` có thêm `activeTotal`, `inactiveTotal`.
  Tức là **`data.data`** mới là mảng bản ghi.
- Hàm gọi API dùng chung phải **tự bóc `data`** trả về cho tầng UI; UI không tự đụng vào `code`/`message` khi thành công.
- Khi thao tác thành công (create / update / delete / submit…) → hiển thị **toast thành công**
  với **message mặc định riêng cho từng màn hình** (ví dụ: "Tạo sản phẩm thành công", "Cập nhật danh mục thành công"),
  không dùng một câu chung chung cho tất cả màn.
- Thao tác chỉ đọc (GET để render danh sách/chi tiết) **không** hiện toast.

### 3.2 Thất bại — `ErrorResponse`

```json
{
  "code": 0,
  "message": "string",
  "logInfo": "string",
  "subKey": "string"
}
```

- `subKey` có dạng `a.b.c` — ví dụ: `error.password.incorrect`.
- Frontend **bắt buộc** có một file message chung để map `subKey` → chuỗi i18n đa ngôn ngữ.
  Vị trí quy ước: `src/i18n/messages/<lang>.ts` (hoặc `src/locales/<lang>/errors.ts`) — giữ nguyên
  cấu trúc key phẳng theo đúng `subKey` của backend.
- Quy tắc hiển thị lỗi (theo thứ tự ưu tiên):
  1. Có `subKey` **và** key tồn tại trong tài nguyên i18n của FE ⇒ hiển thị bản dịch theo ngôn ngữ hiện tại.
  2. **Ngược lại** (không có `subKey`, hoặc key không tồn tại) ⇒ hiển thị **`message`** do backend trả về.
  3. Không có cả hai ⇒ hiển thị message lỗi mặc định của hệ thống.
- `logInfo` **chỉ dùng để log/debug**, **tuyệt đối không hiển thị cho người dùng cuối**.
- Khi thêm `subKey` mới, phải bổ sung key vào **tất cả** file ngôn ngữ đang hỗ trợ.

### 3.3 Quy ước `status` — 3 giá trị, **hai cơ chế tách biệt**

Rule chung cho **mọi** entity có cột `status` (chốt với user 2026-08-09):

| Giá trị | Ý nghĩa | Đặt qua |
|---|---|---|
| `1` | ACTIVE | `POST /<module>/update-status` |
| `0` | INACTIVE | `POST /<module>/update-status` |
| **`-1`** | **DELETED (xoá mềm)** | **`DELETE /<module>/{id}`** — API riêng |

- **Bật/tắt và xoá là hai đường khác nhau, KHÔNG dùng chung API/phương thức.**
  `UpdateStatusReqDTO` bị backend chặn `@Min(0) @Max(1)` ⇒ gửi `status: -1` luôn trả
  `400 error.input.invalid`. Muốn xoá **phải** gọi `DELETE`, để backend tự set `-1`.
- Bản ghi `-1` bị **ẩn khỏi mọi truy vấn nghiệp vụ** ⇒ FE **không bao giờ nhận được**.
  Vì vậy **không dựng bộ lọc/badge "Đã xoá"** trên UI, và type FE chỉ cần mô tả 0/1 cho dữ liệu nhận về.
- Chi tiết (entity nào áp dụng, module nào hard-delete) xem [CLAUDE.md](CLAUDE.md) mục
  "Quy ước `status` 3 giá trị".

---

## 4. Hàm gọi API dùng chung (bắt buộc)

- **Mọi** lời gọi API phải đi qua **một** lớp client dùng chung (quy ước: `src/lib/api-client.ts` +
  các service theo domain tại `src/api/<domain>.ts`).
- **Cấm** gọi `fetch` / `axios` trực tiếp trong component, page hay hook nghiệp vụ.
- Client dùng chung chịu trách nhiệm:
  - Gắn base URL từ `VITE_API_BASE_URL`, header `Content-Type`, `Accept-Language` (theo i18n hiện tại).
  - Gắn `Authorization: Bearer <access token in memory>`; gửi cookie (`credentials: 'include'`).
  - Bóc tách response thành công (`code === 1` ⇒ trả `data`), chuẩn hoá lỗi về đúng shape `ErrorResponse`.
  - Xử lý mặc định theo HTTP status:
    | Status | Hành vi mặc định |
    |---|---|
    | **401** | Thử refresh (single-flight) → retry; thất bại ⇒ clear auth + redirect `/login` |
    | **403** | Toast "Không có quyền truy cập" + điều hướng trang 403 / giữ nguyên màn tuỳ ngữ cảnh |
    | **404** | Trả lỗi cho caller; màn chi tiết hiển thị trạng thái "Không tìm thấy" |
    | **422 / 400** | Map lỗi validate về từng field của form |
    | **5xx** | Toast lỗi hệ thống chung, log `logInfo` ra console (chỉ ở môi trường dev) |
    | **Network / timeout / abort** | Toast lỗi kết nối; abort do huỷ request thì bỏ qua im lặng |
  - Cho phép caller **opt-out** xử lý mặc định (ví dụ tuỳ chọn `skipErrorToast`) khi màn hình cần tự xử lý lỗi.
- Không lặp lại logic xử lý 401/403/500 ở từng màn hình. Nếu cần hành vi khác ⇒ mở rộng client dùng chung.

---

## 5. UI / UX

- **Tuân theo thiết kế UI/UX đã có sẵn trong folder [design/](design/) — xem chi tiết ở mục 6.**
  Không tự sáng tạo layout, đổi bố cục, đổi màu, đổi icon set hay thay component khi chưa được yêu cầu.
- Dùng component có sẵn trong [src/components/ui/](src/components/ui/) (shadcn/ui). Cần component mới ⇒
  thêm đúng theo chuẩn shadcn, không tự viết component trùng chức năng.
- Style bằng **Tailwind utility classes**; dùng `cn()` trong [src/lib/utils.ts](src/lib/utils.ts) để merge class.
  Không viết CSS rời rạc, không dùng inline style trừ giá trị động.
- **Responsive — thứ tự ưu tiên: desktop → tablet → mobile.**
  Đây là công cụ nội bộ dùng chủ yếu trên PC và tablet tại quầy, nên:
  - **Desktop (≥ `lg`) và tablet (`md`–`lg`) là bắt buộc đúng thiết kế**, phải test kỹ.
    Mốc desktop tham chiếu: laptop 13"–15".
  - **Mobile (< `md`) chỉ cần "không vỡ"**: không tràn ngang toàn trang, không đè chữ, vẫn bấm/đọc được.
    **Không** bắt buộc tối ưu thao tác hay thiết kế lại luồng cho mobile.
  - Bảng dữ liệu: desktop dùng table; màn hình hẹp cho **scroll ngang trong khung bảng** (có chủ đích).
    Chỉ chuyển sang card/list khi có yêu cầu riêng.
  - Sidebar/menu: thu gọn (drawer/sheet) khi hẹp — dùng hook [use-mobile.ts](src/hooks/use-mobile.ts).
- **Chỉ hỗ trợ light theme** (đúng theo mockup trong `design/`). **Không** làm dark theme, không thêm nút
  chuyển theme, cho tới khi có yêu cầu mới. Vẫn **bắt buộc dùng token màu** trong
  [src/index.css](src/index.css) thay vì hardcode hex, để sau này bật dark không phải sửa từng component.
- Trạng thái màn hình phải đầy đủ: **loading (skeleton) / empty / error / success**.
- **Không gọi trùng API trong CÙNG một màn** — nhưng **KHÔNG cache giữa các màn** (chốt với user
  2026-08-09). Vào màn nào thì gọi đủ API của màn đó để luôn có dữ liệu mới nhất: người dùng khác
  có thể vừa thêm/sửa chi nhánh, danh mục, sản phẩm… mà FE không có cách nào biết, cache sẽ hiển
  thị dữ liệu cũ. Cụ thể:
  - **Mỗi endpoint chỉ được gọi đúng 1 lần cho một lần vào màn.** Đừng vừa gọi `size=10` cho bảng
    vừa gọi `size=200` cho dropdown của cùng một tài nguyên — nạp một lần rồi lọc/phân trang phía
    client (áp dụng khi danh sách nhỏ, vài chục bản ghi).
  - `BranchProvider` **cố ý không tự nạp** khi đăng nhập; nó chỉ giữ state + hàm `refresh()`.
    Màn nào cần danh sách chi nhánh thì gọi `refresh()` trong `useEffect` khi vào màn — nhờ vậy
    vừa đúng 1 request/màn, vừa luôn là dữ liệu mới.
  - **Mọi `useEffect` gọi API phải truyền `AbortSignal` và huỷ trong cleanup:**
    ```ts
    useEffect(() => {
        const controller = new AbortController()
        void load(controller.signal)
        return () => controller.abort()
    }, [load])
    ```
    Trong `catch`/`finally` nhớ `if (signal?.aborted) return` để request bị huỷ không bị hiểu nhầm
    thành lỗi và không set state trên component đã unmount. Các hàm `*Api.search()` đều nhận
    `signal` ở tham số thứ 3.
  - Đo bằng tab Network: mở một màn, **không được** thấy endpoint nào lặp lại 2 lần.
    (`GET /account/me` 2 lần lúc mở app là bình thường: lần đầu 401 ⇒ api-client tự `/refresh`
    rồi retry — cơ chế single-flight của Phase 2.)
- **`<StrictMode>` được BẬT** và **không cần tắt khi build production** — React tự loại bỏ nó ở bản
  production (đã đo: `vite preview` và `vite dev` cho **cùng 8 request** ở màn Sản phẩm).
  Nếu thấy request nhân đôi khi dev ⇒ đó là **effect chưa idempotent** (thiếu `AbortController`/
  cleanup), **hãy sửa effect** chứ đừng tắt StrictMode để giấu triệu chứng.
  Muốn đo số request thật của người dùng cuối: `npm run build && npx vite preview`
  (proxy `/v1.0` đã được cấu hình cho cả `preview` trong `vite.config.ts`).
- ⚠️ **`bg-background` KHÔNG phải màu trắng** trong repo này — nó là **màu xám nền trang**
  (`#F1F5F9`). Màu trắng là **`bg-card`** / `bg-popover`. Component nổi trên nền trang (modal,
  sheet, nút outline, card…) mà dùng `bg-background` sẽ **chìm hẳn vào nền, nhìn như trong suốt**.
  Bản shadcn gốc dùng `bg-background` cho `DialogContent`/`SheetContent`/`Button variant="outline"`
  ⇒ **đã sửa thành `bg-card`**; khi `npx shadcn add` thêm component mới, phải kiểm tra lại điểm này.
- **Bố cục hàng công cụ của màn danh sách** *(chốt với user 2026-08-28 — **thay thế** rule
  2026-08-09 "mọi nút hành động đặt cùng hàng bộ lọc")*. Chia theo **bản chất thao tác**:

  | Nhóm | Ví dụ | Đặt ở đâu |
  |---|---|---|
  | **Tác động dữ liệu** | Thêm · Xuất · Nhập · Duyệt hàng loạt | **`PageHeader`** (slot `actions`), cùng hàng tiêu đề màn |
  | **Điều khiển bảng** | Tải lại · Hiển thị cột | **`DataTableToolbar`** (slot `tableControls`), cùng hàng search/filter |

  Lý do: nút *ghi dữ liệu* là hành động cấp **màn hình** — đứng cạnh tiêu đề thì luôn ở một chỗ cố
  định dù bộ lọc dài ngắn khác nhau. Còn *tải lại / ẩn hiện cột* chỉ tác động lên **chính bảng** nên
  phải nằm cạnh search/filter, cùng nhóm với những thứ định hình cái bảng đang hiển thị.

  ⇒ `DataTableToolbar` là **một hàng ngang**: ô tìm kiếm + `Select`/`SearchSelect` **bên trái**,
  cụm Tải lại + Hiển thị cột **bên phải**.
  ⚠️ `DataTable` **không tự vẽ** hai nút đó nữa (bản trước tự render ở góc phải phía trên bảng) —
  màn hình lấy chúng từ `useDataTableControls()` rồi truyền vào `tableControls` của toolbar.
- **Droplist danh sách dài dùng [`SearchSelect`](src/components/search-select.tsx)** (Popover + Input,
  không thêm dependency): có ô tìm kiếm **bỏ dấu tiếng Việt**, khớp cả tên lẫn mã, hỗ trợ chọn 1 và
  chọn nhiều (hiện chip có nút ✕). Ô search tự hiện khi > 8 lựa chọn. Danh sách ngắn (< 8) cứ dùng
  `Select` thường. Danh sách lớn tới mức phải phân trang thì **search phía server**, không dùng component này.
- **Đa ngôn ngữ: VI + EN** ngay từ đầu. Mọi text hiển thị cho người dùng đi qua i18n,
  **không hardcode chuỗi** trong JSX. Mặc định `vi`; thêm key mới phải bổ sung **cả `vi` và `en`**.
  Bộ chuyển ngôn ngữ đặt ở **top bar, bên trái chuông thông báo** — đây là **phần bổ sung ngoài mockup**
  (thiết kế hiện chưa có control này), style bám theo các control còn lại của top bar.
- Accessibility cơ bản: `label` cho input, `aria-*` cho control, điều hướng bằng bàn phím.

### 5.1 Sau khi ghi dữ liệu ⇒ **nạp lại danh sách, GIỮ NGUYÊN ngữ cảnh** (chốt với user 2026-08-28)

Áp dụng cho **mọi** hành động làm đổi dữ liệu: create · update · delete · `update-status` ·
`assign-role` · submit/approve/reject phiếu · tạo đơn · thu tiền · kiểm kê…

- Thao tác thành công ⇒ **gọi lại đúng API danh sách của màn hiện tại**. Không được để UI hiển thị
  dữ liệu cũ và chờ người dùng tự F5: người khác có thể vừa sửa cùng bản ghi, và chính thao tác vừa
  rồi cũng có thể đổi field mà server tự tính (mã đơn, tồn, tổng tiền, `lastModifiedDate`…).
- **Bắt buộc giữ nguyên toàn bộ ngữ cảnh bảng**: `page` hiện tại, `size`, `sort`, mọi filter,
  `keyword`, tab đang mở, và **vị trí scroll**. Tuyệt đối **không** `setPage(1)` sau khi ghi —
  `setPage(1)` chỉ dành cho **đổi filter/từ khoá**.
- Cách làm chuẩn trong repo: hàm `load` là `useCallback` có dep là chính các state phân trang/lọc,
  mutation xong chỉ cần `await load()`. Vì `load` đọc state qua closure nên ngữ cảnh tự được giữ.
- **Danh sách rỗng sau khi xoá**: xoá bản ghi cuối của trang cuối ⇒ trang hiện tại rỗng. Phải kẹp
  `page` về trang cuối còn dữ liệu (xem `CategoryListPage`), không để bảng trống trơn.
- Màn có **nhiều danh sách liên quan nhau** thì nạp lại **tất cả** danh sách bị ảnh hưởng, không chỉ
  cái vừa thao tác. Ví dụ: bán hàng POS xong phải nạp lại tồn ở cột chọn hàng, vì đơn vừa tạo đã
  **trừ tồn thật** (xem [CLAUDE.md](CLAUDE.md) mục "Mô hình tồn kho").
- Ngoại lệ **duy nhất** được phép bỏ qua nạp lại: thao tác không làm đổi thứ gì đang hiển thị trên
  danh sách (ví dụ `reset-password` chỉ trả mật khẩu tạm). Phải ghi chú lý do ngay tại chỗ.

### 5.2 Bảng danh sách — năng lực bắt buộc (chốt với user 2026-08-28)

Tham chiếu: **ProTable của Ant Design**. Mọi bảng danh sách **phải** dựng bằng
[`DataTable`](src/components/data-table/data-table.tsx) dùng chung và có đủ 3 năng lực sau:

1. **Nút tải lại (reload)** — đặt **cùng hàng với search/filter** (slot `tableControls` của
   `DataTableToolbar`), bên phải. Bấm vào **giữ nguyên** `page`, `size`, `sort`, filter, `keyword`
   và vị trí scroll; chỉ gọi lại API.

   **Phản hồi cho người dùng bắt buộc đủ 3 lớp** *(chốt với user 2026-08-28 — icon xoay ở nút thôi
   thì quá kín đáo, người dùng không biết là đang tải)*:
   - **Trong lúc tải**: icon nút xoay · **bảng mờ đi + khoá tương tác + hiện spinner "Đang tải lại…"**
     (truyền cờ `refreshing` xuống `DataTable`).
   - **Vẫn giữ nguyên dữ liệu cũ** bên dưới lớp phủ — **không** nháy skeleton, vì skeleton xoá sạch
     nội dung và làm mất vị trí đang đọc. Skeleton chỉ dành cho `loading` (nạp lần đầu).
   - **Sau khi xong**: **toast "Tải lại dữ liệu thành công"**. Dùng `tableState.runRefresh(...)`
     để bọc lượt tải — nó lo phần toast, và tự **bỏ qua khi request bị huỷ** (đổi trang/rời màn
     giữa chừng) để không báo nhầm.
   - ⚠️ Reload **sau mutation** thì **không** toast "đã cập nhật": hành động đó đã có toast riêng
     ("Tạo … thành công"), thêm cái nữa là ồn. Chỉ nút Tải lại mới đi qua `runRefresh`.
2. **Bật/tắt cột** — dropdown liệt kê các cột ẩn/hiện được, đặt **ngay cạnh nút Tải lại**.
   Cột **khoá cứng** (`enableHiding: false`) dùng cho cột định danh và cột thao tác — không cho
   người dùng tự ẩn mất đường thao tác.
3. **Sort theo cột** — **chỉ mở sort cho cột mà backend thực sự sort được**, và phải là
   **sort phía server** (đẩy vào `SearchPagination.sort` dạng `field,ASC|DESC`).
   - ⚠️ **Cấm để sort mặc định của TanStack chạy tự do**: nó chỉ sắp xếp ≤ `size` dòng của **trang
     hiện tại** nên kết quả **sai** với dữ liệu nhiều trang, mà người dùng không hề biết.
     Cột không sort được ở server **phải** khai `enableSorting: false`.
   - Tên field truyền lên là **tên field của DTO backend** (`createdDate`, `fullName`…),
     không phải `id` cột ở FE. Khai qua `meta.sortField` của `ColumnDef` khi hai tên lệch nhau.
   - Đổi sort ⇒ **quay về trang 1** (đây là đổi truy vấn, không phải mutation — khác hẳn mục 5.1).
- Trạng thái bảng (cột đang ẩn, sort hiện tại) là **state của màn**, không lưu localStorage,
  cho tới khi có yêu cầu riêng.

### 5.3 Cột THAO TÁC — **luôn có nút "Chi tiết", phần còn lại vào `(...)`** (chốt với user 2026-09-07)

> Quy tắc này đã được chốt từ 2026-08-08 khi làm màn Nhân viên nhưng **chỉ ghi trong PLAN**, nên các
> màn làm sau bị trôi mỗi nơi một kiểu. Nay nâng thành **luật chung, bắt buộc cho mọi bảng**.

Cột THAO TÁC của **mọi** `DataTable` chỉ được có **đúng 2 thành phần, theo thứ tự**:

| Vị trí | Thành phần | Bắt buộc? |
|---|---|---|
| 1 | **Nút "Chi tiết"** (icon `Eye`) — mở modal xem bản ghi | ✅ **LUÔN CÓ** |
| 2 | Menu `(...)` (icon `MoreHorizontal`) gom **toàn bộ** hành động còn lại | Chỉ khi có ≥ 1 hành động |

- **Cấm** đặt nút hành động thứ ba trực tiếp trên cột (Sửa, Xoá, Bật/tắt, Duyệt…) — kể cả khi chỉ có
  một hành động duy nhất, nó vẫn phải nằm trong `(...)`. Lý do: cột THAO TÁC có **chiều rộng cố
  định**; mỗi màn tự thêm nút thì bảng lệch nhau và cột phình ra, đúng thứ rule `size` cố định muốn
  tránh.
- **Nút "Chi tiết" không bao giờ bị ẩn theo quyền.** Xem là quyền thấp nhất — người vào được màn thì
  xem được bản ghi. Chỉ các mục *trong* `(...)` mới gate theo role, và **`(...)` tự ẩn khi rỗng**.
- Modal chi tiết theo pattern [`DetailModal`](src/components/detail-modal.tsx): chế độ xem chỉ có 2
  nút **"Sửa" + "Đóng"**; bấm "Sửa" chuyển field sang input **ngay tại chỗ** (inline edit, không mở
  dialog thứ hai). Field không sửa được qua API vẫn hiện dạng **khoá (`disabled`)**, không ẩn đi.
- Bản ghi **không có gì để sửa** (ví dụ Nhật ký hệ thống) thì modal chỉ đọc, không có nút "Sửa".
- Cột THAO TÁC luôn khai `enableHiding: false` + `enableSorting: false` + `size` cố định.

⚠️ **Màn không phải bảng** (card grid như Chi nhánh, danh sách phiếu dạng thẻ) **không áp dụng** rule
này — nó chỉ dành cho `DataTable`.

### 5.4 Định dạng ngày giờ hiển thị — **`dd/MM/yyyy`**, có giờ thì **`HH:mm:ss dd/MM/yyyy`** (chốt với user 2026-09-07)

Áp dụng cho **mọi** chỗ người dùng nhìn thấy ngày/giờ: ô nhập, bảng, modal chi tiết, hoá đơn, báo cáo.

| Loại | Định dạng hiển thị | Helper |
|---|---|---|
| Chỉ ngày | `dd/MM/yyyy` | `formatDate()` |
| Ngày + giờ | **`HH:mm:ss dd/MM/yyyy`** (giờ **đứng trước** ngày) | `formatDateTime()` |

- ⚠️ **`<Input type="date">` bị CẤM** ở ô người dùng nhập ngày. Input date của trình duyệt hiển thị
  theo **locale của máy** — máy để tiếng Anh sẽ hiện `mm/dd/yyyy`, không có cách nào ép về
  `dd/MM/yyyy` bằng CSS hay thuộc tính HTML. Dùng
  [`DateInput`](src/components/date-input.tsx) — ô text nhập `dd/MM/yyyy` kèm nút lịch (Popover +
  `Calendar` của shadcn), giá trị trong form vẫn là `yyyy-MM-dd` để gửi API không phải đổi.
- Giá trị **truyền lên backend không đổi**: vẫn ISO-8601 UTC (`2026-09-07T00:00:00Z`) hoặc
  `yyyy-MM-dd` tuỳ DTO. Rule này **chỉ nói về phần hiển thị**.
- **Không tự viết lại logic format** trong component — luôn gọi helper ở
  [`src/lib/format.ts`](src/lib/format.ts) để đổi một chỗ là đổi cả hệ thống.
### 5.5 Ô nhập & hiển thị số tiền — **có dấu ngăn cách, gửi lên backend là số thuần** (chốt với user 2026-09-08)

| Nơi | Định dạng | Cách làm |
|---|---|---|
| **Hiển thị** (bảng, modal, hoá đơn, báo cáo) | `1.500.000đ` — dấu `.` ngăn cách hàng nghìn | `formatVnd()` |
| **Ô nhập** | `1.500.000` trong ô + hậu tố **`đ`** hiện bên phải | [`MoneyInput`](src/components/money-input.tsx) |
| **Gửi API** | `1500000` — **số thuần, không dấu ngăn cách** | `Number(value)` |

- ⚠️ **`<Input type="number">` bị CẤM cho ô tiền.** Trình duyệt không cho chèn dấu ngăn cách vào
  `type="number"` (mọi ký tự không phải số làm ô thành rỗng) ⇒ không thể hiện `1.500.000`.
  Dùng `MoneyInput` — input text tự kiểm soát hiển thị, `value`/`onChange` là **chuỗi chữ số thuần**.
- **Mọi ô nhập tiền BẮT BUỘC có hậu tố đơn vị `đ`** hiện ngay trong ô. Người dùng nhìn ô
  *"Giá trị đơn tối thiểu"* trống không đoán được là **đồng** hay **nghìn đồng** — phải nói rõ.
  Ô đổi được đơn vị (chiết khấu `%` ↔ `đ` ở POS) thì hậu tố **đổi theo** lựa chọn hiện tại.
- ⚠️ Dấu `.` trong tiếng Việt là **ngăn cách hàng nghìn**, KHÔNG phải dấu thập phân. `parseMoneyInput`
  vì vậy **bỏ hẳn dấu chấm** khi đọc ô: `1.500` là *một nghìn năm trăm*, không phải `1.5`.
  Tiền VNĐ không có phần lẻ nên không cần hỗ trợ số thập phân.
- **Ô phần trăm không dùng `MoneyInput`** — `%` không cần ngăn cách hàng nghìn (giá trị ≤ 100) và
  có thể có phần lẻ. Giữ `<Input inputMode="decimal">`, nhưng **vẫn phải có hậu tố `%`**.
- **Ô số lượng** (SL trong phiếu kho, kiểm kê, giỏ hàng) **không** áp rule này: số nhỏ, không phải
  tiền, giữ `type="number"` để dùng được nút tăng/giảm của trình duyệt.
- **Không tự viết lại logic format** trong component — dùng helper ở
  [`src/lib/money-input-format.ts`](src/lib/money-input-format.ts) và
  [`src/lib/format.ts`](src/lib/format.ts).
---

## 6. Thiết kế nguồn — folder `design/`

Folder [design/](design/) chứa **bản thiết kế chốt** của hệ thống (ảnh PNG mockup).
Đây là **nguồn sự thật về giao diện**, tương đương vai trò của api-docs với dữ liệu.

### 6.1 Danh sách màn hình

| File | Màn hình |
|---|---|
| `00-dang-nhap.png` | Đăng nhập |
| `01-dashboard-bao-cao.png` | Dashboard & Báo cáo |
| `02-pos-mo-ca.png` | POS — Mở ca |
| `03-pos-ban-hang.png` | POS — Bán hàng |
| `04-don-hang.png` | Đơn hàng |
| `05-don-hang-chi-tiet.png` | Đơn hàng — Chi tiết |
| `06-doi-tra.png` | Đổi / Trả |
| `07-nhan-vien.png` | Nhân viên & Chi nhánh — tab Nhân viên |
| `08-chi-nhanh.png` | Nhân viên & Chi nhánh — tab Chi nhánh |
| `09-phan-quyen.png` | Nhân viên & Chi nhánh — tab Phân quyền (ma trận role × quyền) |
| `10-khach-hang.png` | Khách hàng (CRM) |
| `11-san-pham.png` | Sản phẩm |
| `12-danh-muc-sp.png` | Danh mục SP |
| `13-kho-hang-ton-kho.png` | Kho hàng — Tồn kho |
| `14-kho-hang-phieu-nhap.png` | Kho hàng — Phiếu nhập |
| `15-kho-hang-kiem-ke.png` | Kho hàng — Kiểm kê |
| `16-khuyen-mai.png` | Khuyến mại |

### 6.2 Quy tắc bắt buộc

- Trước khi code **bất kỳ màn hình nào**, agent phải **mở và đọc file thiết kế tương ứng** trong `design/`.
  Không code "theo trí nhớ" hay theo mô tả gián tiếp.
- Bám sát: bố cục, thứ tự khối, nhóm menu, wording tiếng Việt, badge/trạng thái, cột của bảng,
  vị trí nút hành động, tone màu, spacing.
- **Wording lấy nguyên văn từ thiết kế** (ví dụ: "Tồn khả dụng", "Chậm luân chuyển > 60 ngày", "Xuất dữ liệu").
  Khi đưa vào i18n thì key mới, còn chuỗi tiếng Việt phải giữ đúng chữ trong ảnh.
- Thiết kế **không phủ hết** mọi màn hình (ví dụ: quên mật khẩu, chốt ca, quản lý giá, chi tiết khách hàng,
  audit log…). Với màn chưa có thiết kế ⇒ **tái sử dụng pattern của màn cùng loại đã có** trong `design/`
  (list = pattern của `04-don-hang`, form/tab = pattern của `07-nhan-vien`), **không tự sáng tạo layout mới**.
- Lệch so với thiết kế chỉ được phép khi: (a) người dùng yêu cầu, hoặc (b) thiết kế bất khả thi về kỹ thuật —
  trường hợp (b) phải **báo và hỏi trước khi làm**, không tự quyết.
- Khi file trong `design/` được cập nhật, người dùng sẽ ra lệnh đọc lại. Agent **không tự đoán** thiết kế đã đổi.
- Mockup **chỉ có frame desktop và chỉ có light theme** — đúng với quyết định ở mục 5
  (desktop/tablet là chính, mobile chỉ cần không vỡ; không làm dark theme).
  Agent **không tự dựng thêm biến thể mobile hay dark** rồi coi đó là thiết kế.
- Wording trong mockup là tiếng Việt. Bản **EN** không có trong thiết kế ⇒ agent tự dịch sát nghĩa,
  giữ đúng thuật ngữ nghiệp vụ (SKU, POS, size curve…), và ghi key vào cả `vi` lẫn `en`.

### 6.3 Khung layout chung (rút ra từ thiết kế)

- **Sidebar trái tối màu**, có logo ELORIA, nút thu gọn, menu chia theo nhóm có tiêu đề nhóm viết hoa nhỏ:
  `TỔNG QUAN` · `BÁN HÀNG` · `HỆ THỐNG` · `SẢN PHẨM & KHO`. Item đang chọn nền màu nhấn, bo góc.
- **Top bar**: breadcrumb bên trái ("Trang chủ › Tên màn"), bên phải là **bộ chọn chi nhánh**,
  chuông thông báo, avatar + tên/role người dùng.
- **Vùng nội dung**: tiêu đề màn + mô tả phụ 1 dòng, hàng action bên phải (bộ lọc thời gian, nút xuất dữ liệu),
  rồi tới hàng KPI card, sau đó là khối biểu đồ / bảng dữ liệu.
- Màn nhiều phần dùng **tab dạng pill** ngay dưới tiêu đề (xem `07/08/09`), không dùng tab gạch chân.
- Card nền trắng, bo góc vừa, viền mảnh, đổ bóng nhẹ; nền trang xám nhạt.
- Màu nhấn chính là **indigo/violet**; xanh lá = tăng/tốt, đỏ = giảm/lỗi, vàng = cảnh báo/chờ duyệt.
  Toàn bộ màu phải khai báo thành **token theme** trong [src/index.css](src/index.css), **không hardcode hex trong component**.
- Màn **đăng nhập** là layout riêng (2 cột: panel brand tối bên trái + form bên phải), không dùng app layout.

### 6.4 Role & menu — lưu ý quan trọng

> **Cụm tab `STAFF | ADMIN | SA` trên top bar trong thiết kế CHỈ LÀ DEMO** để người xem chuyển
> qua lại giữa các vai trò khi review mockup. **Không implement cụm tab này vào sản phẩm thật.**

Thực tế:

- Role của người dùng được xác định **từ kết quả login / thông tin phiên do backend trả về**.
- **Menu, route và quyền thao tác được sinh theo role sau khi login**, người dùng không tự chuyển role trên UI.
- Phân quyền phải chặn **cả route lẫn UI**: mục không có quyền thì **ẩn khỏi menu** *và* truy cập thẳng URL
  cũng bị chặn (redirect / trang 403). Không chỉ ẩn nút.
- Bộ chọn chi nhánh trên top bar: `SUPER_ADMIN` được chọn "Tất cả chi nhánh"/từng chi nhánh;
  `ADMIN`/`STAFF` bị **cố định** theo chi nhánh được gán (hiển thị dạng read-only).
- ⚠️ **Data-scope theo chi nhánh KHÔNG áp dụng cho khách hàng** (backend Phase 3b, 2026-08-28):
  khách là bản ghi **toàn cục**, mọi STAFF+ xem/sửa/gắn-vào-đơn được **mọi khách toàn chuỗi**.
  `customer.branchId` chỉ còn nghĩa "chi nhánh đăng ký" (tham khảo, có thể `null`) ⇒ **không**
  dựng UI ngụ ý khách bị giới hạn chi nhánh. Chi tiết ở [CLAUDE.md](CLAUDE.md) mục "Phase 3b".

**Mô hình quyền: thang bậc kế thừa** (backend fix cứng, FE bám theo — **không có ma trận quyền**):

```
SUPER_ADMIN  >  ADMIN  >  STAFF  >  CUSTOMER  >  ANONYMOUS
```

- Role bên trái **kế thừa toàn bộ** quyền của role bên phải.
- Mỗi endpoint trong api-docs mang tiền tố **`[ROLE]`** ở `summary` theo cấu trúc `[ROLE] Tên api`
  (ví dụ `[ANONYMOUS] Đăng nhập`, `[ADMIN] Danh sách nhân viên`) — đó là **role tối thiểu** gọi được.
- FE khai báo **một** hàm so bậc dùng chung, cho phép khi `rank(user) >= rank(required)`.
  Không viết `if (role === 'ADMIN' || role === 'SUPER_ADMIN')` rải rác — sai ngay khi thêm bậc mới.
- Bảng role tối thiểu của từng endpoint đã chắt lọc sẵn ở [CLAUDE.md](CLAUDE.md).
- Màn `09-phan-quyen.png` chỉ là **bảng mô tả tĩnh** để người dùng đọc, **không phải cấu hình**:
  không có API đọc/ghi ma trận quyền, không được dựng UI cho phép sửa.

> ⚠️ `CUSTOMER` là role của khách mua hàng bên storefront, **không được đăng nhập vào web quản trị này**.
> Endpoint gắn `[CUSTOMER]` (ví dụ `/account/me`, `/logout`) chỉ có nghĩa "cần đã đăng nhập" —
> đừng hiểu nhầm thành "web admin có màn cho CUSTOMER".

---

## 7. Cấu trúc mã nguồn & quy ước code

```
src/
├─ api/          # service theo domain, gọi qua api-client
├─ components/   # component tái sử dụng (ui/ = shadcn)
├─ config/       # cấu hình app, menu
├─ contexts/     # React context (theme, auth, ...)
├─ hooks/        # custom hooks
├─ i18n/         # tài nguyên đa ngôn ngữ + map subKey
├─ lib/          # api-client, utils
├─ pages/        # màn hình theo route
└─ types/        # DTO đồng bộ từ api-docs
```

- File component: `kebab-case.tsx` cho `components/`, `PascalCase.tsx` cho `pages/`
  (giữ đúng quy ước đang có trong repo).
- TypeScript **strict**: không `any`, không `@ts-ignore` nếu không có lý do được ghi chú.
- Không để lại `console.log` trong code commit (log lỗi hệ thống chỉ trong dev).
- Chạy `npm run lint` trước khi kết thúc task; build kiểm tra bằng `npm run build`.

---

## 8. Quy tắc chung cho Agent

- Ưu tiên **đọc code hiện có** và tái sử dụng, không tạo pattern mới song song với pattern đã có.
- Chỉ làm đúng phạm vi được yêu cầu; phát hiện vấn đề ngoài phạm vi ⇒ **báo cáo**, không tự sửa lan man.
- Không tự ý thêm dependency mới nếu chưa hỏi.
- Không tự đổi: chiến lược auth (mục 2), format response (mục 3), lớp gọi API dùng chung (mục 4),
  thiết kế UI/UX (mục 5), bản thiết kế trong `design/` (mục 6).

---

## 9. Tài liệu hoá khi thay đổi kiến trúc

Khi có thay đổi **lớn, ảnh hưởng tới kiến trúc**, agent **bắt buộc** cập nhật lại tài liệu ngay trong cùng task:

- Thay đổi được coi là ảnh hưởng kiến trúc: đổi/ thêm cơ chế auth, đổi lớp gọi API, đổi cấu trúc thư mục,
  thêm state management / data-fetching layer, đổi routing, đổi cơ chế i18n, đổi hệ thống theme/design system,
  thêm build/deploy pipeline.
- Phải cập nhật: **file này (CONVENTIONS.md)**, `README.md`, và tài liệu kiến trúc trong `docs/` nếu có.
- Ghi rõ: **cái gì đổi — vì sao đổi — ảnh hưởng tới phần nào — cách migrate**.
- Code và tài liệu phải được cập nhật **trong cùng một commit/PR**.

---

## 10. Review

- **Mỗi lần một agent hoàn thành công việc, sẽ có agent khác review lại code.**
- Agent thực thi phải, ở cuối mỗi task, tóm tắt: các file đã đổi, quyết định kỹ thuật đã đưa ra,
  giả định đang dùng, phần chưa làm — để agent review có đủ ngữ cảnh.
- Agent review kiểm tra tối thiểu:
  1. DTO/endpoint khớp api-docs (mục 1).
  2. Không vi phạm chiến lược auth (mục 2).
  3. Xử lý đúng response thành công / `ErrorResponse` + map `subKey` → i18n, fallback `message` (mục 3).
  4. Gọi API qua client dùng chung, không tự xử lý 401/403/500 rời rạc (mục 4).
  5. Bám thiết kế UI/UX; desktop/tablet đúng thiết kế, mobile không vỡ; chỉ light theme;
     text có cả `vi` + `en`; đủ trạng thái loading/empty/error (mục 5).
  5b. **Ghi dữ liệu xong có nạp lại danh sách và giữ nguyên page/sort/filter/scroll không** (mục 5.1);
     **bảng có đủ nút reload + bật/tắt cột + sort phía server, cột không sort được đã khai
     `enableSorting: false`** (mục 5.2).
  6. **Khớp bản thiết kế trong `design/`**; không implement tab đổi role STAFF/ADMIN/SA;
     menu & route sinh theo role sau login (mục 6).
  7. Không hardcode chuỗi, không `any`, lint/build sạch (mục 7).
  8. Tài liệu đã cập nhật nếu có thay đổi kiến trúc (mục 9).
- Có phát hiện vi phạm ⇒ nêu rõ **file:line**, mức độ nghiêm trọng và cách sửa đề xuất.
