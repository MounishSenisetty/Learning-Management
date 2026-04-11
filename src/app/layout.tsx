import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning Analytics Platform",
  description: "EMG and ECG simulation analytics for education research",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
