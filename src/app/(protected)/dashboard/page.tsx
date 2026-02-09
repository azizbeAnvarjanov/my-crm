"use client";

import { useBranch } from "@/components/app-sidebar";
import { BarChart3, TrendingUp, Users, Phone, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function DashboardPage() {
    const { selectedBranch } = useBranch();

    const stats = [
        { title: "Jami daromad", value: "125,430,000 so'm", change: "+12.5%", trend: "up", icon: TrendingUp },
        { title: "Yangi mijozlar", value: "234", change: "+8.2%", trend: "up", icon: Users },
        { title: "Qo'ng'iroqlar", value: "1,456", change: "-2.4%", trend: "down", icon: Phone },
        { title: "Shartnomalar", value: "89", change: "+15.3%", trend: "up", icon: FileText },
    ];

    const recentDeals = [
        { id: 1, name: "Aziz Azizov", amount: "15,000,000 so'm", status: "Yakunlandi", date: "2024-02-08" },
        { id: 2, name: "Bekzod Bekzodov", amount: "8,500,000 so'm", status: "Jarayonda", date: "2024-02-07" },
        { id: 3, name: "Dilshod Dilshodov", amount: "22,000,000 so'm", status: "Yakunlandi", date: "2024-02-06" },
        { id: 4, name: "Elbek Elbekov", amount: "5,200,000 so'm", status: "Kutilmoqda", date: "2024-02-05" },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    {selectedBranch?.name || "Barcha filiallar"} - Umumiy ko'rsatkichlar
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.title}
                        className="bg-card border border-border rounded-xl p-5 card-hover"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <stat.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-medium ${stat.trend === "up" ? "text-green-500" : "text-red-500"
                                }`}>
                                {stat.trend === "up" ? (
                                    <ArrowUpRight className="h-4 w-4" />
                                ) : (
                                    <ArrowDownRight className="h-4 w-4" />
                                )}
                                {stat.change}
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                        <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart Placeholder */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-card-foreground mb-4">Oylik daromad</h3>
                    <div className="h-64 flex items-center justify-center bg-accent/50 rounded-lg">
                        <div className="text-center">
                            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Grafik ma'lumotlari</p>
                        </div>
                    </div>
                </div>

                {/* Conversion Chart Placeholder */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-card-foreground mb-4">Konversiya</h3>
                    <div className="h-64 flex items-center justify-center bg-accent/50 rounded-lg">
                        <div className="text-center">
                            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Grafik ma'lumotlari</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Deals */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-card-foreground">So'nggi shartnomalar</h3>
                </div>
                <div className="divide-y divide-border">
                    {recentDeals.map((deal) => (
                        <div key={deal.id} className="flex items-center justify-between p-4 hover:bg-accent transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{deal.name}</p>
                                    <p className="text-xs text-muted-foreground">{deal.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-foreground">{deal.amount}</p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${deal.status === "Yakunlandi" ? "bg-green-500/10 text-green-500" :
                                        deal.status === "Jarayonda" ? "bg-blue-500/10 text-blue-500" :
                                            "bg-yellow-500/10 text-yellow-500"
                                    }`}>
                                    {deal.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
