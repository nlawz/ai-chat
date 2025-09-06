"use client";

import React, { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchExaItem, listExaWebsetItems } from "@/artifacts/actions";
import {
    CheckCircle2 as CheckCircleIcon,
    XCircle as XCircleIcon,
    HelpCircle as HelpCircleIcon,
    ExternalLink as ExternalLinkIcon,
} from "lucide-react";

interface WebsetItemSheetProps {
    open: boolean;
    websetId: string | null;
    rowData: Record<string, string> | null;
    itemId?: string | null;
    onClose: () => void;
}

interface WebsetItem {
    id: string;
    properties: any;
    evaluations?: any[];
    enrichments?: any[];
}

export const WebsetItemSheet: React.FC<WebsetItemSheetProps> = ({
    open,
    websetId,
    rowData,
    itemId,
    onClose,
}) => {
    const [item, setItem] = useState<WebsetItem | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const fetchItem = async () => {
            setLoading(true);
            setError(null);
            try {
                if (!websetId) {
                    throw new Error("Missing websetId");
                }
                if (itemId) {
                    // Fetch a single item by ID for fast detail view
                    const data = await fetchExaItem(websetId, itemId);
                    setItem(data);
                    return;
                }
                // fallback: legacy logic (should rarely be used)
                const data = await listExaWebsetItems(websetId);
                const items = Array.isArray((data as any).data)
                    ? (data as any).data
                    : [];
                // Try to match by URL first
                let matched: any = null;
                const url = rowData?.url || rowData?.url?.toLowerCase();
                if (url) {
                    matched = items.find(
                        (it: any) =>
                            (it.properties?.url || "").toLowerCase() === url
                    );
                }
                // Fallback: if nothing matched, just use first item
                if (!matched && items.length > 0) matched = items[0];
                setItem(matched as any);
            } catch (err: any) {
                setError(err?.message ?? String(err));
            } finally {
                setLoading(false);
            }
        };
        fetchItem();
    }, [open, websetId, rowData, itemId]);

    const renderContent = () => {
        if (loading) return <Skeleton className="h-40 w-full" />;
        if (error) return <p className="text-red-600 p-4">{error}</p>;
        if (!item) return null;

        const props = item.properties || {};
        const isPerson = !!props.person;
        const evaluations = Array.isArray(item.evaluations)
            ? item.evaluations
            : [];
        const enrichments = Array.isArray(item.enrichments)
            ? item.enrichments
            : [];
        return (
            <div className="space-y-4 p-4 overflow-auto h-full">
                {/* Header */}
                <div className="flex items-start gap-4">
                    {isPerson && props.person?.pictureUrl ? (
                        <img
                            src={props.person.pictureUrl}
                            alt={props.person.name}
                            className="h-12 w-12 rounded-full object-cover mt-1"
                        />
                    ) : null}
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold">
                            {isPerson
                                ? props.person?.name
                                : props.company?.name}
                        </h2>
                        {props.url && (
                            <a
                                href={
                                    props.url.startsWith("http")
                                        ? props.url
                                        : `https://${props.url}`
                                }
                                target="_blank"
                                className="text-blue-600 underline text-sm break-all">
                                {props.url}
                            </a>
                        )}
                    </div>
                </div>
                {/* Relevance Summary / Description */}
                {props.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {props.description}
                    </p>
                )}

                {/* Evaluations */}
                {evaluations.length > 0 && (
                    <div>
                        <h3 className="font-medium mb-2">
                            Criteria Evaluations
                        </h3>
                        <ul className="space-y-4">
                            {evaluations.map((ev, idx) => {
                                const raw = ev?.satisfied ?? ev?.result ?? 'unknown';
                                const normalized = String(raw).toLowerCase();
                                const satisfied =
                                    normalized === 'match' || normalized === 'true'
                                        ? 'yes'
                                        : normalized === 'miss' || normalized === 'false'
                                          ? 'no'
                                          : normalized;
                                const criterionText =
                                    typeof ev?.criterion === 'string'
                                        ? ev.criterion
                                        : ev?.criterion?.description ?? 'Criterion';
                                const Icon =
                                    satisfied === "yes"
                                        ? CheckCircleIcon
                                        : satisfied === "no"
                                          ? XCircleIcon
                                          : HelpCircleIcon;
                                const iconColor =
                                    satisfied === "yes"
                                        ? "text-green-600"
                                        : satisfied === "no"
                                          ? "text-red-600"
                                          : "text-gray-600";
                                return (
                                    <li
                                        key={criterionText || idx}
                                        className="space-y-1">
                                        <div className="flex items-start gap-2">
                                            <Icon
                                                className={`${iconColor} h-4 w-4 mt-0.5`}
                                            />
                                            <span className="font-medium">
                                                {criterionText}
                                            </span>
                                        </div>
                                        {ev.reasoning && (
                                            <p className="text-sm text-muted-foreground ml-6">
                                                {ev.reasoning}
                                            </p>
                                        )}
                                        {Array.isArray(ev.references) &&
                                            ev.references.length > 0 && (
                                                <ul className="ml-6 mt-1 space-y-1">
                                                    {ev.references.map(
                                                        (
                                                            ref: any,
                                                            idx: number
                                                        ) => (
                                                            <li
                                                                key={idx}
                                                                className="text-xs flex items-start gap-1">
                                                                <ExternalLinkIcon className="h-3 w-3 text-blue-600 mt-0.5" />
                                                                <a
                                                                    href={
                                                                        ref.url
                                                                    }
                                                                    target="_blank"
                                                                    className="underline text-blue-600 break-all">
                                                                    {ref.title ||
                                                                        ref.url}
                                                                </a>
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {/* Work Experience */}
                {isPerson &&
                    Array.isArray(props.person?.experience) &&
                    props.person.experience.length > 0 && (
                        <div>
                            <h3 className="font-medium mb-2">
                                Work Experience
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {props.person.experience.map(
                                    (exp: any, idx: number) => {
                                        const title =
                                            exp.position || exp.title || "";
                                        const company =
                                            exp.company?.name ||
                                            exp.company ||
                                            "";
                                        const dates =
                                            exp.startDate || exp.endDate
                                                ? `${exp.startDate || ""}${exp.startDate || exp.endDate ? " - " : ""}${exp.endDate || "Present"}`
                                                : "";
                                        return (
                                            <li key={idx}>
                                                {title ? `${title} - ` : ""}
                                                {company}
                                                {dates ? `, ${dates}` : ""}
                                            </li>
                                        );
                                    }
                                )}
                            </ul>
                        </div>
                    )}

                {/* Education */}
                {isPerson &&
                    Array.isArray(props.person?.education) &&
                    props.person.education.length > 0 && (
                        <div>
                            <h3 className="font-medium mb-2">Education</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {props.person.education.map(
                                    (edu: any, idx: number) => (
                                        <li key={idx}>
                                            {edu.institution ||
                                                edu.school ||
                                                ""}
                                            {edu.degree
                                                ? `, ${edu.degree}`
                                                : ""}
                                            {edu.field ? `, ${edu.field}` : ""}
                                            {edu.graduationYear
                                                ? `, ${edu.graduationYear}`
                                                : ""}
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>
                    )}

                {/* Enrichments */}
                {enrichments.length > 0 && (
                    <div>
                        <h3 className="font-medium mb-2">Enrichments</h3>
                        <ul className="space-y-4">
                            {enrichments.map((enrich: any, idx: number) => (
                                <li key={idx} className="space-y-1">
                                    <p className="text-sm font-medium">
                                        {enrich.enrichmentId ||
                                            `Enrichment #${idx + 1}`}{" "}
                                        - {enrich.status}
                                    </p>
                                    {enrich.reasoning && (
                                        <p className="text-sm text-muted-foreground">
                                            {enrich.reasoning}
                                        </p>
                                    )}
                                    {Array.isArray(enrich.result) &&
                                        enrich.result.length > 0 && (
                                            <pre className="whitespace-pre-wrap text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
                                                {enrich.result.join("\n")}
                                            </pre>
                                        )}
                                    {Array.isArray(enrich.references) &&
                                        enrich.references.length > 0 && (
                                            <ul className="space-y-1 ml-2">
                                                {enrich.references.map(
                                                    (
                                                        ref: any,
                                                        rIdx: number
                                                    ) => (
                                                        <li
                                                            key={rIdx}
                                                            className="text-xs flex items-start gap-1">
                                                            <ExternalLinkIcon className="h-3 w-3 text-blue-600 mt-0.5" />
                                                            <a
                                                                href={ref.url}
                                                                target="_blank"
                                                                className="underline text-blue-600 break-all">
                                                                {ref.title ||
                                                                    ref.url}
                                                            </a>
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
            <SheetContent side="right" className="w-[420px] sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Details</SheetTitle>
                </SheetHeader>
                {renderContent()}
            </SheetContent>
        </Sheet>
    );
};
