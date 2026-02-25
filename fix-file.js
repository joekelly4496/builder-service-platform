const fs = require('fs');
const content = "use client";

interface RequestActionsProps {
  requestId: string;
}

export default function RequestActions({ requestId }: RequestActionsProps) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      
        href={\/api/ical/request/\\}
        download
        className="block w-full px-4 py-3 bg-slate-100 text-slate-800 rounded-xl hover:bg-slate-200 transition-all duration-200 font-semibold text-center"
      >
        Download .ics File
      </a>
      <p className="text-xs text-slate-500 mt-2 text-center font-medium">
        Add this appointment to your calendar
      </p>
    </div>
  );
}
;
fs.writeFileSync('app/dashboard/requests/[id]/RequestActions.tsx', content);
console.log('Done!');
