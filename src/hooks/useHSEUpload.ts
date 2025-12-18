import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useHSEUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File, folder: "inspections" | "medical-checks"): Promise<string | null> => {
    if (!file) return null;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("hse-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("hse-documents")
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading };
}
