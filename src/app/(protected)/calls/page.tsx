"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Clock,
    Download,
    Loader2,
    Phone,
    PhoneIncoming,
    PhoneOutgoing,
    Play,
    Pause,
    Search,
    SkipBack,
    SkipForward,
    User,
    Volume2,
    XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { useBranch } from "@/components/app-sidebar";
import { useEmployee } from "@/hooks/use-employee";
import { createClient } from "@/lib/supabase/client";
import {
    Call,
    Employee as CallsEmployee,
    fetchPaginatedCalls,
    formatDuration,
    getCallStatusLabel,
    useCallsEmployees,
} from "@/hooks/use-calls";

const PAGE_SIZE = 20;
const EMPTY_CALLS: Call[] = [];

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function AudioPlayerDialog({
    call,
    open,
    onClose,
}: {
    call: Call | null;
    open: boolean;
    onClose: () => void;
}) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);

    const handlePlayPause = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            return;
        }

        audioRef.current.play();
        setIsPlaying(true);
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.volume = value[0];
            setVolume(value[0]);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        if (!nextOpen) {
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
            onClose();
        }
    };

    const skip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
        }
    };

    if (!call) return null;

    const date = new Date(call.called_at);
    const isIncoming = call.direction === "incoming";

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${isIncoming ? "bg-blue-500/10" : "bg-emerald-500/10"}`}>
                            {isIncoming ? (
                                <PhoneIncoming className="h-5 w-5 text-blue-500" />
                            ) : (
                                <PhoneOutgoing className="h-5 w-5 text-emerald-500" />
                            )}
                        </div>
                        <div>
                            <p className="text-lg font-semibold">{call.phone}</p>
                            <p className="text-sm font-normal text-muted-foreground">
                                {date.toLocaleDateString("uz-UZ")} • {date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={call.answered ? "border-green-500/50 text-green-500" : "border-red-500/50 text-red-500"}
                        >
                            {getCallStatusLabel(call)}
                        </Badge>
                        <Badge variant="secondary">
                            {isIncoming ? "Kiruvchi" : "Chiquvchi"}
                        </Badge>
                        <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            {formatDuration(call.duration)}
                        </Badge>
                    </div>

                    {call.record_url ? (
                        <div className="space-y-4 rounded-xl bg-accent/30 p-4">
                            <audio
                                ref={audioRef}
                                src={call.record_url}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onEnded={handleEnded}
                            />

                            <div className="space-y-2">
                                <Slider
                                    value={[currentTime]}
                                    max={duration || 100}
                                    step={0.1}
                                    onValueChange={handleSeek}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-4">
                                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => skip(-10)}>
                                    <SkipBack className="h-5 w-5" />
                                </Button>
                                <Button variant="default" size="icon" className="h-14 w-14 rounded-full" onClick={handlePlayPause}>
                                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => skip(10)}>
                                    <SkipForward className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex items-center justify-center gap-3">
                                <Volume2 className="h-4 w-4 text-muted-foreground" />
                                <Slider
                                    value={[volume]}
                                    max={1}
                                    step={0.1}
                                    onValueChange={handleVolumeChange}
                                    className="w-32"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 text-center text-muted-foreground">
                            Bu recording uchun audio topilmadi
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function getEmployeeOperatorId(employee: Pick<CallsEmployee, "user_id">): string | null {
    const operatorId = employee.user_id?.trim();
    return operatorId || null;
}

export default function CallsPage() {
    const searchParams = useSearchParams();
    const { data: currentEmployee, isLoading: employeeLoading } = useEmployee();
    const { selectedBranch, loading: branchLoading } = useBranch();
    const branchId = selectedBranch?.id ?? null;
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(searchParams.get("employeeId") || "all");
    const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
    const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);
    const [playerOpen, setPlayerOpen] = useState(false);

    const isAdmin = currentEmployee?.role === "super-admin";

    const { data: employees = [], isLoading: employeesLoading } = useCallsEmployees(branchId);

    const activeSelectedEmployeeId = useMemo(() => {
        if (selectedEmployeeId === "all") {
            return "all";
        }

        return employees.some((employee) => employee.id === selectedEmployeeId)
            ? selectedEmployeeId
            : "all";
    }, [employees, selectedEmployeeId]);

    const selectedEmployee = useMemo(
        () => employees.find((employee) => employee.id === activeSelectedEmployeeId) || null,
        [employees, activeSelectedEmployeeId]
    );

    const selectedOperatorIds = useMemo(
        () => {
            const sourceEmployees = selectedEmployee ? [selectedEmployee] : employees;

            return Array.from(
                new Set(
                    sourceEmployees
                        .map(getEmployeeOperatorId)
                        .filter((operatorId): operatorId is string => Boolean(operatorId))
                )
            );
        },
        [employees, selectedEmployee]
    );

    const employeeByOperatorId = useMemo(
        () => {
            const map = new Map<string, CallsEmployee>();

            employees.forEach((employee) => {
                const operatorId = getEmployeeOperatorId(employee);
                if (operatorId) {
                    map.set(operatorId, employee);
                }
            });

            return map;
        },
        [employees]
    );

    const {
        data: recordingsResult,
        isLoading: recordingsLoading,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: [
            "calls",
            branchId,
            currentPage,
            activeSelectedEmployeeId,
            selectedOperatorIds.join(","),
            startDate,
            endDate,
        ],
        queryFn: async () =>
            fetchPaginatedCalls(createClient(), {
                operatorIds: selectedOperatorIds,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                page: currentPage,
                pageSize: PAGE_SIZE,
            }),
        enabled: Boolean(isAdmin && branchId && !employeesLoading),
        placeholderData: keepPreviousData,
    });

    const recordings = recordingsResult?.data ?? EMPTY_CALLS;
    const totalCount = recordingsResult?.totalCount ?? 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const filteredRecordings = useMemo(() => {
        if (!searchQuery.trim()) return recordings;

        const normalizedQuery = searchQuery.trim().toLowerCase();
        return recordings.filter((call) => {
            const operatorName = call.operator_id
                ? employeeByOperatorId.get(call.operator_id)?.name ?? ""
                : "";

            return [
                call.phone,
                call.caller || "",
                call.callee || "",
                call.operator_id || "",
                operatorName,
            ].some((value) => value.toLowerCase().includes(normalizedQuery));
        });
    }, [recordings, searchQuery, employeeByOperatorId]);

    const handleEmployeeSelect = (value: string) => {
        setSelectedEmployeeId(value);
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setSelectedEmployeeId("all");
        setStartDate("");
        setEndDate("");
        setSearchQuery("");
        setCurrentPage(1);
    };

    const getOperatorDisplayName = (operatorId: string | null) => {
        if (!operatorId) return "-";
        return employeeByOperatorId.get(operatorId)?.name ?? operatorId;
    };

    const hasActiveFilters = activeSelectedEmployeeId !== "all" || Boolean(startDate || endDate || searchQuery);

    const callsLoading = employeeLoading || branchLoading || Boolean(isAdmin && branchId && employeesLoading);

    const handlePlayClick = (call: Call) => {
        setSelectedCall(call);
        setPlayerOpen(true);
    };

    if (callsLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <Card className="max-w-md border-border bg-card">
                    <CardContent className="pt-6 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                            <XCircle className="h-6 w-6 text-red-500" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-card-foreground">Ruxsat yo&rsquo;q</h2>
                        <p className="text-muted-foreground">
                            Bu sahifaga faqat admin kirishga ruxsat etilgan.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!branchId) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <Card className="max-w-md border-border bg-card">
                    <CardContent className="pt-6 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <Phone className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-card-foreground">Filial tanlang</h2>
                        <p className="text-muted-foreground">
                            Qo&apos;ng&apos;iroqlarni ko&apos;rish uchun chapdagi sidebar orqali filialni tanlang.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 p-6 lg:p-8">
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                    <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Qo&apos;ng&apos;iroqlar</h1>
                    <p className="text-sm text-muted-foreground">
                        {selectedBranch?.name} filiali bo&apos;yicha har sahifada {PAGE_SIZE} tadan qo&apos;ng&apos;iroq
                    </p>
                </div>
            </div>

            <Card className="border-border bg-card">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="min-w-[240px] space-y-1.5">
                            <label className="flex items-center gap-1 text-sm text-muted-foreground">
                                <User className="h-3.5 w-3.5" />
                                Xodim
                            </label>
                            <Select
                                value={activeSelectedEmployeeId}
                                onValueChange={handleEmployeeSelect}
                            >
                                <SelectTrigger className="w-full bg-background border-border">
                                    <SelectValue placeholder="Xodim tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Barcha xodimlar</SelectItem>
                                    {employees.map((employee) => (
                                        <SelectItem
                                            key={employee.id}
                                            value={employee.id}
                                            disabled={!getEmployeeOperatorId(employee)}
                                        >
                                            {employee.name}
                                            {!getEmployeeOperatorId(employee) ? " (user_id yo'q)" : ""}
                                        </SelectItem>
                                    ))}
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
                                className="w-40 bg-background border-border"
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
                                className="w-40 bg-background border-border"
                            />
                        </div>

                        <div className="min-w-[240px] flex-1 space-y-1.5">
                            <label className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Search className="h-3.5 w-3.5" />
                                Qidirish
                            </label>
                            <Input
                                type="text"
                                placeholder="Telefon, caller, operator..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                className="bg-background border-border"
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

            {recordingsLoading ? (
                <div className="flex justify-center py-16">
                    <div className="text-center">
                        <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
                        <p className="text-muted-foreground">Qo&apos;ng&apos;iroqlar yuklanmoqda...</p>
                    </div>
                </div>
            ) : filteredRecordings.length === 0 ? (
                <Card className="border-border bg-card">
                    <CardContent className="py-16 text-center">
                        <Phone className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-50" />
                        <h3 className="mb-2 text-lg font-medium text-foreground">Qo&apos;ng&apos;iroq topilmadi</h3>
                        <p className="mx-auto max-w-md text-muted-foreground">
                            Tanlangan filtr bo&apos;yicha qo&apos;ng&apos;iroqlar topilmadi.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-border bg-card">
                    <CardContent className="p-0">
                        <div className="flex items-center justify-between border-b border-border p-4">
                            <h2 className="text-lg font-semibold text-foreground">
                                {selectedEmployee
                                    ? `${selectedEmployee.name} uchun ${totalCount} ta qo'ng'iroq`
                                    : `${selectedBranch?.name} filialida ${totalCount} ta qo'ng'iroq`}
                            </h2>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Caller</TableHead>
                                    <TableHead>Operator</TableHead>
                                    <TableHead>Telefon</TableHead>
                                    <TableHead>Sana</TableHead>
                                    <TableHead>Yo&rsquo;nalish</TableHead>
                                    <TableHead>Davomiylik</TableHead>
                                    <TableHead>Holat</TableHead>
                                    <TableHead className="w-24 text-center">Audio</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecordings.map((call, index) => {
                                    const date = new Date(call.called_at);
                                    const isIncoming = call.direction === "incoming";
                                    const rowNumber = (currentPage - 1) * PAGE_SIZE + index + 1;
                                    const operator = call.operator_id ? employeeByOperatorId.get(call.operator_id) : null;
                                    const operatorName = getOperatorDisplayName(call.operator_id);

                                    return (
                                        <TableRow key={call.id} className="hover:bg-accent/50">
                                            <TableCell className="font-medium text-muted-foreground">
                                                {rowNumber}
                                            </TableCell>
                                            <TableCell>{call.caller || "-"}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{operatorName}</div>
                                                {operator && call.operator_id ? (
                                                    <div className="text-xs text-muted-foreground">{call.operator_id}</div>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="font-medium">{call.phone}</TableCell>
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
                                                    {isIncoming ? (
                                                        <>
                                                            <PhoneIncoming className="h-4 w-4 text-blue-500" />
                                                            <span className="text-blue-500">Kiruvchi</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <PhoneOutgoing className="h-4 w-4 text-emerald-500" />
                                                            <span className="text-emerald-500">Chiquvchi</span>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatDuration(call.duration)}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={call.answered ? "border-green-500/50 text-green-500" : "border-red-500/50 text-red-500"}
                                                >
                                                    {getCallStatusLabel(call)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                                                        onClick={() => handlePlayClick(call)}
                                                        disabled={!call.record_url}
                                                    >
                                                        <Play className="h-4 w-4" />
                                                    </Button>
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
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            disabled
                                                        >
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

            <AudioPlayerDialog
                key={selectedCall?.id || "empty"}
                call={selectedCall}
                open={playerOpen}
                onClose={() => {
                    setPlayerOpen(false);
                    setSelectedCall(null);
                }}
            />
        </div>
    );
}
