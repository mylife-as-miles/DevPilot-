/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { DashboardHeroComposer } from "./components/DashboardHeroComposer";
import { Tabs } from "./components/dashboard/Tabs";
import { TaskList } from "./components/dashboard/TaskList";
import { TaskDetail } from "./components/dashboard/TaskDetail";
import { Changelog } from "./pages/Changelog";
import { Documentation } from "./pages/Documentation";
import { Legal, PrivacyPolicyContent, TermsOfServiceContent } from "./pages/Legal";
import { Settings } from "./pages/Settings";
import { Support } from "./pages/Support";
import { useTaskHub } from "./hooks/useTaskHub";
import { Task } from "./types";

type Page =
  | "dashboard"
  | "task_detail"
  | "documentation"
  | "changelog"
  | "settings"
  | "privacy"
  | "terms"
  | "support";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Task["category"]>("tasks");

  const {
    integrationState,
    selectedBranch,
    setSelectedBranch,
    isCreatingTask,
    dashboardError,
    userConfig,
    setUserConfig,
    createTask,
    handleProjectChange,
  } = useTaskHub();

  const navigate = (page: Page, taskId?: string) => {
    setCurrentPage(page);
    if (taskId) setSelectedTask(taskId);
  };

  const handleCreateTask = async (prompt: string) => {
    const taskId = await createTask(prompt);
    if (taskId) navigate("task_detail", taskId);
  };

  const projectPath = integrationState.project?.pathWithNamespace || "";
  const branchNames = integrationState.branches.map((branch) => branch.name);

  // Router Implementation
  const renderPage = () => {
    if (currentPage === "task_detail" && selectedTask) {
      return (
        <TaskDetail
          taskId={selectedTask}
          onBack={() => navigate("dashboard")}
          projects={[projectPath]}
          branches={branchNames}
        />
      );
    }

    if (currentPage === "documentation") return <Documentation onBack={() => navigate("dashboard")} />;
    if (currentPage === "changelog") return <Changelog onBack={() => navigate("dashboard")} />;
    if (currentPage === "settings") {
      return (
        <Settings
          onBack={() => navigate("dashboard")}
          userConfig={userConfig}
          onUpdateConfig={setUserConfig}
        />
      );
    }

    if (currentPage === "privacy") {
      return (
        <Legal
          title="Privacy Policy"
          lastUpdated="March 11, 2026"
          content={PrivacyPolicyContent}
          onBack={() => navigate("dashboard")}
        />
      );
    }

    if (currentPage === "terms") {
      return (
        <Legal
          title="Terms of Service"
          lastUpdated="March 11, 2026"
          content={TermsOfServiceContent}
          onBack={() => navigate("dashboard")}
        />
      );
    }

    if (currentPage === "support") return <Support onBack={() => navigate("dashboard")} />;

    // Default: Dashboard
    return (
      <div className="min-h-screen bg-background-dark font-display text-slate-100 selection:bg-primary/30">
        <Header navigate={navigate} />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <DashboardHeroComposer
            projectLabel={integrationState.project?.name || "Select Project"}
            projectPath={projectPath}
            branches={branchNames}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            onSubmit={handleCreateTask}
            isReady={integrationState.ready}
            isSubmitting={isCreatingTask}
            availableProjects={integrationState.availableProjects}
            onProjectChange={handleProjectChange}
          />

          <section className="mt-16">
            <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
            <TaskList
              onSelectTask={(id) => navigate("task_detail", id)}
              activeTab={activeTab}
            />
          </section>

          <Footer navigate={navigate} />
        </main>
      </div>
    );
  };

  return renderPage();
}
