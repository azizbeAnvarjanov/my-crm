"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2, User, Phone, MapPin, Calendar, Hash } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Lead, Stage } from "@/hooks/use-pipeline";

interface LeadSheetProps {
    lead: Lead | null;
    isOpen: boolean;
    onClose: () => void;
    stages: Stage[];
    onUpdateLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
    isUpdating?: boolean;
}

export function LeadSheet({
    lead,
    isOpen,
    onClose,
    stages,
    onUpdateLead,
    isUpdating = false,
}: LeadSheetProps) {
    const [editedLead, setEditedLead] = useState<Partial<Lead>>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Reset edited lead when lead changes
    useEffect(() => {
        if (lead) {
            setEditedLead({
                name: lead.name,
                phone: lead.phone,
                phone_2: lead.phone_2 || "",
                location: lead.location || "",
                age: lead.age,
                gender: lead.gender || "",
                date_of_year: lead.date_of_year || "",
                utm: lead.utm || "",
                stage_id: lead.stage_id,
            });
            setHasChanges(false);
        }
    }, [lead]);

    const handleFieldChange = (field: keyof Lead, value: any) => {
        setEditedLead(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        if (!lead || !hasChanges) return;

        // Clean up data for database submission
        const cleanedData = { ...editedLead };
        if (cleanedData.date_of_year === "") {
            cleanedData.date_of_year = null as any;
        }

        try {
            await onUpdateLead(lead.id, cleanedData);
            setHasChanges(false);
            onClose();
        } catch (error) {
            console.error("Error updating lead:", error);
        }
    };

    if (!lead) return null;

    const currentStage = stages.find(s => s.id === (editedLead.stage_id || lead.stage_id));

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <SheetTitle className="text-xl font-bold">
                                {lead.name}
                            </SheetTitle>
                            <SheetDescription className="flex items-center gap-2 mt-1">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                            </SheetDescription>
                        </div>
                        <Badge
                            style={{
                                backgroundColor: currentStage?.color ? `${currentStage.color}20` : undefined,
                                color: currentStage?.color,
                                borderColor: currentStage?.color,
                            }}
                            className="ml-2"
                        >
                            {currentStage?.name || "No Stage"}
                        </Badge>
                    </div>
                </SheetHeader>

                <Separator className="my-4" />

                <div className="space-y-4 py-4">
                    {/* Asosiy ma'lumotlar */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Asosiy ma'lumotlar
                        </h3>

                        <div className="space-y-2">
                            <Label htmlFor="name">Ism</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="name"
                                    value={editedLead.name || ""}
                                    onChange={(e) => handleFieldChange("name", e.target.value)}
                                    className="pl-9"
                                    placeholder="Mijoz ismi"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefon</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="phone"
                                    value={editedLead.phone || ""}
                                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                                    className="pl-9"
                                    placeholder="+998 90 123 45 67"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone_2">Qo'shimcha telefon</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="phone_2"
                                    value={editedLead.phone_2 || ""}
                                    onChange={(e) => handleFieldChange("phone_2", e.target.value)}
                                    className="pl-9"
                                    placeholder="+998 90 123 45 67"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Manzil</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="location"
                                    value={editedLead.location || ""}
                                    onChange={(e) => handleFieldChange("location", e.target.value)}
                                    className="pl-9"
                                    placeholder="Manzil"
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Qo'shimcha ma'lumotlar */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Qo'shimcha
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="age">Yosh</Label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="age"
                                        type="number"
                                        value={editedLead.age || ""}
                                        onChange={(e) => handleFieldChange("age", parseInt(e.target.value) || undefined)}
                                        className="pl-9"
                                        placeholder="25"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gender">Jinsi</Label>
                                <Select
                                    value={editedLead.gender || ""}
                                    onValueChange={(value) => handleFieldChange("gender", value)}
                                >
                                    <SelectTrigger id="gender">
                                        <SelectValue placeholder="Tanlang" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Erkak</SelectItem>
                                        <SelectItem value="female">Ayol</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="date_of_year">Tug'ilgan sana</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="date_of_year"
                                    type="date"
                                    value={editedLead.date_of_year || ""}
                                    onChange={(e) => handleFieldChange("date_of_year", e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="utm">UTM Source</Label>
                            <Input
                                id="utm"
                                value={editedLead.utm || ""}
                                onChange={(e) => handleFieldChange("utm", e.target.value)}
                                placeholder="UTM"
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Stage Selection */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Bosqich
                        </h3>

                        <div className="space-y-2">
                            <Label htmlFor="stage">Joriy bosqich</Label>
                            <Select
                                value={editedLead.stage_id || lead.stage_id}
                                onValueChange={(value) => handleFieldChange("stage_id", value)}
                            >
                                <SelectTrigger id="stage">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {stages.map((stage) => (
                                        <SelectItem key={stage.id} value={stage.id}>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: stage.color || "#888" }}
                                                />
                                                {stage.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Metadata */}
                    <Separator />
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                            <span>Yaratilgan:</span>
                            <span>{lead.created_at ? new Date(lead.created_at).toLocaleDateString("uz-UZ") : "-"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Yangilangan:</span>
                            <span>{lead.updated_at ? new Date(lead.updated_at).toLocaleDateString("uz-UZ") : "-"}</span>
                        </div>
                        {lead.employee && (
                            <div className="flex justify-between">
                                <span>Mas'ul xodim:</span>
                                <span>{lead.employee.name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t mt-6 flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Bekor qilish
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || isUpdating}
                        className="flex-1"
                    >
                        {isUpdating ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Saqlash
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
