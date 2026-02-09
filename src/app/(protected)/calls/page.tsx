"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Phone,
    Download,
    Calendar,
    Loader2,
    XCircle,
    X,
    Headphones,
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
import { useEmployee } from "@/hooks/use-employee";
import { useBranch } from "@/components/app-sidebar";
import {
    useCallsEmployees,
    useCallsStatsByEmployee,
    formatDuration,
    CallsFilter,
    EmployeeCallStats,
} from "@/hooks/use-calls";
import { createClient } from "@/lib/supabase/client";

// Donut Chart Component
function DonutChart({
    answered,
    unanswered,
    size = 100,
}: {
    answered: number;
    unanswered: number;
    size?: number;
}) {
    const total = answered + unanswered;
    const answeredPercent = total > 0 ? (answered / total) * 100 : 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const answeredDash = (answeredPercent / 100) * circumference;
    const unansweredDash = circumference - answeredDash;

    return (
        <svg width={size} height={size} viewBox="0 0 100 100">
            {/* Background circle (unanswered - red) */}
            <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#ef4444"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={0}
                transform="rotate(-90 50 50)"
            />
            {/* Foreground circle (answered - green) */}
            <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#22c55e"
                strokeWidth="12"
                strokeDasharray={`${answeredDash} ${unansweredDash}`}
                strokeDashoffset={0}
                transform="rotate(-90 50 50)"
                strokeLinecap="round"
            />
        </svg>
    );
}

// Stats Card Component (Umumiy, Kiruvchi, Chiquvchi)
function StatsCard({
    title,
    total,
    answered,
    unanswered,
    duration,
    color,
}: {
    title: string;
    total: number;
    answered: number;
    unanswered: number;
    duration: number;
    color: string;
}) {
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

    return (
        <Card className="border-border bg-card">
            <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-4">{title}</h3>

                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div>
                            <p className="text-xs text-blue-500">Jami</p>
                            <p className="text-xl font-bold text-foreground">{total}</p>
                        </div>
                        <div>
                            <p className="text-xs text-green-500">Javob berilgan</p>
                            <p className="text-lg font-semibold text-green-500">{answered}</p>
                        </div>
                        <div>
                            <p className="text-xs text-red-500">Javob berilmagan</p>
                            <p className="text-lg font-semibold text-red-500">{unanswered}</p>
                        </div>
                        <div>
                            <p className="text-xs text-orange-500">Gaplashilgan vaqt</p>
                            <p className="text-base font-medium text-foreground">{formatDuration(duration)}</p>
                        </div>
                    </div>

                    <DonutChart answered={answered} unanswered={unanswered} size={90} />
                </div>

                {/* Progress bar */}
                <div className="mt-4 space-y-1">
                    <div className="h-2 bg-accent rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, backgroundColor: color }}
                        />
                    </div>
                    <p className="text-xs text-right text-muted-foreground">{percentage}%</p>
                </div>
            </CardContent>
        </Card>
    );
}

// Employee Row Component
function EmployeeRow({
    stats,
    onRecordingsClick
}: {
    stats: EmployeeCallStats;
    onRecordingsClick: (userId: string, employeeName: string) => void;
}) {
    return (
        <div className="space-y-3">
            {/* Employee Name with Recordings Button */}
            <div className="flex items-center justify-between border-b border-border pb-2">
                <h2 className="text-lg font-bold text-foreground">
                    {stats.employeeName}
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRecordingsClick(stats.userId, stats.employeeName)}
                    className="gap-2 text-primary hover:text-primary"
                >
                    <Headphones className="h-4 w-4" />
                    Yozuvlarni tinglash
                </Button>
            </div>

            {/* Three Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Umumiy */}
                <StatsCard
                    title="Umumiy"
                    total={stats.totalCalls}
                    answered={stats.answeredCalls}
                    unanswered={stats.unansweredCalls}
                    duration={stats.totalDuration}
                    color="#22c55e"
                />

                {/* Kiruvchi */}
                <StatsCard
                    title="Kiruvchi"
                    total={stats.incoming.total}
                    answered={stats.incoming.answered}
                    unanswered={stats.incoming.unanswered}
                    duration={stats.incoming.totalDuration}
                    color="#3b82f6"
                />

                {/* Chiquvchi */}
                <StatsCard
                    title="Chiquvchi"
                    total={stats.outgoing.total}
                    answered={stats.outgoing.answered}
                    unanswered={stats.outgoing.unanswered}
                    duration={stats.outgoing.totalDuration}
                    color="#8b5cf6"
                />
            </div>
        </div>
    );
}

// Main Page
export default function CallsPage() {
    const router = useRouter();
    const { data: currentEmployee, isLoading: employeeLoading } = useEmployee();
    const { selectedBranch } = useBranch();
    const branchId = selectedBranch?.id || null;

    const { data: employees = [], isLoading: employeesLoading } = useCallsEmployees(branchId);

    const isAdmin = currentEmployee?.role === "super-admin";

    // Filter state - default to today
    const today = new Date().toISOString().split("T")[0];

    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [exporting, setExporting] = useState(false);

    // Filter employees to show
    const filteredEmployees = useMemo(() => {
        if (selectedEmployeeIds.length === 0) return employees;
        return employees.filter(e => selectedEmployeeIds.includes(e.id));
    }, [employees, selectedEmployeeIds]);

    const filter: CallsFilter = useMemo(() => ({
        startDate,
        endDate,
    }), [startDate, endDate]);

    // Get stats by employee
    const { data: employeeStats = [], isLoading: employeeStatsLoading } = useCallsStatsByEmployee(
        filter,
        filteredEmployees
    );

    // Add employee to filter
    const addEmployee = (empId: string) => {
        if (!selectedEmployeeIds.includes(empId)) {
            setSelectedEmployeeIds([...selectedEmployeeIds, empId]);
        }
    };

    // Remove employee from filter
    const removeEmployee = (empId: string) => {
        setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== empId));
    };

    // Navigate to recordings page with user_id filter (faster - direct query)
    const handleRecordingsClick = (userId: string, employeeName: string) => {
        router.push(`/calls/recordings?userId=${userId}&name=${encodeURIComponent(employeeName)}&startDate=${startDate}&endDate=${endDate}`);
    };

    // Export to Excel
    const handleExport = async () => {
        setExporting(true);
        try {
            const supabase = createClient();
            let query = supabase
                .from("calls")
                .select("*")
                .order("created_at", { ascending: false });

            if (startDate) {
                query = query.gte("created_at", startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setDate(end.getDate() + 1);
                query = query.lt("created_at", end.toISOString());
            }

            // Filter by selected employees or all employees
            const empsToExport = selectedEmployeeIds.length > 0
                ? employees.filter(e => selectedEmployeeIds.includes(e.id))
                : employees;
            const allUserIds = empsToExport.map(e => e.user_id).filter(Boolean);
            if (allUserIds.length > 0) {
                query = query.in("user_id", allUserIds);
            }

            const { data: calls, error } = await query;
            if (error) throw error;

            // Find employee names
            const employeeMap = new Map<string, string>();
            employees.forEach((e) => {
                if (e.user_id) employeeMap.set(e.user_id, e.name);
            });

            // Create CSV content
            const headers = [
                "Sana",
                "Vaqt",
                "Telefon",
                "Yo'nalish",
                "Holat",
                "Davomiyligi (sek)",
                "Xodim",
            ];

            const rows = (calls || []).map((call) => {
                const date = new Date(call.created_at);
                return [
                    date.toLocaleDateString("uz-UZ"),
                    date.toLocaleTimeString("uz-UZ"),
                    call.phone,
                    call.direction === 1 ? "Chiquvchi" : "Kiruvchi",
                    call.answered === "1" ? "Javob berildi" : "Javobsiz",
                    call.duration || 0,
                    employeeMap.get(call.user_id) || call.user_id,
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
            link.download = `qongiroqlar_${startDate}_${endDate}.csv`;
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
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Manager Call Analytics</h1>
            </div>

            {/* Filters */}
            <Card className="border-border bg-card">
                <CardContent className="px-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Employee Multi-Select */}
                        <div className="flex-1 min-w-[300px]">
                            <div className="flex flex-wrap items-center gap-2 p-2 border border-border rounded-lg bg-background min-h-[42px]">
                                {/* Selected employees as tags */}
                                {selectedEmployeeIds.map(empId => {
                                    const emp = employees.find(e => e.id === empId);
                                    if (!emp) return null;
                                    return (
                                        <Badge
                                            key={empId}
                                            variant="secondary"
                                            className="flex items-center gap-1 pr-1"
                                        >
                                            {emp.name}
                                            <button
                                                onClick={() => removeEmployee(empId)}
                                                className="ml-1 hover:bg-accent rounded-full p-0.5"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    );
                                })}

                                {/* Add employee dropdown */}
                                <Select onValueChange={addEmployee} value="">
                                    <SelectTrigger className="w-auto border-0 shadow-none h-7 px-2 bg-transparent">
                                        <SelectValue placeholder={selectedEmployeeIds.length === 0 ? "Xodim tanlang..." : "+"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees
                                            .filter(e => !selectedEmployeeIds.includes(e.id))
                                            .map((emp) => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                    {emp.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-36 bg-background border-border"
                            />
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-36 bg-background border-border"
                            />
                        </div>

                        {/* Export Button */}
                        <Button
                            onClick={handleExport}
                            disabled={exporting}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {exporting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            Excel
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Employee Stats */}
            {employeesLoading || employeeStatsLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : employeeStats.length === 0 ? (
                <div className="text-center py-12">
                    <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Ma'lumot topilmadi</h3>
                    <p className="text-muted-foreground">
                        Tanlangan davr uchun qo'ng'iroq ma'lumotlari yo'q
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {employeeStats.map((stats) => (
                        <EmployeeRow
                            key={stats.employeeId}
                            stats={stats}
                            onRecordingsClick={handleRecordingsClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
