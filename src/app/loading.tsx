import styles from "@/components/home/brand.module.css";
import { WordmarkShimmerLoader } from "@/components/home/student-loaders";
import { passFontVariables } from "@/lib/fonts";

export default function Loading() {
  return (
    <div
      className={`${passFontVariables} ${styles.root}`}
      role="status"
      aria-busy="true"
      aria-label="Loading StudentStack"
    >
      <div
        data-studentstack-preloader
        style={{
          background: "var(--ground)",
          color: "var(--ink)",
        }}
        className="fixed inset-0 z-[120] flex flex-col items-center justify-center p-6"
      >
        <div className="w-full max-w-lg">
          <WordmarkShimmerLoader />
        </div>
      </div>
    </div>
  );
}
