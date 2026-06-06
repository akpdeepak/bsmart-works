// Field — a labelled form-control wrapper extracted from the App.jsx monolith. Implicit label
// association (D3/E1): wrapping the control in the <label> ties the visible label to it for
// assistive tech without needing an id on every call site. The label text is a block <span> so the
// visual layout is unchanged.
export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{label}</span>
      {children}
    </label>
  );
}
