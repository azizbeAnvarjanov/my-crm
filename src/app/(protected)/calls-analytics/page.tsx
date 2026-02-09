"use client";

import { useBranch } from "@/components/app-sidebar";
import { PhoneCall, Phone, Clock, TrendingUp, Users, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function CallsAnalyticsPage() {
    const { selectedBranch } = useBranch();

    const stats = [
        { title: "Jami qo'ng'iroqlar", value: "2,456", change: "+18.2%", trend: "up" },
        { title: "O'rtacha davomiylik", value: "4:32", change: "+5.1%", trend: "up" },
        { title: "Muvaffaqiyatli", value: "89%", change: "+2.8%", trend: "up" },
        { title: "O'tkazib yuborilgan", value: "156", change: "-12.4%", trend: "down" },
    ];

    const topPerformers = [
        { id: 1, name: "Ali Valiyev", calls: 234, avgDuration: "5:12", success: "94%" },
        { id: 2, name: "Vali Aliyev", calls: 198, avgDuration: "4:45", success: "91%" },
        { id: 3, name: "Karim Karimov", calls: 176, avgDuration: "4:23", success: "88%" },
        { id: 4, name: "Sardor Sardorov", calls: 165, avgDuration: "3:58", success: "85%" },
    ];

    const hourlyData = [
        { hour: "09:00", calls: 45 },
        { hour: "10:00", calls: 78 },
        { hour: "11:00", calls: 92 },
        { hour: "12:00", calls: 56 },
        { hour: "13:00", calls: 34 },
        { hour: "14:00", calls: 89 },
        { hour: "15:00", calls: 102 },
        { hour: "16:00", calls: 85 },
        { hour: "17:00", calls: 62 },
        { hour: "18:00", calls: 38 },
    ];

    const maxCalls = Math.max(...hourlyData.map(d => d.calls));

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Qo'ng'iroqlar analitikasi</h1>
                <p className="text-muted-foreground mt-1">
                    {selectedBranch?.name || "Barcha filiallar"} - Batafsil statistika
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.title}
                        className="bg-card border border-border rounded-xl p-5 card-hover"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-muted-foreground">{stat.title}</p>
                            <div className={`flex items-center gap-1 text-xs font-medium ${stat.trend === "up" ? "text-green-500" : "text-red-500"
                                }`}>
                                {stat.trend === "up" ? (
                                    <ArrowUpRight className="h-3 w-3" />
                                ) : (
                                    <ArrowDownRight className="h-3 w-3" />
                                )}
                                {stat.change}
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly Calls Chart */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-card-foreground mb-4">Soatlik qo'ng'iroqlar</h3>
                    <div className="flex items-end gap-2 h-48">
                        {hourlyData.map((item) => (
                            <div key={item.hour} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full bg-primary/80 rounded-t-md transition-all hover:bg-primary"
                                    style={{ height: `${(item.calls / maxCalls) * 100}%` }}
                                />
                                <span className="text-xs text-muted-foreground">{item.hour.split(':')[0]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Call Duration Distribution */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-card-foreground mb-4">Qo'ng'iroq davomiyligi</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">0-2 daqiqa</span>
                                <span className="text-foreground font-medium">25%</span>
                            </div>
                            <div className="h-2 bg-accent rounded-full overflow-hidden">
                                <div className="h-full bg-red-500/80 rounded-full" style={{ width: '25%' }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">2-5 daqiqa</span>
                                <span className="text-foreground font-medium">45%</span>
                            </div>
                            <div className="h-2 bg-accent rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500/80 rounded-full" style={{ width: '45%' }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">5-10 daqiqa</span>
                                <span className="text-foreground font-medium">22%</span>
                            </div>
                            <div className="h-2 bg-accent rounded-full overflow-hidden">
                                <div className="h-full bg-green-500/80 rounded-full" style={{ width: '22%' }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">10+ daqiqa</span>
                                <span className="text-foreground font-medium">8%</span>
                            </div>
                            <div className="h-2 bg-accent rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500/80 rounded-full" style={{ width: '8%' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Performers */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-card-foreground">Eng yaxshi xodimlar</h3>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border bg-accent/50">
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">#</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Xodim</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Qo'ng'iroqlar</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">O'rtacha davomiylik</th>
                            <th className="text-left p-4 text-sm font-medium text-muted-foreground">Muvaffaqiyat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {topPerformers.map((performer, index) => (
                            <tr key={performer.id} className="hover:bg-accent/50 transition-colors">
                                <td className="p-4 text-sm text-muted-foreground">{index + 1}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Users className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="text-sm font-medium text-foreground">{performer.name}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-foreground">{performer.calls}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-foreground">{performer.avgDuration}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                        {performer.success}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
