import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CourierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is courier
  const { data: staffData } = await supabase
    .from("pharmacy_staff")
    .select("staff_role")
    .eq("user_id", user.id)
    .single();

  // Owners and admins also can deliver, so we let them access courier dashboard
  if (!staffData || !["courier", "admin", "owner"].includes(staffData.staff_role)) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
    </div>
  );
}
