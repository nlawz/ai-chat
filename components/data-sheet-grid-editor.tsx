"use client";

import React, {
    memo,
    useEffect,
    useMemo,
    useState,
    useRef,
    useCallback,
} from "react";
import {
    DynamicDataSheetGrid as DataSheetGrid,
    textColumn,
    keyColumn,
} from "react-datasheet-grid";
import { parse, unparse } from "papaparse";
import { User } from "lucide-react";
import Link from "next/link";

// Import the DataSheetGrid styles
import "react-datasheet-grid/dist/style.css";

interface DataSheetGridEditorProps {
    content: string;
    isReadOnly?: boolean;
    onSaveContent?: (content: string, debounce: boolean) => void;
    onRowSelect?: (itemId: string, row: Record<string, string>) => void;
}

// After User and Link imports define color palette and hash helper
const CRITERION_COLORS = [
    "#9333ea", // purple-600
    "#f97316", // orange-500
    "#3b82f6", // blue-500
    "#a3e635", // lime-400
    "#be185d", // pink-700
    "#eab308", // yellow-500
    "#14b8a6", // teal-500
];

function colorForString(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit int
    }
    const idx = Math.abs(hash) % CRITERION_COLORS.length;
    return CRITERION_COLORS[idx];
}

const PureDataSheetGridEditor = ({
    content,
    isReadOnly = false,
    onSaveContent,
    onRowSelect,
}: DataSheetGridEditorProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(0);

    // Update container height on mount and resize
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                // Calculate available height (subtract some padding for buttons/header)
                const availableHeight = window.innerHeight * 0.7;
                setContainerHeight(availableHeight);
            }
        };

        updateHeight();
        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

    // Parse CSV content into rows
    const parsedData = useMemo(() => {
        try {
            if (!content) {
                return [
                    ["", "", ""],
                    ["", "", ""],
                    ["", "", ""],
                ];
            }

            const result = parse(content, { skipEmptyLines: false });
            if (process.env.NODE_ENV !== "production") {
                const firstRow = (result.data as any[])[0];
                console.log(
                    "[DataSheetGridEditor] Parsed first row length:",
                    Array.isArray(firstRow)
                        ? firstRow.length
                        : Object.keys(firstRow || {}).length,
                    firstRow
                );
            }
            return result.data as string[][];
        } catch (error) {
            console.error("Error parsing spreadsheet content:", error);
            return [["Error parsing content", "", ""]];
        }
    }, [content]);

    // Derive headers and body rows
    const headers = useMemo(() => {
        if (parsedData.length === 0) return [] as string[];
        return parsedData[0] as string[];
    }, [parsedData]);

    const bodyRows = useMemo(() => {
        if (parsedData.length <= 1) return [] as string[][];
        return parsedData.slice(1) as string[][];
    }, [parsedData]);

    // Get the maximum number of columns in the data
    const maxCols = useMemo(() => {
        const colsCount = [headers, ...bodyRows].reduce(
            (max, row) => Math.max(max, Array.isArray(row) ? row.length : 0),
            0
        );
        return Math.max(colsCount, 3); // Minimum 3 columns
    }, [headers, bodyRows]);

    // Transform data from CSV to row objects
    const rows = useMemo(() => {
        return bodyRows.map((row) => {
            const obj: Record<string, string> = {};
            for (let i = 0; i < maxCols; i++) {
                obj[i.toString()] = row[i] ?? "";
            }
            return obj;
        });
    }, [bodyRows, maxCols]);

    // Create columns
    const columns = useMemo(() => {
        const cols: any[] = [];
        for (let i = 0; i < maxCols; i++) {
            const headerName = headers[i] || String.fromCharCode(65 + i);
            if (headerName === "pictureUrl" || headerName === "_itemId") {
                continue; // skip hidden column
            }
            const base = {
                ...keyColumn(i.toString(), textColumn),
                title: (() => {
                    const isCriterion = ![
                        "name",
                        "url",
                        "description",
                        "position",
                        "company",
                        "location",
                        "satisfiesAllCriteria",
                    ].includes(headerName);
                    if (!isCriterion) return headerName;
                    const color = colorForString(headerName);
                    return (
                        <div className="flex items-center gap-1 w-full truncate">
                            <span
                                className="inline-block h-3 w-3 rounded-sm"
                                style={{ backgroundColor: color }}
                            />
                            <span className="truncate max-w-[120px]">
                                {headerName}
                            </span>
                        </div>
                    );
                })(),
                minWidth: headerName === "name" ? 200 : 160,
            } as any;
            if (headerName === "name") {
                // Custom render for name column with avatar
                base.component = ({ rowData }: { rowData: any }) => {
                    const picIdx = headers.indexOf("pictureUrl");
                    const nameIdx = headers.indexOf("name");
                    const url = rowData[picIdx.toString()];
                    const name = rowData[nameIdx.toString()];
                    const handleClick = () => {
                        if (!onRowSelect) return;
                        const itemIdx = headers.indexOf("_itemId");
                        const itemId =
                            itemIdx !== -1 ? rowData[itemIdx.toString()] : "";

                        // Map row to header keys as well as index keys
                        const mapped: Record<string, string> = { ...rowData };
                        for (let j = 0; j < maxCols; j++) {
                            const header = headers[j];
                            if (header)
                                mapped[header] = rowData[j.toString()] ?? "";
                        }

                        onRowSelect(itemId, mapped);
                    };
                    return (
                        <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={handleClick}>
                            {url ? (
                                <img
                                    src={url}
                                    alt="avatar"
                                    className="h-6 w-6 rounded-full object-cover"
                                />
                            ) : (
                                <User className="h-6 w-6 text-muted-foreground" />
                            )}
                            <span className="whitespace-nowrap">{name}</span>
                        </div>
                    );
                };
            } else if (headerName === "url") {
                base.component = ({ rowData }: { rowData: any }) => {
                    const href = rowData[i.toString()];
                    if (!href) return null;
                    return (
                        <Link
                            href={
                                href.startsWith("http")
                                    ? href
                                    : `https://${href}`
                            }
                            target="_blank"
                            className="text-blue-600 underline truncate max-w-[240px]">
                            {href}
                        </Link>
                    );
                };
            } else {
                // Generic component for other columns
                base.component = ({ rowData }: { rowData: any }) => {
                    const cellVal = rowData[i.toString()];
                    // Boolean overall column
                    if (headerName === "satisfiesAllCriteria") {
                        const boolColorClass =
                            cellVal === "true"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800";
                        return (
                            <div className="flex justify-center">
                                <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${boolColorClass}`}>
                                    {cellVal === "true" ? "True" : "False"}
                                </span>
                            </div>
                        );
                    }

                    // Match/Miss/Unknown badges
                    if (
                        cellVal === "Match" ||
                        cellVal === "Miss" ||
                        cellVal === "Unknown"
                    ) {
                        const colorClass =
                            cellVal === "Match"
                                ? "bg-green-100 text-green-800"
                                : cellVal === "Miss"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800";
                        return (
                            <div className="flex justify-center">
                                <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                                    {cellVal}
                                </span>
                            </div>
                        );
                    }

                    // Default text cell
                    return (
                        <span className="truncate max-w-[240px]">
                            {cellVal}
                        </span>
                    );
                };
            }
            cols.push(base);
        }
        return cols;
    }, [maxCols, headers]);

    // Memoised createRow for DynamicDataSheetGrid as prop must be stable
    const createRow = useCallback(() => {
        const obj: Record<string, string> = {};
        for (let i = 0; i < maxCols; i++) {
            obj[i.toString()] = "";
        }
        return obj;
    }, [maxCols]);

    // Handle changes to the grid data
    const handleChange = (newRows: Record<string, string>[]) => {
        if (isReadOnly || !onSaveContent) return;

        // Convert back to CSV format
        const newCsvData = [headers, ...newRows].map((row) => {
            const rowArray: string[] = [];
            for (let i = 0; i < maxCols; i++) {
                // Cast to any for mixed array/object rows (header vs body)
                rowArray.push((row as any)[i.toString()] || "");
            }
            return rowArray;
        });

        const csvContent = unparse(newCsvData);
        onSaveContent(csvContent, true);
    };

    // Calculate how many rows can fit in the container
    const rowsToDisplay = useMemo(() => {
        if (containerHeight <= 0) return 20;
        // Account for header (40px) and row height (35px)
        return Math.floor((containerHeight - 40) / 35);
    }, [containerHeight]);

    return (
        <div
            ref={containerRef}
            className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-md"
            style={{ height: "100%" }}>
            <div className="flex-grow w-full overflow-auto">
                <DataSheetGrid
                    value={rows}
                    onChange={handleChange}
                    columns={columns}
                    lockRows={isReadOnly}
                    headerRowHeight={40}
                    rowHeight={35}
                    addRowsComponent={isReadOnly ? false : undefined}
                    className="border border-gray-300 dark:border-gray-600 h-full"
                    autoAddRow={!isReadOnly}
                    height={containerHeight || undefined}
                    style={{ height: "100%" }}
                    createRow={createRow}
                    onActiveCellChange={({ cell }) => {
                        if (!cell || cell.row == null || !onRowSelect) return;
                        const rowObj = rows[cell.row];
                        const itemIdx = headers.indexOf("_itemId");
                        const maybeItemId =
                            itemIdx !== -1 ? rowObj[itemIdx.toString()] : "";

                        const mapped: Record<string, string> = { ...rowObj };
                        for (let j = 0; j < maxCols; j++) {
                            const header = headers[j];
                            if (header)
                                mapped[header] = rowObj[j.toString()] ?? "";
                        }

                        console.log(
                            "[DataSheetGridEditor] onActiveCellChange",
                            { cell, maybeItemId, mapped }
                        );
                        onRowSelect(maybeItemId, mapped);
                    }}
                    onSelectionChange={({ selection }) => {
                        if (!selection || !onRowSelect) return;
                        const row = selection.min.row;
                        if (row == null) return;
                        const rowObj = rows[row];
                        const itemIdx = headers.indexOf("_itemId");
                        const maybeItemId =
                            itemIdx !== -1 ? rowObj[itemIdx.toString()] : "";

                        const mapped: Record<string, string> = { ...rowObj };
                        for (let j = 0; j < maxCols; j++) {
                            const header = headers[j];
                            if (header)
                                mapped[header] = rowObj[j.toString()] ?? "";
                        }

                        console.log("[DataSheetGridEditor] onSelectionChange", {
                            selection,
                            maybeItemId,
                            mapped,
                        });
                        onRowSelect(maybeItemId, mapped);
                    }}
                />
            </div>
        </div>
    );
};

function areEqual(
    prevProps: DataSheetGridEditorProps,
    nextProps: DataSheetGridEditorProps
) {
    return (
        prevProps.isReadOnly === nextProps.isReadOnly &&
        prevProps.content === nextProps.content &&
        prevProps.onSaveContent === nextProps.onSaveContent &&
        prevProps.onRowSelect === nextProps.onRowSelect
    );
}

export const DataSheetGridEditor = memo(PureDataSheetGridEditor, areEqual);
