import DishubAuthGuard from "@/components/dashboard/DishubAuthGuard";

export default function DashboardLayout(props: LayoutProps<"/dashboard">) {
  return <DishubAuthGuard>{props.children}</DishubAuthGuard>;
}
