"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
    User,
    Phone,
    MapPin,
    Loader2,
    CheckCircle2,
    XCircle,
    Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { usePublicForm, useSubmitForm } from "@/hooks/use-forms";

// Location options
const LOCATIONS = [
    "Toshkent",
    "Namangan",
    "Andijon",
    "Farg'ona",
    "Samarqand",
    "Buxoro",
    "Xorazm",
    "Qashqadaryo",
    "Surxondaryo",
    "Jizzax",
    "Sirdaryo",
    "Navoiy",
    "Qoraqalpog'iston",
];

export default function PublicFormPage() {
    const params = useParams();
    const formId = params.id as string;

    // Form data
    const { data: form, isLoading: formLoading, isError } = usePublicForm(formId);
    const submitForm = useSubmitForm();

    // Form input state
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        location: "",
    });

    // Validation errors
    const [errors, setErrors] = useState({
        name: "",
        phone: "",
        location: "",
    });

    // Success state
    const [success, setSuccess] = useState(false);

    // Validate phone number (Uzbekistan format)
    const validatePhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, "");
        return cleaned.length === 12 && cleaned.startsWith("998");
    };

    // Format phone number
    const formatPhone = (value: string) => {
        // Remove all non-digits except +
        let cleaned = value.replace(/[^\d+]/g, "");

        // Ensure it starts with +998
        if (!cleaned.startsWith("+998") && !cleaned.startsWith("998")) {
            if (cleaned.startsWith("+")) {
                cleaned = "+998" + cleaned.slice(1);
            } else {
                cleaned = "+998" + cleaned;
            }
        } else if (cleaned.startsWith("998")) {
            cleaned = "+" + cleaned;
        }

        // Limit to 13 characters (+998XXXXXXXXX)
        cleaned = cleaned.slice(0, 13);

        // Format: +998 XX XXX XX XX
        if (cleaned.length > 4) {
            let formatted = cleaned.slice(0, 4);
            if (cleaned.length > 4) formatted += " " + cleaned.slice(4, 6);
            if (cleaned.length > 6) formatted += " " + cleaned.slice(6, 9);
            if (cleaned.length > 9) formatted += " " + cleaned.slice(9, 11);
            if (cleaned.length > 11) formatted += " " + cleaned.slice(11, 13);
            return formatted;
        }
        return cleaned;
    };

    // Handle phone change
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        setFormData(prev => ({ ...prev, phone: formatted }));
        if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }));
    };

    // Validate form
    const validate = () => {
        const newErrors = { name: "", phone: "", location: "" };
        let isValid = true;

        if (!formData.name.trim()) {
            newErrors.name = "Ism kiritish majburiy";
            isValid = false;
        }

        const phoneDigits = formData.phone.replace(/\D/g, "");
        if (!phoneDigits || phoneDigits.length < 12) {
            newErrors.phone = "To'liq telefon raqam kiriting";
            isValid = false;
        } else if (!validatePhone(phoneDigits)) {
            newErrors.phone = "Noto'g'ri telefon raqam formati";
            isValid = false;
        }

        if (!formData.location) {
            newErrors.location = "Manzil tanlash majburiy";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            await submitForm.mutateAsync({
                formId,
                submission: {
                    name: formData.name.trim(),
                    phone: formData.phone.replace(/\s/g, ""),
                    location: formData.location,
                },
            });
            setSuccess(true);
        } catch (error) {
            console.error("Error submitting form:", error);
        }
    };

    // Loading
    if (formLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    // Form not found or not active
    if (isError || !form || !form.status) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="max-w-md w-full border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
                    <CardContent className="pt-12 pb-8 text-center">
                        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
                            <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-card-foreground mb-3">
                            Forma topilmadi
                        </h2>
                        <p className="text-muted-foreground">
                            Bu forma mavjud emas yoki hozirda faol emas.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
                <Card className="max-w-md w-full border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
                    <CardContent className="pt-12 pb-8 text-center">
                        <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center animate-pulse">
                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-card-foreground mb-3">
                            Muvaffaqiyatli yuborildi!
                        </h2>
                        <p className="text-muted-foreground">
                            Sizning so'rovingiz qabul qilindi. Tez orada siz bilan bog'lanamiz.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <Card className="max-w-md w-full border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
                <CardHeader className="text-center pb-2">
                    {/* Logo */}
                    <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                            {form.branch?.name?.charAt(0) || "F"}
                        </span>
                    </div>
                    <CardTitle className="text-2xl font-bold text-card-foreground">
                        {form.name}
                    </CardTitle>
                    {form.branch?.name && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {form.branch.name}
                        </p>
                    )}
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                                <User className="h-4 w-4 text-muted-foreground" />
                                Ismingiz *
                            </Label>
                            <Input
                                placeholder="To'liq ismingizni kiriting"
                                value={formData.name}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, name: e.target.value }));
                                    if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
                                }}
                                className={`h-12 bg-background/50 ${errors.name ? "border-red-500" : ""}`}
                            />
                            {errors.name && (
                                <p className="text-xs text-red-500">{errors.name}</p>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                Telefon raqamingiz *
                            </Label>
                            <Input
                                type="tel"
                                placeholder="+998 XX XXX XX XX"
                                value={formData.phone}
                                onChange={handlePhoneChange}
                                className={`h-12 bg-background/50 ${errors.phone ? "border-red-500" : ""}`}
                            />
                            {errors.phone && (
                                <p className="text-xs text-red-500">{errors.phone}</p>
                            )}
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                Manzilingiz *
                            </Label>
                            <Select
                                value={formData.location}
                                onValueChange={(value) => {
                                    setFormData(prev => ({ ...prev, location: value }));
                                    if (errors.location) setErrors(prev => ({ ...prev, location: "" }));
                                }}
                            >
                                <SelectTrigger className={`h-12 bg-background/50 ${errors.location ? "border-red-500" : ""}`}>
                                    <SelectValue placeholder="Viloyatni tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                    {LOCATIONS.map((location) => (
                                        <SelectItem key={location} value={location}>
                                            {location}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.location && (
                                <p className="text-xs text-red-500">{errors.location}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold gap-2"
                            disabled={submitForm.isPending}
                        >
                            {submitForm.isPending ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                            Yuborish
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
