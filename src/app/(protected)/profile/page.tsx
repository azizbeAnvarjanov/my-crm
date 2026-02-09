"use client";

import { useState } from "react";
import { useEmployee } from "@/hooks/use-employee";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, Lock, Save, Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
    const { data: employee, isLoading, refetch } = useEmployee();
    const supabase = createClient();

    // Email change state
    const [newEmail, setNewEmail] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailMessage, setEmailMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Password change state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleEmailChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;

        setEmailLoading(true);
        setEmailMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });

            if (error) {
                setEmailMessage({ type: "error", text: error.message });
            } else {
                setEmailMessage({ type: "success", text: "Email o'zgartirish uchun tasdiqlash xati yuborildi" });
                setNewEmail("");
            }
        } catch {
            setEmailMessage({ type: "error", text: "Xatolik yuz berdi" });
        } finally {
            setEmailLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: "error", text: "Parollar mos kelmaydi" });
            return;
        }

        if (newPassword.length < 6) {
            setPasswordMessage({ type: "error", text: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
            return;
        }

        setPasswordLoading(true);
        setPasswordMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) {
                setPasswordMessage({ type: "error", text: error.message });
            } else {
                setPasswordMessage({ type: "success", text: "Parol muvaffaqiyatli o'zgartirildi" });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            }
        } catch {
            setPasswordMessage({ type: "error", text: "Xatolik yuz berdi" });
        } finally {
            setPasswordLoading(false);
        }
    };

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
                <h1 className="text-2xl font-bold text-foreground">Mening profilim</h1>
                <p className="text-muted-foreground mt-1">Shaxsiy ma'lumotlarni boshqaring</p>
            </div>

            {/* Profile Info Card */}
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-card-foreground">{employee?.name || "Foydalanuvchi"}</h2>
                        <p className="text-muted-foreground">{employee?.email}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${employee?.role === "super-admin"
                                ? "bg-purple-500/10 text-purple-500"
                                : "bg-blue-500/10 text-blue-500"
                            }`}>
                            {employee?.role === "super-admin" ? "Super Admin" : "Manager"}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-accent">
                        <p className="text-sm text-muted-foreground">Bo'lim</p>
                        <p className="text-foreground font-medium mt-1">{employee?.department?.name || "Belgilanmagan"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-accent">
                        <p className="text-sm text-muted-foreground">Filial</p>
                        <p className="text-foreground font-medium mt-1">{employee?.branch?.name || "Belgilanmagan"}</p>
                    </div>
                </div>
            </div>

            {/* Email Change Card */}
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Mail className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-card-foreground">Email o'zgartirish</h2>
                </div>

                <form onSubmit={handleEmailChange} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Joriy email
                        </label>
                        <Input
                            type="email"
                            value={employee?.email || ""}
                            disabled
                            className="bg-accent border-input text-muted-foreground"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Yangi email
                        </label>
                        <Input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="yangi@email.com"
                            className="bg-background border-input text-foreground"
                        />
                    </div>

                    {emailMessage && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${emailMessage.type === "success" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                            }`}>
                            {emailMessage.type === "success" ? (
                                <CheckCircle className="h-4 w-4" />
                            ) : (
                                <AlertCircle className="h-4 w-4" />
                            )}
                            <span className="text-sm">{emailMessage.text}</span>
                        </div>
                    )}

                    <Button type="submit" disabled={emailLoading || !newEmail.trim()} className="btn-primary">
                        {emailLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Saqlash
                    </Button>
                </form>
            </div>

            {/* Password Change Card */}
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Lock className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold text-card-foreground">Parol o'zgartirish</h2>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Joriy parol
                        </label>
                        <div className="relative">
                            <Input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-background border-input text-foreground pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Yangi parol
                        </label>
                        <div className="relative">
                            <Input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-background border-input text-foreground pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Yangi parolni tasdiqlash
                        </label>
                        <div className="relative">
                            <Input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-background border-input text-foreground pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {passwordMessage && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${passwordMessage.type === "success" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                            }`}>
                            {passwordMessage.type === "success" ? (
                                <CheckCircle className="h-4 w-4" />
                            ) : (
                                <AlertCircle className="h-4 w-4" />
                            )}
                            <span className="text-sm">{passwordMessage.text}</span>
                        </div>
                    )}

                    <Button type="submit" disabled={passwordLoading || !newPassword || !confirmPassword} className="btn-primary">
                        {passwordLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Lock className="mr-2 h-4 w-4" />
                        )}
                        Parolni o'zgartirish
                    </Button>
                </form>
            </div>
        </div>
    );
}
