import React, { useEffect, useMemo, useState } from "react";
import { ErrorBoundary, GhostBtn, PrimaryBtn } from "./common";
import { Sidebar, TopBar } from "./layout";
import { ThemeCtx, buildGlobalStyles, makeTheme } from "../context/ThemeContext";

export const AppShell = () => {
  const [dark, setDark] = useState(true);
  const theme = makeTheme(dark);
  const globalStyles = useMemo(() => buildGlobalStyles(theme), [theme]);
  const [step, setStep] = useState(0);
console.log("asdasdasdasdasd");
  return (
    <ThemeCtx.Provider value={theme}>
      <ErrorBoundary>
        <style>{globalStyles}</style>
        <div style={{ display: "flex", minHeight: "100vh", background: theme.bg, color: theme.text }}>
          <Sidebar step={step} onJump={setStep} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <TopBar step={step} onJump={setStep} dark={dark} setDark={setDark} />
            <main style={{ flex: 1, padding: "18px 22px", overflowY: "auto", background: theme.bg }}>
              {/* {machine && <MainSimulationPipeline activeIdx={derivePipelineStage({ machine, algoRunning: simulation.algoRunning, gbfsData: simulation.gbfsData, psoData: simulation.psoData, offloadResult: simulation.offloadResult, step })} />} */}
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