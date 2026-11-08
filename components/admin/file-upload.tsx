"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { COURSE_FILES_BUCKET, MAX_COURSE_FILE_BYTES } from "@/lib/lesson-access";
import { request, secondaryButtonClass } from "./ui";

/** Uploads a file straight to private storage and reports its stored path. */
export function FileUpload({
  scope,
  onUploaded,
  label = "Upload file",
}: {
  scope: "lessons" | "resources";
  onUploaded: (path: string, fileName: string) => void;
  label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    if (file.size > MAX_COURSE_FILE_BYTES) return setError("Files can be up to 50 MB.");
    setBusy(true);
    const { error: err, data } = await request<{ path: string; token: string }>("/uploads", "POST", {
      scope,
      file_name: file.name,
    });
    if (err || !data) {
      setBusy(false);
      return setError(err ?? "Couldn't start the upload.");
    }
    const { error: uploadError } = await supabase.storage
      .from(COURSE_FILES_BUCKET)
      .uploadToSignedUrl(data.path, data.token, file);
    setBusy(false);
    if (uploadError) return setError(`Upload failed: ${uploadError.message}`);
    onUploaded(data.path, file.name);
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className={secondaryButtonClass}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {busy ? "Uploading…" : label}
      </button>
      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
    </div>
  );
}
