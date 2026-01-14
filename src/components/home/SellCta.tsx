import Link from "next/link";
import { PlusCircle, Shield, MessageSquare, TrendingUp } from "lucide-react";

export default function SellCta() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-4 sm:p-8 shadow-lg">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>
      
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-yellow-400 flex items-center justify-center text-black font-extrabold text-xl sm:text-2xl shadow-lg">
              £
            </div>
            <div>
              <h3 className="text-xl sm:text-3xl font-bold text-white">Sell your parts in minutes</h3>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5">Create a listing, get buyers, and cash out securely with Stripe.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4">
            <div className="flex items-start gap-2 text-white">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-semibold">Detailed categories</p>
                <p className="text-[11px] sm:text-xs text-blue-200">To help you sell faster</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-white">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-semibold">Offer & chat built-in</p>
                <p className="text-[11px] sm:text-xs text-blue-200">Negotiate with buyers</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-white">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm font-semibold">Boost exposure</p>
                <p className="text-[11px] sm:text-xs text-blue-200">Reach more buyers</p>
              </div>
            </div>
          </div>
        </div>
        
        <Link
          href="/sell"
          className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-yellow-400 text-black px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-bold hover:bg-yellow-300 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          List a part
        </Link>
      </div>
    </div>
  );
}
