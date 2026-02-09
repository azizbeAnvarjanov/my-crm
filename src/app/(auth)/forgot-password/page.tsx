"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Mail, Check } from "lucide-react";

export default function ForgotPasswordPage() {
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                setError(error.message);
            } else {
                setSuccess(true);
            }
        } catch {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-bg min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-[#2e2e2e] bg-[#1c1c1c]/80 backdrop-blur-sm">
                    <CardContent className="pt-6 text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#3ecf8e]/20 flex items-center justify-center">
                            <Check className="h-6 w-6 text-[#3ecf8e]" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
                        <p className="text-[#a1a1a1] mb-6">
                            We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>.
                        </p>
                        <Link href="/login">
                            <Button
                                variant="outline"
                                className="border-[#2e2e2e] bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Sign In
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="auth-bg min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[#3ecf8e] flex items-center justify-center">
                            <svg
                                viewBox="0 0 24 24"
                                className="h-6 w-6 text-[#171717]"
                                fill="currentColor"
                            >
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold text-white">CRM Pro</span>
                    </div>
                </div>

                <Card className="border-[#2e2e2e] bg-[#1c1c1c]/80 backdrop-blur-sm">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-xl text-white">Reset your password</CardTitle>
                        <CardDescription className="text-[#a1a1a1]">
                            Enter your email and we&apos;ll send you a reset link
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Error Message */}
                        {error && (
                            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Reset Form */}
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#ededed]">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a1a1a1]" />
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                        className="pl-10 bg-[#171717] border-[#2e2e2e] text-white placeholder:text-[#6a6a6a] focus:border-[#3ecf8e] focus:ring-[#3ecf8e]"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-supabase text-[#171717] font-semibold"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 spinner" />
                                        Sending...
                                    </>
                                ) : (
                                    "Send Reset Link"
                                )}
                            </Button>
                        </form>

                        <div className="text-center">
                            <Link
                                href="/login"
                                className="inline-flex items-center text-sm text-[#a1a1a1] hover:text-white transition-colors"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Sign In
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
