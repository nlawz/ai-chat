import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import type { ChatMessage } from '@/lib/types';
import { generateUUID } from '@/lib/utils';
import { saveDocument } from '@/lib/db/queries';

interface ExaResearchProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

// Define the research parameters schema
const ExaResearchParams = z.object({
  instructions: z
    .string()
    .describe(
      'The research instructions describing what to research and how to format the output',
    ),
  output_schema: z
    .object({})
    .optional()
    .describe('Optional JSON schema to structure the research output'),
});

async function pollTaskProgress(researchId: string): Promise<any> {
  const maxAttempts = 60; // 5 minutes max (5s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(
        `https://api.exa.ai/research/v1/${researchId}?events=true`,
        {
          headers: {
            'x-api-key': process.env.EXA_API_KEY!,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to check task status: ${response.statusText}`);
      }

      const taskStatus = await response.json();

      if (taskStatus.status === 'completed') {
        return taskStatus;
      }

      if (taskStatus.status === 'failed') {
        throw new Error(taskStatus.message || 'Research task failed');
      }

      // Wait 5 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    } catch (error) {
      console.error('Error polling task:', error);
      throw error;
    }
  }

  throw new Error('Research task timed out');
}

function extractOutputText(completedTask: any): string {
  const output = completedTask?.output;
  if (!output) return '';

  // Prefer the documented research content field
  if (typeof output.content === 'string' && output.content.trim().length > 0) {
    return output.content;
  }

  // Fallback to text if present
  if (typeof output.text === 'string' && output.text.trim().length > 0) {
    return output.text;
  }

  // As a last resort, serialize
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

function extractCitations(completedTask: any): Array<{ title: string; url: string }> {
  const output = completedTask?.output;
  const raw = Array.isArray(output?.citations) ? output.citations : [];
  return raw
    .filter((c: any) => c && typeof c.url === 'string' && c.url.length > 0)
    .map((c: any) => ({ title: c.title || c.url, url: c.url }));
}

function chunkString(input: string, chunkSize = 1200): string[] {
  if (!input) return [];
  const chunks: string[] = [];
  for (let i = 0; i < input.length; i += chunkSize) {
    chunks.push(input.slice(i, i + chunkSize));
  }
  return chunks;
}

export const exaResearch = ({ session, dataStream }: ExaResearchProps) =>
  tool({
    description:
      "Conduct comprehensive research using Exa AI's Research API. This tool can gather information from multiple sources, analyze content, and provide structured research results with citations.",
    inputSchema: ExaResearchParams,
    execute: async ({ instructions, output_schema }: z.infer<typeof ExaResearchParams>) => {
      console.log('Exa Research Params:', { instructions, output_schema });

      // Prepare a text artifact to display research results
      const documentId = generateUUID();
      const title = `Research: ${instructions.length > 60 ? instructions.slice(0, 57) + '…' : instructions}`;

      // Initialize artifact UI
      try {
        dataStream.write({ type: 'data-kind', data: 'text', transient: true });
        dataStream.write({ type: 'data-id', data: documentId, transient: true });
        dataStream.write({ type: 'data-title', data: title, transient: true });
        dataStream.write({ type: 'data-clear', data: null, transient: true });
      } catch (streamInitError) {
        console.error('[ExaResearch] Failed to init artifact stream', streamInitError);
      }

      try {
        // Create research task
        const createTaskResponse = await fetch('https://api.exa.ai/research/v1', {
          method: 'POST',
          headers: {
            'x-api-key': process.env.EXA_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'exa-research',
            instructions,
            ...(output_schema && { outputSchema: output_schema }),
          }),
        });

        if (!createTaskResponse.ok) {
          const errorText = await createTaskResponse.text();
          console.error('Exa Research Task Creation Error:', {
            status: createTaskResponse.status,
            statusText: createTaskResponse.statusText,
            error: errorText,
          });
          throw new Error(
            `Failed to create research task: ${createTaskResponse.statusText} - ${errorText}`,
          );
        }

        const task = await createTaskResponse.json();
        console.log('Research task created:', task);

        // Poll for completion
        const completedTask = await pollTaskProgress(task.researchId);

        // Extract results
        const textOutput = extractOutputText(completedTask);
        const citations = extractCitations(completedTask);
        const formattedCitations = citations
          .map((c) => `[${c.title}](${c.url})`)
          .join(', ');

        // Compose final content for the artifact
        const contentParts: string[] = [];
        if (textOutput) contentParts.push(textOutput.trim());
        if (citations.length > 0) {
          contentParts.push('\n\n---\n\nSources:');
          for (const c of citations) {
            contentParts.push(`- [${c.title}](${c.url})`);
          }
        }
        const fullContent = contentParts.join('\n');

        // Stream content to UI (chunked for smoother rendering)
        for (const chunk of chunkString(fullContent)) {
          dataStream.write({ type: 'data-textDelta', data: chunk, transient: true });
        }
        dataStream.write({ type: 'data-finish', data: null, transient: true });

        // Persist document
        if (session?.user?.id) {
          try {
            await saveDocument({
              id: documentId,
              title,
              kind: 'text',
              content: fullContent,
              userId: session.user.id,
            });
          } catch (persistError) {
            console.error('[ExaResearch] Failed to save document', persistError);
          }
        }

        const result = {
          id: documentId,
          title,
          kind: 'text' as const,
          content: fullContent,
          taskId: task.researchId,
          status: 'completed' as const,
          citations,
          formattedCitations,
          summary: `Research completed successfully. ${citations.length} sources analyzed.`,
        };

        console.log('Exa Research Response:', result);
        return result;
      } catch (error) {
        console.error('Exa Research Error:', error);
        // Ensure UI is notified
        try {
          dataStream.write({ type: 'data-finish', data: null, transient: true });
        } catch {}
        throw error;
      }
    },
  });