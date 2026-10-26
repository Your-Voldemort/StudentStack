"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "@/components/home/brand.module.css";
import { login } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.cta} disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function AdminLoginForm({
  error,
  code,
  defaultEmail,
}: {
  error?: string;
  code?: string;
  defaultEmail?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordError =
    Boolean(error) &&
    (code === "invalid_password" || /password|invalid/i.test(error ?? ""));
  const isAccountError = Boolean(error) && code === "not_admin";

  const emailDescribedBy = [
    "admin-email-hint",
    isAccountError ? "admin-email-error" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const passwordDescribedBy = [
    "admin-password-hint",
    isPasswordError ? "admin-password-error" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <form action={login} className={styles.fieldStack}>
      <div className={styles.notice}>
        <h2 className={styles.panelTitle}>Sign in with your admin credentials</h2>
        <p className={styles.hint}>
          Use the email and password associated with your StudentStack moderator account.
        </p>
      </div>

      {error && (
        <p role="alert" className={styles.formError}>
          {error}
        </p>
      )}

      <div className={styles.field}>
        <label htmlFor="admin-email" className={styles.label}>
          Email
        </label>
        <p id="admin-email-hint" className={styles.hint}>
          Must be listed in ADMIN_EMAIL or granted the admin role.
        </p>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={defaultEmail}
          required
          aria-invalid={isAccountError ? true : undefined}
          aria-describedby={emailDescribedBy}
          className={styles.input}
        />
        {isAccountError && (
          <p id="admin-email-error" className={styles.fieldError}>
            This account is not authorized to access the admin dashboard.
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="admin-password" className={styles.label}>
          Password
        </label>
        <p id="admin-password-hint" className={styles.hint}>
          Your Supabase account password.
        </p>
        <div className={styles.passwordWrap}>
          <input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            aria-invalid={isPasswordError ? true : undefined}
            aria-describedby={passwordDescribedBy}
            className={`${styles.input} ${styles.passwordInput}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className={styles.passwordToggle}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {isPasswordError && (
          <p id="admin-password-error" className={styles.fieldError}>
            Password is incorrect. Check for typos or caps lock and try again.
          </p>
        )}
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
