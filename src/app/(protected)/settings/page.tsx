"use client";

import { useTheme } from "@/lib/providers/theme-provider";
import { useEmployee } from "@/hooks/use-employee";
import { Settings, Moon, Sun, Monitor, Bell, Lock, Globe, Database, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { data: employee, isLoading } = useEmployee();

    const isAdmin = employee?.role === "super-admin";

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Sozlamalar</h1>
                <p className="text-muted-foreground mt-1">Tizim sozlamalarini boshqaring</p>
            </div>

            {/* Theme Settings */}
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                        {theme === "dark" ? (
                            <Moon className="h-5 w-5 text-primary" />
                        ) : (
                            <Sun className="h-5 w-5 text-primary" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-card-foreground">Mavzu</h2>
                        <p className="text-sm text-muted-foreground">Interfeysning ko'rinishini tanlang</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => setTheme("light")}
                        className={`p-4 rounded-lg border-2 transition-all ${theme === "light"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                    >
                        <Sun className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                        <p className="text-sm font-medium text-foreground">Yorug'</p>
                    </button>
                    <button
                        onClick={() => setTheme("dark")}
                        className={`p-4 rounded-lg border-2 transition-all ${theme === "dark"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                    >
                        <Moon className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                        <p className="text-sm font-medium text-foreground">Qorong'i</p>
                    </button>
                    <button
                        onClick={() => setTheme("system")}
                        className={`p-4 rounded-lg border-2 transition-all ${theme === "system"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                    >
                        <Monitor className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">Tizim</p>
                    </button>
                </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-card-foreground">Bildirishnomalar</h2>
                        <p className="text-sm text-muted-foreground">Bildirishnomalar sozlamalari</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                        <div>
                            <p className="text-sm font-medium text-foreground">Email bildirishnomalari</p>
                            <p className="text-xs text-muted-foreground">Muhim yangilanishlarni emailga yuboring</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                        <div>
                            <p className="text-sm font-medium text-foreground">Push bildirishnomalar</p>
                            <p className="text-xs text-muted-foreground">Brauzer orqali bildirishnomalar</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                        <div>
                            <p className="text-sm font-medium text-foreground">Ovozli signal</p>
                            <p className="text-xs text-muted-foreground">Yangi xabarlar uchun ovoz</p>
                        </div>
                        <Switch />
                    </div>
                </div>
            </div>

            {/* Language Settings */}
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-card-foreground">Til</h2>
                        <p className="text-sm text-muted-foreground">Interfeys tilini tanlang</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button className="p-4 rounded-lg border-2 border-primary bg-primary/5 transition-all">
                        <p className="text-lg font-medium text-foreground">🇺🇿 O'zbekcha</p>
                    </button>
                    <button className="p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-all">
                        <p className="text-lg font-medium text-foreground">🇷🇺 Русский</p>
                    </button>
                </div>
            </div>

            {/* Admin Settings */}
            {isAdmin && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Lock className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-card-foreground">Admin sozlamalari</h2>
                            <p className="text-sm text-muted-foreground">Faqat super-admin uchun</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                            <div>
                                <p className="text-sm font-medium text-foreground">Ro'yxatdan o'tish</p>
                                <p className="text-xs text-muted-foreground">Yangi foydalanuvchilar ro'yxatdan o'ta oladi</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                            <div>
                                <p className="text-sm font-medium text-foreground">2-bosqichli tasdiqlash</p>
                                <p className="text-xs text-muted-foreground">Kirish uchun qo'shimcha tasdiq talab qilish</p>
                            </div>
                            <Switch />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                            <div>
                                <p className="text-sm font-medium text-foreground">Ma'lumotlar zaxirasi</p>
                                <p className="text-xs text-muted-foreground">Avtomatik zaxira nusxalash</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </div>
                </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
                <Button className="btn-primary">
                    <Save className="mr-2 h-4 w-4" />
                    Saqlash
                </Button>
            </div>
        </div>
    );
}
