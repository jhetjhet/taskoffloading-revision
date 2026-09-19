import React, { useCallback, useMemo, useState } from "react";
import { ErrorBoundary, GhostBtn, PrimaryBtn } from "./common";
import { Sidebar, TopBar } from "./layout";
import { ServerMonitorPanel } from "./servers";
import { ThemeCtx, buildGlobalStyles, makeTheme } from "../context/ThemeContext";
import Step0Machine from "./steps/Step0Machine";
import { Step1CollectData } from "./steps/Step1CollectData";
import { Step2Algorithms } from "./steps/Step2Algorithms";
import { Step4Reports } from "./steps/Step4Reports";

export const AppShell = () => {
  const [dark, setDark] = useState(true);
  const theme = makeTheme(dark);
  const globalStyles = useMemo(() => buildGlobalStyles(theme), [theme]);
  const [step, setStep] = useState(0);
  const [machine, setMachine] = useState(null);
  const [machineTasks, setMachineTasks] = useState([]);
  const [batchTasks, setBatchTasks] = useState([]);
  const [serverUsage, setServerUsage] = useState({});
  const [report, setReport] = useState(null);

  const sameBatch = (current, next) => (
    current.length === next.length
    && current.every((task, index) => task.task_id === next[index]?.task_id)
  );

  const handleMachineSelection = useCallback((selectedMachine, tasks) => {
    setMachine((current) => current?.id === selectedMachine?.id ? current : selectedMachine);
    setMachineTasks((current) => sameBatch(current, tasks) ? current : tasks);
    setBatchTasks((current) => current.length === 0 ? current : []);
  }, []);

  const handleBatchChange = useCallback((tasks) => {
    setBatchTasks((current) => sameBatch(current, tasks) ? current : tasks);
  }, []);

  const handleServerUsage = useCallback((event) => {
    setServerUsage((current) => ({ ...current, [event.server_id]: event }));
  }, []);

  const handleReportReady = useCallback((nextReport) => {
    setReport(nextReport);
  }, []);

  const stepComponent = useMemo(() => {
    switch (step) {
      case 0:
        return <Step0Machine onSelectionChange={handleMachineSelection} />;
      // Add other steps here as needed
      case 1:
        return <Step1CollectData machine={machine} tasks={machineTasks} onBatchChange={handleBatchChange} />;
      case 2:
        return <Step2Algorithms machine={machine} tasks={batchTasks} onServerUsage={handleServerUsage} onReportReady={handleReportReady} />;
      case 3:
        return <Step4Reports report={report} />;
      default:
        return null;
    }
  }, [batchTasks, handleBatchChange, handleMachineSelection, handleReportReady, handleServerUsage, machine, machineTasks, report, step]);

  return (
    <ThemeCtx.Provider value={theme}>
      <ErrorBoundary>
        <style>{globalStyles}</style>
        <div style={{ display: "flex", minHeight: "100vh", background: theme.bg, color: theme.text }}>
          <Sidebar step={step} onJump={setStep} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <TopBar step={step} onJump={setStep} dark={dark} setDark={setDark} />
            <ServerMonitorPanel liveUsage={serverUsage} />
            <main style={{ flex: 1, padding: "18px 22px", overflowY: "auto", background: theme.bg }}>
              {/* {machine && <MainSimulationPipeline activeIdx={derivePipelineStage({ machine, algoRunning: simulation.algoRunning, gbfsData: simulation.gbfsData, psoData: simulation.psoData, offloadResult: simulation.offloadResult, step })} />} */}
              {stepComponent}


              {/* <div key={step} className="app-fade-in">{renderStep()}</div> */}
            </main>
            <footer style={{ background: theme.surface, borderTop: `1px solid ${theme.border}`, padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <GhostBtn disabled={step === 0} onClick={() => setStep((current) => current - 1)}>← Back</GhostBtn>
              {/* <span style={{ fontSize: 14, color: theme.dim, fontFamily: theme.fontMono }}>{STEPS[step].title}</span> */}
              <PrimaryBtn disabled={step >= 3} onClick={() => setStep((current) => current + 1)}>{step >= 3 ? "Complete" : "Next →"}</PrimaryBtn>
            </footer>
          </div>
        </div>
      </ErrorBoundary>
    </ThemeCtx.Provider>
  );
};