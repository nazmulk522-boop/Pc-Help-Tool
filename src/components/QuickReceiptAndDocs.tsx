import React, { useState } from 'react';
import { 
  Receipt, 
  FileText, 
  Printer, 
  Plus, 
  Trash2, 
  Check, 
  Building2, 
  User, 
  Phone, 
  Calendar,
  Sparkles,
  Download
} from 'lucide-react';

interface ReceiptItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
}

export const QuickReceiptAndDocs: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'receipt' | 'doc_templates'>('receipt');

  // Receipt State
  const [shopName, setShopName] = useState('মা কম্পিউটার পয়েন্ট & ডিজিটাল স্টুডিও');
  const [shopAddress, setShopAddress] = useState('কলেজ রোড, থানা মোড়, সদর');
  const [shopMobile, setShopMobile] = useState('০১৭১২-৩৪৫৬৭৮');
  const [customerName, setCustomerName] = useState('মোঃ সুমন আহমেদ');
  const [customerPhone, setCustomerPhone] = useState('০১৮১১-২২৩৩৪৪');
  const [receiptNo, setReceiptNo] = useState(() => `REC-${Math.floor(1000 + Math.random() * 9000)}`);
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().split('T')[0]);

  const [items, setItems] = useState<ReceiptItem[]>([
    { id: '1', description: 'পাসপোর্ট সাইজ ছবি ৪R শিট প্রিন্ট', qty: 1, rate: 50 },
    { id: '2', description: 'স্মার্ট এনআইডি কার্ড কালার প্রিন্ট ও লেমিনেটিং', qty: 2, rate: 30 },
    { id: '3', description: 'সরকারি চাকরির অনলাইন আবেদন ফি জমা', qty: 1, rate: 100 },
  ]);

  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(200);

  // Document Template State
  const [selectedTemplate, setSelectedTemplate] = useState<'nid_correction' | 'lost_nid' | 'character_cert' | 'job_application'>('nid_correction');
  const [docApplicantName, setDocApplicantName] = useState('মোঃ আরিফুল ইসলাম');
  const [docFatherName, setDocFatherName] = useState('মোঃ আব্দুল কাদের');
  const [docMotherName, setDocMotherName] = useState('মোসাঃ রাবেয়া বেগম');
  const [docAddress, setDocAddress] = useState('গ্রাম: শান্তিনগর, ডাকঘর: সদর, উপজেলা: সদর, জেলা: ঢাকা');
  const [docNidNo, setDocNidNo] = useState('1994 2698 7412 3658');
  const [docIssueDetails, setDocIssueDetails] = useState('আমার বর্তমান জাতীয় পরিচয়পত্রে নামের বানান ও জন্ম তারিখে ভুল থাকায় তা সংশোধনের জন্য অনুরোধ করছি।');

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const grandTotal = Math.max(0, subtotal - discount);
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: 'ফটোকপি / প্রিন্ট সেবা', qty: 1, rate: 10 },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ReceiptItem, val: any) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handlePrintReceipt = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>ক্যাশ মেমো - ${receiptNo}</title>
          <style>
            body { font-family: 'SolaimanLipi', 'Kalpurush', sans-serif; padding: 20px; max-width: 450px; margin: 0 auto; color: #111; }
            .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 12px; }
            .shop-title { font-size: 18px; font-weight: bold; margin: 0; }
            .shop-sub { font-size: 12px; margin: 2px 0; }
            .meta-table { width: 100%; font-size: 12px; margin-bottom: 12px; }
            .meta-table td { padding: 2px 0; }
            .items-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
            .items-table th, .items-table td { border-bottom: 1px solid #ccc; padding: 6px 4px; text-align: left; }
            .items-table th:last-child, .items-table td:last-child { text-align: right; }
            .totals { width: 100%; font-size: 13px; margin-bottom: 15px; }
            .totals td { padding: 2px 0; text-align: right; }
            .footer { text-align: center; font-size: 11px; border-top: 1px dashed #666; padding-top: 8px; margin-top: 15px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="shop-title">${shopName}</h1>
            <p class="shop-sub">${shopAddress}</p>
            <p class="shop-sub">মোবাইল: ${shopMobile}</p>
            <p style="font-size: 13px; font-weight: bold; margin-top: 6px; text-decoration: underline;">ক্যাশ মেমো / মানি রিসিট</p>
          </div>

          <table class="meta-table">
            <tr>
              <td><strong>রিসিট নং:</strong> ${receiptNo}</td>
              <td style="text-align: right;"><strong>তারিখ:</strong> ${dateStr}</td>
            </tr>
            <tr>
              <td colspan="2"><strong>গ্রাহকের নাম:</strong> ${customerName} (${customerPhone})</td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th>বিবরণ</th>
                <th style="text-align: center;">পরিমাণ</th>
                <th style="text-align: right;">দর</th>
                <th>মোট</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (i) => `
                <tr>
                  <td>${i.description}</td>
                  <td style="text-align: center;">${i.qty}</td>
                  <td style="text-align: right;">৳${i.rate}</td>
                  <td>৳${i.qty * i.rate}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <table class="totals">
            <tr><td>মোট বিল:</td><td style="width: 80px;"><strong>৳${subtotal}</strong></td></tr>
            ${discount > 0 ? `<tr><td>ছাড়:</td><td>- ৳${discount}</td></tr>` : ''}
            <tr><td>সর্বমোট:</td><td><strong>৳${grandTotal}</strong></td></tr>
            <tr><td>জমা (Paid):</td><td>৳${paidAmount}</td></tr>
            <tr><td>বকেয়া (Due):</td><td><strong style="color: ${dueAmount > 0 ? '#b91c1c' : '#15803d'}">৳${dueAmount}</strong></td></tr>
          </table>

          <div class="footer">
            <p>আমাদের সেবা গ্রহণের জন্য ধন্যবাদ। আবার আসবেন!</p>
            <p style="font-size: 9px; color: #666;">সফটওয়্যার: ডিজিটাল কম্পিউটার শপ টুলকিট</p>
          </div>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  const handlePrintDoc = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    let docTitle = 'আবেদনপত্র';
    let docBody = '';

    if (selectedTemplate === 'nid_correction') {
      docTitle = 'জাতীয় পরিচয়পত্র (NID) সংশোধনের আবেদন';
      docBody = `
        <p>তারিখ: ${dateStr}</p>
        <p>বরাবর,<br/>উপজেলা / থানা নির্বাচন অফিসার,<br/>বাংলাদেশ নির্বাচন কমিশন সচিবালয়।</p>
        <p><strong>বিষয়: জাতীয় পরিচয়পত্র (NID) সংশোধন প্রসঙ্গে আবেদন।</strong></p>
        <p>জনাব,<br/>যথাবিহিত সম্মান প্রদর্শনপূর্বক বিনীত নিবেদন এই যে, আমি নিম্নে স্বাক্ষরকারী ${docApplicantName}, পিতা: ${docFatherName}, মাতা: ${docMotherName}, ঠিকানা: ${docAddress}। আমার জাতীয় পরিচয়পত্র নং: <strong>${docNidNo}</strong>।</p>
        <p>${docIssueDetails}</p>
        <p>অতএব, মহোদয়ের নিকট আকুল প্রার্থনা, উক্ত বিষয়টি বিবেচনাপূর্বক আমার জাতীয় পরিচয়পত্রের প্রয়োজনীয় তথ্য সংশোধন করে নতুন স্মার্ট কার্ড প্রদানের মর্জি হয়।</p>
        <div style="margin-top: 50px; display: flex; justify-content: space-between;">
          <div>
            <p>সংযুক্তি:<br/>১. জন্ম নিবন্ধন সনদ<br/>২. পুরাতন NID কপি<br/>৩. শিক্ষাগত যোগ্যতার সনদ</p>
          </div>
          <div style="text-align: center;">
            <p style="border-top: 1px solid #000; width: 180px; padding-top: 4px;">আবেদনকারীর স্বাক্ষর</p>
            <p>${docApplicantName}</p>
          </div>
        </div>
      `;
    } else if (selectedTemplate === 'lost_nid') {
      docTitle = 'হারানো জাতীয় পরিচয়পত্র উত্তোলনের আবেদন';
      docBody = `
        <p>তারিখ: ${dateStr}</p>
        <p>বরাবর,<br/>উপজেলা / থানা নির্বাচন অফিসার,<br/>বাংলাদেশ নির্বাচন কমিশন।</p>
        <p><strong>বিষয়: হারানো স্মার্ট কার্ড / জাতীয় পরিচয়পত্রের ডুপ্লিকেট কপির জন্য আবেদন।</strong></p>
        <p>জনাব,<br/>বিনীত নিবেদন এই যে, আমি ${docApplicantName}, পিতা: ${docFatherName}, মাতা: ${docMotherName}। আমার NID নং: ${docNidNo}। আমার জাতীয় পরিচয়পত্রটি অসাবধানতাবশত হারিয়ে গেছে। এই মর্মে স্থানীয় থানায় একটি সাধারণ ডায়েরি (GD) করা হয়েছে।</p>
        <p>অতএব, উক্ত জিডি কপি ও প্রয়োজনীয় ফি প্রদান সাপেক্ষে আমাকে একটি ডুপ্লিকেট স্মার্ট কার্ড উত্তোলনের অনুমতি প্রদানে আপনার সদয় মর্জি কামনা করছি।</p>
        <div style="margin-top: 60px; text-align: right;">
          <p style="display: inline-block; border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 4px;">আবেদনকারীর স্বাক্ষর</p>
        </div>
      `;
    } else {
      docTitle = 'চারিত্রিক ও নাগরিকত্ব সনদপত্র';
      docBody = `
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="margin: 0;">নাগরিকত্ব ও চারিত্রিক সনদপত্র</h2>
          <p style="margin: 4px 0;">স্থানীয় ইউনিয়ন পরিষদ / পৌরসভা কার্যালয়</p>
        </div>
        <p>এই মর্মে প্রত্যয়ন করা যাইতেছে যে, <strong>${docApplicantName}</strong>, পিতা: ${docFatherName}, মাতা: ${docMotherName}, গ্রাম: ${docAddress}। তিনি এই এলাকার একজন স্থায়ী বাসিন্দা।</p>
        <p>তিনি জন্মসূত্রে বাংলাদেশের একজন সুনাগরিক। আমার জানামতে তিনি কোনো প্রকার রাষ্ট্রবিরোধী বা অপরাধমূলক কর্মকাণ্ডে জড়িত নহেন। তাঁহার নৈতিক চরিত্র উত্তম।</p>
        <p>আমি তাঁহার সর্বাঙ্গীন মঙ্গল ও ভবিষ্যৎ জীবনের উন্নতি কামনা করি।</p>
        <div style="margin-top: 80px; display: flex; justify-content: space-between;">
          <p>তারিখ: ${dateStr}</p>
          <div style="text-align: center;">
            <p style="border-top: 1px solid #000; width: 180px; padding-top: 4px;">চেয়ারম্যান / কাউন্সিলর স্বাক্ষর ও সিল</p>
          </div>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            body { font-family: 'SolaimanLipi', 'Kalpurush', sans-serif; padding: 40px; font-size: 15px; line-height: 1.8; color: #111; max-width: 750px; margin: 0 auto; }
            @media print { body { padding: 25mm 20mm; } }
          </style>
        </head>
        <body>
          ${docBody}
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Sub-tab switcher */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 font-bold">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              কম্পিউটার দোকান মানি রিসিট ও দ্রুত ডকুমেন্ট প্রিন্টার
            </h2>
            <p className="text-[11px] text-slate-500">
              কাস্টমার ক্যাশ মেমো / বিল ভাউচার এবং NID সংশোধন ও অন্যান্য প্রয়োজনীয় সরকারি আবেদন ফরম।
            </p>
          </div>
        </div>

        <div className="inline-flex rounded bg-slate-100 p-0.5 border border-slate-200">
          <button
            onClick={() => setActiveSubTab('receipt')}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              activeSubTab === 'receipt' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ক্যাশ মেমো (Receipt)
          </button>
          <button
            onClick={() => setActiveSubTab('doc_templates')}
            className={`px-3 py-1 rounded text-xs font-semibold transition ${
              activeSubTab === 'doc_templates' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            আবেদন ফরম (Templates)
          </button>
        </div>
      </div>

      {activeSubTab === 'receipt' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Form Controls */}
          <div className="lg:col-span-7 space-y-4">
            {/* Shop info */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 text-xs shadow-xs">
              <h3 className="text-[11px] font-bold uppercase text-slate-500 tracking-tight flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                দোকানের তথ্য
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 text-[11px] font-semibold block mb-1">দোকানের নাম</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-600 text-[11px] font-semibold block mb-1">মোবাইল নং</label>
                  <input
                    type="text"
                    value={shopMobile}
                    onChange={(e) => setShopMobile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Customer info */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 text-xs shadow-xs">
              <h3 className="text-[11px] font-bold uppercase text-slate-500 tracking-tight flex items-center gap-1.5 pb-1 border-b border-slate-100">
                <User className="w-3.5 h-3.5 text-blue-600" />
                গ্রাহকের তথ্য
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 text-[11px] font-semibold block mb-1">গ্রাহকের নাম</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-600 text-[11px] font-semibold block mb-1">গ্রাহকের ফোন</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 text-xs shadow-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h3 className="text-[11px] font-bold uppercase text-slate-500 tracking-tight">সেবার বিবরণ ও মূল্য তালিকা</h3>
                <button
                  onClick={addItem}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  নতুন আইটেম
                </button>
              </div>

              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="সেবার নাম"
                      className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 text-xs focus:ring-0"
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))}
                      className="w-12 bg-white border border-slate-200 rounded px-1.5 py-1 text-center text-slate-800 font-semibold"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 font-bold">৳</span>
                      <input
                        type="number"
                        min="0"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', Number(e.target.value))}
                        className="w-16 bg-white border border-slate-200 rounded px-1.5 py-1 text-right text-slate-800 font-semibold"
                      />
                    </div>
                    <span className="w-16 text-right font-mono font-bold text-slate-900">
                      ৳{item.qty * item.rate}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Payment Summary Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="text-slate-600 text-[11px] font-semibold block mb-1">ছাড় (Discount ৳)</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-600 text-[11px] font-semibold block mb-1">জমা (Paid ৳)</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Preview */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3.5 shadow-xs">
              <h3 className="text-[11px] font-bold uppercase text-slate-500 tracking-tight pb-1 border-b border-slate-100">
                লাইভ মানি রিসিট প্রিভিউ
              </h3>

              <div className="bg-slate-50 text-slate-900 rounded-lg p-4 font-sans text-xs space-y-3.5 border border-slate-200">
                <div className="text-center border-b-2 border-dashed border-slate-300 pb-2.5">
                  <h4 className="font-bold text-sm text-slate-900">{shopName}</h4>
                  <p className="text-[11px] text-slate-500">{shopAddress} • {shopMobile}</p>
                  <span className="inline-block font-bold text-xs uppercase underline mt-1 text-slate-800">
                    ক্যাশ মেমো / রিসিট
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-slate-600 font-mono">
                  <span>রিসিট: <strong>{receiptNo}</strong></span>
                  <span>তারিখ: <strong>{dateStr}</strong></span>
                </div>

                <div>
                  <p className="text-[11px] text-slate-700">
                    গ্রাহক: <strong className="text-slate-900">{customerName}</strong> ({customerPhone})
                  </p>
                </div>

                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-500">
                      <th className="text-left py-1 font-semibold">বিবরণ</th>
                      <th className="text-center py-1 font-semibold">পরিমাণ</th>
                      <th className="text-right py-1 font-semibold">মোট</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id} className="border-b border-slate-200">
                        <td className="py-1 text-slate-800">{i.description}</td>
                        <td className="text-center py-1 font-mono">{i.qty}</td>
                        <td className="text-right py-1 font-mono font-bold">৳{i.qty * i.rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-slate-200 pt-2 space-y-1 text-right text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-600">মোট বিল:</span>
                    <strong className="font-mono">৳{subtotal}</strong>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>ছাড়:</span>
                      <strong className="font-mono">- ৳{discount}</strong>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold border-t border-slate-300 pt-1 text-slate-900">
                    <span>সর্বমোট:</span>
                    <span className="font-mono">৳{grandTotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>জমা (Paid):</span>
                    <span className="font-mono">৳{paidAmount}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold">
                    <span>বকেয়া (Due):</span>
                    <span className={`font-mono ${dueAmount > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}`}>
                      ৳{dueAmount}
                    </span>
                  </div>
                </div>

                <div className="text-center border-t border-dashed border-slate-300 pt-2.5 text-[10px] text-slate-500">
                  ধন্যবাদ, আবার আসবেন!
                </div>
              </div>

              <button
                onClick={handlePrintReceipt}
                className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                ক্যাশ মেমো প্রিন্ট করুন (Print Memo)
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Document Templates */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 text-xs shadow-xs">
              <h3 className="text-[11px] font-bold uppercase text-slate-500 tracking-tight pb-1 border-b border-slate-100">
                আবেদনপত্রের ধরন নির্বাচন
              </h3>
              <div className="space-y-1.5">
                {[
                  { id: 'nid_correction', label: 'জাতীয় পরিচয়পত্র (NID) ভুল সংশোধন' },
                  { id: 'lost_nid', label: 'হারানো স্মার্ট কার্ড / NID উত্তোলন' },
                  { id: 'character_cert', label: 'চেয়ারম্যান নাগরিকত্ব ও চারিত্রিক সনদ' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id as any)}
                    className={`w-full p-2.5 rounded border text-left text-xs font-bold transition ${
                      selectedTemplate === t.id
                        ? 'border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 text-xs shadow-xs">
              <h3 className="text-[11px] font-bold uppercase text-slate-500 tracking-tight pb-1 border-b border-slate-100">
                আবেদনকারীর তথ্য পূরণ
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-slate-600 text-[11px] font-semibold block mb-1">নাম</label>
                  <input
                    type="text"
                    value={docApplicantName}
                    onChange={(e) => setDocApplicantName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-600 text-[11px] font-semibold block mb-1">পিতার নাম</label>
                  <input
                    type="text"
                    value={docFatherName}
                    onChange={(e) => setDocFatherName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-600 text-[11px] font-semibold block mb-1">মাতার নাম</label>
                  <input
                    type="text"
                    value={docMotherName}
                    onChange={(e) => setDocMotherName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-600 text-[11px] font-semibold block mb-1">বর্তমান NID নম্বর</label>
                  <input
                    type="text"
                    value={docNidNo}
                    onChange={(e) => setDocNidNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-slate-600 text-[11px] font-semibold block mb-1">ঠিকানা</label>
                  <textarea
                    rows={2}
                    value={docAddress}
                    onChange={(e) => setDocAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 text-xs focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h3 className="text-[11px] font-bold uppercase text-slate-500 tracking-tight">A4 ডকুমেন্ট প্রিন্ট প্রিভিউ</h3>
                <button
                  onClick={handlePrintDoc}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  A4 প্রিন্ট করুন
                </button>
              </div>

              <div className="bg-slate-50 text-slate-900 p-6 rounded-lg shadow-xs min-h-[420px] text-xs leading-relaxed space-y-3.5 border border-slate-200">
                <p>তারিখ: {dateStr}</p>
                <p>বরাবর,<br />উপজেলা নির্বাচন অফিসার / উপযুক্ত কর্তৃপক্ষ।</p>
                <p className="font-bold underline text-slate-900">
                  বিষয়: {selectedTemplate === 'nid_correction' ? 'জাতীয় পরিচয়পত্র ভুল সংশোধনের আবেদন' : 'আবেদনপত্র'}
                </p>
                <p>
                  জনাব,<br />
                  বিনীত নিবেদন এই যে, আমি নিম্নে স্বাক্ষরকারী {docApplicantName}, পিতা: {docFatherName}, মাতা: {docMotherName}, ঠিকানা: {docAddress}। আমার NID নম্বর: {docNidNo}।
                </p>
                <p>{docIssueDetails}</p>
                <p>অতএব, প্রার্থনা এই যে বিষয়টি বিবেচনাপূর্বক প্রয়োজনীয় ব্যবস্থা গ্রহণে আপনার সদয় মর্জি হয়।</p>
                <div className="pt-10 flex justify-between">
                  <div>
                    <p className="font-bold">সংযুক্তি:</p>
                    <p>১. জন্ম নিবন্ধন সনদ</p>
                    <p>২. শিক্ষাগত যোগ্যতার সনদ</p>
                  </div>
                  <div className="text-center">
                    <p className="border-t border-slate-900 pt-1 w-36 font-semibold">আবেদনকারীর স্বাক্ষর</p>
                    <p className="font-medium text-slate-700">{docApplicantName}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
