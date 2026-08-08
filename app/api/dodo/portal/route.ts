import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dodo } from "@/lib/dodo";
import { isSameOrigin } from "@/lib/security";

// Lets a paying user manage or cancel their subscription, view invoices,
// and update their card — all on Dodo's own secure hosted page.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("dodo_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.dodo_customer_id) {
    return NextResponse.json({ error: "No subscription found." }, { status: 404 });
  }

  const portalSession = await dodo.customers.customerPortal.create(
    profile.dodo_customer_id
  );

  return NextResponse.json({ url: portalSession.link });
}