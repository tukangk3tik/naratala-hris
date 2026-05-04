export function passwordScore(p: string): 0 | 1 | 2 | 3 | 4 {
  let s = 0;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4) as 0 | 1 | 2 | 3 | 4;
}

export function PasswordStrengthMeter({ password }: { password: string }): JSX.Element {
  const s = passwordScore(password);
  return (
    <div className="nt-pw-meter" aria-label="password strength" data-score={s}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} data-active={i < s} />
      ))}
    </div>
  );
}
