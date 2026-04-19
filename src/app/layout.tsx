import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Learning Analytics Platform",
    template: "%s | Learning Analytics Platform",
  },
  applicationName: "Learning Analytics Platform",
  description: "EMG and ECG simulation analytics for education research",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
