'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ArcsPage() {
  const [message] = useState('Arc testing UI requires sample face data to be loaded.');

  return (
    <main className="container mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <h1 className="text-3xl font-bold mb-4">Arc Testing Tool</h1>
      
      <div className="bg-gray-900 rounded-lg p-8 max-w-2xl">
        <p className="text-gray-400 mb-6">{message}</p>
        
        <h3 className="font-semibold mb-3">To use the Arc Testing tool:</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm">
          <li>Add face images and landmarks to <code className="text-blue-400">data/sample-faces.json</code></li>
          <li>The tool will render Bezier curves over facial landmarks</li>
          <li>Drag control handles to adjust curve shape</li>
          <li>Curvature Index (CI) updates in real-time</li>
        </ol>

        <div className="mt-8 p-4 bg-gray-800 rounded">
          <h4 className="font-medium mb-2">CI Formula</h4>
          <code className="text-green-400 text-sm">
            CI = mean(κ) × 10, where κ = (x&apos;y&apos;&apos; - y&apos;x&apos;&apos;) / |v|³
          </code>
        </div>
      </div>
    </main>
  );
}
