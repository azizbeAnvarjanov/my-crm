"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    FileText,
    Loader2,
    XCircle,
    ArrowLeft,
    Save,
    ExternalLink,
    Copy,
    Check,
    Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useForm, useUpdateForm } from "@/hooks/use-forms";
import { usePipelines, useStages } from "@/hooks/use-pipeline";

export default function FormEditPage() {
    const params = useParams();
    const router = useRouter();
    const formId = params.id as string;

    const { data: currentEmployee, isLoading: employeeLoading } = useEmployee();
    const { selectedBranch } = useBranch();
    const branchId = selectedBranch?.id || null;

    const isAdmin = currentEmployee?.role === "super-admin";

    // Form data
    const { data: form, isLoading: formLoading } = useForm(formId);
    const updateForm = useUpdateForm();

    // Pipeline and stage data
    const { data: pipelines = [] } = usePipelines(branchId);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
    const { data: stages = [] } = useStages(selectedPipelineId);

    // Form edit state
    const [editedForm, setEditedForm] = useState({
        name: "",
        pipline_id: "",
        stage_id: "",
        utm: "",
        status: false,
    });

    // Copy state
    const [copied, setCopied] = useState(false);

    // Initialize form data when loaded
    useEffect(() => {
        if (form) {
            setEditedForm({
                name: form.name,
                pipline_id: form.pipline_id,
                stage_id: form.stage_id,
                utm: form.utm || "",
                status: form.status,
            });
            setSelectedPipelineId(form.pipline_id);
        }
    }, [form]);

    // Handle pipeline change
    const handlePipelineChange = (pipelineId: string) => {
        setSelectedPipelineId(pipelineId);
        setEditedForm(prev => ({ ...prev, pipline_id: pipelineId, stage_id: "" }));
    };

    // Handle save
    const handleSave = async () => {
        try {
            await updateForm.mutateAsync({
                id: formId,
                name: editedForm.name,
                pipline_id: editedForm.pipline_id,
                stage_id: editedForm.stage_id,
                utm: editedForm.utm || null,
                status: editedForm.status,
            });
        } catch (error) {
            console.error("Error updating form:", error);
        }
    };

    // Copy form link
    const copyFormLink = () => {
        let link = `${window.location.origin}/form/${formId}`;
        // Add utm_source parameter if UTM is set
        if (editedForm.utm) {
            link += `?utm_source=${encodeURIComponent(editedForm.utm)}`;
        }
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Get form link
    const getFormLink = () => {
        let link = `${typeof window !== "undefined" ? window.location.origin : ""}/form/${formId}`;
        // Add utm_source parameter if UTM is set
        if (editedForm.utm) {
            link += `?utm_source=${encodeURIComponent(editedForm.utm)}`;
        }
        return link;
    };

    // Loading
    if (employeeLoading || formLoading || !branchId) {
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

    // Form not found
    if (!form) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <Card className="max-w-md border-border bg-card">
                    <CardContent className="pt-6 text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-yellow-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-card-foreground mb-2">
                            Forma topilmadi
                        </h2>
                        <p className="text-muted-foreground mb-4">
                            Bu forma mavjud emas yoki o'chirilgan.
                        </p>
                        <Button onClick={() => router.push("/forms")}>
                            Formalarga qaytish
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Check if form has changes
    const hasChanges = form && (
        editedForm.name !== form.name ||
        editedForm.pipline_id !== form.pipline_id ||
        editedForm.stage_id !== form.stage_id ||
        editedForm.utm !== (form.utm || "") ||
        editedForm.status !== form.status
    );

    return (
        <div className="min-h-screen p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/forms")}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="p-2 rounded-xl bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Formani tahrirlash</h1>
                        <p className="text-muted-foreground text-sm">{form.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                            const previewUrl = editedForm.utm
                                ? `/form/${formId}?utm_source=${encodeURIComponent(editedForm.utm)}`
                                : `/form/${formId}`;
                            window.open(previewUrl, "_blank");
                        }}
                    >
                        <Eye className="h-4 w-4" />
                        Preview
                    </Button>
                    <Button
                        className="gap-2"
                        onClick={handleSave}
                        disabled={!hasChanges || updateForm.isPending}
                    >
                        {updateForm.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Saqlash
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Edit Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg">Forma sozlamalari</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Form Name */}
                            <div className="space-y-2">
                                <Label>Forma nomi</Label>
                                <Input
                                    value={editedForm.name}
                                    onChange={(e) => setEditedForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Forma nomi"
                                />
                            </div>

                            {/* Pipeline Select */}
                            <div className="space-y-2">
                                <Label>Pipeline</Label>
                                <Select
                                    value={editedForm.pipline_id}
                                    onValueChange={handlePipelineChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pipeline tanlang" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pipelines.map((pipeline) => (
                                            <SelectItem key={pipeline.id} value={pipeline.id}>
                                                {pipeline.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Stage Select */}
                            <div className="space-y-2">
                                <Label>Stage</Label>
                                <Select
                                    value={editedForm.stage_id}
                                    onValueChange={(value) => setEditedForm(prev => ({ ...prev, stage_id: value }))}
                                    disabled={!editedForm.pipline_id}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={editedForm.pipline_id ? "Stage tanlang" : "Avval pipeline tanlang"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stages.map((stage) => (
                                            <SelectItem key={stage.id} value={stage.id}>
                                                {stage.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* UTM */}
                            <div className="space-y-2">
                                <Label>UTM</Label>
                                <Input
                                    value={editedForm.utm}
                                    onChange={(e) => setEditedForm(prev => ({ ...prev, utm: e.target.value }))}
                                    placeholder="Masalan: instagram_ad, google_cpc"
                                />
                                <p className="text-xs text-muted-foreground">
                                    UTM kodi lead yaratilganda avtomatik saqlanadi
                                </p>
                            </div>

                            {/* Status */}
                            <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg">
                                <div>
                                    <Label className="text-base">Faol holat</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {editedForm.status ? "Forma klientlar uchun ochiq" : "Forma yopiq, klientlar ko'ra olmaydi"}
                                    </p>
                                </div>
                                <Switch
                                    checked={editedForm.status}
                                    onCheckedChange={(checked) => setEditedForm(prev => ({ ...prev, status: checked }))}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview & Link */}
                <div className="space-y-6">
                    {/* Form Link */}
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg">Forma havolasi</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Input
                                    value={getFormLink()}
                                    readOnly
                                    className="bg-accent/30 text-sm"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={copyFormLink}
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={() => {
                                    const openUrl = editedForm.utm
                                        ? `/form/${formId}?utm_source=${encodeURIComponent(editedForm.utm)}`
                                        : `/form/${formId}`;
                                    window.open(openUrl, "_blank");
                                }}
                            >
                                <ExternalLink className="h-4 w-4" />
                                Formani ochish
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Form Preview Info */}
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg">Ma'lumot</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Status</span>
                                {editedForm.status ? (
                                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                        Faol
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-muted-foreground">
                                        Nofaol
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Branch</span>
                                <Badge variant="outline">{form.branch?.name || "-"}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Pipeline</span>
                                <Badge variant="secondary">
                                    {pipelines.find(p => p.id === editedForm.pipline_id)?.name || "-"}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Stage</span>
                                <Badge variant="outline">
                                    {stages.find(s => s.id === editedForm.stage_id)?.name || "-"}
                                </Badge>
                            </div>
                            {editedForm.utm && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">UTM</span>
                                    <Badge variant="outline">{editedForm.utm}</Badge>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Yaratilgan</span>
                                <span className="text-sm">
                                    {form.created_at ? new Date(form.created_at).toLocaleDateString("uz-UZ") : "-"}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
