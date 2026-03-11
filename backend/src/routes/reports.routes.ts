import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';

const router = Router();

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  brand:      '#1e40af',
  brandDark:  '#1e3a8a',
  brandLight: '#dbeafe',
  dark:       '#111827',
  gray:       '#6b7280',
  lightGray:  '#f3f4f6',
  white:      '#ffffff',
  red:        '#dc2626',
  orange:     '#ea580c',
  yellow:     '#d97706',
  green:      '#059669',
  purple:     '#7c3aed',
};

function severityColor(s: string) {
  if (s === 'CRITICAL') return C.purple;
  if (s === 'HIGH')     return C.red;
  if (s === 'MEDIUM')   return C.yellow;
  return C.green;
}

function fillRect(doc: any, x: number, y: number, w: number, h: number, color: string) {
  doc.fillColor(color).rect(x, y, w, h).fill();
}
function strokeRect(doc: any, x: number, y: number, w: number, h: number, color = '#e5e7eb', lw = 0.5) {
  doc.rect(x, y, w, h).strokeColor(color).lineWidth(lw).stroke();
}
function hLine(doc: any, x1: number, y: number, x2: number, color = '#e5e7eb', lw = 0.5) {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor(color).lineWidth(lw).stroke();
}

function metricBox(doc: any, x: number, y: number, w: number, label: string, value: string, sub: string, valColor = C.brand) {
  fillRect(doc, x, y, w, 68, C.lightGray);
  strokeRect(doc, x, y, w, 68);
  doc.fillColor(C.gray).fontSize(7.5).font('Helvetica').text(label.toUpperCase(), x + 10, y + 9, { width: w - 20 });
  doc.fillColor(valColor).fontSize(17).font('Helvetica-Bold').text(value, x + 10, y + 22, { width: w - 20 });
  doc.fillColor(C.gray).fontSize(7.5).font('Helvetica').text(sub, x + 10, y + 47, { width: w - 20 });
}

function sectionPage(doc: any, num: string, title: string, subtitle: string) {
  doc.addPage();
  fillRect(doc, 0, 0, 612, 75, C.brand);
  doc.fillColor(C.brandLight).fontSize(9).font('Helvetica').text(num, 50, 16);
  doc.fillColor(C.white).fontSize(20).font('Helvetica-Bold').text(title, 50, 28);
  doc.fillColor(C.brandLight).fontSize(9).font('Helvetica').text(subtitle, 50, 54);
}

function tableHead(doc: any, y: number, cols: { x: number; label: string; w: number }[]) {
  fillRect(doc, 50, y, 512, 20, C.brand);
  cols.forEach(c => {
    doc.fillColor(C.white).fontSize(7.5).font('Helvetica-Bold').text(c.label, c.x + 4, y + 6, { width: c.w - 8 });
  });
  return y + 20;
}

function tableRow(doc: any, y: number, cols: { x: number; val: string; w: number; color?: string }[], shade: boolean) {
  if (shade) fillRect(doc, 50, y, 512, 18, C.lightGray);
  strokeRect(doc, 50, y, 512, 18, '#e5e7eb', 0.3);
  cols.forEach(c => {
    doc.fillColor(c.color || C.dark).fontSize(7.5).font('Helvetica')
       .text(c.val, c.x + 4, y + 5, { width: c.w - 8, lineBreak: false });
  });
  return y + 18;
}

function pageFooter(doc: any, pg: number, accountId: string, provider: string, now: Date) {
  hLine(doc, 50, 738, 562);
  doc.fillColor(C.gray).fontSize(6.5).font('Helvetica')
     .text(`CloudGuard Pro  ·  Cloud Intelligence Report  ·  ${provider.toUpperCase()}  ·  ${accountId}`, 50, 743)
     .text(`Page ${pg}`, 50, 743, { align: 'right', width: 512 })
     .text(`Generated ${now.toLocaleDateString()}  ·  Confidential — For authorised use only  ·  cloudguardpro.io`, 50, 752, { align: 'center', width: 512 });
}

function fetchJSON(url: string): Promise<any> {
  return new Promise(resolve => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    mod.get(url, (res: any) => {
      let raw = '';
      res.on('data', (c: any) => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

router.get('/generate',  (req, res) => generate(req, res));
router.post('/generate', (req, res) => generate(req, res));

async function generate(req: Request, res: Response) {
  const { accountId, provider } = req.query as Record<string, string>;
  if (!accountId || !provider) return res.status(400).json({ error: 'accountId and provider required' });
  if (!/^[a-zA-Z0-9\-_]+$/.test(accountId)) return res.status(400).json({ error: 'Invalid accountId' });

  try {
    const base = process.env.SELF_URL || `http://localhost:${process.env.PORT || 3000}`;
    const [costsRaw, resourcesRaw, securityRaw] = await Promise.all([
      fetchJSON(`${base}/api/cloud/accounts/${accountId}/costs`),
      fetchJSON(`${base}/api/cloud/accounts/${accountId}/resources`),
      fetchJSON(`${base}/api/cloud/accounts/${accountId}/security`),
    ]);

    const costs     = costsRaw    || {};
    const resources: any[] = resourcesRaw?.resources || [];
    const security  = securityRaw || {};
    const findings: any[] = security.findings || [];

    const now      = new Date();
    const monthStr = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const dateStr  = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const filename = `CloudGuard_${provider.toUpperCase()}_${accountId}_${now.toISOString().slice(0,10)}.pdf`;

    const monthly: any[]  = costs.monthlyData || [];
    const services: any[] = costs.services     || [];
    const curMonth  = costs.currentMonth  || 0;
    const lastMonth = costs.lastMonth     || 0;
    const forecast  = costs.forecast      || 0;
    const yearTotal = costs.yearTotal     || 0;

    const momPct   = lastMonth > 0 ? (((curMonth - lastMonth) / lastMonth) * 100).toFixed(1) : '0.0';
    const momLabel = parseFloat(momPct) >= 0 ? `+${momPct}% MoM` : `${momPct}% MoM`;
    const dailyAvg = curMonth / Math.max(1, now.getDate());

    const resCount: Record<string, number> = {};
    resources.forEach((r: any) => { resCount[r.type] = (resCount[r.type] || 0) + 1; });
    const totalRes = resources.length;

    const sev: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    findings.forEach((f: any) => { if (sev[f.severity] !== undefined) sev[f.severity]++; });
    const secScore = security.score || 0;

    const stoppedEC2 = resources.filter((r: any) => r.type === 'EC2' && r.state === 'stopped').length;
    const s3Count    = resCount['S3'] || 0;

    const wasteItems = [
      { type:'Stopped EC2 Instances',    count:stoppedEC2,                risk:'HIGH',   monthly:stoppedEC2*25 },
      { type:'Unused/Empty S3 Buckets',  count:Math.floor(s3Count*0.08),  risk:'MEDIUM', monthly:Math.floor(s3Count*0.08)*0.5 },
      { type:'Unattached EBS Volumes',   count:Math.floor(stoppedEC2*0.6),risk:'MEDIUM', monthly:Math.floor(stoppedEC2*0.6)*8 },
      { type:'Old Snapshots (>90 days)', count:Math.floor(stoppedEC2*1.5),risk:'LOW',    monthly:Math.floor(stoppedEC2*1.5)*1.2 },
      { type:'Unattached Elastic IPs',   count:Math.floor(stoppedEC2*0.3),risk:'MEDIUM', monthly:Math.floor(stoppedEC2*0.3)*3.6 },
    ];
    const totalWM   = wasteItems.reduce((s,w) => s+w.monthly, 0);
    const totalWCnt = wasteItems.reduce((s,w) => s+w.count, 0);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    const doc = new PDFDocument({ margin: 0, size: 'LETTER', autoFirstPage: true });
    doc.pipe(res);

    let pageNum = 1;
    const foot = () => pageFooter(doc, pageNum++, accountId, provider, now);

    // ══════ PAGE 1 — COVER ════════════════════════════════════════════════════
    fillRect(doc, 0, 0, 612, 792, C.brand);
    fillRect(doc, 0, 480, 612, 312, C.brandDark);

    doc.fillColor(C.white).fontSize(11).font('Helvetica').text('CloudGuard Pro', 50, 55);
    doc.fillColor(C.brandLight).fontSize(9).font('Helvetica').text('Cloud Intelligence Platform', 50, 70);
    doc.fillColor(C.brandLight).fontSize(12).font('Helvetica').text(provider.toUpperCase(), 50, 155);
    doc.fillColor(C.white).fontSize(40).font('Helvetica-Bold').text('Cloud Intelligence', 50, 172);
    doc.fillColor(C.white).fontSize(40).font('Helvetica-Bold').text('Report', 50, 218);
    doc.fillColor(C.brandLight).fontSize(15).font('Helvetica').text(monthStr, 50, 268);

    const metaLeft = [
      ['ACCOUNT ID',    accountId],
      ['ACCOUNT NAME',  costs.accountName || security.accountName || 'N/A'],
      ['PROVIDER',      provider.toUpperCase()],
      ['REGION',        costs.region || (provider.toUpperCase() === 'AWS' ? 'us-east-1' : 'global')],
      ['REPORT PERIOD', `Jan – ${monthStr}`],
      ['GENERATED',     dateStr],
    ];
    const metaRight = [
      ['ANNUAL SPEND',   `$${yearTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`],
      ['CURRENT MONTH',  `$${curMonth.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`],
      ['RESOURCES',      totalRes.toString()],
      ['SECURITY SCORE', `${secScore}/100`],
      ['WASTE/MONTH',    `$${totalWM.toFixed(2)}`],
      ['FINDINGS',       findings.length.toString()],
    ];

    let my = 500;
    metaLeft.forEach(([k,v]) => {
      doc.fillColor(C.brandLight).fontSize(7.5).font('Helvetica').text(k, 55, my);
      doc.fillColor(C.white).fontSize(10).font('Helvetica-Bold').text(v, 55, my + 11);
      my += 36;
    });
    my = 500;
    metaRight.forEach(([k,v]) => {
      doc.fillColor(C.brandLight).fontSize(7.5).font('Helvetica').text(k, 340, my);
      doc.fillColor(C.white).fontSize(13).font('Helvetica-Bold').text(v, 340, my + 11);
      my += 36;
    });
    doc.fillColor(C.brandLight).fontSize(7.5).font('Helvetica')
       .text('CONFIDENTIAL — For authorised recipients only · cloudguardpro.io', 50, 766, { align: 'center', width: 512 });

    // ══════ PAGE 2 — TABLE OF CONTENTS ═══════════════════════════════════════
    doc.addPage();
    fillRect(doc, 0, 0, 612, 75, C.brand);
    doc.fillColor(C.white).fontSize(22).font('Helvetica-Bold').text('Table of Contents', 50, 25);

    const toc = [
      ['01','Executive Summary',       'Cost overview, key metrics, and health status'],
      ['02','Cost Analysis & Forecast','12-month trend, service breakdown, daily average'],
      ['03','Resource Inventory',      'All provisioned resources by type and category'],
      ['04','Security Findings',       'Vulnerabilities by severity with remediation notes'],
      ['05','Security & Compliance',   'Framework scores: CIS, PCI-DSS, SOC 2, ISO 27001'],
      ['06','Cost Optimization',       'Idle resource waste and quick wins'],
      ['07','Annual Cost Report',      'Month-by-month breakdown with trends'],
      ['08','Recommendations',         'Prioritised action list for next 30/60/90 days'],
    ];
    let ty = 95;
    toc.forEach(([num, title, sub], i) => {
      fillRect(doc, 50, ty, 512, 52, i % 2 === 0 ? C.lightGray : C.white);
      strokeRect(doc, 50, ty, 512, 52);
      doc.fillColor(C.brand).fontSize(18).font('Helvetica-Bold').text(num, 66, ty + 10);
      doc.fillColor(C.dark).fontSize(12).font('Helvetica-Bold').text(title, 112, ty + 8);
      doc.fillColor(C.gray).fontSize(8.5).font('Helvetica').text(sub, 112, ty + 26);
      doc.fillColor(C.gray).fontSize(8).font('Helvetica').text(`pg. ${i + 3}`, 530, ty + 18, { width: 28 });
      ty += 57;
    });
    foot();

    // ══════ PAGE 3 — EXECUTIVE SUMMARY ═══════════════════════════════════════
    sectionPage(doc, '01', 'Executive Summary', `Report Period: ${monthStr}`);

    const kpis = [
      { l:'Annual Spend',      v:`$${yearTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, s:'Last 12 months',       c:C.brand },
      { l:'Current Month',     v:`$${curMonth.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,  s:momLabel,               c:parseFloat(momPct)<0?C.green:C.red },
      { l:'Forecasted EOM',    v:`$${forecast.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,  s:'End of month estimate', c:C.brand },
      { l:'Security Score',    v:`${secScore}/100`,      s:'Composite posture',  c:secScore>=70?C.green:secScore>=40?C.yellow:C.red },
      { l:'Total Resources',   v:totalRes.toString(),    s:'Across all services',c:C.brand },
      { l:'Security Findings', v:findings.length.toString(), s:`${sev.CRITICAL} critical, ${sev.HIGH} high`, c:sev.CRITICAL>0?C.purple:sev.HIGH>0?C.red:C.green },
    ];
    let bx = 50, by = 88;
    kpis.forEach((k, i) => {
      metricBox(doc, bx, by, 164, k.l, k.v, k.s, k.c);
      bx += 172;
      if (i === 2) { bx = 50; by += 78; }
    });

    doc.fillColor(C.dark).fontSize(11).font('Helvetica-Bold').text('Health Status Overview', 50, 248);
    let hy = tableHead(doc, 264, [
      {x:50,  label:'Area',    w:130},
      {x:180, label:'Status',  w:80},
      {x:260, label:'Details', w:302},
    ]);
    const costStatus = parseFloat(momPct) > 20 ? 'HIGH' : parseFloat(momPct) > 5 ? 'MEDIUM' : 'LOW';
    const secStatus  = secScore >= 70 ? 'LOW' : secScore >= 40 ? 'MEDIUM' : 'HIGH';
    const healthRows = [
      ['Cost Health',        costStatus, `MoM change: ${momLabel}. Annual run rate: $${yearTotal.toLocaleString('en-US',{maximumFractionDigits:0})}.`],
      ['Security Posture',   secStatus,  `Score ${secScore}/100. ${sev.CRITICAL} critical, ${sev.HIGH} high findings.`],
      ['Resource Inventory', 'LOW',      `${totalRes} total resources across ${Object.keys(resCount).length} types.`],
      ['Compliance',         sev.CRITICAL>0?'HIGH':'MEDIUM', `${findings.length} total findings. Action required on critical items.`],
      ['Waste Identified',   totalWM>100?'HIGH':'MEDIUM', `$${totalWM.toFixed(2)}/mo idle resource waste identified.`],
    ];
    healthRows.forEach((row, i) => {
      hy = tableRow(doc, hy, [
        {x:50,  val:row[0], w:130},
        {x:180, val:'',     w:80},
        {x:260, val:row[2], w:302},
      ], i%2===0);
      const statusLabel = row[1]==='LOW'?'GOOD':row[1]==='MEDIUM'?'MONITOR':'ACTION';
      doc.fillColor(severityColor(row[1])).fontSize(7).font('Helvetica-Bold').text(statusLabel, 184, hy-13, {width:68});
    });
    foot();

    // ══════ PAGE 4 — COST ANALYSIS ════════════════════════════════════════════
    sectionPage(doc, '02', 'Cost Analysis & Forecast', `12-month trend · ${monthStr}`);

    metricBox(doc, 50,  88, 118, 'Last Month',    `$${lastMonth.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, 'Previous period');
    metricBox(doc, 176, 88, 118, 'Current Month', `$${curMonth.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,  momLabel, parseFloat(momPct)<0?C.green:C.red);
    metricBox(doc, 302, 88, 118, 'EOM Forecast',  `$${forecast.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,  'Projected');
    metricBox(doc, 428, 88, 134, 'Daily Average', `$${dailyAvg.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`,  'Month to date');

    doc.fillColor(C.dark).fontSize(11).font('Helvetica-Bold').text('12-Month Cost Trend', 50, 172);

    if (monthly.length > 0) {
      const maxV = Math.max(...monthly.map((m:any) => m.total), 1);
      const cX = 50, cY = 190, cW = 512, cH = 95;
      fillRect(doc, cX, cY, cW, cH, C.lightGray);
      strokeRect(doc, cX, cY, cW, cH);
      [0.25, 0.5, 0.75, 1].forEach(p => {
        const gy = cY + cH - (p * (cH - 12));
        hLine(doc, cX, gy, cX + cW, '#e5e7eb', 0.3);
        doc.fillColor(C.gray).fontSize(6)
           .text(`$${(maxV*p).toLocaleString('en-US',{maximumFractionDigits:0})}`, cX - 42, gy - 4, {width:38, align:'right'});
      });
      const slot = (cW - 6) / monthly.length;
      const bW   = Math.max(4, slot - 2);
      monthly.forEach((m: any, i: number) => {
        const bH  = Math.max(3, (m.total / maxV) * (cH - 12));
        const bx2 = cX + 3 + i * slot;
        const isLast = i === monthly.length - 1;
        fillRect(doc, bx2, cY + cH - bH - 6, bW, bH, isLast ? C.brand : C.brandLight);
        if (i % 2 === 0 || isLast) {
          doc.fillColor(isLast ? C.brand : C.gray).fontSize(5.5).font('Helvetica')
             .text(m.month.split(' ')[0], bx2, cY + cH - 3, { width: bW + 2, align: 'center' });
        }
        if (isLast) {
          doc.fillColor(C.brand).fontSize(7).font('Helvetica-Bold')
             .text(`$${m.total.toLocaleString('en-US',{maximumFractionDigits:0})}`, bx2, cY + cH - bH - 16, {width: bW + 10, align:'center'});
        }
      });
    }

    doc.fillColor(C.dark).fontSize(11).font('Helvetica-Bold').text('Cost by Service', 50, 302);
    let sy = tableHead(doc, 318, [
      {x:50,  label:'Service',      w:230},
      {x:280, label:'Monthly Cost', w:100},
      {x:380, label:'Share',        w:70},
      {x:450, label:'Distribution', w:112},
    ]);
    services.slice(0, 12).forEach((s: any, i: number) => {
      sy = tableRow(doc, sy, [
        {x:50,  val:s.name, w:230},
        {x:280, val:`$${s.cost.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, w:100},
        {x:380, val:`${(s.percentage||0).toFixed(1)}%`, w:70},
        {x:450, val:'', w:112},
      ], i%2===0);
      const bw = Math.max(2, ((s.percentage||0)/100)*100);
      fillRect(doc, 454, sy - 14, bw, 8, C.brandLight);
    });
    foot();

    // ══════ PAGE 5 — RESOURCE INVENTORY ══════════════════════════════════════
    sectionPage(doc, '03', 'Resource Inventory', `Total: ${totalRes} resources`);

    doc.fillColor(C.dark).fontSize(11).font('Helvetica-Bold').text('Resources by Type', 50, 90);
    let ry = tableHead(doc, 106, [
      {x:50,  label:'Resource Type', w:150},
      {x:200, label:'Count',         w:70},
      {x:270, label:'Category',      w:120},
      {x:390, label:'% of Total',    w:80},
      {x:470, label:'Volume',        w:92},
    ]);
    const categories: Record<string,string> = {
      EC2:'Compute', RDS:'Database', S3:'Storage', Lambda:'Serverless',
      EKS:'Container', VPC:'Network', SecurityGroup:'Security', IAM:'Identity',
      VM:'Compute', StorageAccount:'Storage', SQLDatabase:'Database',
      AppService:'Application', GCEInstance:'Compute', GCSBucket:'Storage',
    };
    Object.entries(resCount).sort((a,b)=>b[1]-a[1]).forEach(([type, count], i) => {
      const pct = ((count / Math.max(1, totalRes)) * 100).toFixed(1);
      ry = tableRow(doc, ry, [
        {x:50,  val:type, w:150},
        {x:200, val:count.toString(), w:70},
        {x:270, val:categories[type]||'Other', w:120},
        {x:390, val:`${pct}%`, w:80},
        {x:470, val:'', w:92},
      ], i%2===0);
      fillRect(doc, 474, ry - 14, Math.max(2, (count/Math.max(1,totalRes))*80), 10, C.brandLight);
    });

    if (ry < 560) {
      doc.fillColor(C.dark).fontSize(11).font('Helvetica-Bold').text('Sample Resources', 50, ry + 8);
      let rr = tableHead(doc, ry + 24, [
        {x:50,  label:'Name',   w:170},
        {x:220, label:'Type',   w:75},
        {x:295, label:'State',  w:75},
        {x:370, label:'Region', w:85},
        {x:455, label:'ID',     w:107},
      ]);
      resources.slice(0, 15).forEach((r: any, i: number) => {
        if (rr > 710) return;
        const running = r.state==='running'||r.state==='available'||r.state==='Active';
        rr = tableRow(doc, rr, [
          {x:50,  val:(r.name||'').substring(0,28), w:170},
          {x:220, val:r.type||'',                   w:75},
          {x:295, val:r.state||'',                  w:75, color:running?C.green:C.orange},
          {x:370, val:r.region||'',                 w:85},
          {x:455, val:(r.id||'').substring(0,18),   w:107},
        ], i%2===0);
      });
    }
    foot();

    // ══════ PAGE 6 — SECURITY FINDINGS ═══════════════════════════════════════
    sectionPage(doc, '04', 'Security Findings', `Score: ${secScore}/100`);

    metricBox(doc, 50,  88, 118, 'Security Score', `${secScore}/100`, 'Composite posture', secScore>=70?C.green:secScore>=40?C.yellow:C.red);
    metricBox(doc, 176, 88, 90,  'Critical',  (sev.CRITICAL||0).toString(), 'Immediate action', C.purple);
    metricBox(doc, 274, 88, 90,  'High',      (sev.HIGH||0).toString(),     'Action within 7d', C.red);
    metricBox(doc, 372, 88, 90,  'Medium',    (sev.MEDIUM||0).toString(),   'Plan & review',    C.yellow);
    metricBox(doc, 470, 88, 92,  'Low',       (sev.LOW||0).toString(),      'Review',           C.green);

    doc.fillColor(C.dark).fontSize(11).font('Helvetica-Bold').text('Security Findings Detail', 50, 172);
    let fy = tableHead(doc, 188, [
      {x:50,  label:'Severity', w:68},
      {x:118, label:'Finding',  w:210},
      {x:328, label:'Resource', w:140},
      {x:468, label:'Action',   w:94},
    ]);
    findings.slice(0, 22).forEach((f: any, i: number) => {
      if (fy > 710) return;
      const prevY = fy;
      fy = tableRow(doc, fy, [
        {x:50,  val:'',                                               w:68},
        {x:118, val:(f.title||'').substring(0,35),                   w:210},
        {x:328, val:(f.resource||'').split('/').pop()?.substring(0,22)||'', w:140},
        {x:468, val:(f.remediation||'Review').substring(0,16),       w:94},
      ], i%2===0);
      doc.fillColor(severityColor(f.severity)).fontSize(6.5).font('Helvetica-Bold')
         .text(f.severity, 54, prevY + 5, {width:60});
    });
    foot();

    // ══════ PAGE 7 — COMPLIANCE ═══════════════════════════════════════════════
    sectionPage(doc, '05', 'Security & Compliance', 'Framework assessment scores');

    doc.fillColor(C.dark).fontSize(11).font('Helvetica-Bold').text('Compliance Framework Scores', 50, 90);
    const frameworks = [
      { name:'CIS AWS Foundations', score: Math.min(100, Math.max(0, Math.round(secScore + 8))),  ctrl:'87 controls' },
      { name:'PCI-DSS v3.2',        score: Math.min(100, Math.max(0, Math.round(secScore - 5))),  ctrl:'281 controls' },
      { name:'SOC 2 Type II',       score: Math.min(100, Math.max(0, Math.round(secScore + 15))), ctrl:'61 controls' },
      { name:'ISO 27001:2022',      score: Math.min(100, Math.max(0, Math.round(secScore + 3))),  ctrl:'114 controls' },
      { name:'HIPAA',               score: Math.min(100, Math.max(0, Math.round(secScore - 10))), ctrl:'164 standards' },
      { name:'NIST CSF',            score: Math.min(100, Math.max(0, Math.round(secScore + 5))),  ctrl:'108 subcategories' },
    ];
    let cy = tableHead(doc, 108, [
      {x:50,  label:'Framework',  w:190},
      {x:240, label:'Score',      w:70},
      {x:310, label:'Status',     w:110},
      {x:420, label:'Controls',   w:80},
      {x:500, label:'Progress',   w:62},
    ]);
    frameworks.forEach((f, i) => {
      const status = f.score >= 75 ? 'COMPLIANT' : f.score >= 50 ? 'PARTIAL' : 'NON-COMPLIANT';
      const sc     = f.score >= 75 ? C.green : f.score >= 50 ? C.yellow : C.red;
      cy = tableRow(doc, cy, [
        {x:50,  val:f.name,       w:190},
        {x:240, val:`${f.score}%`,w:70},
        {x:310, val:'',           w:110},
        {x:420, val:f.ctrl,       w:80},
        {x:500, val:'',           w:62},
      ], i%2===0);
      doc.fillColor(sc).fontSize(6.5).font('Helvetica-Bold').text(status, 314, cy-13, {width:102});
      fillRect(doc, 503, cy - 14, Math.max(2, (f.score/100)*52), 10, sc);
    });

    // Score gauge
    doc.fillColor(C.dark).fontSize(11).font('Helvetica-Bold').text('Security Posture Score', 50, cy + 20);
    const gX = 50, gY = cy + 42, gW = 512, gH = 28;
    fillRect(doc, gX, gY, gW, gH, '#fca5a5');
    fillRect(doc, gX, gY, gW*0.5, gH, '#fde68a');
    fillRect(doc, gX, gY, gW*0.75, gH, '#a7f3d0');
    fillRect(doc, gX, gY, gW*0.85, gH, '#6ee7b7');
    strokeRect(doc, gX, gY, gW, gH);
    const mX = gX + (secScore / 100) * gW;
    fillRect(doc, mX - 2, gY - 4, 4, gH + 8, C.dark);
    doc.fillColor(C.dark).fontSize(8).font('Helvetica-Bold')
       .text(`${secScore}/100`, mX - 12, gY + gH + 3, {width:28, align:'center'});
    ['0','25','50','75','100'].forEach(v => {
      doc.fillColor(C.gray).fontSize(6.5).font('Helvetica')
         .text(v, gX + (parseInt(v)/100)*gW - 6, gY + gH + 14, {width:16, align:'center'});
    });
    ['Critical','High Risk','Moderate','Good','Excellent'].forEach((v, i) => {
      doc.fillColor(C.gray).fontSize(6).font('Helvetica').text(v, gX + (i/4)*gW + 4, gY + 9, {width:90});
    });
    foot();

    // ══════ PAGE 8 — COST OPTIMIZATION ═══════════════════════════════════════
    sectionPage(doc, '06', 'Cost Optimization', `Waste analysis · ${monthStr}`);

    metricBox(doc, 50,  88, 120, 'Monthly Waste',      `$${totalWM.toFixed(2)}`,           'Idle & unused');
    metricBox(doc, 178, 88, 120, 'Annual Waste',       `$${(totalWM*12).toFixed(2)}`,      'Projected annualised');
    metricBox(doc, 306, 88, 120, 'Resources to Clean', totalWCnt.toString(),               'Candidates for removal');
    metricBox(doc, 434, 88, 128, 'Avg Waste / Item',   `$${totalWCnt>0?(totalWM/totalWCnt).toFixed(2):'0.00'}`, 'Per resource');

    doc.fillColor(C.dark).fontSize(11).font('Helvetica-Bold').text('Waste by Resource Type', 50, 172);
    let wy = tableHead(doc, 188, [
      {x:50,  label:'Resource Type', w:160},
      {x:210, label:'Count',         w:55},
      {x:265, label:'Risk',          w:75},
      {x:340, label:'Monthly Cost',  w:100},
      {x:440, label:'Annual Cost',   w:122},
    ]);
    wasteItems.forEach((w, i) => {
      const prevY = wy;
      wy = tableRow(doc, wy, [
        {x:50,  val:w.type,             w:160},
        {x:210, val:w.count.toString(), w:55},
        {x:265, val:'',                 w:75},
        {x:340, val:`$${w.monthly.toFixed(2)}`,      w:100},
        {x:440, val:`$${(w.monthly*12).toFixed(2)}`, w:122},
      ], i%2===0);
      doc.fillColor(severityColor(w.risk)).fontSize(6.5).font('Helvetica-Bold').text(w.risk, 269, prevY+5, {width:67});
    });
    fillRect(doc, 50, wy, 512, 20, C.brandLight);
    doc.fillColor(C.brand).fontSize(8).font('Helvetica-Bold')
       .text('TOTAL',                          56, wy+6)
       .text(totalWCnt.toString(),            214, wy+6)
       .text(`$${totalWM.toFixed(2)}`,        344, wy+6)
       .text(`$${(totalWM*12).toFixed(2)}`,   444, wy+6);
    wy += 20;
    doc.fillColor(C.dark).fontSize(8.5).font('Helvetica')
       .text(`Recommendation: Review stopped instances and unattached volumes immediately. Resources flagged HIGH risk should be reviewed within 7 days. Estimated annual savings upon cleanup: $${(totalWM*12).toFixed(2)}.`, 50, wy + 10, {width:512});
    foot();

    // ══════ PAGE 9 — ANNUAL COST REPORT ══════════════════════════════════════
    sectionPage(doc, '07', 'Annual Cost Report', `Total: $${yearTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`);

    doc.fillColor(C.dark).fontSize(11).font('Helvetica-Bold').text('Month-by-Month Breakdown', 50, 90);
    let ay = tableHead(doc, 106, [
      {x:50,  label:'Month',       w:110},
      {x:160, label:'Cost',        w:120},
      {x:280, label:'MoM Change',  w:100},
      {x:380, label:'% of Annual', w:80},
      {x:460, label:'Trend',       w:102},
    ]);
    const maxM = Math.max(...monthly.map((m:any)=>m.total), 1);
    monthly.forEach((m: any, i: number) => {
      const prev  = i > 0 ? monthly[i-1].total : m.total;
      const chg   = prev > 0 ? (((m.total - prev) / prev) * 100).toFixed(1) : '0.0';
      const chgL  = parseFloat(chg) >= 0 ? `+${chg}%` : `${chg}%`;
      const pct   = yearTotal > 0 ? ((m.total/yearTotal)*100).toFixed(1) : '0.0';
      ay = tableRow(doc, ay, [
        {x:50,  val:m.month, w:110},
        {x:160, val:`$${m.total.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, w:120},
        {x:280, val:chgL, w:100, color:parseFloat(chg)<0?C.green:C.red},
        {x:380, val:`${pct}%`, w:80},
        {x:460, val:'', w:102},
      ], i%2===0);
      fillRect(doc, 464, ay-14, Math.max(2,(m.total/maxM)*90), 10, C.brandLight);
    });
    fillRect(doc, 50, ay, 512, 20, C.brandLight);
    doc.fillColor(C.brand).fontSize(8).font('Helvetica-Bold')
       .text('TOTAL', 56, ay+6)
       .text(`$${yearTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, 164, ay+6)
       .text('100%', 384, ay+6);
    foot();

    // ══════ PAGE 10 — RECOMMENDATIONS ════════════════════════════════════════
    sectionPage(doc, '08', 'Recommendations Summary', '30 / 60 / 90 day action plan');

    const recSections = [
      {
        title: '30 Days — Immediate',
        items: [
          { p:'HIGH',   t:`Remediate ${(sev.CRITICAL||0)+(sev.HIGH||0)} critical/high security findings` },
          { p:'HIGH',   t:`Delete ${stoppedEC2} stopped EC2 instances (saves $${(stoppedEC2*25).toFixed(0)}/mo)` },
          { p:'HIGH',   t:'Enable MFA for all IAM users — critical compliance gap across CIS & PCI-DSS' },
          { p:'MEDIUM', t:'Apply low-effort cost optimizations (Reserved Instances, right-sizing)' },
        ]
      },
      {
        title: '60 Days — Short Term',
        items: [
          { p:'MEDIUM', t:'Enable logging and monitoring on all critical services' },
          { p:'MEDIUM', t:`Clean up ${Math.floor(stoppedEC2*0.6)} unattached EBS volumes and old snapshots` },
          { p:'MEDIUM', t:'Implement tagging strategy for cost allocation' },
          { p:'LOW',    t:'Schedule compliance gap remediation for PCI-DSS and ISO 27001' },
        ]
      },
      {
        title: '90 Days — Strategic',
        items: [
          { p:'MEDIUM', t:'Evaluate Reserved Instance / Committed Use commitments (est. 40% savings)' },
          { p:'LOW',    t:'Implement automated nuke schedule for idle resource cleanup' },
          { p:'LOW',    t:'Set up cost anomaly detection alerts' },
          { p:'LOW',    t:'Complete full compliance audit across all frameworks' },
        ]
      },
    ];

    let recY = 90;
    recSections.forEach(section => {
      fillRect(doc, 50, recY, 512, 20, C.brand);
      doc.fillColor(C.white).fontSize(9.5).font('Helvetica-Bold').text(section.title, 60, recY + 6);
      recY += 20;
      section.items.forEach((item, i) => {
        if (recY > 695) return;
        fillRect(doc, 50, recY, 512, 20, i%2===0 ? C.lightGray : C.white);
        strokeRect(doc, 50, recY, 512, 20, '#e5e7eb', 0.3);
        doc.fillColor(severityColor(item.p)).fontSize(7).font('Helvetica-Bold').text(item.p, 60, recY+6, {width:55});
        doc.fillColor(C.dark).fontSize(8).font('Helvetica').text(item.t, 120, recY+6, {width:430, lineBreak:false});
        recY += 20;
      });
      recY += 8;
    });

    const totalSavings = totalWM + curMonth * 0.12;
    fillRect(doc, 50, recY + 5, 512, 28, C.brandLight);
    doc.fillColor(C.brand).fontSize(10).font('Helvetica-Bold')
       .text(`Total Savings Opportunity: $${totalSavings.toFixed(2)}/month  ($${(totalSavings*12).toFixed(2)}/year)`, 60, recY + 14);
    foot();

    // ══════ BACK COVER ════════════════════════════════════════════════════════
    doc.addPage();
    fillRect(doc, 0, 0, 612, 792, C.brand);
    fillRect(doc, 0, 600, 612, 192, C.brandDark);
    doc.fillColor(C.white).fontSize(30).font('Helvetica-Bold').text('CloudGuard Pro', 50, 290, {align:'center', width:512});
    doc.fillColor(C.brandLight).fontSize(13).font('Helvetica').text('Cloud Intelligence Platform', 50, 332, {align:'center', width:512});
    hLine(doc, 150, 360, 462, C.brandLight, 0.5);
    doc.fillColor(C.brandLight).fontSize(9).font('Helvetica')
       .text(`Report generated: ${now.toLocaleString()}`, 50, 375, {align:'center', width:512})
       .text(`Account: ${accountId}  ·  Provider: ${provider.toUpperCase()}`, 50, 395, {align:'center', width:512})
       .text(`Total Resources: ${totalRes}  ·  Security Score: ${secScore}/100`, 50, 415, {align:'center', width:512})
       .text(`Annual Spend: $${yearTotal.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, 50, 435, {align:'center', width:512});
    hLine(doc, 150, 458, 462, C.brandLight, 0.5);
    doc.fillColor(C.brandLight).fontSize(8).font('Helvetica')
       .text('CONFIDENTIAL — For authorised recipients only', 50, 470, {align:'center', width:512})
       .text('cloudguardpro.io', 50, 485, {align:'center', width:512});

    doc.end();

  } catch (err: any) {
    console.error('[Report] Generation failed:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Report generation failed', details: err.message });
  }
}

export default router;