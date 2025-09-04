import { z } from "zod";
import { tool } from "ai";

// Define the search parameters schema
const ExaSearchParams = z.object({
    query: z.string().describe("The search query to find relevant information"),
    category: z
        .string()
        .describe(
            "The category to search in (research paper, news, blog, any)"
        ),
    numResults: z.number().describe("Number of results to return"),
});

export const exaSearch = tool({
    description: "Search the web using Exa AI to find relevant and high-quality information on any topic",
    inputSchema: ExaSearchParams,
    execute: async (params: z.infer<typeof ExaSearchParams>) => {
        console.log("Exa Search Params:", params);

        const { query, category = "any", numResults = 5 } = params;

        const options = {
            method: "POST",
            headers: {
                "x-api-key": process.env.EXA_API_KEY!,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                type: "auto",
                category,
                numResults,
                contents: {
                    text: { maxCharacters: 1000 },
                    highlights: { numSentences: 1, highlightsPerUrl: 1 },
                    summary: { enabled: true },
                },
            }),
        };

        console.log("Exa Search Request:", {
            url: "https://api.exa.ai/search",
            headers: options.headers,
            body: JSON.parse(options.body as string),
        });

        const response = await fetch("https://api.exa.ai/search", options);
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Exa Search Error:", {
                status: response.status,
                statusText: response.statusText,
                error: errorText,
            });
            throw new Error(
                `Exa API error: ${response.statusText} - ${errorText}`
            );
        }

        const data = await response.json();

        // Format the response to include URLs with titles
        const formattedResults = {
            results: data.results.map(
                (result: { url: string; title: string; text: string; highlights?: string[]; summary?: string }) => ({
                    ...result,
                    formattedSource: `[${result.title}](${result.url})`, // Add formatted markdown link
                    text: result.text,
                    highlights: result.highlights,
                    summary: result.summary,
                })
            ),
        };

        console.log("Exa Search Response:", formattedResults);
        return formattedResults;
    },
});
