import { StreamingData } from "@/types/anime";
import { fetchStreamingSources } from "./anime.service";

export async function fetchCombinedSources(
  episodeId: string | undefined,
  animeName: string | undefined,
  episodeNumber: number | undefined,
  server: string = "hd-1",
  category: string = "sub",
  currentUserId?: string,
  knownAnilistId?: number | string | null,
  knownMalId?: number | string | null
): Promise<StreamingData & { hasAniStreamAPI: boolean }> {
  if (!episodeId) throw new Error("Episode ID required");

  let primaryData: StreamingData = {
    headers: { Referer: "", "User-Agent": "" },
    sources: [],
    subtitles: [],
    anilistID: null,
    malID: null
  };

  try {
    primaryData = await fetchStreamingSources(episodeId, server, category, {
      animeName,
      anilistId: knownAnilistId,
    });
  } catch (error) {
    console.warn('Streaming source fetch failed:', error);
  }

  return {
    sources: primaryData.sources || [],
    subtitles: primaryData.subtitles || [],
    tracks: primaryData.tracks || [],
    providerServers: [],
    anilistID: primaryData.anilistID || null,
    malID: primaryData.malID || null,
    intro: primaryData.intro || null,
    outro: primaryData.outro || null,
    headers: primaryData.headers || { Referer: "", "User-Agent": "" },
    hasAniStreamAPI: true,
  };
}
