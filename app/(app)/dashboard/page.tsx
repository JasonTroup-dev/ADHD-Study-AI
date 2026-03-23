import Link from 'next/link';
import SignOutButton from "@/components/SignOutButton";

export default function DashboardPage() {
  return (
    //main screen
    <div className="h-full w-full border border-amber-700">

      {/* Top Bar */}
      <div className="flex justify-end p-4">
        <SignOutButton />
      </div>

      {/*Todays Focus & Study Tools container*/}
      <div className="flex justify-between h-3/5 m-8  border border-amber-300">
        {/*Todays Focus*/}
        <div className="h-full w-6/12 border border-green-500">
          Todays Focus
        </div>

        {/*Study Tools*/}
        <div className="h-full w-6/12 border border-green-500">
          Study Tools
        </div>
      </div>

      {/*Streak/Stats & Current Classes container*/}
      <div className="flex flex-column h-1/5 m-8 border border-amber-200">
        {/*Stats/Streak*/}
        <div className="h-full w-6/12 border border-green-500">
          Stats/Streak
        </div>

        {/*Current Classes*/}
        <div className="h-full w-6/12 border border-green-500">
          Current Classes
        </div>
      </div>
    </div>
  );
}