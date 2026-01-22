import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FaceIQ ML Sandbox',
  description: 'Arc testing and ML training environment',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
