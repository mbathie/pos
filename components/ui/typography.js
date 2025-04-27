export function TypographyH1({ className = "", children }) {
  return <h1 className={`scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl ${className}`}>{children}</h1>;
}

export function TypographyH2({ className = "", children }) {
  return <h2 className={`scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0 ${className}`}>{children}</h2>;
}

export function TypographyH3({ className = "", children }) {
  return <h3 className={`scroll-m-20 text-2xl font-semibold tracking-tight ${className}`}>{children}</h3>;
}

export function TypographyH4({ className = "", children }) {
  return <h4 className={`scroll-m-20 text-xl font-semibold tracking-tight ${className}`}>{children}</h4>;
}

export function TypographyP({ className = "", children }) {
  return <p className={`leading-7 [&:not(:first-child)]:mt-6 ${className}`}>{children}</p>;
}

export function TypographyBlockquote({ className = "", children }) {
  return <blockquote className={`mt-6 border-l-2 pl-6 italic ${className}`}>{children}</blockquote>;
}

export function TypographyLead({ className = "", children }) {
  return <p className={`text-xl text-gray-500 dark:text-gray-400 ${className}`}>{children}</p>;
}

export function TypographyLarge({ className = "", children }) {
  return <p className={`text-lg font-semibold ${className}`}>{children}</p>;
}

export function TypographySmall({ className = "", children }) {
  return <small className={`text-sm font-medium leading-none ${className}`}>{children}</small>;
}

export function TypographyMuted({ className = "", children }) {
  return <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>{children}</p>;
}