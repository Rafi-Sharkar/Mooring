import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Dockhand — Docker Fleet Monitor',
  description:
    'Centralized monitoring dashboard for Docker containers across your entire fleet. Track status, resources, and health in real-time.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}