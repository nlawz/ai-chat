'use server';

import { getSuggestionsByDocumentId } from '@/lib/db/queries';

export async function getSuggestions({ documentId }: { documentId: string }) {
  const suggestions = await getSuggestionsByDocumentId({ documentId });
  return suggestions ?? [];
}

export async function fetchExaItem(websetId: string, itemId: string) {
    console.log("[fetchExaItem] Fetching item", { websetId, itemId });
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
        throw new Error("EXA_API_KEY not set");
    }

    const url = `https://api.exa.ai/websets/v0/websets/${websetId}/items/${itemId}`;
    console.log("[fetchExaItem] Request URL", url);

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        // Ensure this request always happens server-side
        cache: "no-store",
    });

    console.log("[fetchExaItem] Response status", res.status);

    let responseBody: any = null;
    try {
        responseBody = await res.json();
        console.log(
            "[fetchExaItem] Response body (truncated)",
            JSON.stringify(responseBody).slice(0, 500)
        );
    } catch (jsonErr) {
        console.error("[fetchExaItem] Failed to parse JSON", jsonErr);
        const text = await res.text();
        console.log(
            "[fetchExaItem] Raw response text (truncated)",
            text.slice(0, 500)
        );
        throw new Error("Failed to parse EXA API response");
    }

    if (!res.ok) {
        throw new Error(
            `Exa API error ${res.status}: ${JSON.stringify(responseBody).slice(0, 200)}`
        );
    }

    return responseBody;
}

export async function listExaWebsetItems(websetId: string) {
    console.log("[listExaWebsetItems] Fetching list for", websetId);
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) throw new Error("EXA_API_KEY not set");

    let allItems: any[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
        pageCount++;
        const url: string = `https://api.exa.ai/websets/v0/websets/${websetId}/items${cursor ? `?cursor=${cursor}` : ''}`;
        // console.log(`[listExaWebsetItems] Fetching page ${pageCount}${cursor ? ` with cursor ${cursor}` : ''}`);
        
        const res: Response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        // console.log(`[listExaWebsetItems] Page ${pageCount} response`, res.status);
        
        if (!res.ok) {
            throw new Error(`Failed to fetch webset items: ${res.status} ${res.statusText}`);
        }
        
        const json: any = await res.json();
        
        // Add items from this page
        const items = json.data || [];
        allItems = allItems.concat(items);
       //  console.log(`[listExaWebsetItems] Page ${pageCount}: ${items.length} items, total: ${allItems.length}`);
        
        // Check for more pages
        hasMore = json.hasMore === true;
        cursor = json.nextCursor || null;
        
        if (!hasMore) {
            console.log(`[listExaWebsetItems] Completed pagination - total items: ${allItems.length}`);
            break;
        }
    }

    return { data: allItems, hasMore: false }; // Return all items with hasMore: false since we've fetched everything
}

