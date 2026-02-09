"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImportPage() {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setFile(droppedFile);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const recentImports = [
        { id: 1, name: "leads_january.csv", rows: 1234, status: "success", date: "2024-02-08" },
        { id: 2, name: "contacts_update.xlsx", rows: 567, status: "success", date: "2024-02-05" },
        { id: 3, name: "old_data.csv", rows: 890, status: "error", date: "2024-02-01" },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Import</h1>
                <p className="text-muted-foreground mt-1">
                    Ma'lumotlarni CSV yoki Excel fayllaridan import qiling
                </p>
            </div>

            {/* Upload Area */}
            <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {file ? (
                    <div className="flex flex-col items-center">
                        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                            <FileSpreadsheet className="h-8 w-8 text-green-500" />
                        </div>
                        <p className="text-lg font-medium text-foreground mb-1">{file.name}</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            {(file.size / 1024).toFixed(2)} KB
                        </p>
                        <div className="flex gap-3">
                            <Button className="btn-primary">
                                <Upload className="mr-2 h-4 w-4" />
                                Import qilish
                            </Button>
                            <Button variant="outline" onClick={() => setFile(null)}>
                                <X className="mr-2 h-4 w-4" />
                                Bekor qilish
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <Upload className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-lg font-medium text-foreground mb-1">
                            Faylni bu yerga tashlang
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                            yoki kompyuteringizdan tanlang
                        </p>
                        <label>
                            <input
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <Button asChild className="btn-primary cursor-pointer">
                                <span>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    Fayl tanlash
                                </span>
                            </Button>
                        </label>
                        <p className="text-xs text-muted-foreground mt-4">
                            Qo'llab-quvvatlanuvchi formatlar: CSV, XLSX, XLS
                        </p>
                    </div>
                )}
            </div>

            {/* Download Template */}
            <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-card-foreground">Shablon yuklab olish</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            To'g'ri formatda import qilish uchun shablondan foydalaning
                        </p>
                    </div>
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Shablonni yuklab olish
                    </Button>
                </div>
            </div>

            {/* Recent Imports */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-card-foreground">So'nggi importlar</h3>
                </div>
                <div className="divide-y divide-border">
                    {recentImports.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-accent transition-colors">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${item.status === "success" ? "bg-green-500/10" : "bg-red-500/10"
                                }`}>
                                {item.status === "success" ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.rows} qator</p>
                            </div>
                            <div className="text-right">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.status === "success"
                                        ? "bg-green-500/10 text-green-500"
                                        : "bg-red-500/10 text-red-500"
                                    }`}>
                                    {item.status === "success" ? "Muvaffaqiyatli" : "Xato"}
                                </span>
                                <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
