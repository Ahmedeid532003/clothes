/**
 * Restore report toolbars from mozafen, then rebuild with balanced extracts.
 */
const fs = require('fs');

const filePath = 'c:/Users/DELL/OneDrive/Desktop/clothes-main/employees-v13/components/EmployeesTab.tsx';
const goodPath = 'c:/Users/DELL/OneDrive/Desktop/clothes-main/components/additions/mozafen/EmployeesTab.tsx';

const MARKER = '{/* Advanced Controls Toolbar */}';
const END_MARKERS = [
  '{/* KPI Summaries and Data Table */}',
  '{/* KPIs & Results Grid */}',
];

function extractToolbars(text) {
  const blocks = [];
  let from = 0;
  while (true) {
    const start = text.indexOf(MARKER, from);
    if (start === -1) break;
    let endPos = Infinity;
    for (const m of END_MARKERS) {
      const p = text.indexOf(m, start + MARKER.length);
      if (p !== -1 && p < endPos) endPos = p;
    }
    if (endPos === Infinity) {
      const candidates = [
        text.indexOf('\n                  {(() => {', start + 200),
        text.indexOf('\n              {(() => {', start + 200),
      ].filter((x) => x !== -1);
      endPos = candidates.sort((a, b) => a - b)[0];
      if (endPos == null) throw new Error('no end');
    }
    blocks.push({ start, end: endPos, body: text.slice(start, endPos) });
    from = endPos;
  }
  return blocks;
}

/** Find end index (inclusive) of an opening/self-closing tag starting at `<div` */
function findTagEnd(str, start) {
  // start points at '<'
  let i = start + 1;
  let brace = 0;
  let quote = null;
  while (i < str.length) {
    const ch = str[i];
    if (quote) {
      if (ch === quote && str[i - 1] !== '\\') quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      i++;
      continue;
    }
    if (ch === '{') {
      brace++;
      i++;
      continue;
    }
    if (ch === '}') {
      brace = Math.max(0, brace - 1);
      i++;
      continue;
    }
    if (brace === 0 && ch === '>') {
      return i;
    }
    i++;
  }
  return -1;
}

function matchDivFrom(str, from) {
  const divStart = str.indexOf('<div', from);
  if (divStart === -1) return null;
  let depth = 0;
  let i = divStart;
  while (i < str.length) {
    if (str.startsWith('</div>', i)) {
      depth--;
      i += 6;
      if (depth === 0) return { start: divStart, end: i, html: str.slice(divStart, i) };
      continue;
    }
    if (str.startsWith('<div', i)) {
      const gt = findTagEnd(str, i);
      if (gt === -1) return null;
      const slice = str.slice(i, gt + 1);
      const selfClosing = /\/\s*>$/.test(slice);
      if (selfClosing) {
        i = gt + 1;
        continue;
      }
      depth++;
      i = gt + 1;
      continue;
    }
    i++;
  }
  return null;
}

function divBalance(html) {
  let opens = 0;
  let closes = 0;
  let i = 0;
  while (i < html.length) {
    if (html.startsWith('</div>', i)) {
      closes++;
      i += 6;
      continue;
    }
    if (html.startsWith('<div', i)) {
      const gt = findTagEnd(html, i);
      if (gt === -1) break;
      const slice = html.slice(i, gt + 1);
      if (!/\/\s*>$/.test(slice)) opens++;
      i = gt + 1;
      continue;
    }
    i++;
  }
  return { opens, closes, ok: opens === closes };
}

function trimToBalance(html) {
  // Only strip trailing extra closes — never invent closes (avoids breaking JSX)
  let out = html;
  let { opens, closes } = divBalance(out);
  while (closes > opens) {
    const idx = out.lastIndexOf('</div>');
    if (idx === -1) break;
    out = out.slice(0, idx) + out.slice(idx + 6);
    closes--;
  }
  return out;
}

function extractBranch(body, openSetter) {
  const commentMarkers = ['{/* Top Row: Branch Dropdown', '{/* Top Row: Branch', '{/* Branch Dropdown'];
  let commentIdx = -1;
  for (const m of commentMarkers) {
    const i = body.indexOf(m);
    if (i !== -1) {
      commentIdx = i;
      break;
    }
  }
  const bottomMarkers = ['{/* Bottom Row:', '{/* Toggle View', 'Toggle View Mode Button', 'Toggle View Button'];
  let endIdx = -1;
  if (commentIdx !== -1) {
    for (const m of bottomMarkers) {
      const i = body.indexOf(m, commentIdx + 10);
      if (i !== -1 && (endIdx === -1 || i < endIdx)) endIdx = i;
    }
  }

  if (commentIdx !== -1 && endIdx !== -1) {
    const region = body.slice(commentIdx, endIdx);
    const divStartInBody = body.indexOf('<div', commentIdx);
    if (divStartInBody !== -1 && divStartInBody < endIdx) {
      const m = matchDivFrom(body, divStartInBody);
      if (m && m.end <= endIdx + 10) {
        return trimToBalance(m.html);
      }
    }
    // Fallback: take first div region textually until last balanced point before bottom
    const divStart = region.indexOf('<div');
    if (divStart !== -1) {
      const m2 = matchDivFrom(region, divStart);
      if (m2) return trimToBalance(m2.html);
    }
  }

  const idx = body.indexOf(openSetter);
  if (idx === -1) return null;
  const rel = body.lastIndexOf('className="relative w-full"', idx);
  if (rel === -1) return null;
  const m = matchDivFrom(body, body.lastIndexOf('<div', rel));
  if (!m) return null;
  if (m.html.length > 8000) return null;
  return trimToBalance(m.html);
}

function extractSettings(body, settingsOpenVar) {
  const candidates = [];
  let searchFrom = 0;
  while (true) {
    const rel = body.indexOf('className="relative', searchFrom);
    if (rel === -1) break;
    const divStart = body.lastIndexOf('<div', rel);
    const matched = matchDivFrom(body, divStart);
    if (
      matched &&
      matched.html.includes(settingsOpenVar) &&
      matched.html.includes('<Settings') &&
      (matched.html.includes('checkbox') || matched.html.includes('اختر الأعمدة') || matched.html.includes('Choose Columns'))
    ) {
      candidates.push(matched);
    }
    searchFrom = rel + 10;
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.html.length - b.html.length);
  return trimToBalance(candidates[0].html);
}

function extractCards(body, viewModeVar) {
  const candidates = [];
  let searchFrom = 0;
  while (true) {
    const lg = body.indexOf('<LayoutGrid', searchFrom);
    if (lg === -1) break;
    let start = body.lastIndexOf('<div', lg);
    const groupIdx = body.lastIndexOf('relative group', lg);
    if (groupIdx !== -1 && lg - groupIdx < 200) start = body.lastIndexOf('<div', groupIdx);
    const matched = matchDivFrom(body, start);
    if (matched && matched.html.includes(viewModeVar) && matched.html.includes('LayoutGrid') && matched.html.length < 2500) {
      candidates.push(matched);
    }
    searchFrom = lg + 10;
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.html.length - b.html.length);
  return trimToBalance(candidates[0].html);
}

function restyleCards(html) {
  let h = html
    .replace(/className="relative group[^"]*"/g, 'className="relative group/toggle shrink-0"')
    .replace(/ClipboardList/g, 'List')
    .replace(/w-full flex items-center justify-center gap-2 p-2/g, 'flex items-center justify-center gap-1.5 p-2 px-3')
    .replace(/h-\[38px\] active:scale-\[0\.98\] shadow-xs/g, 'min-h-[36px] text-[11px] font-black')
    .replace(/text-slate-655/g, 'text-slate-650')
    .replace(/group-hover:block bg-slate-800/g, 'group-hover/toggle:block bg-slate-800')
    .replace(/<LayoutGrid size=\{14\} className="text-\[#0a1945\]" \/>/g, '<LayoutGrid size={14} className="text-orange-500" />')
    .replace(/border-slate-200/g, 'border-gray-300');
  if (!h.includes("style={{ height: '36px' }}")) {
    h = h.replace(/<button(\s+)/, "<button\n                            style={{ height: '36px' }}$1");
  }
  return trimToBalance(h);
}

function restyleSettings(html) {
  let h = html
    .replace(/className="relative flex-1"/g, 'className="relative group/settings shrink-0"')
    .replace(/className="relative"/g, 'className="relative group/settings shrink-0"')
    .replace(/w-full flex items-center justify-center gap-2 p-2/g, 'flex items-center justify-center p-2')
    .replace(/h-\[38px\] active:scale-\[0\.98\] shadow-xs/g, 'min-h-[36px] w-[36px]')
    .replace(/text-slate-655/g, 'text-slate-650')
    .replace(/border-slate-200/g, 'border-gray-300')
    .replace(
      /(<Settings size=\{14\} className="text-orange-500)(" \/>)\s*<span className="text-\[11px\][^>]*>[\s\S]*?<\/span>/,
      '$1 animate-spin-hover$2'
    );
  if (!h.includes("style={{ height: '36px' }}")) {
    h = h.replace(/<button(\s+)/, "<button\n                            style={{ height: '36px' }}$1");
  }
  return trimToBalance(h);
}

function restyleBranch(html) {
  if (!html) return '';
  return trimToBalance(
    html
      .replace(/className="relative w-full"/, 'className="relative shrink-0"')
      .replace(/w-full flex items-center justify-between gap-2 px-4 py-2/g, 'flex items-center justify-between gap-2 px-3 py-2 max-w-[160px]')
      .replace(/h-\[38px\]/g, 'h-[36px] min-h-[36px]')
      .replace(/absolute right-0 left-0 mt-2 w-full/g, 'absolute end-0 mt-2 w-56')
      .replace(/border-slate-200/g, 'border-gray-300')
  );
}

function buildDateRange(cfg, pad) {
  const clearExtra = cfg.clearDatesExtra || '';
  const onStart = cfg.onStartChange || `e => ${cfg.setDateStart}(e.target.value)`;
  const onEnd = cfg.onEndChange || `e => ${cfg.setDateEnd}(e.target.value)`;
  return `${pad}<div className="flex items-center gap-1 bg-white border border-gray-300 rounded-xl px-2.5 shadow-xs select-none h-[36px] w-auto max-w-[220px] font-bold leading-6 text-base shrink-0">
${pad}  <Calendar size={13} className="text-orange-500 shrink-0" />
${pad}  <div className="flex items-center gap-0.5 min-w-0 flex-1">
${pad}    <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'من' : 'From'}</span>
${pad}    <input type="date" value={${cfg.dateStart}} onChange={${onStart}} className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0" />
${pad}  </div>
${pad}  <div className="w-[1px] h-3.5 bg-slate-200 shrink-0 mx-1" />
${pad}  <div className="flex items-center gap-0.5 min-w-0 flex-1">
${pad}    <span className="text-[9px] font-extrabold text-slate-400 uppercase shrink-0">{lang === 'ar' ? 'إلى' : 'To'}</span>
${pad}    <input type="date" value={${cfg.dateEnd}} onChange={${onEnd}} className="text-[10px] font-sans font-bold text-slate-700 bg-transparent outline-none border-none w-full cursor-pointer focus:text-orange-600 p-0" />
${pad}  </div>
${pad}  {(${cfg.dateStart} || ${cfg.dateEnd}) && (
${pad}    <button onClick={() => { ${cfg.setDateStart}(''); ${cfg.setDateEnd}(''); ${clearExtra} }} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition cursor-pointer shrink-0" title={lang === 'ar' ? 'مسح التاريخ' : 'Clear dates'}>
${pad}      <X size={11} />
${pad}    </button>
${pad}  )}
${pad}</div>`;
}

function buildToolbar(indent, cfg, pieces) {
  const pad = indent;
  const { branchHtml, cardsHtml, settingsHtml } = pieces;
  return `${pad}{/* Advanced Controls Toolbar */}
${pad}<div className="bg-white border-4 border-white rounded-2xl overflow-visible shadow-md relative mb-4">
${pad}  <div className="p-3.5 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center rtl:flex-row-reverse gap-3.5 min-h-[48px] h-auto">
${pad}    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md" style={{ direction: 'ltr' }}>
${pad}      <div className="relative flex-1 flex items-center min-w-0">
${pad}        <Search size={14} className="absolute left-3 rtl:right-3 rtl:left-auto text-slate-400 pointer-events-none" />
${pad}        <input
${pad}          type="text"
${pad}          value={${cfg.searchValue}}
${pad}          onChange={${cfg.searchOnChange}}
${pad}          placeholder={${cfg.placeholder}}
${pad}          style={{ height: '36px' }}
${pad}          className="w-full text-xs p-2 pl-8 pr-8 rtl:pr-8 rtl:pl-8 bg-white border border-gray-300 rounded-xl outline-none focus:border-orange-400 transition h-[36px]"
${pad}        />
${pad}        {${cfg.searchValue} && (
${pad}          <button
${pad}            onClick={${cfg.clearOnClick}}
${pad}            className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 -translate-y-1/2 p-0.5 text-slate-450 hover:text-orange-500 rounded-lg hover:bg-slate-100 transition cursor-pointer"
${pad}            title={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
${pad}          >
${pad}            <X size={13} />
${pad}          </button>
${pad}        )}
${pad}      </div>
${pad}      <div className="relative group/filter shrink-0">
${pad}        <button
${pad}          onClick={() => ${cfg.filterSetter}(!${cfg.filterState})}
${pad}          style={{ height: '36px' }}
${pad}          className={cn(
${pad}            "p-2 px-3 text-xs font-black rounded-lg border transition flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap min-h-[36px]",
${pad}            ${cfg.filterState}
${pad}              ? "bg-[#0a1945] text-white border-[#0a1945]"
${pad}              : "bg-white text-black border-gray-300 hover:border-orange-400 hover:text-orange-500"
${pad}          )}
${pad}        >
${pad}          <Filter size={13} className="text-orange-500" />
${pad}        </button>
${pad}        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/filter:block bg-slate-800 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-50 font-bold font-sans pointer-events-none">
${pad}          {lang === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
${pad}        </div>
${pad}      </div>
${pad}    </div>

${pad}    <div className="flex items-center gap-2 w-full justify-between sm:w-auto sm:justify-start flex-wrap" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
${pad}      ${settingsHtml.split('\n').join('\n' + pad + '      ')}
${pad}      <div className="relative shrink-0" style={{ height: '36px', width: '36px' }} title={lang === 'ar' ? 'تحميل / تصدير' : 'Download / Export'}>
${pad}        <ExportDataButton
${pad}          lang={lang}
${pad}          hideText
${pad}          onToast={triggerHrToast}
${pad}          onCopy={() => triggerHrToast(${cfg.exportCopy})}
${pad}          onPrint={() => triggerHrToast(${cfg.exportPrint})}
${pad}          className="w-full h-full block"
${pad}          buttonClassName="!w-[36px] !h-[36px] !min-h-[36px]"
${pad}        />
${pad}      </div>
${pad}      ${cardsHtml.split('\n').join('\n' + pad + '      ')}
${buildDateRange(cfg, pad + '      ')}
${branchHtml ? pad + '      ' + branchHtml.split('\n').join('\n' + pad + '      ') + '\n' : ''}${pad}    </div>
${pad}  </div>
${pad}</div>
`;
}

const configs = [
  {
    searchValue: 'commissionSearch',
    searchOnChange: 'e => setCommissionSearch(e.target.value)',
    clearOnClick: "() => setCommissionSearch('')",
    placeholder: "lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'",
    filterState: 'isComColumnFiltersOpen',
    filterSetter: 'setIsComColumnFiltersOpen',
    viewMode: 'comViewMode',
    dateStart: 'comStartDate',
    setDateStart: 'setComStartDate',
    dateEnd: 'comEndDate',
    setDateEnd: 'setComEndDate',
    branchOpenSetter: 'setComBranchDropdownOpen',
    settingsOpenVar: 'comColumnSettingsOpen',
    exportCopy: "lang === 'ar' ? 'تم نسخ بيانات العمولات إلى الحافظة' : 'Commissions report copied to clipboard!'",
    exportPrint: "lang === 'ar' ? 'تم فتح خيارات الطباعة لجدول العمولات' : 'Print dialog opened for commissions!'",
    indent: '              ',
  },
  {
    searchValue: 'commissionSearch',
    searchOnChange: 'e => setCommissionSearch(e.target.value)',
    clearOnClick: "() => setCommissionSearch('')",
    placeholder: "lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'",
    filterState: 'isComColumnFiltersOpen',
    filterSetter: 'setIsComColumnFiltersOpen',
    viewMode: 'comViewMode',
    dateStart: 'comStartDate',
    setDateStart: 'setComStartDate',
    dateEnd: 'comEndDate',
    setDateEnd: 'setComEndDate',
    branchOpenSetter: 'setComBranchDropdownOpen',
    settingsOpenVar: 'comColumnSettingsOpen',
    exportCopy: "lang === 'ar' ? 'تم نسخ بيانات العمولات إلى الحافظة' : 'Commissions report copied to clipboard!'",
    exportPrint: "lang === 'ar' ? 'تم فتح خيارات الطباعة لجدول العمولات' : 'Print dialog opened for commissions!'",
    indent: '                  ',
  },
  {
    searchValue: 'profileSearch',
    searchOnChange: 'e => setProfileSearch(e.target.value)',
    clearOnClick: "() => setProfileSearch('')",
    placeholder: "lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'",
    filterState: 'isProfileColumnFiltersOpen',
    filterSetter: 'setIsProfileColumnFiltersOpen',
    viewMode: 'profileViewMode',
    dateStart: 'profileStartDate',
    setDateStart: 'setProfileStartDate',
    dateEnd: 'profileEndDate',
    setDateEnd: 'setProfileEndDate',
    branchOpenSetter: 'setProfileBranchDropdownOpen',
    settingsOpenVar: 'profileColumnSettingsOpen',
    exportCopy: "lang === 'ar' ? 'تم نسخ التقرير لحافظتك' : 'Report copied to clipboard!'",
    exportPrint: "lang === 'ar' ? 'فتح شاشة الطباعة لتقرير الموظفين' : 'Opening profiles print setup!'",
    indent: '                  ',
  },
  {
    searchValue: 'attendanceSearchReport',
    searchOnChange: 'e => setAttendanceSearchReport(e.target.value)',
    clearOnClick: "() => setAttendanceSearchReport('')",
    placeholder: "lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'",
    filterState: 'isAttendanceColumnFiltersOpenReport',
    filterSetter: 'setIsAttendanceColumnFiltersOpenReport',
    viewMode: 'attendanceViewModeReport',
    dateStart: 'attendanceStartDateReport',
    setDateStart: 'setAttendanceStartDateReport',
    dateEnd: 'attendanceEndDateReport',
    setDateEnd: 'setAttendanceEndDateReport',
    branchOpenSetter: 'setAttendanceBranchDropdownOpenReport',
    settingsOpenVar: 'attendanceColumnSettingsOpenReport',
    exportCopy: "lang === 'ar' ? 'تم نسخ التقرير لحافظتك' : 'Report copied to clipboard!'",
    exportPrint: "lang === 'ar' ? 'فتح شاشة الطباعة لتقرير الحضور' : 'Opening attendance print setup!'",
    indent: '                  ',
  },
  {
    searchValue: 'bonusDeductSearchReport',
    searchOnChange: 'e => setBonusDeductSearchReport(e.target.value)',
    clearOnClick: "() => setBonusDeductSearchReport('')",
    placeholder: "lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'",
    filterState: 'isBonusDeductColumnFiltersOpenReport',
    filterSetter: 'setIsBonusDeductColumnFiltersOpenReport',
    viewMode: 'bonusDeductViewModeReport',
    dateStart: 'bonusDeductStartDateReport',
    setDateStart: 'setBonusDeductStartDateReport',
    dateEnd: 'bonusDeductEndDateReport',
    setDateEnd: 'setBonusDeductEndDateReport',
    branchOpenSetter: 'setBonusDeductBranchDropdownOpenReport',
    settingsOpenVar: 'bonusDeductColumnSettingsOpenReport',
    exportCopy: "lang === 'ar' ? 'تم نسخ التقرير لحافظتك' : 'Report copied to clipboard!'",
    exportPrint: "lang === 'ar' ? 'فتح شاشة الطباعة لتقرير المكافآت' : 'Opening bonus/deduction print setup!'",
    indent: '                  ',
  },
  {
    searchValue: 'disbursalsSearchReport',
    searchOnChange: 'e => { setDisbursalsSearchReport(e.target.value); setDisbursalsCurrentPageReport(1); }',
    clearOnClick: "() => { setDisbursalsSearchReport(''); setDisbursalsCurrentPageReport(1); }",
    placeholder: "lang === 'ar' ? 'البحث بالاسم أو كود الموظف...' : 'Search by name or code...'",
    filterState: 'isDisbursalsColumnFiltersOpenReport',
    filterSetter: 'setIsDisbursalsColumnFiltersOpenReport',
    viewMode: 'disbursalsViewModeReport',
    dateStart: 'disbursalsStartDateReport',
    setDateStart: 'setDisbursalsStartDateReport',
    dateEnd: 'disbursalsEndDateReport',
    setDateEnd: 'setDisbursalsEndDateReport',
    onStartChange: 'e => { setDisbursalsStartDateReport(e.target.value); setDisbursalsCurrentPageReport(1); }',
    onEndChange: 'e => { setDisbursalsEndDateReport(e.target.value); setDisbursalsCurrentPageReport(1); }',
    clearDatesExtra: 'setDisbursalsCurrentPageReport(1);',
    branchOpenSetter: 'setDisbursalsBranchDropdownOpenReport',
    settingsOpenVar: 'disbursalsColumnSettingsOpenReport',
    exportCopy: "lang === 'ar' ? 'تم نسخ التقرير لحافظتك' : 'Report copied to clipboard!'",
    exportPrint: "lang === 'ar' ? 'فتح شاشة الطباعة لتقرير صرف الرواتب' : 'Opening salary disbursals print setup!'",
    indent: '                  ',
  },
];

// 1) Restore from mozafen
{
  let broken = fs.readFileSync(filePath, 'utf8');
  const good = fs.readFileSync(goodPath, 'utf8');
  const brokenBlocks = extractToolbars(broken);
  const goodBlocks = extractToolbars(good);
  console.log('restore', brokenBlocks.length, goodBlocks.length);
  if (brokenBlocks.length !== 6 || goodBlocks.length !== 6) process.exit(1);
  for (let i = 5; i >= 0; i--) {
    broken =
      broken.slice(0, brokenBlocks[i].start) +
      goodBlocks[i].body +
      broken.slice(brokenBlocks[i].end);
  }
  fs.writeFileSync(filePath, broken);
  console.log('restored');
}

// 2) Rebuild
{
  let src = fs.readFileSync(filePath, 'utf8');
  const blocks = extractToolbars(src);
  for (let i = 5; i >= 0; i--) {
    const cfg = configs[i];
    const body = blocks[i].body;
    const branchRaw = extractBranch(body, cfg.branchOpenSetter);
    const settingsRaw = extractSettings(body, cfg.settingsOpenVar);
    const cardsRaw = extractCards(body, cfg.viewMode);
    console.log(i, {
      branch: branchRaw && divBalance(branchRaw),
      settings: settingsRaw && divBalance(settingsRaw),
      cards: cardsRaw && divBalance(cardsRaw),
      blen: branchRaw && branchRaw.length,
      slen: settingsRaw && settingsRaw.length,
      clen: cardsRaw && cardsRaw.length,
    });
    if (!settingsRaw || !cardsRaw) {
      console.error('missing settings/cards', i, { settings: !!settingsRaw, cards: !!cardsRaw, branch: !!branchRaw });
      process.exit(1);
    }
    if (!branchRaw) {
      console.warn('no branch for', i, '- continuing without');
    }
    const rebuiltRaw = buildToolbar(cfg.indent, cfg, {
      branchHtml: branchRaw ? restyleBranch(branchRaw) : '',
      cardsHtml: restyleCards(cardsRaw),
      settingsHtml: restyleSettings(settingsRaw),
    });
    const rebuilt = trimToBalance(rebuiltRaw);
    const bal = divBalance(rebuilt);
    console.log(i, 'toolbar balance', bal, 'branchLen', branchRaw ? restyleBranch(branchRaw).length : 0);
    if (!bal.ok) {
      console.error('unbalanced toolbar', i, 'delta', bal.opens - bal.closes);
      process.exit(1);
    }
    // Replace including any leading spaces on the marker line
    let start = blocks[i].start;
    while (start > 0 && (src[start - 1] === ' ' || src[start - 1] === '\t')) start--;
    src = src.slice(0, start) + rebuilt + '\n' + src.slice(blocks[i].end);
  }
  fs.writeFileSync(filePath, src);
  console.log('rebuilt ok');
}
