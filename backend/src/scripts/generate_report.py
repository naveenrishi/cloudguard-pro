"""
CloudGuard Pro — Premium Cloud Report Generator
Produces a multi-section PDF report for a single cloud account.
Usage: python3 generate_report.py [--provider aws|azure|gcp] [--account-id <id>] [--output report.pdf]
"""

import argparse, math, random, os
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Circle, Wedge, Path
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics import renderPDF
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.colors import HexColor, white, black

# ── Brand colours ─────────────────────────────────────────────────────────────
INDIGO      = HexColor('#6366f1')
INDIGO_DARK = HexColor('#4f46e5')
INDIGO_LIGHT= HexColor('#eef2ff')
SLATE_900   = HexColor('#0f172a')
SLATE_800   = HexColor('#1e293b')
SLATE_700   = HexColor('#334155')
SLATE_500   = HexColor('#64748b')
SLATE_300   = HexColor('#cbd5e1')
SLATE_100   = HexColor('#f1f5f9')
SLATE_50    = HexColor('#f8fafc')
RED         = HexColor('#ef4444')
RED_LIGHT   = HexColor('#fef2f2')
AMBER       = HexColor('#f59e0b')
AMBER_LIGHT = HexColor('#fffbeb')
GREEN       = HexColor('#10b981')
GREEN_LIGHT = HexColor('#ecfdf5')
BLUE        = HexColor('#3b82f6')
BLUE_LIGHT  = HexColor('#eff6ff')
PURPLE      = HexColor('#8b5cf6')
CYAN        = HexColor('#06b6d4')
PINK        = HexColor('#ec4899')
ORANGE      = HexColor('#f97316')

CHART_PALETTE = [INDIGO, CYAN, AMBER, GREEN, PINK, PURPLE, BLUE, ORANGE, RED, HexColor('#84cc16')]

W, H = A4  # 595 x 842

# ── Sample data generators ────────────────────────────────────────────────────
def make_data(provider: str, account_id: str):
    random.seed(hash(account_id) % 9999)
    months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    now = datetime.now()
    month_labels = []
    for i in range(12):
        dt = now - timedelta(days=(11-i)*30)
        month_labels.append(dt.strftime('%b %Y'))

    base = {'aws': 8400, 'azure': 6200, 'gcp': 4800}.get(provider, 7000)
    monthly_costs = [round(base * (0.8 + 0.4*random.random()), 2) for _ in range(12)]
    monthly_costs[-1] = round(base * 1.05, 2)  # current month slight up

    if provider == 'aws':
        services = [
            ('Amazon EC2',        round(base*0.35,2)),
            ('Amazon RDS',        round(base*0.18,2)),
            ('Amazon S3',         round(base*0.12,2)),
            ('AWS Lambda',        round(base*0.08,2)),
            ('Amazon CloudFront', round(base*0.07,2)),
            ('Amazon EKS',        round(base*0.06,2)),
            ('Amazon DynamoDB',   round(base*0.05,2)),
            ('Amazon SQS',        round(base*0.04,2)),
            ('Others',            round(base*0.05,2)),
        ]
        resources = [
            ('EC2 Instances',    142, 'Compute'),
            ('RDS Databases',     18, 'Database'),
            ('S3 Buckets',        67, 'Storage'),
            ('Lambda Functions', 234, 'Serverless'),
            ('EKS Clusters',       4, 'Container'),
            ('VPCs',               8, 'Network'),
            ('Security Groups',  312, 'Security'),
            ('IAM Roles',        189, 'Identity'),
        ]
        nuke = [
            ('Idle EC2 Instances',     4, 'HIGH',   320.00),
            ('Unused EBS Volumes',    12, 'MEDIUM', 180.00),
            ('Old Snapshots',         28, 'LOW',     95.00),
            ('Empty S3 Buckets',       3, 'MEDIUM',   8.50),
            ('Unattached Elastic IPs', 6, 'MEDIUM',  21.60),
            ('Stopped Instances',      9, 'HIGH',   222.40),
        ]
        security_findings = [
            ('CRITICAL', 'Root account MFA not enabled',           'IAM'),
            ('HIGH',     'S3 bucket public read ACL detected',     'S3'),
            ('HIGH',     'Security group allows 0.0.0.0/0 SSH',   'EC2'),
            ('MEDIUM',   'CloudTrail logging disabled in us-west', 'CloudTrail'),
            ('MEDIUM',   'RDS instance not encrypted at rest',     'RDS'),
            ('LOW',      'IAM password policy too permissive',     'IAM'),
            ('LOW',      'Unused IAM access keys (>90 days)',      'IAM'),
        ]
        migration = [
            ('EC2 On-Demand → Reserved (1yr)',  312.40, 'LOW',    94),
            ('GP2 EBS → GP3 EBS',                89.20, 'LOW',    99),
            ('NAT Gateway → NAT Instance',       156.00, 'MEDIUM', 78),
            ('Single-AZ RDS → Read Replica RI',  210.00, 'LOW',    88),
            ('CloudFront → S3 Transfer Accel',    45.00, 'MEDIUM', 71),
        ]
        compliance = [
            ('CIS AWS Foundations',  78, '#6366f1'),
            ('PCI-DSS',              62, '#8b5cf6'),
            ('SOC 2 Type II',        81, '#06b6d4'),
            ('ISO 27001',            74, '#10b981'),
            ('HIPAA',                55, '#f59e0b'),
            ('NIST CSF',             70, '#3b82f6'),
        ]
        config_changes = [
            ('2024-12-01', 'Security Group sg-0ab12 modified',         'EC2',        'HIGH'),
            ('2024-12-03', 'S3 bucket policy updated on prod-assets',  'S3',         'MEDIUM'),
            ('2024-12-05', 'IAM role AdminAccess attached to svc-prod','IAM',        'HIGH'),
            ('2024-12-08', 'RDS parameter group changed',              'RDS',        'LOW'),
            ('2024-12-10', 'CloudTrail trail disabled temporarily',    'CloudTrail', 'CRITICAL'),
            ('2024-12-12', 'Lambda concurrency limit updated',         'Lambda',     'LOW'),
            ('2024-12-15', 'EKS node group scaled from 3 to 8',       'EKS',        'MEDIUM'),
        ]
    elif provider == 'azure':
        services = [
            ('Virtual Machines',      round(base*0.38,2)),
            ('Azure SQL Database',    round(base*0.16,2)),
            ('Azure Blob Storage',    round(base*0.11,2)),
            ('Azure Kubernetes',      round(base*0.09,2)),
            ('Azure Functions',       round(base*0.07,2)),
            ('Azure CDN',             round(base*0.06,2)),
            ('Azure Cosmos DB',       round(base*0.05,2)),
            ('Azure Monitor',         round(base*0.04,2)),
            ('Others',                round(base*0.04,2)),
        ]
        resources = [
            ('Virtual Machines',      88, 'Compute'),
            ('Managed Disks',        124, 'Storage'),
            ('Storage Accounts',      34, 'Storage'),
            ('Azure Functions',      189, 'Serverless'),
            ('AKS Clusters',           3, 'Container'),
            ('Virtual Networks',      12, 'Network'),
            ('Network Security Grps', 98, 'Security'),
            ('Service Principals',    67, 'Identity'),
        ]
        nuke = [
            ('Stopped VMs',             6, 'HIGH',   480.00),
            ('Unattached Managed Disks',14, 'MEDIUM', 210.00),
            ('Old Snapshots',           22, 'LOW',    110.00),
            ('Empty Resource Groups',    5, 'MEDIUM',   0.00),
            ('Unused Public IPs',        9, 'MEDIUM',  32.40),
            ('Orphaned NICs',           11, 'LOW',      0.00),
        ]
        security_findings = [
            ('CRITICAL', 'Subscription-level Owner role assigned broadly','RBAC'),
            ('HIGH',     'Storage account allows public blob access',     'Storage'),
            ('HIGH',     'NSG allows inbound RDP from Internet',          'Network'),
            ('MEDIUM',   'Diagnostic logs disabled on Key Vault',         'KeyVault'),
            ('MEDIUM',   'SQL Server auditing not enabled',               'SQL'),
            ('LOW',      'Service principal creds expiring in 14 days',  'AAD'),
            ('LOW',      'Azure Defender not enabled on subscriptions',   'Defender'),
        ]
        migration = [
            ('On-demand VMs → Reserved (1yr)',    620.00, 'LOW',    91),
            ('HDD Disks → SSD (Premium)',          98.00, 'LOW',    97),
            ('Standalone SQL → Elastic Pool',     245.00, 'MEDIUM', 82),
            ('Azure Blob Hot → Cool tier',        135.00, 'LOW',    89),
            ('Outbound bandwidth optimisation',    67.00, 'MEDIUM', 74),
        ]
        compliance = [
            ('Azure Security Benchmark', 82, '#2563eb'),
            ('CIS Azure',                71, '#0891b2'),
            ('ISO 27001',                77, '#10b981'),
            ('PCI-DSS',                  60, '#8b5cf6'),
            ('SOC 2 Type II',            74, '#06b6d4'),
            ('NIST CSF',                 68, '#f59e0b'),
        ]
        config_changes = [
            ('2024-12-01', 'NSG rule added: allow 3389 inbound',        'Network', 'HIGH'),
            ('2024-12-04', 'Storage account public access enabled',     'Storage', 'HIGH'),
            ('2024-12-06', 'Key Vault access policy modified',          'KeyVault','MEDIUM'),
            ('2024-12-09', 'AKS node pool autoscale enabled',           'AKS',     'LOW'),
            ('2024-12-11', 'SQL firewall rule 0.0.0.0 added',           'SQL',     'CRITICAL'),
            ('2024-12-13', 'Azure Policy assignment removed',           'Policy',  'HIGH'),
            ('2024-12-16', 'VM scale set max instances changed to 20',  'Compute', 'LOW'),
        ]
    else:  # gcp
        services = [
            ('Compute Engine',       round(base*0.34,2)),
            ('Cloud SQL',            round(base*0.17,2)),
            ('Cloud Storage',        round(base*0.12,2)),
            ('Google Kubernetes',    round(base*0.10,2)),
            ('Cloud Functions',      round(base*0.08,2)),
            ('BigQuery',             round(base*0.07,2)),
            ('Cloud CDN',            round(base*0.05,2)),
            ('Cloud Pub/Sub',        round(base*0.04,2)),
            ('Others',               round(base*0.03,2)),
        ]
        resources = [
            ('Compute Instances',    76, 'Compute'),
            ('Persistent Disks',    102, 'Storage'),
            ('Cloud Storage Buckets',48, 'Storage'),
            ('Cloud Functions',     156, 'Serverless'),
            ('GKE Clusters',          2, 'Container'),
            ('VPC Networks',          6, 'Network'),
            ('Firewall Rules',       88, 'Security'),
            ('Service Accounts',     54, 'Identity'),
        ]
        nuke = [
            ('Idle Compute Instances', 5, 'HIGH',   350.00),
            ('Unattached Disks',      10, 'MEDIUM', 145.00),
            ('Old Snapshots',         19, 'LOW',     82.00),
            ('Unused Static IPs',      7, 'MEDIUM',  25.20),
            ('Empty GCS Buckets',      4, 'LOW',      0.00),
            ('Unused Reservations',    3, 'MEDIUM',  96.00),
        ]
        security_findings = [
            ('CRITICAL', 'Service account has Owner role at project level','IAM'),
            ('HIGH',     'GCS bucket with allUsers public access',        'Storage'),
            ('HIGH',     'Firewall rule allows SSH from 0.0.0.0/0',       'VPC'),
            ('MEDIUM',   'Cloud Audit Logs disabled for some services',   'Logging'),
            ('MEDIUM',   'Cloud SQL instance has no backup enabled',      'SQL'),
            ('LOW',      'Service account key older than 90 days',        'IAM'),
            ('LOW',      'VPC Flow Logs disabled on subnets',             'VPC'),
        ]
        migration = [
            ('On-demand → Committed Use (1yr)',  410.00, 'LOW',    93),
            ('Standard PD → Balanced PD',         78.00, 'LOW',    98),
            ('Cloud SQL Standard → HA',           188.00, 'MEDIUM', 80),
            ('GCS Standard → Nearline',           112.00, 'LOW',    86),
            ('Egress optimisation (CDN)',           55.00, 'MEDIUM', 72),
        ]
        compliance = [
            ('CIS GCP',              75, '#6366f1'),
            ('ISO 27001',            79, '#10b981'),
            ('PCI-DSS',              63, '#8b5cf6'),
            ('SOC 2 Type II',        77, '#06b6d4'),
            ('NIST CSF',             69, '#f59e0b'),
            ('HIPAA',                58, '#ef4444'),
        ]
        config_changes = [
            ('2024-12-01', 'Firewall rule created: allow-ssh-all',        'VPC',     'HIGH'),
            ('2024-12-03', 'GCS bucket IAM policy changed to allUsers',   'Storage', 'CRITICAL'),
            ('2024-12-06', 'Service account key created for svc-prod',    'IAM',     'HIGH'),
            ('2024-12-09', 'GKE node pool upgraded to 1.29',              'GKE',     'LOW'),
            ('2024-12-12', 'Cloud SQL backup schedule disabled',          'SQL',     'MEDIUM'),
            ('2024-12-14', 'VPC peering established with external proj',  'VPC',     'MEDIUM'),
            ('2024-12-17', 'BigQuery dataset made publicly accessible',   'BigQuery','HIGH'),
        ]

    total_services = sum(s[1] for s in services)
    services_pct = [(s[0], s[1], round(s[1]/total_services*100, 1)) for s in services]

    return {
        'provider':       provider.upper(),
        'account_id':     account_id,
        'account_name':   f"{'Production' if 'prod' in account_id else 'Development'} Account",
        'region':         {'aws':'us-east-1 / eu-west-1','azure':'East US / West Europe','gcp':'us-central1 / europe-west1'}.get(provider,'global'),
        'report_date':    datetime.now().strftime('%B %d, %Y'),
        'report_month':   datetime.now().strftime('%B %Y'),
        'month_labels':   month_labels,
        'monthly_costs':  monthly_costs,
        'current_cost':   monthly_costs[-1],
        'last_month_cost':monthly_costs[-2],
        'year_total':     sum(monthly_costs),
        'forecast':       round(monthly_costs[-1] * (1 + random.uniform(0.02, 0.08)), 2),
        'services':       services_pct,
        'resources':      resources,
        'nuke':           nuke,
        'security_findings': security_findings,
        'security_score': random.randint(58, 82),
        'migration':      migration,
        'compliance':     compliance,
        'config_changes': config_changes,
        'resource_count': sum(r[1] for r in resources),
    }


# ── Canvas callbacks (header / footer on every page) ─────────────────────────
class ReportCanvas(rl_canvas.Canvas):
    def __init__(self, *args, data=None, **kwargs):
        super().__init__(*args, **kwargs)
        self._data = data or {}
        self._page_num = 0

    def showPage(self):
        self._page_num += 1
        self._draw_chrome()
        super().showPage()

    def save(self):
        self._page_num += 1
        self._draw_chrome()
        super().save()

    def _draw_chrome(self):
        p = self._page_num
        provider = self._data.get('provider', 'CLOUD')
        account_id = self._data.get('account_id', '')

        if p == 1:
            return  # Cover page has its own full-bleed design

        # ── Top bar ──
        self.setFillColor(SLATE_900)
        self.rect(0, H - 28*mm, W, 28*mm, fill=1, stroke=0)

        # Accent stripe
        self.setFillColor(INDIGO)
        self.rect(0, H - 30*mm, W, 2*mm, fill=1, stroke=0)

        # Logo text
        self.setFillColor(white)
        self.setFont('Helvetica-Bold', 10)
        self.drawString(15*mm, H - 18*mm, 'CloudGuard Pro')
        self.setFont('Helvetica', 8)
        self.setFillColor(SLATE_300)
        self.drawString(15*mm, H - 23*mm, f'Cloud Intelligence Report  ·  {provider}  ·  {account_id}')

        # Page number
        self.setFont('Helvetica', 8)
        self.setFillColor(SLATE_300)
        self.drawRightString(W - 15*mm, H - 20*mm, f'Page {p}')

        # ── Bottom bar ──
        self.setFillColor(SLATE_900)
        self.rect(0, 0, W, 12*mm, fill=1, stroke=0)
        self.setFillColor(INDIGO)
        self.rect(0, 12*mm, W, 0.8*mm, fill=1, stroke=0)

        self.setFont('Helvetica', 7)
        self.setFillColor(SLATE_500)
        self.drawString(15*mm, 4*mm, f'Generated {self._data.get("report_date","")}  ·  Confidential — For authorised use only')
        self.drawRightString(W - 15*mm, 4*mm, 'cloudguardpro.io')


# ── Helper styles ─────────────────────────────────────────────────────────────
def styles():
    return {
        'h1': ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=22,
                             textColor=SLATE_900, spaceAfter=4, leading=28),
        'h2': ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=14,
                             textColor=SLATE_900, spaceAfter=4, leading=18),
        'h3': ParagraphStyle('h3', fontName='Helvetica-Bold', fontSize=11,
                             textColor=SLATE_700, spaceAfter=3, leading=15),
        'body': ParagraphStyle('body', fontName='Helvetica', fontSize=9,
                               textColor=SLATE_700, spaceAfter=3, leading=14),
        'small': ParagraphStyle('small', fontName='Helvetica', fontSize=8,
                                textColor=SLATE_500, spaceAfter=2, leading=12),
        'label': ParagraphStyle('label', fontName='Helvetica-Bold', fontSize=8,
                                textColor=SLATE_500, spaceAfter=1, leading=11),
        'caption': ParagraphStyle('caption', fontName='Helvetica', fontSize=7.5,
                                  textColor=SLATE_500, alignment=TA_CENTER),
        'white_h': ParagraphStyle('white_h', fontName='Helvetica-Bold', fontSize=11,
                                  textColor=white, leading=14),
        'white_b': ParagraphStyle('white_b', fontName='Helvetica', fontSize=8.5,
                                  textColor=SLATE_300, leading=13),
        'tag_red':    ParagraphStyle('tag_red',    fontName='Helvetica-Bold', fontSize=7.5, textColor=RED),
        'tag_amber':  ParagraphStyle('tag_amber',  fontName='Helvetica-Bold', fontSize=7.5, textColor=AMBER),
        'tag_green':  ParagraphStyle('tag_green',  fontName='Helvetica-Bold', fontSize=7.5, textColor=GREEN),
        'tag_indigo': ParagraphStyle('tag_indigo', fontName='Helvetica-Bold', fontSize=7.5, textColor=INDIGO),
        'tag_slate':  ParagraphStyle('tag_slate',  fontName='Helvetica-Bold', fontSize=7.5, textColor=SLATE_500),
    }

S = styles()

def severity_color(sev):
    return {'CRITICAL': RED, 'HIGH': ORANGE, 'MEDIUM': AMBER, 'LOW': GREEN}.get(sev, SLATE_500)

def severity_bg(sev):
    return {'CRITICAL': RED_LIGHT, 'HIGH': HexColor('#fff7ed'),
            'MEDIUM': AMBER_LIGHT, 'LOW': GREEN_LIGHT}.get(sev, SLATE_100)

def money(v): return f'${v:,.2f}'
def short_money(v): return f'${v/1000:.1f}k' if v >= 1000 else f'${v:.0f}'


# ── Section divider ───────────────────────────────────────────────────────────
def section_header(title, subtitle=''):
    items = []
    items.append(Spacer(1, 6*mm))
    # Dark pill header
    tbl = Table([[Paragraph(title, S['h2']),
                  Paragraph(subtitle, S['small'])]],
                colWidths=[120*mm, 55*mm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0),(-1,-1), SLATE_50),
        ('LINEBELOW',  (0,0),(-1,-1), 1.5, INDIGO),
        ('TOPPADDING', (0,0),(-1,-1), 6),
        ('BOTTOMPADDING',(0,0),(-1,-1), 6),
        ('LEFTPADDING',(0,0),(0,-1), 8),
        ('RIGHTPADDING',(-1,0),(-1,-1), 8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('ALIGN',(1,0),(1,-1),'RIGHT'),
    ]))
    items.append(tbl)
    items.append(Spacer(1, 4*mm))
    return items


# ── KPI card row ──────────────────────────────────────────────────────────────
def kpi_row(cards):
    """cards = list of (label, value, sub, color)"""
    n = len(cards)
    cw = (175*mm) / n
    cell_data = []
    row = []
    for label, value, sub, col in cards:
        inner = Table([
            [Paragraph(label, S['label'])],
            [Paragraph(value, ParagraphStyle('kv', fontName='Helvetica-Bold',
                                              fontSize=16, textColor=col, leading=20))],
            [Paragraph(sub,   S['small'])],
        ], colWidths=[cw - 8*mm])
        inner.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,-1), white),
            ('TOPPADDING',(0,0),(-1,-1), 5),
            ('BOTTOMPADDING',(0,0),(-1,-1), 5),
            ('LEFTPADDING',(0,0),(-1,-1), 0),
        ]))
        cell = Table([[inner]], colWidths=[cw])
        cell.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,-1), white),
            ('BOX',(0,0),(-1,-1), 0.5, SLATE_300),
            ('LINEBELOW',(0,0),(-1,-1), 3, col),
            ('TOPPADDING',(0,0),(-1,-1), 8),
            ('BOTTOMPADDING',(0,0),(-1,-1), 8),
            ('LEFTPADDING',(0,0),(-1,-1), 8),
            ('RIGHTPADDING',(0,0),(-1,-1), 8),
        ]))
        row.append(cell)

    outer = Table([row], colWidths=[cw]*n)
    outer.setStyle(TableStyle([
        ('LEFTPADDING',(0,0),(-1,-1), 2),
        ('RIGHTPADDING',(0,0),(-1,-1), 2),
    ]))
    return outer


# ── Bar chart drawing ─────────────────────────────────────────────────────────
def bar_chart(month_labels, values, chart_w=175*mm, chart_h=55*mm):
    d = Drawing(chart_w, chart_h)
    n = len(values)
    bar_w = (chart_w - 30*mm) / n
    max_v = max(values) or 1
    plot_h = chart_h - 18*mm
    plot_x = 25*mm
    plot_y = 12*mm

    # Gridlines
    for i in range(5):
        y = plot_y + i * plot_h / 4
        d.add(Line(plot_x, y, chart_w - 5*mm, y,
                   strokeColor=SLATE_100, strokeWidth=0.5))
        label = short_money(max_v * i / 4)
        d.add(String(plot_x - 2*mm, y - 3, label,
                     fontName='Helvetica', fontSize=6.5,
                     fillColor=SLATE_500, textAnchor='end'))

    # Bars
    for i, (label, val) in enumerate(zip(month_labels, values)):
        x = plot_x + i * bar_w
        bh = (val / max_v) * plot_h
        is_last = (i == n - 1)
        fill = INDIGO if is_last else HexColor('#a5b4fc')
        d.add(Rect(x + bar_w*0.1, plot_y, bar_w*0.8, bh,
                   fillColor=fill, strokeWidth=0))
        # Month label
        short = label[:3]
        d.add(String(x + bar_w/2, plot_y - 8,
                     short, fontName='Helvetica', fontSize=6.5,
                     fillColor=SLATE_500, textAnchor='middle'))
        # Value on top of last bar
        if is_last:
            d.add(String(x + bar_w/2, plot_y + bh + 2,
                         short_money(val), fontName='Helvetica-Bold', fontSize=7,
                         fillColor=INDIGO_DARK, textAnchor='middle'))
    return d


# ── Donut chart ───────────────────────────────────────────────────────────────
def donut_chart(slices, size=60*mm):
    """slices = [(label, pct, color), ...]"""
    d = Drawing(size, size)
    cx, cy, r_out, r_in = size/2, size/2, size*0.46, size*0.28
    angle = 90
    for label, pct, col in slices:
        sweep = pct * 3.6
        w = Wedge(cx, cy, r_out, angle, angle - sweep,
                  fillColor=col, strokeColor=white, strokeWidth=1.5)
        w.innerRadius = r_in
        d.add(w)
        angle -= sweep
    return d


# ── Horizontal bar (progress) ─────────────────────────────────────────────────
def h_bar(pct, col, w=80*mm, h=5):
    d = Drawing(w, h + 4)
    d.add(Rect(0, 2, w, h, fillColor=SLATE_100, strokeWidth=0))
    filled = max(2, w * pct / 100)
    d.add(Rect(0, 2, filled, h, fillColor=col, strokeWidth=0))
    return d


# ── PAGE 1: Cover ─────────────────────────────────────────────────────────────
def build_cover(c, data):
    provider = data['provider']
    provider_color = {'AWS': AMBER, 'AZURE': BLUE, 'GCP': GREEN}.get(provider, INDIGO)

    # Full-bleed dark background
    c.setFillColor(SLATE_900)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Decorative circles
    c.setFillColor(HexColor('#1e293b'))
    c.circle(W + 40, H - 40, 180, fill=1, stroke=0)
    c.circle(-40, 60, 120, fill=1, stroke=0)

    # Indigo accent band
    c.setFillColor(INDIGO)
    c.rect(0, H*0.52, W, 4, fill=1, stroke=0)

    # Provider colour stripe left edge
    c.setFillColor(provider_color)
    c.rect(0, 0, 6, H, fill=1, stroke=0)

    # Logo
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 16)
    c.drawString(20*mm, H - 28*mm, 'CloudGuard Pro')
    c.setFont('Helvetica', 9)
    c.setFillColor(SLATE_300)
    c.drawString(20*mm, H - 34*mm, 'Cloud Intelligence Platform')

    # Provider badge
    c.setFillColor(provider_color)
    badge_w, badge_h = 40*mm, 10*mm
    c.roundRect(W - 20*mm - badge_w, H - 32*mm, badge_w, badge_h, 3, fill=1, stroke=0)
    c.setFillColor(SLATE_900)
    c.setFont('Helvetica-Bold', 10)
    c.drawCentredString(W - 20*mm - badge_w/2, H - 27*mm, provider)

    # Main title area
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 34)
    c.drawString(20*mm, H*0.57, 'Cloud Intelligence')
    c.setFont('Helvetica-Bold', 34)
    c.drawString(20*mm, H*0.57 - 40, 'Report')

    c.setFillColor(INDIGO)
    c.setFont('Helvetica-Bold', 13)
    c.drawString(20*mm, H*0.57 - 70, data['report_month'])

    # Divider
    c.setFillColor(SLATE_700)
    c.rect(20*mm, H*0.52 - 8, W - 40*mm, 0.5, fill=1, stroke=0)

    # Account details grid
    details = [
        ('Account ID',    data['account_id']),
        ('Account Name',  data['account_name']),
        ('Provider',      data['provider']),
        ('Region',        data['region']),
        ('Report Period', f"Jan – {data['report_month']}"),
        ('Generated',     data['report_date']),
    ]
    col_x = [20*mm, 100*mm]
    start_y = H*0.52 - 22*mm
    for i, (k, v) in enumerate(details):
        col = i % 2
        row = i // 2
        x = col_x[col]
        y = start_y - row * 14*mm
        c.setFont('Helvetica', 7.5)
        c.setFillColor(SLATE_500)
        c.drawString(x, y + 5, k.upper())
        c.setFont('Helvetica-Bold', 10)
        c.setFillColor(white)
        c.drawString(x, y - 5, v)

    # Summary KPIs at bottom
    kpis = [
        ('Annual Spend',   money(data['year_total'])),
        ('Current Month',  money(data['current_cost'])),
        ('Resources',      str(data['resource_count'])),
        ('Security Score', f"{data['security_score']}/100"),
        ('Potential Savings', money(sum(m[1] for m in data['migration']))),
    ]
    kpi_y = 38*mm
    kpi_w = W / len(kpis)
    c.setFillColor(HexColor('#0f172a'))
    c.rect(0, 0, W, kpi_y + 8*mm, fill=1, stroke=0)
    c.setFillColor(INDIGO)
    c.rect(0, kpi_y + 8*mm, W, 1.5, fill=1, stroke=0)

    for i, (label, val) in enumerate(kpis):
        x = i * kpi_w + kpi_w/2
        c.setFont('Helvetica', 7)
        c.setFillColor(SLATE_500)
        c.drawCentredString(x, kpi_y - 2, label.upper())
        c.setFont('Helvetica-Bold', 12)
        c.setFillColor(white)
        c.drawCentredString(x, kpi_y - 14, val)

    # Confidential footer
    c.setFont('Helvetica', 7)
    c.setFillColor(SLATE_700)
    c.drawCentredString(W/2, 8, 'CONFIDENTIAL — For authorised recipients only  ·  cloudguardpro.io')

    c.showPage()


# ── TABLE OF CONTENTS ─────────────────────────────────────────────────────────
def toc_page():
    items = []
    items.append(Spacer(1, 8*mm))
    items.append(Paragraph('Table of Contents', S['h1']))
    items.append(HRFlowable(width='100%', thickness=2, color=INDIGO, spaceAfter=6*mm))

    sections = [
        ('01', 'Executive Summary',            'Cost overview, key metrics, and health status'),
        ('02', 'Cost Analysis & Forecast',     '12-month trend, service breakdown, daily average'),
        ('03', 'Resource Inventory',           'All provisioned resources by type and category'),
        ('04', 'Cost Optimization',            'Idle resource waste, nuke candidates, quick wins'),
        ('05', 'Migration Advisor',            'Recommended migrations with savings & confidence'),
        ('06', 'Security Findings',            'Vulnerabilities by severity with remediation notes'),
        ('07', 'Security & Compliance',        'Framework scores: CIS, PCI-DSS, SOC 2, ISO 27001'),
        ('08', 'Configuration Changes',        'Audit trail of infrastructure changes this period'),
        ('09', 'Annual Cost Report',           'Month-by-month breakdown, YoY comparison'),
        ('10', 'Recommendations Summary',      'Prioritised action list for next 30/60/90 days'),
    ]

    for num, title, desc in sections:
        row = Table([
            [Paragraph(f'<b>{num}</b>', ParagraphStyle('tn', fontName='Helvetica-Bold',
                        fontSize=11, textColor=INDIGO)),
             Paragraph(f'<b>{title}</b><br/><font size="8" color="#64748b">{desc}</font>',
                       S['body']),
             Paragraph('', S['small'])],
        ], colWidths=[14*mm, 145*mm, 16*mm])
        row.setStyle(TableStyle([
            ('LINEBELOW',(0,0),(-1,-1), 0.4, SLATE_100),
            ('TOPPADDING',(0,0),(-1,-1), 7),
            ('BOTTOMPADDING',(0,0),(-1,-1), 7),
            ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ]))
        items.append(row)

    items.append(PageBreak())
    return items


# ── 01 EXECUTIVE SUMMARY ──────────────────────────────────────────────────────
def section_executive(data):
    d = data
    items = []
    items += section_header('01  Executive Summary',
                            f"Report Period: {d['report_month']}")

    mom_change = (d['current_cost'] - d['last_month_cost']) / d['last_month_cost'] * 100
    trend_text = f"{'Up' if mom_change>=0 else 'Down'} {abs(mom_change):.1f}% MoM"
    total_waste = sum(n[3] for n in d['nuke'])
    total_savings = sum(m[1] for m in d['migration'])
    sec_color = GREEN if d['security_score'] >= 70 else (AMBER if d['security_score'] >= 50 else RED)

    items.append(kpi_row([
        ('Annual Spend',       money(d['year_total']),    'Last 12 months',          INDIGO),
        ('Current Month',      money(d['current_cost']),  trend_text,                BLUE),
        ('Forecasted EOM',     money(d['forecast']),      'End of month estimate',   AMBER),
        ('Security Score',     f"{d['security_score']}/100", 'Composite posture',   sec_color),
    ]))
    items.append(Spacer(1, 4*mm))
    items.append(kpi_row([
        ('Total Resources',    str(d['resource_count']),  'Across all services',     CYAN),
        ('Waste Identified',   money(total_waste),        'Idle & unused resources', RED),
        ('Savings Available',  money(total_savings),      'Migration optimisations', GREEN),
        ('Config Changes',     str(len(d['config_changes'])), 'This period',         PURPLE),
    ]))
    items.append(Spacer(1, 5*mm))

    # Health status table
    critical = sum(1 for f in d['security_findings'] if f[0]=='CRITICAL')
    high     = sum(1 for f in d['security_findings'] if f[0]=='HIGH')
    medium   = sum(1 for f in d['security_findings'] if f[0]=='MEDIUM')
    low      = sum(1 for f in d['security_findings'] if f[0]=='LOW')

    status_data = [
        [Paragraph('<b>Area</b>', S['label']),
         Paragraph('<b>Status</b>', S['label']),
         Paragraph('<b>Details</b>', S['label'])],
        [Paragraph('Cost Health', S['body']),
         Paragraph('<b>MONITOR</b>', ParagraphStyle('amber', fontName='Helvetica-Bold',
                   fontSize=8, textColor=AMBER)),
         Paragraph(f'MoM change: {trend_text}. Annual run rate: {money(d["year_total"])}.', S['small'])],
        [Paragraph('Security Posture', S['body']),
         Paragraph(f'<b>{"GOOD" if d["security_score"]>=70 else "REVIEW"}</b>',
                   ParagraphStyle('sc', fontName='Helvetica-Bold', fontSize=8, textColor=sec_color)),
         Paragraph(f'Score {d["security_score"]}/100. {critical} critical, {high} high findings.', S['small'])],
        [Paragraph('Compliance', S['body']),
         Paragraph('<b>PARTIAL</b>', ParagraphStyle('cp', fontName='Helvetica-Bold',
                   fontSize=8, textColor=AMBER)),
         Paragraph(f'Avg framework score: {round(sum(c[1] for c in d["compliance"])/len(d["compliance"]))}%. Action required on PCI-DSS.', S['small'])],
        [Paragraph('Resource Waste', S['body']),
         Paragraph('<b>ACTION</b>', ParagraphStyle('rw', fontName='Helvetica-Bold',
                   fontSize=8, textColor=RED)),
         Paragraph(f'{money(total_waste)}/mo in idle resources identified. {sum(n[1] for n in d["nuke"])} resources to clean.', S['small'])],
        [Paragraph('Config Drift', S['body']),
         Paragraph('<b>MONITOR</b>', ParagraphStyle('cd', fontName='Helvetica-Bold',
                   fontSize=8, textColor=AMBER)),
         Paragraph(f'{len(d["config_changes"])} changes this period. {sum(1 for c in d["config_changes"] if c[3] in ("CRITICAL","HIGH"))} high/critical.', S['small'])],
    ]

    st = Table(status_data, colWidths=[45*mm, 28*mm, 102*mm])
    st.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0), SLATE_900),
        ('TEXTCOLOR',(0,0),(-1,0), white),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[white, SLATE_50]),
        ('GRID',(0,0),(-1,-1), 0.3, SLATE_300),
        ('TOPPADDING',(0,0),(-1,-1), 7),
        ('BOTTOMPADDING',(0,0),(-1,-1), 7),
        ('LEFTPADDING',(0,0),(-1,-1), 8),
    ]))
    items.append(st)
    items.append(PageBreak())
    return items


# ── 02 COST ANALYSIS ─────────────────────────────────────────────────────────
def section_cost(data):
    d = data
    items = []
    items += section_header('02  Cost Analysis & Forecast',
                            f"12-month trend  ·  {d['report_month']}")

    # Bar chart
    chart = bar_chart(d['month_labels'], d['monthly_costs'])
    items.append(Paragraph('<b>12-Month Cost Trend</b>', S['h3']))
    items.append(chart)
    items.append(Paragraph('Monthly cloud spend. Current month highlighted in indigo.', S['caption']))
    items.append(Spacer(1, 5*mm))

    # Service breakdown — table + donut
    items.append(Paragraph('<b>Cost by Service</b>', S['h3']))

    svc_rows = [[Paragraph('<b>Service</b>', S['label']),
                 Paragraph('<b>Monthly Cost</b>', S['label']),
                 Paragraph('<b>Share</b>', S['label']),
                 Paragraph('<b>Distribution</b>', S['label'])]]
    for i, (name, cost, pct) in enumerate(d['services']):
        col = CHART_PALETTE[i % len(CHART_PALETTE)]
        svc_rows.append([
            Paragraph(name, S['body']),
            Paragraph(f'<b>{money(cost)}</b>', ParagraphStyle('cv', fontName='Helvetica-Bold',
                      fontSize=9, textColor=SLATE_900)),
            Paragraph(f'{pct}%', S['body']),
            h_bar(pct, col, w=55*mm),
        ])

    svc_tbl = Table(svc_rows, colWidths=[65*mm, 32*mm, 18*mm, 60*mm])
    svc_tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0), SLATE_900),
        ('TEXTCOLOR',(0,0),(-1,0), white),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[white, SLATE_50]),
        ('GRID',(0,0),(-1,-1), 0.3, SLATE_300),
        ('TOPPADDING',(0,0),(-1,-1), 6),
        ('BOTTOMPADDING',(0,0),(-1,-1), 6),
        ('LEFTPADDING',(0,0),(-1,-1), 8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    items.append(svc_tbl)
    items.append(Spacer(1, 5*mm))

    # Cost stats row
    mom = (d['current_cost'] - d['last_month_cost']) / d['last_month_cost'] * 100
    daily_avg = d['current_cost'] / datetime.now().day
    items.append(kpi_row([
        ('Last Month',    money(d['last_month_cost']),  'Previous period',       BLUE),
        ('Current Month', money(d['current_cost']),     f'{mom:+.1f}% MoM',      INDIGO),
        ('EOM Forecast',  money(d['forecast']),         'Projected',             AMBER),
        ('Daily Average', money(daily_avg),             'Month to date',         CYAN),
    ]))
    items.append(PageBreak())
    return items


# ── 03 RESOURCE INVENTORY ─────────────────────────────────────────────────────
def section_resources(data):
    d = data
    items = []
    items += section_header('03  Resource Inventory',
                            f"Total: {d['resource_count']} resources")

    rows = [[Paragraph('<b>Resource Type</b>', S['label']),
             Paragraph('<b>Count</b>', S['label']),
             Paragraph('<b>Category</b>', S['label']),
             Paragraph('<b>Volume</b>', S['label'])]]

    max_count = max(r[1] for r in d['resources'])
    cat_colors = {'Compute': INDIGO, 'Storage': CYAN, 'Database': BLUE,
                  'Serverless': PURPLE, 'Container': GREEN, 'Network': AMBER,
                  'Security': RED, 'Identity': ORANGE}

    for rtype, count, cat in d['resources']:
        col = cat_colors.get(cat, SLATE_500)
        rows.append([
            Paragraph(rtype, S['body']),
            Paragraph(f'<b>{count}</b>', ParagraphStyle('rc', fontName='Helvetica-Bold',
                      fontSize=10, textColor=SLATE_900)),
            Paragraph(cat, ParagraphStyle('rcat', fontName='Helvetica-Bold',
                      fontSize=7.5, textColor=col)),
            h_bar(count/max_count*100, col, w=70*mm),
        ])

    tbl = Table(rows, colWidths=[65*mm, 18*mm, 25*mm, 67*mm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0), SLATE_900),
        ('TEXTCOLOR',(0,0),(-1,0), white),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[white, SLATE_50]),
        ('GRID',(0,0),(-1,-1), 0.3, SLATE_300),
        ('TOPPADDING',(0,0),(-1,-1), 8),
        ('BOTTOMPADDING',(0,0),(-1,-1), 8),
        ('LEFTPADDING',(0,0),(-1,-1), 8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    items.append(tbl)
    items.append(PageBreak())
    return items


# ── 04 COST OPTIMIZATION / NUKE ───────────────────────────────────────────────
def section_optimization(data):
    d = data
    items = []
    total_waste = sum(n[3] for n in d['nuke'])
    total_resources = sum(n[1] for n in d['nuke'])
    items += section_header('04  Cost Optimization',
                            f"Waste: {money(total_waste)}/mo  ·  {total_resources} resources")

    items.append(kpi_row([
        ('Monthly Waste',     money(total_waste),      'Idle & unused',          RED),
        ('Annual Waste',      money(total_waste*12),   'Projected annualised',   ORANGE),
        ('Resources to Clean',str(total_resources),    'Candidates for removal', AMBER),
        ('Avg Waste / Item',  money(total_waste/max(total_resources,1)), 'Per resource', INDIGO),
    ]))
    items.append(Spacer(1, 4*mm))

    rows = [[Paragraph('<b>Resource Type</b>', S['label']),
             Paragraph('<b>Count</b>', S['label']),
             Paragraph('<b>Risk</b>', S['label']),
             Paragraph('<b>Monthly Cost</b>', S['label']),
             Paragraph('<b>Annual Cost</b>', S['label'])]]

    for name, count, risk, cost in d['nuke']:
        rcol = severity_color(risk)
        rbg  = severity_bg(risk)
        rows.append([
            Paragraph(name, S['body']),
            Paragraph(str(count), S['body']),
            Paragraph(f'<b>{risk}</b>', ParagraphStyle('rsk', fontName='Helvetica-Bold',
                      fontSize=8, textColor=rcol)),
            Paragraph(money(cost), ParagraphStyle('mc', fontName='Helvetica-Bold',
                      fontSize=9, textColor=RED)),
            Paragraph(money(cost*12), S['body']),
        ])

    # Totals row
    rows.append([
        Paragraph('<b>TOTAL</b>', ParagraphStyle('tot', fontName='Helvetica-Bold',
                  fontSize=9, textColor=white)),
        Paragraph(f'<b>{total_resources}</b>',
                  ParagraphStyle('tot2', fontName='Helvetica-Bold', fontSize=9, textColor=white)),
        Paragraph('', S['small']),
        Paragraph(f'<b>{money(total_waste)}</b>',
                  ParagraphStyle('tot3', fontName='Helvetica-Bold', fontSize=9, textColor=white)),
        Paragraph(f'<b>{money(total_waste*12)}</b>',
                  ParagraphStyle('tot4', fontName='Helvetica-Bold', fontSize=9, textColor=white)),
    ])

    tbl = Table(rows, colWidths=[70*mm, 18*mm, 22*mm, 33*mm, 32*mm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0), SLATE_900),
        ('TEXTCOLOR',(0,0),(-1,0), white),
        ('ROWBACKGROUNDS',(0,1),(-1,-2),[white, SLATE_50]),
        ('BACKGROUND',(0,-1),(-1,-1), RED),
        ('GRID',(0,0),(-1,-1), 0.3, SLATE_300),
        ('TOPPADDING',(0,0),(-1,-1), 8),
        ('BOTTOMPADDING',(0,0),(-1,-1), 8),
        ('LEFTPADDING',(0,0),(-1,-1), 8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    items.append(tbl)
    items.append(Spacer(1, 4*mm))
    items.append(Paragraph(
        '<b>Recommendation:</b> Run a dry-run nuke scan immediately. '
        'Resources flagged HIGH risk should be reviewed within 7 days. '
        'Estimated annual savings upon cleanup: <b>' + money(total_waste*12) + '</b>.',
        S['body']))
    items.append(PageBreak())
    return items


# ── 05 MIGRATION ADVISOR ──────────────────────────────────────────────────────
def section_migration(data):
    d = data
    items = []
    total_savings = sum(m[1] for m in d['migration'])
    items += section_header('05  Migration Advisor',
                            f"Potential: {money(total_savings)}/mo")

    items.append(kpi_row([
        ('Monthly Savings',   money(total_savings),        'If all applied',        GREEN),
        ('Annual Savings',    money(total_savings*12),     'Projected annualised',  GREEN),
        ('Recommendations',   str(len(d['migration'])),    'Actionable paths',      INDIGO),
        ('Avg Confidence',    f"{round(sum(m[3] for m in d['migration'])/len(d['migration']))}%",
         'Model confidence',  CYAN),
    ]))
    items.append(Spacer(1, 4*mm))

    rows = [[Paragraph('<b>Migration Path</b>', S['label']),
             Paragraph('<b>Monthly Saving</b>', S['label']),
             Paragraph('<b>Annual Saving</b>', S['label']),
             Paragraph('<b>Effort</b>', S['label']),
             Paragraph('<b>Confidence</b>', S['label'])]]

    for path, saving, effort, confidence in d['migration']:
        ecol = {'LOW': GREEN, 'MEDIUM': AMBER, 'HIGH': RED}.get(effort, SLATE_500)
        rows.append([
            Paragraph(path, S['body']),
            Paragraph(f'<b>{money(saving)}</b>',
                      ParagraphStyle('ms', fontName='Helvetica-Bold',
                      fontSize=9, textColor=GREEN)),
            Paragraph(money(saving*12), S['small']),
            Paragraph(f'<b>{effort}</b>',
                      ParagraphStyle('me', fontName='Helvetica-Bold',
                      fontSize=8, textColor=ecol)),
            Paragraph(f'{confidence}%', S['body']),
        ])

    rows.append([
        Paragraph('<b>TOTAL POTENTIAL</b>',
                  ParagraphStyle('tp', fontName='Helvetica-Bold', fontSize=9, textColor=white)),
        Paragraph(f'<b>{money(total_savings)}/mo</b>',
                  ParagraphStyle('ts', fontName='Helvetica-Bold', fontSize=9, textColor=white)),
        Paragraph(f'<b>{money(total_savings*12)}/yr</b>',
                  ParagraphStyle('ts2', fontName='Helvetica-Bold', fontSize=9, textColor=white)),
        Paragraph('', S['small']),
        Paragraph('', S['small']),
    ])

    tbl = Table(rows, colWidths=[72*mm, 30*mm, 28*mm, 22*mm, 23*mm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0), SLATE_900),
        ('TEXTCOLOR',(0,0),(-1,0), white),
        ('ROWBACKGROUNDS',(0,1),(-1,-2),[white, SLATE_50]),
        ('BACKGROUND',(0,-1),(-1,-1), GREEN),
        ('GRID',(0,0),(-1,-1), 0.3, SLATE_300),
        ('TOPPADDING',(0,0),(-1,-1), 8),
        ('BOTTOMPADDING',(0,0),(-1,-1), 8),
        ('LEFTPADDING',(0,0),(-1,-1), 8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    items.append(tbl)
    items.append(PageBreak())
    return items


# ── 06 SECURITY FINDINGS ─────────────────────────────────────────────────────
def section_security(data):
    d = data
    items = []
    items += section_header('06  Security Findings',
                            f"Score: {d['security_score']}/100")

    counts = {s: sum(1 for f in d['security_findings'] if f[0]==s)
              for s in ['CRITICAL','HIGH','MEDIUM','LOW']}
    sec_color = GREEN if d['security_score'] >= 70 else (AMBER if d['security_score'] >= 50 else RED)

    items.append(kpi_row([
        ('Security Score',  f"{d['security_score']}/100", 'Composite posture',     sec_color),
        ('Critical',        str(counts['CRITICAL']),       'Immediate action',      RED),
        ('High',            str(counts['HIGH']),           'Action within 7 days',  ORANGE),
        ('Medium / Low',    f"{counts['MEDIUM']} / {counts['LOW']}", 'Plan & review', AMBER),
    ]))
    items.append(Spacer(1, 4*mm))

    rows = [[Paragraph('<b>Severity</b>', S['label']),
             Paragraph('<b>Finding</b>', S['label']),
             Paragraph('<b>Service</b>', S['label']),
             Paragraph('<b>Action</b>', S['label'])]]

    actions = {
        'CRITICAL': 'Remediate immediately',
        'HIGH':     'Fix within 7 days',
        'MEDIUM':   'Schedule for next sprint',
        'LOW':      'Review in quarterly cycle',
    }

    for sev, title, svc in d['security_findings']:
        scol = severity_color(sev)
        rows.append([
            Paragraph(f'<b>{sev}</b>',
                      ParagraphStyle('sv', fontName='Helvetica-Bold',
                      fontSize=8, textColor=scol)),
            Paragraph(title, S['body']),
            Paragraph(svc, ParagraphStyle('svc', fontName='Helvetica-Bold',
                      fontSize=8, textColor=INDIGO)),
            Paragraph(actions.get(sev,'Review'), S['small']),
        ])

    tbl = Table(rows, colWidths=[22*mm, 90*mm, 26*mm, 37*mm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0), SLATE_900),
        ('TEXTCOLOR',(0,0),(-1,0), white),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[white, SLATE_50]),
        ('GRID',(0,0),(-1,-1), 0.3, SLATE_300),
        ('TOPPADDING',(0,0),(-1,-1), 8),
        ('BOTTOMPADDING',(0,0),(-1,-1), 8),
        ('LEFTPADDING',(0,0),(-1,-1), 8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    items.append(tbl)
    items.append(PageBreak())
    return items


# ── 07 COMPLIANCE ─────────────────────────────────────────────────────────────
def section_compliance(data):
    d = data
    items = []
    avg_score = round(sum(c[1] for c in d['compliance']) / len(d['compliance']))
    items += section_header('07  Security & Compliance',
                            f"Avg framework score: {avg_score}%")

    rows = [[Paragraph('<b>Framework</b>', S['label']),
             Paragraph('<b>Score</b>', S['label']),
             Paragraph('<b>Status</b>', S['label']),
             Paragraph('<b>Progress</b>', S['label'])]]

    for name, score, col_hex in d['compliance']:
        col = HexColor(col_hex)
        status = 'COMPLIANT' if score >= 80 else ('PARTIAL' if score >= 60 else 'NON-COMPLIANT')
        scol   = GREEN if score >= 80 else (AMBER if score >= 60 else RED)
        rows.append([
            Paragraph(name, S['body']),
            Paragraph(f'<b>{score}%</b>',
                      ParagraphStyle('cs', fontName='Helvetica-Bold',
                      fontSize=11, textColor=col)),
            Paragraph(f'<b>{status}</b>',
                      ParagraphStyle('cst', fontName='Helvetica-Bold',
                      fontSize=8, textColor=scol)),
            h_bar(score, col, w=72*mm),
        ])

    tbl = Table(rows, colWidths=[60*mm, 20*mm, 30*mm, 65*mm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0), SLATE_900),
        ('TEXTCOLOR',(0,0),(-1,0), white),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[white, SLATE_50]),
        ('GRID',(0,0),(-1,-1), 0.3, SLATE_300),
        ('TOPPADDING',(0,0),(-1,-1), 10),
        ('BOTTOMPADDING',(0,0),(-1,-1), 10),
        ('LEFTPADDING',(0,0),(-1,-1), 8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    items.append(tbl)
    items.append(PageBreak())
    return items


# ── 08 CONFIG CHANGES ────────────────────────────────────────────────────────
def section_config(data):
    d = data
    items = []
    items += section_header('08  Configuration Changes',
                            f"{len(d['config_changes'])} changes this period")

    rows = [[Paragraph('<b>Date</b>', S['label']),
             Paragraph('<b>Change Description</b>', S['label']),
             Paragraph('<b>Service</b>', S['label']),
             Paragraph('<b>Severity</b>', S['label'])]]

    for date, desc, svc, sev in d['config_changes']:
        scol = severity_color(sev)
        rows.append([
            Paragraph(date, S['small']),
            Paragraph(desc, S['body']),
            Paragraph(svc, ParagraphStyle('csvc', fontName='Helvetica-Bold',
                      fontSize=8, textColor=INDIGO)),
            Paragraph(f'<b>{sev}</b>',
                      ParagraphStyle('csev', fontName='Helvetica-Bold',
                      fontSize=8, textColor=scol)),
        ])

    tbl = Table(rows, colWidths=[24*mm, 95*mm, 28*mm, 28*mm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0), SLATE_900),
        ('TEXTCOLOR',(0,0),(-1,0), white),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[white, SLATE_50]),
        ('GRID',(0,0),(-1,-1), 0.3, SLATE_300),
        ('TOPPADDING',(0,0),(-1,-1), 8),
        ('BOTTOMPADDING',(0,0),(-1,-1), 8),
        ('LEFTPADDING',(0,0),(-1,-1), 8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    items.append(tbl)
    items.append(PageBreak())
    return items


# ── 09 ANNUAL COST REPORT ─────────────────────────────────────────────────────
def section_annual(data):
    d = data
    items = []
    items += section_header('09  Annual Cost Report',
                            f"Total: {money(d['year_total'])}")

    rows = [[Paragraph('<b>Month</b>', S['label']),
             Paragraph('<b>Cost</b>', S['label']),
             Paragraph('<b>MoM Change</b>', S['label']),
             Paragraph('<b>% of Annual</b>', S['label']),
             Paragraph('<b>Trend</b>', S['label'])]]

    annual = d['year_total']
    for i, (label, cost) in enumerate(zip(d['month_labels'], d['monthly_costs'])):
        prev = d['monthly_costs'][i-1] if i > 0 else cost
        mom = (cost - prev) / prev * 100 if prev else 0
        pct_annual = cost / annual * 100
        mom_col = RED if mom > 5 else (GREEN if mom < -5 else SLATE_700)
        is_cur = (i == len(d['monthly_costs']) - 1)
        rows.append([
            Paragraph(f'<b>{label}</b>' if is_cur else label,
                      ParagraphStyle('ml', fontName='Helvetica-Bold' if is_cur else 'Helvetica',
                      fontSize=9, textColor=INDIGO if is_cur else SLATE_700)),
            Paragraph(f'<b>{money(cost)}</b>',
                      ParagraphStyle('mc2', fontName='Helvetica-Bold',
                      fontSize=9, textColor=SLATE_900)),
            Paragraph(f'{mom:+.1f}%',
                      ParagraphStyle('mom', fontName='Helvetica-Bold',
                      fontSize=9, textColor=mom_col)),
            Paragraph(f'{pct_annual:.1f}%', S['body']),
            h_bar(pct_annual * 3, INDIGO if is_cur else HexColor('#a5b4fc'), w=55*mm),
        ])

    # Total row
    rows.append([
        Paragraph('<b>TOTAL</b>',
                  ParagraphStyle('tot', fontName='Helvetica-Bold', fontSize=9, textColor=white)),
        Paragraph(f'<b>{money(annual)}</b>',
                  ParagraphStyle('tot2', fontName='Helvetica-Bold', fontSize=9, textColor=white)),
        Paragraph('', S['small']),
        Paragraph('<b>100%</b>',
                  ParagraphStyle('tot3', fontName='Helvetica-Bold', fontSize=9, textColor=white)),
        Paragraph('', S['small']),
    ])

    tbl = Table(rows, colWidths=[30*mm, 30*mm, 26*mm, 26*mm, 63*mm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0), SLATE_900),
        ('TEXTCOLOR',(0,0),(-1,0), white),
        ('ROWBACKGROUNDS',(0,1),(-1,-2),[white, SLATE_50]),
        ('BACKGROUND',(0,-1),(-1,-1), INDIGO_DARK),
        ('GRID',(0,0),(-1,-1), 0.3, SLATE_300),
        ('TOPPADDING',(0,0),(-1,-1), 7),
        ('BOTTOMPADDING',(0,0),(-1,-1), 7),
        ('LEFTPADDING',(0,0),(-1,-1), 8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    items.append(tbl)
    items.append(PageBreak())
    return items


# ── 10 RECOMMENDATIONS ────────────────────────────────────────────────────────
def section_recommendations(data):
    d = data
    items = []
    items += section_header('10  Recommendations Summary', '30 / 60 / 90 day action plan')

    buckets = {
        '30 Days — Immediate': [
            ('HIGH',   f'Remediate {sum(1 for f in d["security_findings"] if f[0] in ("CRITICAL","HIGH"))} critical/high security findings'),
            ('HIGH',   f'Delete {sum(n[1] for n in d["nuke"] if n[2]=="HIGH")} high-risk idle resources ({money(sum(n[3] for n in d["nuke"] if n[2]=="HIGH"))}/mo waste)'),
            ('HIGH',   'Review and tighten IAM/RBAC permissions across all services'),
            ('MEDIUM', f'Apply {sum(1 for m in d["migration"] if m[2]=="LOW")} low-effort migrations ({money(sum(m[1] for m in d["migration"] if m[2]=="LOW"))}/mo savings)'),
        ],
        '60 Days — Short Term': [
            ('MEDIUM', 'Enable logging and monitoring on all critical services'),
            ('MEDIUM', f'Clean up {sum(n[1] for n in d["nuke"] if n[2]=="MEDIUM")} medium-risk idle resources'),
            ('MEDIUM', 'Implement tagging strategy for cost allocation'),
            ('LOW',    'Schedule compliance gap remediation for PCI-DSS and ISO 27001'),
        ],
        '90 Days — Strategic': [
            ('MEDIUM', 'Evaluate Reserved Instance / Committed Use commitments'),
            ('LOW',    'Implement automated nuke schedule for idle resource cleanup'),
            ('LOW',    'Set up cost anomaly detection alerts'),
            ('LOW',    'Complete full compliance audit across all frameworks'),
        ],
    }

    for bucket_title, actions in buckets.items():
        items.append(Spacer(1, 3*mm))
        items.append(Paragraph(f'<b>{bucket_title}</b>', S['h3']))

        rows = []
        for priority, action in actions:
            pcol = severity_color(priority)
            rows.append([
                Paragraph(f'<b>{priority}</b>',
                          ParagraphStyle('pr', fontName='Helvetica-Bold',
                          fontSize=8, textColor=pcol)),
                Paragraph(action, S['body']),
            ])

        tbl = Table(rows, colWidths=[22*mm, 153*mm])
        tbl.setStyle(TableStyle([
            ('ROWBACKGROUNDS',(0,0),(-1,-1),[white, SLATE_50]),
            ('LINEBELOW',(0,0),(-1,-1), 0.3, SLATE_100),
            ('TOPPADDING',(0,0),(-1,-1), 7),
            ('BOTTOMPADDING',(0,0),(-1,-1), 7),
            ('LEFTPADDING',(0,0),(-1,-1), 8),
            ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ]))
        items.append(tbl)

    items.append(Spacer(1, 6*mm))
    items.append(HRFlowable(width='100%', thickness=1, color=SLATE_300))
    items.append(Spacer(1, 4*mm))
    items.append(Paragraph(
        f'<b>Total Savings Opportunity: {money(sum(m[1] for m in d["migration"]) + sum(n[3] for n in d["nuke"]))}/month</b>  '
        f'({money((sum(m[1] for m in d["migration"]) + sum(n[3] for n in d["nuke"]))*12)}/year)',
        ParagraphStyle('big_save', fontName='Helvetica-Bold', fontSize=12,
                       textColor=GREEN, alignment=TA_CENTER)))
    return items


# ── MAIN BUILD ────────────────────────────────────────────────────────────────
def build_report(provider: str, account_id: str, output_path: str):
    data = make_data(provider.lower(), account_id)

    # Use a temp file for the flowable content, then merge with cover
    import tempfile
    tmp = tempfile.mktemp(suffix='.pdf')

    # Build main content with custom canvas
    def canvas_maker(*args, **kwargs):
        return ReportCanvas(*args, data=data, **kwargs)

    doc = SimpleDocTemplate(
        tmp,
        pagesize=A4,
        leftMargin=15*mm, rightMargin=15*mm,
        topMargin=36*mm, bottomMargin=18*mm,
        title=f'CloudGuard Pro — {provider.upper()} Report',
        author='CloudGuard Pro',
        subject=f'Cloud Intelligence Report for {account_id}',
    )

    story = []
    story += toc_page()
    story += section_executive(data)
    story += section_cost(data)
    story += section_resources(data)
    story += section_optimization(data)
    story += section_migration(data)
    story += section_security(data)
    story += section_compliance(data)
    story += section_config(data)
    story += section_annual(data)
    story += section_recommendations(data)

    doc.build(story, canvasmaker=canvas_maker)

    # Now build the cover page and prepend
    from pypdf import PdfWriter, PdfReader
    import io

    cover_buf = io.BytesIO()
    cover_c = rl_canvas.Canvas(cover_buf, pagesize=A4)
    build_cover(cover_c, data)
    cover_c.save()
    cover_buf.seek(0)

    writer = PdfWriter()
    # Add cover
    cover_reader = PdfReader(cover_buf)
    for page in cover_reader.pages:
        writer.add_page(page)
    # Add rest
    main_reader = PdfReader(tmp)
    for page in main_reader.pages:
        writer.add_page(page)

    # Metadata
    writer.add_metadata({
        '/Title':    f'CloudGuard Pro — {provider.upper()} Cloud Intelligence Report',
        '/Author':   'CloudGuard Pro',
        '/Subject':  f'Cloud report for account {account_id}',
        '/Keywords': 'cloud, cost, security, compliance, AWS, Azure, GCP',
        '/Creator':  'CloudGuard Pro Report Engine v2.0',
    })

    with open(output_path, 'wb') as f:
        writer.write(f)

    os.unlink(tmp)
    print(f'Report saved to: {output_path}')
    return output_path


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--provider',   default='aws',        choices=['aws','azure','gcp'])
    parser.add_argument('--account-id', default='prod-aws-001')
    parser.add_argument('--output',     default='cloudguard_report.pdf')
    args = parser.parse_args()
    build_report(args.provider, args.account_id, args.output)
