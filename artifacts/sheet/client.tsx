"use client";
import { Artifact } from '@/components/create-artifact';
import {
  CopyIcon,
  LineChartIcon,
  RedoIcon,
  SparklesIcon,
  UndoIcon,
} from '@/components/icons';
import { DataSheetGridEditor } from '@/components/data-sheet-grid-editor';
import { WebsetItemSheet } from '@/components/webset-item-sheet';
import { parse, unparse } from 'papaparse';
import { toast } from 'sonner';
import { useState } from 'react';

type Metadata = any;

function SheetArtifactContent({
  content,
  currentVersionIndex,
  isCurrentVersion,
  onSaveContent,
  status,
  metadata,
}: {
  content: string;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  onSaveContent: (content: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  metadata: Metadata;
}) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedRowData, setSelectedRowData] = useState<Record<string, string> | null>(null);
  const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);

  const handleRowSelect = (itemId: string, rowData: Record<string, string>) => {
    console.log('[SheetArtifact] Row selected:', { itemId, rowData });
    setSelectedItemId(itemId);
    setSelectedRowData(rowData);
    setIsItemSheetOpen(true);
  };

  const handleCloseItemSheet = () => {
    setIsItemSheetOpen(false);
    setSelectedItemId(null);
    setSelectedRowData(null);
  };

  const websetId = (metadata as any)?.websetId || null;

  return (
    <>
      <DataSheetGridEditor
        content={content}
        isReadOnly={!isCurrentVersion}
        onSaveContent={onSaveContent}
        onRowSelect={handleRowSelect}
      />
      {websetId && (
        <WebsetItemSheet
          open={isItemSheetOpen}
          websetId={websetId}
          rowData={selectedRowData}
          itemId={selectedItemId}
          onClose={handleCloseItemSheet}
        />
      )}
    </>
  );
}

export const sheetArtifact = new Artifact<'sheet', Metadata>({
  kind: 'sheet',
  description: 'Useful for working with spreadsheets',
  initialize: async () => {},
  onStreamPart: ({ setArtifact, setMetadata, streamPart }) => {
    if (streamPart.type === 'data-sheetDelta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: 'streaming',
      }));
    } else if (streamPart.type === 'data-websetMetadata') {
      // Update metadata with webset information
      setMetadata((prevMetadata: any) => ({
        ...prevMetadata,
        ...streamPart.data,
      }));
    }
  },
  content: SheetArtifactContent,
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon />,
      description: 'Copy as .csv',
      onClick: ({ content }) => {
        const parsed = parse<string[]>(content, { skipEmptyLines: true });

        const nonEmptyRows = parsed.data.filter((row) =>
          row.some((cell) => cell.trim() !== ''),
        );

        const cleanedCsv = unparse(nonEmptyRows);

        navigator.clipboard.writeText(cleanedCsv);
        toast.success('Copied csv to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      description: 'Format and clean data',
      icon: <SparklesIcon />,
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            { type: 'text', text: 'Can you please format and clean the data?' },
          ],
        });
      },
    },
    {
      description: 'Analyze and visualize data',
      icon: <LineChartIcon />,
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Can you please analyze and visualize the data by creating a new code artifact in python?',
            },
          ],
        });
      },
    },
  ],
});
