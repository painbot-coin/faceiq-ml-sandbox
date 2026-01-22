import Link from 'next/link';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">FaceIQ ML Sandbox</h1>
      
      <p className="text-gray-400 mb-8 max-w-2xl">
        This sandbox contains tools for understanding facial curvature analysis 
        and training ML models to detect angularity features.
      </p>

      <div className="grid gap-6 md:grid-cols-2 max-w-2xl">
        <Link 
          href="/arcs"
          className="block p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">Arc Testing Tool</h2>
          <p className="text-gray-400 text-sm">
            Interactive Bezier curve editor. Adjust handles and see Curvature Index (CI) 
            values update in real-time.
          </p>
        </Link>

        <Link 
          href="/morphs"
          className="block p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-amber-500 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">Angularity Morphs</h2>
          <p className="text-gray-400 text-sm">
            View 40-frame morph sequences showing the 0-10 angularity spectrum 
            for jaw, cheek, chin, and submental features.
          </p>
        </Link>
      </div>

      <div className="mt-12 p-6 bg-gray-900/50 rounded-lg max-w-2xl">
        <h3 className="font-semibold mb-3">Getting Started</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm">
          <li>Copy morph videos from main repo to <code className="text-blue-400">public/morphs/</code></li>
          <li>Add sample face data to <code className="text-blue-400">data/sample-faces.json</code></li>
          <li>Use the Arc Testing tool to understand curvature calculations</li>
          <li>Use the Morphs viewer to see labeled angularity examples</li>
        </ol>
      </div>
    </main>
  );
}
