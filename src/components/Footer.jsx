import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full py-6 mt-auto border-t border-slate-200 bg-slate-50/50 text-center">
      <div className="flex flex-col items-center justify-center space-y-1.5">
        {/* 實驗室名稱 */}
        <h4 className="text-sm font-bold text-slate-700 tracking-wide">
          Cyber Physical System Lab, NCKU.IMIS
        </h4>

        {/* 版權宣告 + Logo (水平排列) */}
        <div className="flex items-center gap-2">
          {/* 圖片嵌入 */}
          <img
            src="/cps-lab-logo.png"
            alt="CPS Lab Logo"
            className="w-6 h-6 object-contain shrink-0"
            loading="lazy"
            decoding="async"
          />

          {/* 原本的版權文字 */}
          <p className="text-xs text-slate-500 font-mono">
            Copyright &copy; 2026 NCKU CPS Lab all rights reserved.
          </p>
        </div>

        {/* 網頁管理員 */}
        <p className="text-xs text-slate-400 mt-2">
          Webmaster: ALan Lin (林宣辰)
        </p>
      </div>
    </footer>
  );
}
