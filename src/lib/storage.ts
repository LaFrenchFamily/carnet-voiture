import { BUCKET, supabase } from './supabase'

/** Recursively lists every file path under a folder of the invoices bucket. */
async function listFiles(prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error) throw error
  const paths: string[] = []
  for (const item of data) {
    const path = `${prefix}/${item.name}`
    // Folders are returned without an id.
    if (item.id === null) paths.push(...(await listFiles(path)))
    else paths.push(path)
  }
  return paths
}

/** Deletes every file under a folder (direct SQL deletes on storage are blocked by Supabase). */
export async function removeFolder(prefix: string): Promise<void> {
  const paths = await listFiles(prefix)
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 100))
    if (error) throw error
  }
}

export async function signedUrl(path: string, download?: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300, download ? { download } : undefined)
  if (error) throw error
  return data.signedUrl
}
