import type { SVGProps } from "react";

export function LogoMark({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path
        d="M23 9H49.5C53.0899 9 56 11.9101 56 15.5C56 19.0899 53.0899 22 49.5 22H36L23 9Z"
        fill="currentColor"
      />
      <path
        d="M18 9H30L18 21L35 38H23L9.5 24.5C7.567 22.567 7.567 19.433 9.5 17.5L18 9Z"
        fill="#F7A61C"
      />
      <path
        d="M46 55H34L46 43L29 26H41L54.5 39.5C56.433 41.433 56.433 44.567 54.5 46.5L46 55Z"
        fill="currentColor"
      />
      <path
        d="M41 55H14.5C10.9101 55 8 52.0899 8 48.5C8 44.9101 10.9101 42 14.5 42H28L41 55Z"
        fill="currentColor"
      />
    </svg>
  );
}
