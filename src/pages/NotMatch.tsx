import { Link } from "react-router-dom"
import { buttonVariants } from "@/components/ui/button"

export default function NotMatch() {
    return (
        <div className="flex flex-grow items-center justify-center py-16">
            <div className="space-y-4 text-center">
                <p className="text-7xl font-semibold text-primary">404</p>
                <h1 className="text-2xl font-semibold">Không tìm thấy trang</h1>
                <p className="text-sm text-muted-foreground">
                    Trang bạn truy cập không tồn tại hoặc đã bị di chuyển.
                </p>
                <Link to="/" className={buttonVariants()}>Về trang chủ</Link>
            </div>
        </div>
    )
}
