"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    Loader2,
    PhoneIncoming,
    PhoneMissed,
    Search,
    UserX,
    XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useBranch } from "@/components/app-sidebar";
import { useEmployee } from "@/hooks/use-employee";
import {
    Call,
    fetchPaginatedCalls,
    formatDuration,
    getCallStatusLabel,
} from "@/hooks/use-calls";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 20;
const MISSED_OPERATOR_IDS = ["5000", "10"] as const;
const EMPTY_CALLS: Call[] = [];

type MissedCallReason = "all" | (typeof MISSED_OPERATOR_IDS)[number];

const missedCallReasons = {
    "5000": {
        title: "Ish vaqtidan tashqari",
        description: "Operatorlar ish vaqtidan tashqari kelgan qo'ng'iroqlar",
        badgeClass: "border-amber-500/50 text-amber-500",
        iconClass: "bg-amber-500/10 text-amber-500",
    },
    "10": {
        title: "Operator javob bermagan",
        description: "Umumiy admin liniyasida birorta operator ko'tarmagan qo'ng'iroqlar",
        badgeClass: "border-red-500/50 text-red-500",
        iconClass: "bg-red-500/10 text-red-500",
    },
} as const;

function getEndDateIso(endDate: string) {
    const date = new Date(endDate);
    date.setDate(date.getDate() + 1);
    return date.toISOString();
}

function getReason(operatorId: string | null) {
    if (operatorId === "5000" || operatorId === "10") {
        return missedCallReasons[operatorId];
    }

    return null;
}

function getOperatorIdsForReason(reason: MissedCallReason) {
    return reason === "all" ? [...MISSED_OPERATOR_IDS] : [reason];
}

async function fetchMissedSummary(startDate: string, endDate: string) {
    const supabase = createClient();

    const fetchCount = async (operatorId: (typeof MISSED_OPERATOR_IDS)[number]) => {
        let query = supabase
            .from("calls")
            .select("*", { count: "exact", head: true })
            .eq("operator_id", operatorId)
            .eq("answered", false)
            .eq("direction", "inbound");

        if (startDate) {
            query = query.gte("called_at", startDate);
        }

        if (endDate) {
            query = query.lt("called_at", getEndDateIso(endDate));
        }

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
    };

    const [afterHours, unhandled] = await Promise.all([
        fetchCount("5000"),
        fetchCount("10"),
    ]);

    return {
        afterHours,
        unhandled,
        total: afterHours + unhandled,
    };
}

function SummaryCard({
    title,
    description,
    value,
    iconClass,
    active,
    onClick,
}: {
    title: string;
    description: string;
    value: number;
    iconClass: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/40 ${
                active ? "border-primary/50" : "border-border"
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}>
                    <PhoneMissed className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold text-foreground">{value}</span>
            </div>
            <div className="mt-3">
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
        </button>
    );
}

export default function MissedCallsPage() {
    const { data: currentEmployee, isLoading: employeeLoading } = useEmployee();
    const { loading: branchLoading } = useBranch();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedReason, setSelectedReason] = useState<MissedCallReason>("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const isAdmin = currentEmployee?.role === "super-admin";

    const selectedOperatorIds = useMemo(
        () => getOperatorIdsForReason(selectedReason),
        [selectedReason]
    );

    const {
        data: summary,
        isLoading: summaryLoading,
    } = useQuery({
        queryKey: ["missed-calls-summary", startDate, endDate],
        queryFn: () => fetchMissedSummary(startDate, endDate),
        enabled: Boolean(isAdmin),
    });

    const {
        data: callsResult,
        isLoading: callsLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: [
            "missed-calls",
            currentPage,
            selectedReason,
            selectedOperatorIds.join(","),
            startDate,
            endDate,
        ],
        queryFn: () =>
            fetchPaginatedCalls(createClient(), {
                operatorIds: selectedOperatorIds,
                answered: false,
                direction: "inbound",
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                page: currentPage,
                pageSize: PAGE_SIZE,
            }),
        enabled: Boolean(isAdmin),
        placeholderData: keepPreviousData,
    });

    const calls = callsResult?.data ?? EMPTY_CALLS;
    const totalCount = callsResult?.totalCount ?? 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const filteredCalls = useMemo(() => {
        if (!searchQuery.trim()) return calls;

        const normalizedQuery = searchQuery.trim().toLowerCase();
        return calls.filter((call) => {
            const reason = getReason(call.operator_id);

            return [
                call.phone,
                call.caller || "",
                call.callee || "",
                call.operator_id || "",
                reason?.title || "",
                reason?.description || "",
            ].some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [calls, searchQuery]);

    const handleReasonChange = (value: MissedCallReason) => {
        setSelectedReason(value);
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setSelectedReason("all");
        setStartDate("");
        setEndDate("");
        setSearchQuery("");
        setCurrentPage(1);
    };

    const hasActiveFilters = selectedReason !== "all" || Boolean(startDate || endDate || searchQuery);
    const pageLoading = employeeLoading || branchLoading;

    if (pageLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6">
                <Card className="max-w-md border-border bg-card">
                    <CardContent className="pt-6 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                            <XCircle className="h-6 w-6 text-red-500" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-card-foreground">Ruxsat yo&apos;q</h2>
                        <p className="text-muted-foreground">
                            Bu sahifaga faqat admin kirishga ruxsat etilgan.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 p-6 lg:p-8">
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-500/10 p-2">
                    <PhoneMissed className="h-6 w-6 text-red-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">O&apos;tkazib yuborilgan qo&apos;ng&apos;iroqlar</h1>
                    <p className="text-sm text-muted-foreground">
                        5000 va 10 operator IDlari bo&apos;yicha propushenniy qo&apos;ng&apos;iroqlar
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <SummaryCard
                    title="Hammasi"
                    description="Maxsus operator IDlar bo'yicha jami"
                    value={summaryLoading ? 0 : summary?.total ?? 0}
                    iconClass="bg-primary/10 text-primary"
                    active={selectedReason === "all"}
                    onClick={() => handleReasonChange("all")}
                />
                <SummaryCard
                    title={missedCallReasons["5000"].title}
                    description={missedCallReasons["5000"].description}
                    value={summaryLoading ? 0 : summary?.afterHours ?? 0}
                    iconClass={missedCallReasons["5000"].iconClass}
                    active={selectedReason === "5000"}
                    onClick={() => handleReasonChange("5000")}
                />
                <SummaryCard
                    title={missedCallReasons["10"].title}
                    description={missedCallReasons["10"].description}
                    value={summaryLoading ? 0 : summary?.unhandled ?? 0}
                    iconClass={missedCallReasons["10"].iconClass}
                    active={selectedReason === "10"}
                    onClick={() => handleReasonChange("10")}
                />
            </div>

            <Card className="border-border bg-card">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="min-w-[240px] space-y-1.5">
                            <label className="flex items-center gap-1 text-sm text-muted-foreground">
                                <UserX className="h-3.5 w-3.5" />
                                Sabab
                            </label>
                            <Select value={selectedReason} onValueChange={handleReasonChange}>
                                <SelectTrigger className="w-full border-border bg-background">
                                    <SelectValue placeholder="Sabab tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Hammasi</SelectItem>
                                    <SelectItem value="5000">Ish vaqtidan tashqari</SelectItem>
                                    <SelectItem value="10">Operator javob bermagan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                Qaysi sanadan
                            </label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(event) => {
                                    setStartDate(event.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-40 border-border bg-background"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                Qaysi sanagacha
                            </label>
                            <Input
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(event) => {
                                    setEndDate(event.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-40 border-border bg-background"
                            />
                        </div>

                        <div className="min-w-[240px] flex-1 space-y-1.5">
                            <label className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Search className="h-3.5 w-3.5" />
                                Qidirish
                            </label>
                            <Input
                                type="text"
                                placeholder="Telefon, caller, operator ID..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="border-border bg-background"
                            />
                        </div>

                        <Button
                            onClick={handleClearFilters}
                            variant="outline"
                            disabled={!hasActiveFilters}
                        >
                            Tozalash
                        </Button>

                        <Button onClick={() => refetch()} variant="outline" className="gap-2" disabled={isFetching}>
                            {isFetching ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            Yangilash
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {callsLoading ? (
                <div className="flex justify-center py-16">
                    <div className="text-center">
                        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
                        <p className="text-muted-foreground">Qo&apos;ng&apos;iroqlar yuklanmoqda...</p>
                    </div>
                </div>
            ) : filteredCalls.length === 0 ? (
                <Card className="border-border bg-card">
                    <CardContent className="py-16 text-center">
                        <PhoneMissed className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-50" />
                        <h3 className="mb-2 text-lg font-medium text-foreground">Qo&apos;ng&apos;iroq topilmadi</h3>
                        <p className="mx-auto max-w-md text-muted-foreground">
                            Tanlangan filtr bo&apos;yicha propushenniy qo&apos;ng&apos;iroqlar topilmadi.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-border bg-card">
                    <CardContent className="p-0">
                        <div className="flex items-center justify-between border-b border-border p-4">
                            <h2 className="text-lg font-semibold text-foreground">
                                {totalCount} ta o&apos;tkazib yuborilgan qo&apos;ng&apos;iroq
                            </h2>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Caller</TableHead>
                                    <TableHead>Telefon</TableHead>
                                    <TableHead>Sabab</TableHead>
                                    <TableHead>Operator ID</TableHead>
                                    <TableHead>Sana</TableHead>
                                    <TableHead>Yo&apos;nalish</TableHead>
                                    <TableHead>Davomiylik</TableHead>
                                    <TableHead>Holat</TableHead>
                                    <TableHead className="w-24 text-center">Audio</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCalls.map((call, index) => {
                                    const date = new Date(call.called_at);
                                    const reason = getReason(call.operator_id);
                                    const rowNumber = (currentPage - 1) * PAGE_SIZE + index + 1;

                                    return (
                                        <TableRow key={call.id} className="hover:bg-accent/50">
                                            <TableCell className="font-medium text-muted-foreground">
                                                {rowNumber}
                                            </TableCell>
                                            <TableCell>{call.caller || "-"}</TableCell>
                                            <TableCell className="font-medium">{call.phone}</TableCell>
                                            <TableCell>
                                                {reason ? (
                                                    <div>
                                                        <Badge variant="outline" className={reason.badgeClass}>
                                                            {reason.title}
                                                        </Badge>
                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                            {reason.description}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell>{call.operator_id || "-"}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div>{date.toLocaleDateString("uz-UZ")}</div>
                                                    <div className="text-muted-foreground">
                                                        {date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <PhoneIncoming className="h-4 w-4 text-blue-500" />
                                                    <span className="text-blue-500">Kiruvchi</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {formatDuration(call.duration)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-red-500/50 text-red-500">
                                                    {getCallStatusLabel(call)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-center">
                                                    {call.record_url ? (
                                                        <Button
                                                            asChild
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                        >
                                                            <a href={call.record_url} target="_blank" rel="noreferrer">
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    ) : (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-border p-4">
                                <p className="text-sm text-muted-foreground">
                                    {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, totalCount)} / {totalCount}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                        disabled={currentPage === 1 || isFetching}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                                            let pageNumber = index + 1;

                                            if (totalPages > 5) {
                                                if (currentPage <= 3) {
                                                    pageNumber = index + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNumber = totalPages - 4 + index;
                                                } else {
                                                    pageNumber = currentPage - 2 + index;
                                                }
                                            }

                                            return (
                                                <Button
                                                    key={pageNumber}
                                                    variant={currentPage === pageNumber ? "default" : "outline"}
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setCurrentPage(pageNumber)}
                                                    disabled={isFetching}
                                                >
                                                    {pageNumber}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                        disabled={currentPage === totalPages || isFetching}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
