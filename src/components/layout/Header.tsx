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

interface HeaderProps {
    navigate: (page: Page) => void;
}

export const Header: React.FC<HeaderProps> = ({ navigate }) => (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border-subtle bg-background-dark/50 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div
            className="flex cursor-pointer items-center gap-3"
            onClick={() => navigate("dashboard")}
        >
            <div className="flex size-8 items-center justify-center rounded bg-primary text-black">
                <span className="material-symbols-outlined text-[20px] font-bold">
                    bolt
                </span>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-100">
                DevPilot
            </h2>
        </div>
        <div className="flex items-center gap-4">
            <div className="mr-6 hidden items-center gap-6 md:flex">
                <button
                    onClick={() => navigate("documentation")}
                    className="text-sm font-medium text-slate-500 transition-colors hover:text-primary"
                >
                    Documentation
                </button>
                <button
                    onClick={() => navigate("changelog")}
                    className="text-sm font-medium text-slate-500 transition-colors hover:text-primary"
                >
                    Changelog
                </button>
            </div>
            <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5">
                <span className="material-symbols-outlined">notifications</span>
            </button>
            <button
                onClick={() => navigate("settings")}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5"
            >
                <span className="material-symbols-outlined">settings</span>
            </button>
            <div
                className="h-8 w-8 cursor-pointer rounded-full border border-white/10 bg-gradient-to-tr from-primary to-orange-200"
                onClick={() => navigate("settings")}
            />
        </div>
    </header>
);
