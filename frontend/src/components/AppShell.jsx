import React, { useCallback, useMemo, useState } from "react";
import { ErrorBoundary, GhostBtn, PrimaryBtn } from "./common";
import { Sidebar, TopBar } from "./layout";
import { ServerMonitorPanel } from "./servers";
import { ThemeCtx, buildGlobalStyles, makeTheme } from "../context/ThemeContext";
import Step0Machine from "./steps/Step0Machine";
import { Step1CollectData } from "./steps/Step1CollectData";
import { Step2Algorithms } from "./steps/Step2Algorithms";
import { Step4Reports } from "./steps/Step4Reports";
import { SimulationHistory } from "./history/SimulationHistory";

export const AppShell = () => {
  const [dark, setDark] = useState(true);
  const theme = makeTheme(dark);
  const globalStyles = useMemo(() => buildGlobalStyles(theme), [theme]);
  const [view, setView] = useState("history");
  const [step, setStep] = useState(0);
  const [machine, setMachine] = useState(null);
  const [machineTasks, setMachineTasks] = useState([]);
  const [batchTasks, setBatchTasks] = useState([]);
  const [serverUsage, setServerUsage] = useState({});
  const [report, setReport] = useState(null);
  const [runStatus, setRunStatus] = useState("READY");

  const sameBatch = (current, next) => {
    const fields = [
      "task_id",
      "payload_size_mb",
      "processing_duration_sec",
      "cpu_demand_percent",
      "ram_demand_mb",
      "max_tolerable_latency_sec",
    ];
    return current.length === next.length
      && current.every((task, index) => fields.every((field) => task[field] === next[index]?.[field]));
  };

  const handleMachineSelection = useCallback((selectedMachine, tasks) => {
    setMachine((current) => current?.id === selectedMachine?.id ? current : selectedMachine);
    setMachineTasks((current) => sameBatch(current, tasks) ? current : tasks);
    setBatchTasks((current) => current.length === 0 ? current : []);
    setRunStatus("READY");
    setReport(null);
  }, []);

  const handleBatchChange = useCallback((tasks) => {
    setBatchTasks((current) => {
      if (sameBatch(current, tasks)) return current;
      setRunStatus("READY");
      setReport(null);
      return tasks;
    });
  }, []);

  const handleServerUsage = useCallback((event) => {
    setServerUsage((current) => ({ ...current, [event.server_id]: event }));
  }, []);

  const handleReportReady = useCallback((nextReport) => {
    setReport(nextReport);
    setRunStatus("COMPLETED");
  }, []);

  const handleRunStatusChange = useCallback((nextStatus) => {
    setRunStatus(nextStatus);
  }, []);

  const restartPipeline = useCallback(() => {
    setStep(0);
    setMachine(null);
    setMachineTasks([]);
    setBatchTasks([]);
    setServerUsage({});
    setReport(null);
    setRunStatus("READY");
    setView("pipeline");
  }, []);

  const startNewPipeline = useCallback(() => {
    setView("pipeline");
    setStep(0);
  }, []);

  const handleJumpStep = useCallback((targetStep) => {
    setView("pipeline");
    setStep(targetStep);
  }, []);

  const handleSelectView = useCallback((selectedView) => {
    setView(selectedView);
  }, []);

  const maxReached = !machine ? 0 : !batchTasks.length ? 1 : runStatus === "COMPLETED" ? 3 : 2;
  const canAdvance = step === 0
    ? Boolean(machine)
    : step === 1
    ? batchTasks.length > 0
    : step === 2
    ? runStatus === "COMPLETED"
    : false;

  const stepComponent = useMemo(() => {
    if (view === "history") {
      return <SimulationHistory onStartNewPipeline={startNewPipeline} />;
    }

    switch (step) {
      case 0:
        return <Step0Machine onSelectionChange={handleMachineSelection} />;
      case 1:
        return <Step1CollectData machine={machine} tasks={machineTasks} onBatchChange={handleBatchChange} />;
      case 2:
        return <Step2Algorithms machine={machine} tasks={batchTasks} onServerUsage={handleServerUsage} onReportReady={handleReportReady} onRunStatusChange={handleRunStatusChange} />;
      case 3:
        return <Step4Reports report={report} />;
      default:
        return null;
    }
  }, [batchTasks, handleBatchChange, handleMachineSelection, handleReportReady, handleRunStatusChange, handleServerUsage, machine, machineTasks, report, startNewPipeline, step, view]);

  return (
    <ThemeCtx.Provider value={theme}>
      <ErrorBoundary>
        <style>{globalStyles}</style>
        <div style={{ display: "flex", minHeight: "100vh", background: theme.bg, color: theme.text }}>
          <Sidebar
            view={view}
            step={step}
            maxReached={maxReached}
            onSelectView={handleSelectView}
            onJump={handleJumpStep}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <TopBar view={view} step={step} dark={dark} setDark={setDark} />
            {view === "pipeline" && <ServerMonitorPanel liveUsage={serverUsage} />}
            <main style={{ flex: 1, padding: "18px 22px", overflowY: "auto", background: theme.bg }}>
              {stepComponent}
            </main>
            {view === "pipeline" ? (
              <footer style={{ background: theme.surface, borderTop: `1px solid ${theme.border}`, padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <GhostBtn disabled={step === 0} onClick={() => setStep((current) => current - 1)}>← Back</GhostBtn>
                <PrimaryBtn
                  disabled={step >= 3 ? false : !canAdvance}
                  onClick={step >= 3 ? restartPipeline : () => setStep((current) => current + 1)}
                >
                  {step >= 3 ? "Start over" : "Next →"}
                </PrimaryBtn>
              </footer>
            ) : (
              <footer style={{ background: theme.surface, borderTop: `1px solid ${theme.border}`, padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: theme.dim, fontFamily: theme.fontMono }}>
                  Task Offloading Simulation System
                </span>
                <PrimaryBtn onClick={startNewPipeline}>
                  Create New Run →
                </PrimaryBtn>
              </footer>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </ThemeCtx.Provider>
  );
};