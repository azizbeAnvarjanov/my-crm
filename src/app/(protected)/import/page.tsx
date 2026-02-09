"use client";

import { useState, useRef } from "react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, CheckCircle2, Loader2, ArrowRight, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useBranch } from "@/components/app-sidebar";
import { usePipelines } from "@/hooks/use-pipeline";
import { useStages } from "@/hooks/use-pipeline";
import { createClient } from "@/lib/supabase/client";

interface ExcelColumn {
    name: string;
    sample: string;
}

interface ColumnMapping {
    excelColumn: string;
    supabaseColumn: string;
}

const SUPABASE_COLUMNS = [
    { value: "none", label: "Import qilinmasin" },
    { value: "name", label: "Ism (Name)" },
    { value: "phone", label: "Telefon (Phone)" },
    { value: "phone_2", label: "Telefon 2 (Phone 2)" },
    { value: "utm", label: "UTM" },
    { value: "age", label: "Yosh (Age)" },
    { value: "location", label: "Manzil (Location)" },
];

export default function ImportPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { selectedBranch } = useBranch();
    const branchId = selectedBranch?.id || null;

    const [file, setFile] = useState<File | null>(null);
    const [excelColumns, setExcelColumns] = useState<ExcelColumn[]>([]);
    const [excelData, setExcelData] = useState<any[]>([]);
    const [selectedPipeline, setSelectedPipeline] = useState<string>("");
    const [selectedStage, setSelectedStage] = useState<string>("");
    const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);

    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importSuccess, setImportSuccess] = useState(false);
    const [importedCount, setImportedCount] = useState(0);

    // Countdown state for success screen
    const [countdown, setCountdown] = useState(5);

    const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines(branchId);
    const { data: stages = [], isLoading: stagesLoading } = useStages(selectedPipeline);

    // Countdown timer effect for success screen
    React.useEffect(() => {
        if (!importSuccess) return;

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [importSuccess]);

    // Redirect when countdown reaches 0
    React.useEffect(() => {
        if (importSuccess && countdown === 0) {
            router.push('/not-assigned-leads');
        }
    }, [countdown, importSuccess, router]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Check file type
        if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
            alert('Faqat Excel fayllari (.xlsx, .xls) qabul qilinadi!');
            return;
        }

        setFile(selectedFile);
        parseExcelFile(selectedFile);
    };

    const parseExcelFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                if (jsonData.length === 0) {
                    alert('Excel fayl bo\'sh!');
                    return;
                }

                // Extract column names from first row
                const headers = jsonData[0] as string[];
                const dataRows = jsonData.slice(1) as any[][];

                // Get sample data for each column
                const columns: ExcelColumn[] = headers.map((header, index) => ({
                    name: header,
                    sample: dataRows[0]?.[index]?.toString() || '',
                }));

                setExcelColumns(columns);
                setExcelData(dataRows);

                // Initialize mappings with "none"
                const initialMappings: ColumnMapping[] = columns.map(col => ({
                    excelColumn: col.name,
                    supabaseColumn: 'none',
                }));
                setColumnMappings(initialMappings);

            } catch (error) {
                console.error('Excel parse error:', error);
                alert('Excel faylni o\'qishda xatolik!');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const updateMapping = (excelColumn: string, supabaseColumn: string) => {
        setColumnMappings(prev =>
            prev.map(m =>
                m.excelColumn === excelColumn
                    ? { ...m, supabaseColumn }
                    : m
            )
        );
    };

    const handleImport = async () => {
        if (!file || !selectedPipeline || !selectedStage || !branchId) {
            alert('Barcha maydonlarni to\'ldiring!');
            return;
        }

        // Check if at least one column is mapped
        const hasMapping = columnMappings.some(m => m.supabaseColumn !== 'none');
        if (!hasMapping) {
            alert('Kamida bitta ustunni import qilish uchun tanlang!');
            return;
        }

        setImporting(true);
        setProgress(0);

        try {
            const supabase = createClient();
            const totalRows = excelData.length;
            let importedRows = 0;

            // Get column indices
            const columnIndices: { [key: string]: number } = {};
            excelColumns.forEach((col, index) => {
                const mapping = columnMappings.find(m => m.excelColumn === col.name);
                if (mapping && mapping.supabaseColumn !== 'none') {
                    columnIndices[mapping.supabaseColumn] = index;
                }
            });

            // Process rows in batches
            const batchSize = 50;
            for (let i = 0; i < totalRows; i += batchSize) {
                const batch = excelData.slice(i, Math.min(i + batchSize, totalRows));

                const leadsToInsert = batch.map(row => {
                    const lead: any = {
                        stage_id: selectedStage,
                        pipeline_id: selectedPipeline,
                    };

                    // Map columns
                    Object.entries(columnIndices).forEach(([supabaseCol, excelIndex]) => {
                        const value = row[excelIndex];
                        if (value !== undefined && value !== null && value !== '') {
                            lead[supabaseCol] = value.toString();
                        }
                    });

                    return lead;
                }).filter(lead => lead.name || lead.phone); // Only import if has name or phone

                if (leadsToInsert.length > 0) {
                    const { error } = await supabase
                        .from('leads')
                        .insert(leadsToInsert);

                    if (error) {
                        console.error('Import error:', error);
                        throw error;
                    }

                    importedRows += leadsToInsert.length;
                }

                // Update progress
                const currentProgress = Math.round((Math.min(i + batchSize, totalRows) / totalRows) * 100);
                setProgress(currentProgress);
            }

            setImportedCount(importedRows);
            setCountdown(5); // Reset countdown
            setImportSuccess(true);

            // The countdown and redirect are handled by useEffect

        } catch (error) {
            console.error('Import error:', error);
            alert('Import qilishda xatolik yuz berdi!');
            setImporting(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setExcelColumns([]);
        setExcelData([]);
        setSelectedPipeline('');
        setSelectedStage('');
        setColumnMappings([]);
        setImporting(false);
        setProgress(0);
        setImportSuccess(false);
        setImportedCount(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (importSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
                <Card className="max-w-md w-full border-border bg-card shadow-2xl">
                    <CardContent className="pt-12 pb-10">
                        <div className="text-center space-y-8">
                            {/* Success Icon */}
                            <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center animate-pulse">
                                <CheckCircle2 className="h-12 w-12 text-green-500" />
                            </div>

                            {/* Success Message */}
                            <div>
                                <h2 className="text-3xl font-bold text-foreground mb-3">
                                    Muvaffaqiyatli yuklandi!
                                </h2>
                                <p className="text-lg text-muted-foreground">
                                    <span className="text-green-500 font-semibold text-2xl">{importedCount}</span> ta lid import qilindi
                                </p>
                            </div>

                            {/* Countdown Circle */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <svg className="w-32 h-32 transform -rotate-90">
                                        {/* Background circle */}
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="none"
                                            className="text-muted/20"
                                        />
                                        {/* Progress circle */}
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="none"
                                            strokeDasharray={`${2 * Math.PI * 56}`}
                                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - countdown / 5)}`}
                                            className="text-primary transition-all duration-1000 ease-linear"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    {/* Countdown Number */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-6xl font-bold text-primary tabular-nums">
                                            {countdown}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    "Biriktirilmagan Lidlar" sahifasiga o'tkazilmoqda...
                                </p>
                            </div>

                            {/* Manual redirect button */}
                            <Button
                                onClick={() => router.push('/not-assigned-leads')}
                                className="w-full mt-4"
                                size="lg"
                            >
                                Hozir o'tish
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                    <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Lidlarni import qilish</h1>
                    <p className="text-muted-foreground text-sm">
                        Excel fayldan lidlarni import qiling
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid gap-6 max-w-4xl">
                {/* File Upload */}
                <Card className="border-border bg-card">
                    <CardHeader>
                        <CardTitle>1. Excel faylni yuklash</CardTitle>
                        <CardDescription>
                            Faqat .xlsx va .xls fayl formatlari qabul qilinadi
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-accent/30 transition-colors"
                            >
                                {file ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <FileSpreadsheet className="h-8 w-8 text-green-500" />
                                        <div className="text-left">
                                            <p className="font-medium text-foreground">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {excelData.length} qator topildi
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                resetForm();
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                                        <p className="text-foreground font-medium">
                                            Faylni bu yerga tashlang yoki tanlang
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            XLSX, XLS
                                        </p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Pipeline & Stage Selection */}
                {file && excelColumns.length > 0 && (
                    <>
                        <Card className="border-border bg-card">
                            <CardHeader>
                                <CardTitle>2. Pipeline va Stage tanlash</CardTitle>
                                <CardDescription>
                                    Lidlar qaysi pipeline va stage'ga import qilinishini tanlang
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    {/* Pipeline Select */}
                                    <div className="space-y-2">
                                        <Label>Pipeline</Label>
                                        <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                                            <SelectTrigger disabled={pipelinesLoading}>
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
                                            value={selectedStage}
                                            onValueChange={setSelectedStage}
                                            disabled={!selectedPipeline || stagesLoading}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Stage tanlang" />
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
                                </div>
                            </CardContent>
                        </Card>

                        {/* Column Mapping */}
                        <Card className="border-border bg-card">
                            <CardHeader>
                                <CardTitle>3. Ustunlarni moslashtirish</CardTitle>
                                <CardDescription>
                                    Excel ustunlari Supabase ustunlariga qaysi biri mos kelishini belgilang
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {excelColumns.map((column) => (
                                        <div key={column.name} className="grid gap-3 md:grid-cols-3 items-center p-3 border border-border rounded-lg">
                                            <div>
                                                <p className="font-medium text-sm text-foreground">{column.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    Namuna: {column.sample}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-center">
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <Select
                                                value={columnMappings.find(m => m.excelColumn === column.name)?.supabaseColumn || 'none'}
                                                onValueChange={(value) => updateMapping(column.name, value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {SUPABASE_COLUMNS.map((col) => (
                                                        <SelectItem key={col.value} value={col.value}>
                                                            {col.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Import Button */}
                        <Card className="border-border bg-card">
                            <CardContent className="pt-6">
                                {importing ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Import qilinmoqda...</span>
                                            <span className="font-medium text-foreground">{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Iltimos kuting...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={handleImport}
                                        disabled={!selectedPipeline || !selectedStage}
                                        className="w-full"
                                        size="lg"
                                    >
                                        <Upload className="mr-2 h-5 w-5" />
                                        Import qilish
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
