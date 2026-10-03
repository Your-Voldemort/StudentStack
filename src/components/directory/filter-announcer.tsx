import styles from "./directory.module.css";

export function FilterAnnouncer({ count }: { count: number }) {
  const message =
    count === 0
      ? "No offers found"
      : `${count} ${count === 1 ? "offer" : "offers"} found`;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`sr-only ${styles.srOnly}`}
    >
      {message}
    </div>
  );
}
