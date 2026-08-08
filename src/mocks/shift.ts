import { EShiftStatus, type Shift } from '@/types/shift'

/** Ca bán hàng mẫu — chưa có mockup dữ liệu thật (`02-pos-mo-ca.png` chỉ có form trống). */
export const mockShifts: Shift[] = [
    {
        id: 'shift-001',
        branchId: 'branch-hn-hoan-kiem',
        staffId: 'staff-001',
        staffName: 'Trần Văn Minh',
        openingCash: 2_000_000,
        closingCash: 2_450_000,
        cashVariance: 0,
        note: null,
        status: EShiftStatus.CLOSED,
        openedAt: '2024-07-12T08:00:00Z',
        closedAt: '2024-07-12T21:00:00Z',
    },
]
