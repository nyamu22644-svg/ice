import Link from 'next/link';
import { GlobalHeader } from '@/components/navigation/GlobalHeader';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#101C2C] flex flex-col">
      <GlobalHeader />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <span className="font-mono text-4xl font-extrabold text-[#2676D2]">404</span>
        <h1 className="text-xl font-bold text-[#101C2C]">Page Not Found</h1>
        <p className="text-xs text-[#536273] max-w-sm">
          The requested identity verification resource or portal route does not exist.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-[#2676D2] hover:bg-[#1E62B0] text-white text-xs font-semibold rounded shadow-xs"
        >
          Return to Platform Home
        </Link>
      </div>
    </div>
  );
}
