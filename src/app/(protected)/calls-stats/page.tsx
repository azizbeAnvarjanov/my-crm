"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
    Calendar,
    Headphones,
    Loader2,
    Phone,
    XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEmployee } from "@/hooks/use-employee";
import {
    CallsFilter,
    Employee,
    EmployeeCallStats,
    formatDuration,
    useCallsStatsByEmployee,
} from "@/hooks/use-calls";
import { createClient } from "@/lib/supabase/client";

type ManagerRow = {
    id: number | string;
    name: string;
    role: string;
    user_id: string | null;
    employee_id: string | null;
};

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
                <h3 className="mb-4 font-semibold text-foreground">{title}</h3>

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

                <div className="mt-4 space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-accent">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, backgroundColor: color }}
                        />
                    </div>
                    <p className="text-right text-xs text-muted-foreground">{percentage}%</p>
                </div>
            </CardContent>
        </Card>
    );
}

function EmployeeStatsRow({
    stats,
    onRecordingsClick,
}: {
    stats: EmployeeCallStats;
    onRecordingsClick: (employeeId: string) => void;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
                <h2 className="text-lg font-bold text-foreground">{stats.employeeName}</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRecordingsClick(stats.employeeId)}
                    className="gap-2 text-primary hover:text-primary"
                >
                    <Headphones className="h-4 w-4" />
                    Yozuvlarni tinglash
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <StatsCard
                    title="Umumiy"
                    total={stats.totalCalls}
                    answered={stats.answeredCalls}
                    unanswered={stats.unansweredCalls}
                    duration={stats.totalDuration}
                    color="#22c55e"
                />
                <StatsCard
                    title="Kiruvchi"
                    total={stats.incoming.total}
                    answered={stats.incoming.answered}
                    unanswered={stats.incoming.unanswered}
                    duration={stats.incoming.totalDuration}
                    color="#3b82f6"
                />
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

export default function CallsStatsPage() {
    const router = useRouter();
    const { data: currentEmployee, isLoading: employeeLoading } = useEmployee();
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const isAdmin = currentEmployee?.role === "super-admin";

    const { data: managers = [], isLoading: managersLoading } = useQuery({
        queryKey: ["callsStatsManagers"],
        queryFn: async () => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("xodimlar")
                .select("id, name, role, user_id, employee_id")
                .eq("role", "manager")
                .not("user_id", "is", null)
                .order("name", { ascending: true });

            if (error) throw error;

            return (data || []).map((manager: ManagerRow) => ({
                id: String(manager.id),
                name: manager.name,
                role: manager.role,
                user_id: manager.user_id || undefined,
                employee_id: manager.employee_id || undefined,
            })) as Employee[];
        },
        enabled: isAdmin,
    });

    const filter: CallsFilter = useMemo(() => ({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
    }), [startDate, endDate]);

    const { data: employeeStats = [], isLoading: statsLoading } = useCallsStatsByEmployee(filter, managers);

    const handleRecordingsClick = (employeeId: string) => {
        router.push(`/calls-2?employeeId=${employeeId}`);
    };

    if (employeeLoading || managersLoading) {
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

    return (
        <div className="min-h-screen space-y-6 p-6 lg:p-8">
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2">
                    <Phone className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Calls Stats</h1>
                    <p className="text-sm text-muted-foreground">
                        Managerlar bo&rsquo;yicha yengil call statistika
                    </p>
                </div>
            </div>

            <Card className="border-border bg-card">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                Boshlanish
                            </label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                className="w-40 bg-background border-border"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                Tugash
                            </label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(event) => setEndDate(event.target.value)}
                                className="w-40 bg-background border-border"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {statsLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : employeeStats.length === 0 ? (
                <div className="py-12 text-center">
                    <Phone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-medium">Ma&rsquo;lumot topilmadi</h3>
                    <p className="text-muted-foreground">
                        Tanlangan davr uchun qo&rsquo;ng&rsquo;iroq statistikasi yo&rsquo;q
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {employeeStats.map((stats) => (
                        <EmployeeStatsRow
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
