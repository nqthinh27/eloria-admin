/**
 * `AdministrativeAddressResDTO` — dùng chung cho cả Tỉnh/Thành (level 0) và Phường/Xã (level 1).
 * CHỈ có `{id, name}`, không có field `code` riêng — `id` chính là giá trị truyền vào
 * `provinceCode`/`wardCode` của `Branch`/`CreateBranchReqDTO` và query `wards?provinceCode=`.
 */
export type AdministrativeAddress = {
    id: string
    name: string
}
