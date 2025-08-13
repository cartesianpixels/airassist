import { Plane } from 'lucide-react';

export function AirAssistLogo() {
  return (
    <div className="flex items-center gap-2.5 font-bold text-lg tracking-tighter text-primary">
      <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-md">
        <Plane className="h-5 w-5" />
      </div>
      <span className="text-foreground">AirAssist</span>
    </div>
  );
}
