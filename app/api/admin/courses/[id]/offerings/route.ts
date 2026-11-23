import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { rejectNonAdmin } from "@/lib/supabase-server";
import { offeringUpsertSchema } from "@/lib/admin-schemas";
import { refreshCatalogue } from "@/lib/catalogue-admin";
import { dbErrorResponse, parseBody } from "@/lib/cohorts";

type Params = { params: Promise<{ id: string }> };

// PUT — create or update the course's offering of one kind (group or
// self-paced). Deactivate an offering rather than deleting it.
export async function PUT(req: NextRequest, { params }: Params) {
  const denied = await rejectNonAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await parseBody(req, offeringUpsertSchema);
  if (body.response) return body.response;

  const { data, error } = await createAdminClient()
    .from("offerings")
    .upsert({ course_id: id, ...body.data }, { onConflict: "course_id,kind" })
    .select()
    .single();
  if (error) return dbErrorResponse(error);

  refreshCatalogue();
  return NextResponse.json(data);
}
