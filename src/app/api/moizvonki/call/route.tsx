import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
    try {
        const { phone } = await req.json();
        const supabase = await createClient();
        const { data } = await supabase.auth.getClaims();
        const email = data?.claims?.email;

        const payload = {
            user_name: email,
            api_key: "p0wpv3svpjjs5n525wsyb1pnwo1cmo7s",
            action: "calls.make_call",
            to: phone,
        };

        const body = new URLSearchParams();
        body.append("request_data", JSON.stringify(payload));

        const res = await fetch("https://azswewqfwergfwf.moizvonki.ru/api/v1", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
        });

        const text = await res.text();
        // console.log("MOIZVONKI RESPONSE:", text);

        // Try to parse JSON if possible
        let parsed = null;
        try {
            parsed = JSON.parse(text);
        } catch (_) { }

        // Helper: deep search for a likely recording URL
        const findRecordingUrl = (value: any): string | null => {
            const urlRegex = /(https?:\/\/[^\s"']+\.(mp3|wav|ogg|m4a))/i;
            if (typeof value === "string") {
                const m = value.match(urlRegex);
                return m ? m[1] : null;
            }
            if (value && typeof value === "object") {
                for (const k of Object.keys(value)) {
                    const found = findRecordingUrl(value[k]);
                    if (found) return found;
                }
            }
            return null;
        };

        let recording = null;
        if (parsed) {
            // Common places to check, then fallback to deep search
            recording =
                parsed?.result?.recording ||
                parsed?.result?.record_file ||
                parsed?.recording ||
                parsed?.record_file ||
                findRecordingUrl(parsed);
        }
        if (!recording) {
            // Fallback: regex directly on the raw text
            recording = findRecordingUrl(text);
        }

        return NextResponse.json({ ok: true, recording, raw: parsed ?? text });
    } catch (err) {
        console.error("MOIZVONKI CALL ERROR:", err);
        return NextResponse.json(
            { ok: false, error: "server_error" },
            { status: 500 }
        );
    }
}
