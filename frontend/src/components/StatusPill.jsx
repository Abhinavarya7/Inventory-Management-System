export default function StatusPill({ children, tone = "default" }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

