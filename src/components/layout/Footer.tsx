import React from "react";

type Page =
    | "dashboard"
    | "task_detail"
    | "documentation"
    | "changelog"
    | "settings"
    | "privacy"
    | "terms"
    | "support";

interface FooterProps {
    navigate: (page: Page) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => (
    <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-border-subtle py-8 md:flex-row">
        <p className="text-xs text-slate-600">(c) 2026 DevPilot Automation Platform</p>
        <div className="flex gap-6">
            <button
                onClick={() => navigate("privacy")}
                className="text-xs text-slate-500 transition-colors hover:text-primary"
            >
                Privacy Policy
            </button>
            <button
                onClick={() => navigate("terms")}
                className="text-xs text-slate-500 transition-colors hover:text-primary"
            >
                Terms of Service
            </button>
            <button
                onClick={() => navigate("support")}
                className="text-xs text-slate-500 transition-colors hover:text-primary"
            >
                Support
            </button>
        </div>
    </div>
);
