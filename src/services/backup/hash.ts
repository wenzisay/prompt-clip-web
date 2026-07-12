export async function sha256(content: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', content as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
