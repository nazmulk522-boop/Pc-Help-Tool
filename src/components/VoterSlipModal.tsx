import React, { useRef } from 'react';
import { VoterRecord } from '../types';
import { Printer, X, Download, CheckCircle, ShieldCheck, QrCode, FileText } from 'lucide-react';

interface VoterSlipModalProps {
  voter: VoterRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VoterSlipModal: React.FC<VoterSlipModalProps> = ({ voter, isOpen, onClose }) => {
  const printRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen || !voter) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">ভোটার তথ্য ও যাচাইকরণ স্লিপ (Official Token Slip)</h3>
              <p className="text-[11px] text-slate-400">কাস্টমার ডেলিভারি ও ভেরিফিকেশন প্রিন্ট</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Voter Token Area */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
          <div
            ref={printRef}
            id="printable-voter-slip"
            className="bg-white border-2 border-slate-800 rounded-lg p-5 shadow-sm space-y-4 max-w-md mx-auto print:border-black print:p-4 print:shadow-none"
          >
            {/* Slip Official Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-slate-300">
              <div className="inline-block px-3 py-0.5 rounded bg-slate-900 text-white text-[11px] font-bold tracking-wider mb-1 print:bg-black">
                বাংলাদেশ ভোটার তথ্য সেবা স্লিপ
              </div>
              <h2 className="text-base font-black text-slate-900">জাতীয় পরিচয়পত্র ও ভোটার ভেরিফিকেশন</h2>
              <div className="text-xs text-slate-600 font-semibold mt-0.5">
                আসন: <span className="text-blue-700 font-bold print:text-black">{voter.seatNo}</span> ({voter.district} জেলা)
              </div>
            </div>

            {/* Main Key Info Box */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">ভোটার ক্রমিক নং:</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{voter.serialNo || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">ভোটার এলাকা কোড:</span>
                <span className="font-bold text-slate-900 font-mono">{voter.voterAreaCode || '০২৬১'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">ভোটার নম্বর:</span>
                <span className="font-bold text-blue-700 text-sm font-mono print:text-black">{voter.voterNo}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">এনআইডি নম্বর:</span>
                <span className="font-bold text-emerald-700 text-sm font-mono print:text-black">{voter.nidNo}</span>
              </div>
            </div>

            {/* Detailed Table Info */}
            <table className="w-full text-xs border-collapse">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-1.5 font-bold text-slate-500 w-1/3">ভোটারের নাম:</td>
                  <td className="py-1.5 font-black text-slate-900 text-sm">{voter.nameBn}</td>
                </tr>
                {voter.nameEn && (
                  <tr>
                    <td className="py-1.5 font-bold text-slate-500">Name (English):</td>
                    <td className="py-1.5 font-semibold text-slate-800 font-mono">{voter.nameEn}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1.5 font-bold text-slate-500">পিতার নাম:</td>
                  <td className="py-1.5 font-semibold text-slate-800">{voter.fatherName}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-bold text-slate-500">মাতার নাম:</td>
                  <td className="py-1.5 font-semibold text-slate-800">{voter.motherName}</td>
                </tr>
                {voter.spouseName && (
                  <tr>
                    <td className="py-1.5 font-bold text-slate-500">স্বামী / স্ত্রী:</td>
                    <td className="py-1.5 font-semibold text-slate-800">{voter.spouseName}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1.5 font-bold text-slate-500">জন্ম তারিখ:</td>
                  <td className="py-1.5 font-bold text-slate-900 font-mono">{voter.dob}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-bold text-slate-500">লিঙ্গ ও রক্ত:</td>
                  <td className="py-1.5 font-semibold text-slate-800">
                    {voter.gender === 'female' ? 'মহিলা' : 'পুরুষ'}
                    {voter.bloodGroup ? ` • গ্রুপ: ${voter.bloodGroup}` : ''}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 font-bold text-slate-500">ভোট কেন্দ্র:</td>
                  <td className="py-1.5 font-bold text-blue-800 print:text-black">{voter.pollingCenter}</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-bold text-slate-500">ঠিকানা / এলাকা:</td>
                  <td className="py-1.5 text-slate-700">
                    {voter.villageArea}, {voter.unionWard}, {voter.upazilaThana}, {voter.district}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Official Slip Footer */}
            <div className="pt-3 border-t-2 border-dashed border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-1 text-emerald-700 font-bold print:text-black">
                <ShieldCheck className="w-3.5 h-3.5" />
                যাচাইকৃত ডিজিটাল রেকর্ড
              </div>
              <div className="font-mono">
                প্রিন্ট তারিখ: {new Date().toLocaleDateString('bn-BD')}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
          >
            বন্ধ করুন
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition"
          >
            <Printer className="w-4 h-4" />
            স্লিপ প্রিন্ট করুন (Ctrl + P)
          </button>
        </div>
      </div>
    </div>
  );
};
