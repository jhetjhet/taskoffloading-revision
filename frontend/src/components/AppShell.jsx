import React, { useEffect, useMemo, useState } from "react";
import { ErrorBoundary, GhostBtn, PrimaryBtn } from "./common";
import { MainSimulationPipeline, Sidebar, TopBar } from "./layout";
import { Step0Machine } from "./steps/Step0Machine";
import { Step1CollectData } from "./steps/Step1CollectData";
import { Step2Algorithms } from "./steps/Step2Algorithms";
import { Step5Latency } from "./steps/Step5Latency";
import { ThemeCtx, buildGlobalStyles, makeTheme } from "../context/ThemeContext";
import { useMachines } from "../hooks/useMachines";
import { useSimulationRunner } from "../hooks/useSimulationRunner";
import { loadHistory, saveHistory } from "../utils/api";
import { STEPS, applyWorkloadTier, derivePipelineStage, filterTasksByWorkload } from "../config/constants";
import { DEFAULT_TASKS_BY_MACHINE } from "../taskData";

export const AppShell = () => {
  const [dark, setDark] = useState(true);
  const theme = makeTheme(dark);
  const globalStyles = useMemo(() => buildGlobalStyles(theme), [theme]);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [workload, setWorkload] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const machines = useMachines();

  useEffect(() => saveHistory(history), [history]);

  const rawMachine = machines.selectedId ? machines.machineData[machines.selectedId] : null;
  const machine = applyWorkloadTier(rawMachine, workload);
  const allTasks = DEFAULT_TASKS_BY_MACHINE[rawMachine?.machineId] || [];
  const tasks = filterTasksByWorkload(allTasks, workload);
  const simulation = useSimulationRunner({ machine, tasks, workload, setHistory });
  const decidedServer = useMemo(() => {
    if (!simulation.gbfsData || !simulation.psoData) return null;
    return (simulation.gbfsData.latency <= simulation.psoData.latency ? simulation.gbfsData : simulation.psoData).recommendedServer;
  }, [simulation.gbfsData, simulation.psoData]);

  const selectMachine = (id) => {
    machines.setSelectedId(id);
    simulation.resetRun();
    setWorkload(null);
    setStep(0);
    setMaxReached(0);
  };
  const selectWorkload = (tier) => {
    setWorkload(tier);
    simulation.resetRun();
    setMaxReached((current) => Math.min(current, 1));
  };
  const progress = (event) => {
    if (event === "algorithms-done") setMaxReached((current) => Math.max(current, 2));
    if (event === "offload-done") setMaxReached((current) => Math.max(current, 3));
  };
  const runAlgorithms = () => simulation.runBothAlgorithms({ onProgress: progress });
  const retryOffload = () => simulation.retryOffload({ onProgress: progress });
  const canNext = step === 0 ? Boolean(machines.selectedId) : step === 1 ? tasks.length > 0 : step === 2 ? Boolean(simulation.offloadResult) : true;
  const next = () => {
    const nextStep = step + 1;
    setStep(nextStep);
    setMaxReached((current) => Math.max(current, nextStep));
  };

  const renderStep = () => {
    if (step === 0) return <Step0Machine {...machines} setSelectedId={selectMachine} onRetry={machines.loadMachines} />;
    if (!machine) return null;
    if (step === 1) return <Step1CollectData machine={machine} workload={workload} setWorkload={selectWorkload} tasks={tasks} />;
    if (step === 2) return <Step2Algorithms machine={machine} tasks={tasks} workload={workload} {...simulation} onRunBoth={runAlgorithms} onRetryOffload={retryOffload} />;
    return <Step5Latency machine={machine} workload={workload} history={history} {...simulation} />;
  };

  return (
    <ThemeCtx.Provider value={theme}>
      <ErrorBoundary>
        <style>{globalStyles}</style>
        <div style={{ display: "flex", minHeight: "100vh", background: theme.bg, color: theme.text }}>
          <Sidebar step={step} maxReached={maxReached} onJump={setStep} serverStatuses={machines.serverStatuses} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <TopBar step={step} maxReached={maxReached} onJump={setStep} algoDecision={decidedServer} dark={dark} setDark={setDark} workload={workload} />
            <main style={{ flex: 1, padding: "18px 22px", overflowY: "auto", background: theme.bg }}>
              {machine && <MainSimulationPipeline activeIdx={derivePipelineStage({ machine, algoRunning: simulation.algoRunning, gbfsData: simulation.gbfsData, psoData: simulation.psoData, offloadResult: simulation.offloadResult, step })} />}
              <div key={step} className="app-fade-in">{renderStep()}</div>
            </main>
            <footer style={{ background: theme.surface, borderTop: `1px solid ${theme.border}`, padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <GhostBtn disabled={step === 0} onClick={() => setStep((current) => current - 1)}>← Back</GhostBtn>
              <span style={{ fontSize: 14, color: theme.dim, fontFamily: theme.fontMono }}>{STEPS[step].title}</span>
              <PrimaryBtn disabled={!canNext || step >= 3} onClick={next}>{step >= 3 ? "Complete" : "Next →"}</PrimaryBtn>
            </footer>
          </div>
        </div>
      </ErrorBoundary>
    </ThemeCtx.Provider>
  );
};