import { supabase, REPORT_BUCKET } from './supabase';
import { normalizeAccount } from './normalize';

export type Report = {
  id: string;
  account: string;
  account_display: string;
  description: string;
  image_paths: string[];
  created_at: string;
};

export async function searchReportsByAccount(rawAccount: string): Promise<Report[]> {
  const account = normalizeAccount(rawAccount);
  if (!account) return [];

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('account', account)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export type CreateReportInput = {
  rawAccount: string;
  description: string;
  images: File[];
};

export async function createReport(input: CreateReportInput): Promise<Report> {
  const reportId = crypto.randomUUID();
  const account = normalizeAccount(input.rawAccount);
  const accountDisplay = input.rawAccount.trim();

  const uploadedPaths: string[] = [];

  try {
    for (let i = 0; i < input.images.length; i++) {
      const file = input.images[i];
      const path = `${reportId}/${i}.webp`;
      const { error: uploadError } = await supabase.storage
        .from(REPORT_BUCKET)
        .upload(path, file, { contentType: 'image/webp', upsert: false });

      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        id: reportId,
        account,
        account_display: accountDisplay,
        description: input.description.trim(),
        image_paths: uploadedPaths,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Report;
  } catch (err) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(REPORT_BUCKET).remove(uploadedPaths).catch(() => {});
    }
    throw err;
  }
}

export function getImagePublicUrl(path: string): string {
  const { data } = supabase.storage.from(REPORT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
