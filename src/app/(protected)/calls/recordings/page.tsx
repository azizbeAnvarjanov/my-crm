"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
    Phone,
    Play,
    Pause,
    PhoneIncoming,
    PhoneOutgoing,
    Clock,
    Calendar,
    User,
    Loader2,
    XCircle,
    Volume2,
    Search,
    SkipBack,
    SkipForward,
    ChevronLeft,
    ChevronRight,
    Download,
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
import { useEmployee } from "@/hooks/use-employee";
import { useBranch } from "@/components/app-sidebar";
import {
    useCallsEmployees,
    useCallRecordings,
    formatDuration,
    Call,
    CallRecordingsFilter,
} from "@/hooks/use-calls";
import { createClient } from "@/lib/supabase/client";

// Format time for audio player (mm:ss)
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Audio Player Dialog Component
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

    // Reset state when call changes
    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
    }, [call]);

    // Stop playing when dialog closes
    useEffect(() => {
        if (!open && audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }, [open]);

    const handlePlayPause = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
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

    const skip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
        }
    };

    if (!call) return null;

    const date = new Date(call.created_at);
    const isIncoming = call.direction === 0;

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isIncoming ? "bg-blue-500/10" : "bg-emerald-500/10"}`}>
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
                    {/* Call Info */}
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={`${call.answered === "1"
                                ? "border-green-500/50 text-green-500"
                                : "border-red-500/50 text-red-500"
                                }`}
                        >
                            {call.answered === "1" ? "Javob berildi" : "Javobsiz"}
                        </Badge>
                        <Badge variant="secondary">
                            {isIncoming ? "Kiruvchi" : "Chiquvchi"}
                        </Badge>
                        <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(call.duration)}
                        </Badge>
                    </div>

                    {/* Audio Player */}
                    {call.record_url ? (
                        <div className="space-y-4 bg-accent/30 rounded-xl p-4">
                            <audio
                                ref={audioRef}
                                src={call.record_url}
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onEnded={handleEnded}
                            />

                            {/* Progress Bar */}
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

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10"
                                    onClick={() => skip(-10)}
                                >
                                    <SkipBack className="h-5 w-5" />
                                </Button>
                                <Button
                                    variant="default"
                                    size="icon"
                                    className="h-14 w-14 rounded-full"
                                    onClick={handlePlayPause}
                                >
                                    {isPlaying ? (
                                        <Pause className="h-6 w-6" />
                                    ) : (
                                        <Play className="h-6 w-6 ml-1" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10"
                                    onClick={() => skip(10)}
                                >
                                    <SkipForward className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Volume Control */}
                            <div className="flex items-center gap-3 justify-center">
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
                        <div className="text-center py-8 text-muted-foreground">
                            Bu qo'ng'iroq uchun yozuv mavjud emas
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Main Page
export default function CallRecordingsPage() {
    const searchParams = useSearchParams();
    const { data: currentEmployee, isLoading: employeeLoading } = useEmployee();
    const { selectedBranch } = useBranch();
    const branchId = selectedBranch?.id || null;

    // Get employees for dropdown (only if we need to change selection)
    const { data: employees = [] } = useCallsEmployees(branchId);

    const isAdmin = currentEmployee?.role === "super-admin";

    // Filter state - initialize from URL params (userId directly)
    const today = new Date().toISOString().split("T")[0];
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [startDate, setStartDate] = useState(searchParams.get("startDate") || oneMonthAgo);
    const [endDate, setEndDate] = useState(searchParams.get("endDate") || today);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(
        searchParams.get("userId") || null
    );
    const [employeeName, setEmployeeName] = useState(
        searchParams.get("name") || ""
    );
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Export state
    const [exporting, setExporting] = useState(false);

    // Player dialog state
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);
    const [playerOpen, setPlayerOpen] = useState(false);

    // Update employee name when selecting from dropdown
    const handleEmployeeSelect = (empId: string) => {
        const emp = employees.find(e => e.id === empId);
        if (emp?.user_id) {
            setSelectedUserId(emp.user_id);
            setEmployeeName(emp.name);
            setCurrentPage(1); // Reset page on employee change
        }
    };

    const filter: CallRecordingsFilter = useMemo(() => ({
        startDate,
        endDate,
        userId: selectedUserId,
        page: currentPage,
        pageSize,
    }), [startDate, endDate, selectedUserId, currentPage, pageSize]);

    // Get recordings - now with server-side pagination
    const { data: recordingsResult, isLoading: recordingsLoading } = useCallRecordings(filter);

    const recordings = recordingsResult?.data || [];
    const totalCount = recordingsResult?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Filter by search query (client-side for current page only)
    const filteredRecordings = useMemo(() => {
        if (!searchQuery) return recordings;
        return recordings.filter((call: Call) =>
            call.phone.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [recordings, searchQuery]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedUserId, startDate, endDate, pageSize]);

    // Open player dialog
    const handlePlayClick = (call: Call) => {
        setSelectedCall(call);
        setPlayerOpen(true);
    };

    // Export to Excel
    const handleExport = async () => {
        if (!selectedUserId) return;

        setExporting(true);
        try {
            const supabase = createClient();
            let query = supabase
                .from("calls")
                .select("*")
                .order("created_at", { ascending: false })
                .eq("user_id", selectedUserId)
                .not("record_url", "is", null);

            if (startDate) {
                query = query.gte("created_at", startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setDate(end.getDate() + 1);
                query = query.lt("created_at", end.toISOString());
            }

            const { data: calls, error } = await query;
            if (error) throw error;

            // Create CSV content
            const headers = [
                "Sana",
                "Vaqt",
                "Telefon",
                "Yo'nalish",
                "Holat",
                "Davomiyligi (sek)",
                "Yozuv URL",
            ];

            const rows = (calls || []).map((call: Call) => {
                const date = new Date(call.created_at);
                return [
                    date.toLocaleDateString("uz-UZ"),
                    date.toLocaleTimeString("uz-UZ"),
                    call.phone,
                    call.direction === 1 ? "Chiquvchi" : "Kiruvchi",
                    call.answered === "1" ? "Javob berildi" : "Javobsiz",
                    call.duration || 0,
                    call.record_url || "",
                ];
            });

            const csvContent = [
                headers.join(","),
                ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
            ].join("\n");

            // Add BOM for Excel UTF-8 support
            const BOM = "\uFEFF";
            const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `yozuvlar_${employeeName}_${startDate}_${endDate}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export error:", error);
        } finally {
            setExporting(false);
        }
    };

    // Loading
    if (employeeLoading || !branchId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Only admin can access
    if (!isAdmin) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <Card className="max-w-md border-border bg-card">
                    <CardContent className="pt-6 text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                            <XCircle className="h-6 w-6 text-red-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-card-foreground mb-2">
                            Ruxsat yo'q
                        </h2>
                        <p className="text-muted-foreground">
                            Bu sahifaga faqat admin kirishga ruxsat etilgan.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                    <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Qo'ng'iroq yozuvlari</h1>
                    <p className="text-muted-foreground text-sm">
                        Xodimlar suhbatlarini tinglash
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-border bg-card">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-end gap-4">
                        {/* Employee Select */}
                        <div className="space-y-1.5">
                            <label className="text-sm text-muted-foreground flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                Xodim
                            </label>
                            <Select
                                value={employees.find(e => e.user_id === selectedUserId)?.id || ""}
                                onValueChange={handleEmployeeSelect}
                            >
                                <SelectTrigger className="w-52 bg-background border-border">
                                    <SelectValue placeholder="Xodim tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-1.5">
                            <label className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Boshlanish
                            </label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-40 bg-background border-border"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Tugash
                            </label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-40 bg-background border-border"
                            />
                        </div>

                        {/* Search */}
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <label className="text-sm text-muted-foreground flex items-center gap-1">
                                <Search className="h-3.5 w-3.5" />
                                Qidirish
                            </label>
                            <Input
                                type="text"
                                placeholder="Telefon raqam bo'yicha..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-background border-border"
                            />
                        </div>

                        {/* Export Button */}
                        <Button
                            onClick={handleExport}
                            disabled={!selectedUserId || exporting}
                            variant="outline"
                            className="gap-2"
                        >
                            {exporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            Excel
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            {!selectedUserId ? (
                <Card className="border-border bg-card">
                    <CardContent className="py-16 text-center">
                        <User className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            Xodim tanlang
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Qo'ng'iroq yozuvlarini ko'rish uchun yuqoridagi ro'yxatdan xodimni tanlang
                        </p>
                    </CardContent>
                </Card>
            ) : recordingsLoading ? (
                <div className="flex justify-center py-16">
                    <div className="text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Yozuvlar yuklanmoqda...</p>
                    </div>
                </div>
            ) : filteredRecordings.length === 0 ? (
                <Card className="border-border bg-card">
                    <CardContent className="py-16 text-center">
                        <Phone className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            Yozuv topilmadi
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            {employeeName} uchun tanlangan davr ichida qo'ng'iroq yozuvlari mavjud emas
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-border bg-card">
                    <CardContent className="p-0">
                        {/* Results Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="text-lg font-semibold text-foreground">
                                {employeeName} - {totalCount} ta yozuv
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Ko'rsatish:</span>
                                <Select
                                    value={pageSize.toString()}
                                    onValueChange={(v) => {
                                        setPageSize(Number(v));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-20 h-8 bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Table */}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Telefon</TableHead>
                                    <TableHead>Sana</TableHead>
                                    <TableHead>Vaqt</TableHead>
                                    <TableHead>Yo'nalish</TableHead>
                                    <TableHead>Holat</TableHead>
                                    <TableHead>Davomiylik</TableHead>
                                    <TableHead className="w-20 text-center">Tinglash</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecordings.map((call: Call, index: number) => {
                                    const date = new Date(call.created_at);
                                    const isIncoming = call.direction === 0;
                                    const rowNumber = (currentPage - 1) * pageSize + index + 1;

                                    return (
                                        <TableRow key={call.id} className="hover:bg-accent/50">
                                            <TableCell className="font-medium text-muted-foreground">
                                                {rowNumber}
                                            </TableCell>
                                            <TableCell className="font-medium">{call.phone}</TableCell>
                                            <TableCell>{date.toLocaleDateString("uz-UZ")}</TableCell>
                                            <TableCell>
                                                {date.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
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
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={`${call.answered === "1"
                                                        ? "border-green-500/50 text-green-500"
                                                        : "border-red-500/50 text-red-500"
                                                        }`}
                                                >
                                                    {call.answered === "1" ? "Javob berildi" : "Javobsiz"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{formatDuration(call.duration)}</TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                                    onClick={() => handlePlayClick(call)}
                                                    disabled={!call.record_url}
                                                >
                                                    <Play className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-border">
                                <p className="text-sm text-muted-foreground">
                                    {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} / {totalCount}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1 || recordingsLoading}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum: number;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={currentPage === pageNum ? "default" : "outline"}
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    disabled={recordingsLoading}
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || recordingsLoading}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Audio Player Dialog */}
            <AudioPlayerDialog
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
