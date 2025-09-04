import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import type { ChatMessage } from '@/lib/types';

interface ExaResearchProps {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
}

// Define the research parameters schema
const ExaResearchParams = z.object({
  instructions: z.string().describe("The research instructions describing what to research and how to format the output"),
  output_schema: z.object({}).optional().describe("Optional JSON schema to structure the research output"),
});

async function pollTaskProgress(researchId: string): Promise<any> {
  const maxAttempts = 60; // 5 minutes max (5s intervals)
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`https://api.exa.ai/research/v1/${researchId}`, {
        headers: {
          'x-api-key': process.env.EXA_API_KEY!,
          'Content-Type': 'application/json',
        },
      });

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
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
      
    } catch (error) {
      console.error('Error polling task:', error);
      throw error;
    }
  }
  
  throw new Error('Research task timed out');
}

export const exaResearch = ({ session, dataStream }: ExaResearchProps) =>
  tool({
    description: 'Conduct comprehensive research using Exa AI\'s Research API. This tool can gather information from multiple sources, analyze content, and provide structured research results with citations.',
    inputSchema: ExaResearchParams,
    execute: async ({ instructions, output_schema }: z.infer<typeof ExaResearchParams>) => {
      console.log('Exa Research Params:', { instructions, output_schema });

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
            ...(output_schema && { output_schema }),
          }),
        });

        if (!createTaskResponse.ok) {
          const errorText = await createTaskResponse.text();
          console.error('Exa Research Task Creation Error:', {
            status: createTaskResponse.status,
            statusText: createTaskResponse.statusText,
            error: errorText,
          });
          throw new Error(`Failed to create research task: ${createTaskResponse.statusText} - ${errorText}`);
        }

        const task = await createTaskResponse.json();
        console.log('Research task created:', task);

        // Poll for completion
        const completedTask = await pollTaskProgress(task.researchId);

        // Format the response with citations
        const formattedCitations = completedTask.citations?.map((citation: any) => 
          `[${citation.title || citation.url}](${citation.url})`
        ).join(', ') || '';

        const result = {
          taskId: task.researchId,
          status: 'completed' as const,
          data: completedTask.data,
          citations: completedTask.citations || [],
          formattedCitations,
          summary: `Research completed successfully. ${completedTask.citations?.length || 0} sources analyzed.`,
        };

        console.log('Exa Research Response:', result);
        return result;

      } catch (error) {
        console.error('Exa Research Error:', error);
        throw error;
      }
    },
  });