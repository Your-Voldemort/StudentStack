"use client";

import { useActionState, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import styles from "@/components/home/brand.module.css";
import type { Category } from "@/lib/resources";
import { submitResource, type SubmitState } from "./actions";

const COST_OPTIONS = [
  ["free", "Free"],
  ["discount", "Discount"],
  ["credits", "Credits"],
  ["trial", "Free trial"],
  ["scholarship", "Scholarship"],
  ["stipend", "Stipend"],
] as const;

const REGION_OPTIONS = [
  ["Global", "Worldwide"],
  ["IN", "India only"],
] as const;

const initialState: SubmitState = { status: "idle" };

// Remounting with a new key is how "Add another" gets a fresh form state.
export function SubmitForm({ categories }: { categories: Category[] }) {
  const [formKey, setFormKey] = useState(0);
  return <SubmitFormInner key={formKey} categories={categories} onAddAnother={() => setFormKey((k) => k + 1)} />;
}

function SubmitFormInner({ categories, onAddAnother }: { categories: Category[]; onAddAnother: () => void }) {
  const [state, action, pending] = useActionState(submitResource, initialState);

  if (state.status === "success") {
    return (
      <div className={styles.notice} role="status">
        <h2 className={styles.panelTitle}>Thanks, it’s in the review queue</h2>
        <p>
          <strong>{state.submittedName}</strong> shows up in the directory once it’s been checked. You can follow it
          under “Your submissions”.
        </p>
        <div>
          <button type="button" className={styles.cta} onClick={onAddAnother}>
            Add another
          </button>
        </div>
      </div>
    );
  }

  const errors = state.errors ?? {};
  const values = state.values ?? {};

  return (
    <form action={action} className={styles.fieldStack} noValidate>
      {state.status === "error" && state.message && (
        <p role="alert" className={styles.formError}>
          {state.message}
        </p>
      )}

      <Field
        id="submit-name"
        name="name"
        label="Offer name"
        hint="What it’s called on the official site, like “Figma Education”."
        error={errors.name}
        defaultValue={values.name}
        maxLength={80}
        required
      />
      <Field
        id="submit-url"
        name="url"
        type="url"
        inputMode="url"
        label="Official link"
        hint="The page where students claim it, not an article about it."
        error={errors.url}
        defaultValue={values.url}
        placeholder="https://"
        required
      />
      <Field
        id="submit-tagline"
        name="tagline"
        label="One-liner (optional)"
        hint="The deal in a few words, like “Free Pro plan while you’re a student”."
        error={errors.tagline}
        defaultValue={values.tagline}
        maxLength={90}
      />
      <TextArea
        id="submit-description"
        name="description"
        label="What students get and how to claim it"
        hint="Say what’s needed to qualify: a student email, the GitHub Student Pack, an ID upload, or nothing."
        error={errors.description}
        defaultValue={values.description}
        rows={5}
        maxLength={600}
        required
      />

      <div className={styles.fieldRow}>
        <Select
          id="submit-category"
          name="categoryId"
          label="Category"
          error={errors.categoryId}
          defaultValue={values.categoryId ?? ""}
          required
        >
          <option value="" disabled>
            Choose one
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Select
          id="submit-cost"
          name="costType"
          label="Type of offer"
          error={errors.costType}
          defaultValue={values.costType ?? ""}
          required
        >
          <option value="" disabled>
            Choose one
          </option>
          {COST_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select id="submit-region" name="region" label="Where it works" defaultValue={values.region ?? "Global"}>
          {REGION_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <button type="submit" className={styles.cta} disabled={pending}>
          {pending ? "Sending…" : "Send for review"}
        </button>
      </div>
    </form>
  );
}

type FieldChrome = { id: string; label: string; hint?: string; error?: string };

function describedBy({ id, hint, error }: FieldChrome) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

function FieldFrame({ id, label, hint, error, children }: FieldChrome & { children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

function Field({ id, label, hint, error, ...input }: FieldChrome & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id, label, hint, error })}
        {...input}
      />
    </FieldFrame>
  );
}

function TextArea({ id, label, hint, error, ...textarea }: FieldChrome & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        className={`${styles.input} ${styles.textarea}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id, label, hint, error })}
        {...textarea}
      />
    </FieldFrame>
  );
}

function Select({ id, label, hint, error, children, ...select }: FieldChrome & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id, label, hint, error })}
        {...select}
      >
        {children}
      </select>
    </FieldFrame>
  );
}
