import { z } from "zod";
import { tool } from "ai";
import type { UIMessageStreamWriter } from "ai";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { saveDocument } from "@/lib/db/queries";

// Parameters for creating a Webset. We expose a high-level "mode" that maps to
// Exa's `entity.type` value ("company" or "person") so the AI can choose the
// right search template.
const ExaWebsetsParams = z.object({
    query: z
        .string()
        .describe(
            "Plain-English description of what to find. e.g. 'Seed-stage B2B SaaS startups in Germany'"
        )
        .min(3),
    mode: z
        .enum(["company", "person"])
        .describe(
            "Search type: 'company' for organisations, 'person' for individual people"
        ),
    criteria: z
        .array(z.string())
        .min(1)
        .describe(
            "One or more inclusion criteria (each becomes a Websets criterion description)"
        ),
    count: z
        .number()
        .min(1)
        .max(1000)
        .describe("How many rows to return (max 1000 – defaults to 100)"),
});

interface ExaWebsetsProps {
    session: any;
    dataStream: UIMessageStreamWriter<ChatMessage>;
}

export const exaWebsets = ({ session, dataStream }: ExaWebsetsProps) =>
    tool({
        description: 'Create and populate a webset using Exa AI. This creates a spreadsheet that gets populated in real-time as Exa finds matching entities based on your criteria.',
        inputSchema: ExaWebsetsParams,
        execute: async ({ query, criteria, count = 100, mode }: z.infer<typeof ExaWebsetsParams>) => {
            console.log("[exaWebsets] Params received", { query, criteria, count, mode });

            try {
                // ───────────────────────────────────────────────────────────
                // Prep identifiers & helper values
                // ───────────────────────────────────────────────────────────
                const documentId = generateUUID();
                const entityType = mode; // already "company" | "person"

                const formattedCriteria = criteria.map((c) => ({ description: c }));

                // ───────────────────────────────────────────────────────────
                // 1. Create document artifact immediately using standard flow
                // ───────────────────────────────────────────────────────────
                console.log("[exaWebsets] Creating artifact with documentId:", documentId);
                
                dataStream.write({
                    type: 'data-kind',
                    data: 'sheet',
                    transient: true,
                });
                console.log("[exaWebsets] Sent data-kind: sheet");

                dataStream.write({
                    type: 'data-id',
                    data: documentId,
                    transient: true,
                });
                console.log("[exaWebsets] Sent data-id:", documentId);

                dataStream.write({
                    type: 'data-title',
                    data: `${entityType} webset for "${query}"`,
                    transient: true,
                });
                console.log("[exaWebsets] Sent data-title:", `${entityType} webset for "${query}"`);

                dataStream.write({
                    type: 'data-clear',
                    data: null,
                    transient: true,
                });
                console.log("[exaWebsets] Sent data-clear");

                // Send webset metadata for the artifact
                dataStream.write({
                    type: 'data-websetMetadata',
                    data: {
                        websetId: null, // Will be set after webset creation
                        query,
                        mode,
                        criteria,
                    },
                    transient: true,
                });
                console.log("[exaWebsets] Sent initial metadata");

                // Create initial CSV with headers
                const headers = mode === 'company' 
                    ? ['name', 'url', 'description', ...criteria, 'satisfiesAllCriteria', 'pictureUrl', '_itemId']
                    : ['name', 'url', 'description', 'position', 'company', 'location', ...criteria, 'satisfiesAllCriteria', 'pictureUrl', '_itemId'];

                let currentCsv = headers.join(',') + '\n';
                console.log("[exaWebsets] Initial CSV headers:", currentCsv);

                dataStream.write({
                    type: 'data-sheetDelta',
                    data: currentCsv,
                    transient: true,
                });
                console.log("[exaWebsets] Sent initial data-sheetDelta");

                // ───────────────────────────────────────────────────────────
                // 2. Create the Webset
                // ───────────────────────────────────────────────────────────
                const createRes = await fetch(
                    "https://api.exa.ai/websets/v0/websets",
                    {
                        method: "POST",
                        headers: {
                            "x-api-key": process.env.EXA_API_KEY!,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            externalId: documentId,
                            search: {
                                query,
                                entity: { type: entityType },
                                criteria: formattedCriteria,
                                count,
                                metadata: {
                                    documentId,
                                    userId: session?.user?.id ?? null,
                                    query,
                                    mode,
                                    count: String(count),
                                },
                            },
                            metadata: {
                                documentId,
                                userId: session?.user?.id ?? null,
                                query,
                                mode,
                                count: String(count),
                            },
                            enrichments: [],
                        }),
                    }
                );

                if (!createRes.ok) {
                    const errorText = await createRes.text();
                    throw new Error(
                        `Failed to create Webset – ${createRes.status} ${createRes.statusText}: ${errorText}`
                    );
                }

                const websetData = await createRes.json();
                const websetId = websetData.id;
                console.log(`[exaWebsets] Webset created -> ${websetId}`);

                // Update metadata with the actual webset ID
                dataStream.write({
                    type: 'data-websetMetadata',
                    data: {
                        websetId,
                        query,
                        mode,
                        criteria,
                    },
                    transient: true,
                });
                console.log("[exaWebsets] Updated metadata with websetId:", websetId);

                // ───────────────────────────────────────────────────────────
                // 3. Start polling for results and stream updates
                // ───────────────────────────────────────────────────────────
                
                // Poll for webset status and items
                const pollResults = async () => {
                    const seenItemIds = new Set<string>();

                    for (let attempt = 0; attempt < 15; attempt++) {
                        try {
                            // Check webset status
                            const statusRes = await fetch(`https://api.exa.ai/websets/v0/websets/${websetId}`, {
                                headers: {
                                    "x-api-key": process.env.EXA_API_KEY!,
                                },
                            });

                            if (statusRes.ok) {
                                const statusData = await statusRes.json();
                                console.log(`[exaWebsets] Status check ${attempt + 1}:`, statusData.status);

                                // Fetch current items
                                const itemsRes = await fetch(`https://api.exa.ai/websets/v0/websets/${websetId}/items`, {
                                    headers: {
                                        "x-api-key": process.env.EXA_API_KEY!,
                                    },
                                });

                                if (itemsRes.ok) {
                                    const itemsData = await itemsRes.json();
                                    console.log(`[exaWebsets] Items response:`, itemsData);
                                    const items = itemsData.data || [];
                                    console.log(`[exaWebsets] Found ${items.length} items`);

                                    // Process new items
                                    let hasNewItems = false;
                                    for (const item of items) {
                                        if (!seenItemIds.has(item.id)) {
                                            seenItemIds.add(item.id);
                                            hasNewItems = true;

                                            // Create row data
                                            const row: string[] = [];
                                            const props = item.properties || {};
                                            const company = props.company || {};
                                            const person = props.person || {};
                                            
                                            if (mode === 'company') {
                                                row.push(
                                                    `"${(company.name || '').replace(/"/g, '""')}"`,
                                                    `"${(props.url || '').replace(/"/g, '""')}"`,
                                                    `"${(props.description || '').replace(/"/g, '""')}"`,
                                                );
                                            } else {
                                                // Person mode: name, url, description, position, company, location
                                                row.push(
                                                    `"${(person.name || '').replace(/"/g, '""')}"`,
                                                    `"${(props.url || '').replace(/"/g, '""')}"`,
                                                    `"${(props.description || '').replace(/"/g, '""')}"`,
                                                    `"${(person.position || '').replace(/"/g, '""')}"`,
                                                    `"${(person.company?.name || '').replace(/"/g, '""')}"`,
                                                    `"${(person.location || '').replace(/"/g, '""')}"`,
                                                );
                                            }

                                            // Add criteria columns - get from evaluations
                                            const evaluations = item.evaluations || [];
                                            for (const criterion of criteria) {
                                                const evaluation = evaluations.find((e: any) => e.criterion?.description === criterion);
                                                const value = evaluation?.result || 'Unknown';
                                                row.push(`"${value}"`);
                                            }

                                            // Add satisfiesAllCriteria column
                                            const satisfiesAll = evaluations.every((e: any) => e.result === 'Match');
                                            row.push(`"${satisfiesAll}"`);

                                            // Add hidden columns
                                            const pictureUrl = mode === 'company' 
                                                ? (company.logoUrl || '')
                                                : (person.pictureUrl || '');
                                            row.push(`"${pictureUrl.replace(/"/g, '""')}"`);
                                            row.push(`"${item.id}"`);

                                            currentCsv += row.join(',') + '\n';
                                            const itemName = mode === 'company' ? company.name : person.name;
                                            console.log(`[exaWebsets] Added item: ${itemName}`);
                                        }
                                    }

                                    // Stream update if we have new items
                                    if (hasNewItems) {
                                        dataStream.write({
                                            type: 'data-sheetDelta',
                                            data: currentCsv,
                                            transient: true,
                                        });
                                    }

                                    // Check if complete
                                    if (statusData.status === 'completed' || items.length >= count) {
                                        console.log(`[exaWebsets] Polling complete - status: ${statusData.status}, items: ${items.length}`);
                                        break;
                                    }
                                } else {
                                    console.error(`[exaWebsets] Items API call failed:`, itemsRes.status, await itemsRes.text());
                                }
                            } else {
                                console.error(`[exaWebsets] Status API call failed:`, statusRes.status, await statusRes.text());
                            }

                            // Wait before next poll
                            await new Promise(resolve => setTimeout(resolve, 2000));

                        } catch (pollError) {
                            console.error(`[exaWebsets] Poll attempt ${attempt + 1} failed:`, pollError);
                        }
                    }
                };

                // Start polling and wait for it to complete
                await pollResults();
                
                console.log('[exaWebsets] Polling complete, sending data-finish');
                dataStream.write({ type: 'data-finish', data: null, transient: true });

                // Save the final webset data to database
                if (session?.user?.id) {
                    console.log('[exaWebsets] Saving document to database');
                    await saveDocument({
                        id: documentId,
                        title: `${entityType} webset for "${query}"`,
                        kind: "sheet",
                        content: currentCsv,
                        userId: session.user.id,
                    });
                    console.log('[exaWebsets] Document saved successfully');
                }

                return {
                    id: documentId,
                    title: `${entityType} webset for "${query}"`,
                    kind: "sheet" as const,
                    content: currentCsv,
                };

            } catch (error) {
                console.error("[exaWebsets] Fatal error", error);
                throw error;
            }
        },
    });
