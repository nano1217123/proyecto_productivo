export const metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }) {
  return <div className="auth-ui">{children}</div>;
}
