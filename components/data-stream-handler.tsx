'use client';

import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { artifactDefinitions } from './artifact';
import { initialArtifactData, useArtifact } from '@/hooks/use-artifact';
import { useDataStream } from './data-stream-provider';
import { todoPlansAtom } from '@/lib/atoms/to-dos';

export function DataStreamHandler() {
  const { dataStream } = useDataStream();

  const { artifact, setArtifact, setMetadata } = useArtifact();
  const [, setTodoPlans] = useAtom(todoPlansAtom);
  const lastProcessedIndex = useRef(-1);

  useEffect(() => {
    if (!dataStream?.length) return;

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    newDeltas.forEach((delta) => {
      const artifactDefinition = artifactDefinitions.find(
        (artifactDefinition) => artifactDefinition.kind === artifact.kind,
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: 'streaming' };
        }

        switch (delta.type) {
          case 'data-id':
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: 'streaming',
            };

          case 'data-title':
            return {
              ...draftArtifact,
              title: delta.data,
              status: 'streaming',
            };

          case 'data-kind':
            return {
              ...draftArtifact,
              kind: delta.data,
              status: 'streaming',
            };

          case 'data-clear':
            return {
              ...draftArtifact,
              content: '',
              status: 'streaming',
            };

          case 'data-finish':
            return {
              ...draftArtifact,
              status: 'idle',
            };

          case 'data-todoReplace':
            if (delta.data) {
              setTodoPlans((prev) => ({
                ...prev,
                [delta.data.chatId]: {
                  title: delta.data.title,
                  items: delta.data.items,
                },
              }));
            }
            return draftArtifact;

          case 'data-todoUpdate':
            if (delta.data) {
              setTodoPlans((prev) => ({
                ...prev,
                [delta.data.chatId]: {
                  title: delta.data.title,
                  items: delta.data.items,
                },
              }));
            }
            return draftArtifact;

          case 'data-todoClear':
            if (delta.data) {
              setTodoPlans((prev) => {
                const next = { ...prev };
                delete next[delta.data.chatId];
                return next;
              });
            }
            return draftArtifact;

          default:
            return draftArtifact;
        }
      });
    });
  }, [dataStream, setArtifact, setMetadata, artifact, setTodoPlans]);

  return null;
}
