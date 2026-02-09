"use client";

import { useBranch } from "@/components/app-sidebar";
import { useEmployee } from "@/hooks/use-employee";
import { LayoutDashboard, Users, GitBranch, Phone, FileText, TrendingUp } from "lucide-react";

export default function HomePage() {
    const { selectedBranch } = useBranch();
    const { data: employee, isLoading } = useEmployee();

    const stats = [
        { title: "Jami lidlar", value: "1,234", icon: Users, change: "+12%", color: "text-blue-500" },
        { title: "Faol pipeline'lar", value: "8", icon: GitBranch, change: "+2", color: "text-green-500" },
        { title: "Bugungi qo'ng'iroqlar", value: "45", icon: Phone, change: "+8%", color: "text-purple-500" },
        { title: "Yangi formalar", value: "12", icon: FileText, change: "+3", color: "text-orange-500" },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Xush kelibsiz, {employee?.name || "Foydalanuvchi"}! 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {selectedBranch ? `${selectedBranch.name} filiali` : "Filial tanlanmagan"} - Bugungi ko'rsatkichlar
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-primary">O'sish: +15%</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.title}
                        className="bg-card border border-border rounded-xl p-5 card-hover"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{stat.title}</p>
                                <p className="text-2xl font-bold text-card-foreground mt-1">{stat.value}</p>
                            </div>
                            <div className={`p-3 rounded-lg bg-accent ${stat.color}`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1">
                            <span className="text-sm text-green-500 font-medium">{stat.change}</span>
                            <span className="text-xs text-muted-foreground">o'tgan oyga nisbatan</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">Tezkor harakatlar</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button className="flex flex-col items-center gap-2 p-4 rounded-lg bg-accent hover:bg-accent/80 transition-colors">
                        <Users className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium text-foreground">Yangi lid</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-4 rounded-lg bg-accent hover:bg-accent/80 transition-colors">
                        <Phone className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium text-foreground">Qo'ng'iroq</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-4 rounded-lg bg-accent hover:bg-accent/80 transition-colors">
                        <FileText className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium text-foreground">Yangi forma</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-4 rounded-lg bg-accent hover:bg-accent/80 transition-colors">
                        <LayoutDashboard className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium text-foreground">Hisobot</span>
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">So'nggi faoliyat</h2>
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">Yangi lid qo'shildi</p>
                                <p className="text-xs text-muted-foreground">Ali Valiyev - 2 daqiqa oldin</p>
                            </div>
                            <span className="text-xs text-muted-foreground">14:32</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
