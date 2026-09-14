/**
 * nekos.best is behind Cloudflare bot-detection that blocks naive HTTP
 * clients (confirmed: curl gets a JS-challenge page, Node's native fetch
 * — what this bot actually uses — gets a clean 200) — worth stating
 * explicitly since it's the one external dependency in this milestone.
 * Failures are still caught and surfaced as null rather than thrown,
 * since it's a third-party service outside this project's control.
 */
export async function fetchReactionGif(endpoint: string): Promise<string | null> {
  try {
    const response = await fetch(`https://nekos.best/api/v2/${endpoint}`);
    if (!response.ok) return null;

    const data = (await response.json()) as { results?: { url?: string }[] };
    return data.results?.[0]?.url ?? null;
  } catch (err) {
    console.error(`[interactions] failed to fetch a "${endpoint}" GIF from nekos.best:`, err);
    return null;
  }
}
