let admission;
export function setAdmission(value) { admission = value; }
export function takeAdmission() { const value = admission; admission = null; return value; }
