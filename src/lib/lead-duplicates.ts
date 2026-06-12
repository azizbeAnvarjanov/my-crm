const LEAD_DUPLICATE_FIELD_LABELS: Record<string, string> = {
    phone: "Telefon",
    passport_series: "Passport seriya",
    jshshr: "JSHSHR",
};

export function getLeadDuplicateFieldLabels(fields?: readonly string[] | null) {
    if (!fields?.length) return [];

    return fields
        .map((field) => LEAD_DUPLICATE_FIELD_LABELS[field] || field)
        .filter(Boolean);
}
