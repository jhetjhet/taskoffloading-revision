import React from "react";
import { useT } from "../../context/ThemeContext";

export const TableRow = ({ cells, isOdd }) => {
  const T = useT();
  return (
    <tr
      className="app-row"
      style={{
        background: isOdd ? T.elevated : T.surface,
        borderBottom: `1px solid ${T.borderSub}`,
        transition: "background 0.12s",
      }}
    >
      {cells.map((c, i) => (
        <td
          key={i}
          style={{
            padding: "9px 12px",
            fontSize: 12,
            color: i === 0 ? T.text : T.muted,
            fontFamily: i === 0 ? T.fontSans : T.fontMono,
            fontWeight: i === 0 ? 600 : 400,
          }}
        >
          {c}
        </td>
      ))}
    </tr>
  );
};

export const Th = ({ children }) => {
  const T = useT();
  return (
    <th
      style={{
        padding: "8px 12px",
        textAlign: "left",
        fontSize: 11,
        fontFamily: T.fontSans,
        fontWeight: 600,
        color: T.muted,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        borderBottom: `1px solid ${T.border}`,
        background: T.surface,
      }}
    >
      {children}
    </th>
  );
};

export const EvalTh = ({ children }) => {
  const T = useT();
  return (
    <th
      style={{
        padding: "6px 8px",
        textAlign: "left",
        fontSize: 10,
        fontFamily: T.fontSans,
        fontWeight: 600,
        color: T.dim,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      {children}
    </th>
  );
};

