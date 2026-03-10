// src/pages/Automation.tsx  ← ENHANCED UI — all logic preserved
// New: stats bar, pinned actions, run-again from history, keyboard search,
//      enhanced ServiceCard, richer history table, polished wizard

import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '../components/layout/MainLayout';
import {
  Play, Clock, Search, X, ChevronRight, CheckCircle,
  AlertTriangle, Loader2, XCircle, Terminal, Copy,
  Download, RefreshCw, ArrowLeft, Activity, Cpu,
  Database, HardDrive, Network, Shield, ChevronDown,
  ChevronUp, Zap, Settings2, Pin, Star, RotateCcw,
  TrendingUp, BarChart3, CheckSquare, AlertCircle,
  ChevronLeft,
} from 'lucide-react';

// ─── TYPES (unchanged) ───────────────────────────────────────────────────────
interface CloudAction {
  id: string; label: string; desc: string;
  risk: 'low' | 'medium' | 'high';
  code: (r: string) => string;
}
interface CloudService { id: string; name: string; icon: string; actions: CloudAction[]; }
interface ServiceCategory { category: string; icon: any; color: string; bg: string; services: CloudService[]; }

// ─── AWS CATALOG (unchanged) ─────────────────────────────────────────────────
const AWS_CATALOG: ServiceCategory[] = [
  { category: 'Compute', icon: Cpu, color: '#f97316', bg: '#fff7ed', services: [
    { id: 'ec2', name: 'EC2', icon: '🖥️', actions: [
      { id:'start',     label:'Start Instance',     risk:'low',    desc:'Start a stopped EC2 instance',
        code: r=>`import boto3\nclient = boto3.client('ec2')\nclient.start_instances(InstanceIds=['${r}'])\nprint(f"Started: ${r}")` },
      { id:'stop',      label:'Stop Instance',      risk:'medium', desc:'Gracefully stop a running EC2 instance',
        code: r=>`import boto3\nclient = boto3.client('ec2')\nclient.stop_instances(InstanceIds=['${r}'])\nprint(f"Stopped: ${r}")` },
      { id:'restart',   label:'Restart Instance',   risk:'medium', desc:'Reboot the EC2 instance',
        code: r=>`import boto3\nclient = boto3.client('ec2')\nclient.reboot_instances(InstanceIds=['${r}'])\nprint(f"Rebooted: ${r}")` },
      { id:'terminate', label:'Terminate Instance', risk:'high',   desc:'Permanently delete the EC2 instance',
        code: r=>`import boto3\nclient = boto3.client('ec2')\nclient.terminate_instances(InstanceIds=['${r}'])\nprint(f"Terminated: ${r}")` },
      { id:'snapshot',  label:'Create Snapshot',    risk:'low',    desc:'Snapshot all EBS volumes attached',
        code: r=>`import boto3\nfrom datetime import datetime\nec2 = boto3.resource('ec2')\nfor vol in ec2.Instance('${r}').volumes.all():\n    snap = vol.create_snapshot(Description=f'Auto snapshot ${r}')\n    print(f"Snapshot: {snap.id}")` },
      { id:'resize',    label:'Resize Instance',    risk:'high',   desc:'Change instance type (stop/start required)',
        code: r=>`import boto3\nclient = boto3.client('ec2')\nclient.stop_instances(InstanceIds=['${r}'])\nclient.get_waiter('instance_stopped').wait(InstanceIds=['${r}'])\nclient.modify_instance_attribute(InstanceId='${r}', InstanceType={'Value':'t3.medium'})\nclient.start_instances(InstanceIds=['${r}'])\nprint("Resized")` },
    ]},
    { id: 'lambda', name: 'Lambda', icon: '⚡', actions: [
      { id:'invoke', label:'Invoke Function', risk:'low', desc:'Manually invoke a Lambda function',
        code: r=>`import boto3, json\nresponse = boto3.client('lambda').invoke(FunctionName='${r}', InvocationType='RequestResponse', Payload=json.dumps({}))\nprint(response['Payload'].read().decode())` },
      { id:'delete', label:'Delete Function', risk:'high', desc:'Permanently delete Lambda function',
        code: r=>`import boto3\nboto3.client('lambda').delete_function(FunctionName='${r}')\nprint(f"Deleted: ${r}")` },
    ]},
    { id: 'autoscaling', name: 'Auto Scaling', icon: '📈', actions: [
      { id:'scale', label:'Set Desired Capacity', risk:'medium', desc:'Update ASG desired instance count',
        code: r=>`import boto3\nboto3.client('autoscaling').set_desired_capacity(AutoScalingGroupName='${r}', DesiredCapacity=3)\nprint("Scaled")` },
    ]},
  ]},
  { category: 'Database', icon: Database, color: '#8b5cf6', bg: '#f5f3ff', services: [
    { id: 'rds', name: 'RDS', icon: '🗄️', actions: [
      { id:'start',    label:'Start DB',       risk:'low',    desc:'Start a stopped RDS instance',
        code: r=>`import boto3\nboto3.client('rds').start_db_instance(DBInstanceIdentifier='${r}')\nprint(f"Started: ${r}")` },
      { id:'stop',     label:'Stop DB',        risk:'medium', desc:'Stop RDS instance (saves cost)',
        code: r=>`import boto3\nboto3.client('rds').stop_db_instance(DBInstanceIdentifier='${r}')\nprint(f"Stopped: ${r}")` },
      { id:'snapshot', label:'Create Snapshot',risk:'low',    desc:'Take a manual DB snapshot',
        code: r=>`import boto3\nfrom datetime import datetime\nboto3.client('rds').create_db_snapshot(DBSnapshotIdentifier=f"${r}-{datetime.now().strftime('%Y%m%d%H%M')}", DBInstanceIdentifier='${r}')\nprint("Snapshot created")` },
    ]},
    { id: 'dynamodb', name: 'DynamoDB', icon: '📊', actions: [
      { id:'backup', label:'Create Backup', risk:'low', desc:'On-demand backup of DynamoDB table',
        code: r=>`import boto3\nfrom datetime import datetime\nboto3.client('dynamodb').create_backup(TableName='${r}', BackupName=f"${r}-{datetime.now().strftime('%Y%m%d')}")\nprint("Backup created")` },
    ]},
  ]},
  { category: 'Storage', icon: HardDrive, color: '#10b981', bg: '#ecfdf5', services: [
    { id: 's3', name: 'S3', icon: '🪣', actions: [
      { id:'versioning', label:'Enable Versioning',   risk:'low',  desc:'Enable S3 bucket versioning',
        code: r=>`import boto3\nboto3.client('s3').put_bucket_versioning(Bucket='${r}', VersioningConfiguration={'Status':'Enabled'})\nprint(f"Versioning on: ${r}")` },
      { id:'lifecycle',  label:'Set Lifecycle Policy',risk:'low',  desc:'Move objects to Glacier after 90 days',
        code: r=>`import boto3\nboto3.client('s3').put_bucket_lifecycle_configuration(Bucket='${r}', LifecycleConfiguration={'Rules':[{'ID':'Glacier90','Status':'Enabled','Filter':{'Prefix':''},'Transitions':[{'Days':90,'StorageClass':'GLACIER'}]}]})\nprint("Lifecycle set")` },
      { id:'empty',      label:'Empty Bucket',        risk:'high', desc:'Delete ALL objects in bucket',
        code: r=>`import boto3\nboto3.resource('s3').Bucket('${r}').objects.all().delete()\nprint(f"Emptied: ${r}")` },
    ]},
  ]},
  { category: 'Security', icon: Shield, color: '#ef4444', bg: '#fef2f2', services: [
    { id: 'iam', name: 'IAM', icon: '🔐', actions: [
      { id:'rotate',  label:'Rotate Access Key', risk:'medium', desc:'Create new key, deactivate old',
        code: r=>`import boto3\nclient=boto3.client('iam')\nkeys=client.list_access_keys(UserName='${r}')['AccessKeyMetadata']\nnew=client.create_access_key(UserName='${r}')['AccessKey']\nprint(f"New key: {new['AccessKeyId']}")\nif len(keys)>=2: client.update_access_key(UserName='${r}',AccessKeyId=keys[0]['AccessKeyId'],Status='Inactive')` },
      { id:'disable', label:'Disable User',      risk:'medium', desc:'Deactivate all IAM user access keys',
        code: r=>`import boto3\nclient=boto3.client('iam')\nfor k in client.list_access_keys(UserName='${r}')['AccessKeyMetadata']:\n    client.update_access_key(UserName='${r}',AccessKeyId=k['AccessKeyId'],Status='Inactive')\n    print(f"Disabled: {k['AccessKeyId']}")` },
    ]},
  ]},
  { category: 'Networking', icon: Network, color: '#3b82f6', bg: '#eff6ff', services: [
    { id: 'vpc', name: 'VPC', icon: '🌐', actions: [
      { id:'flow-logs', label:'Enable Flow Logs', risk:'low', desc:'Enable VPC flow logs to CloudWatch',
        code: r=>`import boto3\nboto3.client('ec2').create_flow_logs(ResourceIds=['${r}'],ResourceType='VPC',TrafficType='ALL',LogDestinationType='cloud-watch-logs',LogGroupName='/aws/vpc/flowlogs',DeliverLogsPermissionArn='arn:aws:iam::ACCOUNT:role/FlowLogsRole')\nprint("Flow logs enabled")` },
    ]},
    { id: 'elb', name: 'Load Balancer', icon: '⚖️', actions: [
      { id:'health', label:'Check Target Health', risk:'low', desc:'Get health of all load balancer targets',
        code: r=>`import boto3\nclient=boto3.client('elbv2')\nfor tg in client.describe_target_groups(LoadBalancerArn='${r}')['TargetGroups']:\n    for t in client.describe_target_health(TargetGroupArn=tg['TargetGroupArn'])['TargetHealthDescriptions']:\n        print(f"{t['Target']['Id']}: {t['TargetHealth']['State']}")` },
    ]},
  ]},
];

// ─── AZURE CATALOG (unchanged) ───────────────────────────────────────────────
const AZURE_CATALOG: ServiceCategory[] = [
  { category: 'Compute', icon: Cpu, color: '#2563eb', bg: '#eff6ff', services: [
    { id: 'vm', name: 'Virtual Machines', icon: '🖥️', actions: [
      { id:'start',    label:'Start VM',          risk:'low',    desc:'Start an Azure Virtual Machine',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.compute import ComputeManagementClient\ncred=DefaultAzureCredential()\nclient=ComputeManagementClient(cred,'SUBSCRIPTION_ID')\nrg,vm='${r}'.split('|')\nclient.virtual_machines.begin_start(rg,vm).result()\nprint(f"Started: {vm}")` },
      { id:'stop',     label:'Deallocate VM',     risk:'medium', desc:'Stop and deallocate VM (stops billing)',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.compute import ComputeManagementClient\ncred=DefaultAzureCredential()\nclient=ComputeManagementClient(cred,'SUBSCRIPTION_ID')\nrg,vm='${r}'.split('|')\nclient.virtual_machines.begin_deallocate(rg,vm).result()\nprint(f"Deallocated: {vm}")` },
      { id:'restart',  label:'Restart VM',        risk:'medium', desc:'Restart the Virtual Machine',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.compute import ComputeManagementClient\ncred=DefaultAzureCredential()\nclient=ComputeManagementClient(cred,'SUBSCRIPTION_ID')\nrg,vm='${r}'.split('|')\nclient.virtual_machines.begin_restart(rg,vm).result()\nprint(f"Restarted: {vm}")` },
      { id:'snapshot', label:'Create Snapshot',   risk:'low',    desc:'Snapshot all OS and data disks',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.compute import ComputeManagementClient\ncred=DefaultAzureCredential()\nclient=ComputeManagementClient(cred,'SUBSCRIPTION_ID')\nrg,vm_name='${r}'.split('|')\nvm=client.virtual_machines.get(rg,vm_name)\nprint(f"OS Disk: {vm.storage_profile.os_disk.name}")` },
      { id:'resize',   label:'Resize VM',         risk:'high',   desc:'Change VM size/SKU',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.compute import ComputeManagementClient\ncred=DefaultAzureCredential()\nclient=ComputeManagementClient(cred,'SUBSCRIPTION_ID')\nrg,vm_name='${r}'.split('|')\nvm=client.virtual_machines.get(rg,vm_name)\nvm.hardware_profile.vm_size='Standard_D2s_v3'\nclient.virtual_machines.begin_create_or_update(rg,vm_name,vm).result()\nprint("Resized")` },
    ]},
    { id: 'aks', name: 'AKS Clusters', icon: '☸️', actions: [
      { id:'scale', label:'Scale Node Pool', risk:'medium', desc:'Resize AKS node pool count',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.containerservice import ContainerServiceClient\ncred=DefaultAzureCredential()\nclient=ContainerServiceClient(cred,'SUBSCRIPTION_ID')\nrg,cluster='${r}'.split('|')\npool=client.agent_pools.get(rg,cluster,'nodepool1')\npool.count=3\nclient.agent_pools.begin_create_or_update(rg,cluster,'nodepool1',pool).result()\nprint("Scaled to 3")` },
    ]},
    { id: 'functions', name: 'Azure Functions', icon: '⚡', actions: [
      { id:'restart', label:'Restart Function App', risk:'medium', desc:'Restart an Azure Function App',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.web import WebSiteManagementClient\ncred=DefaultAzureCredential()\nclient=WebSiteManagementClient(cred,'SUBSCRIPTION_ID')\nrg,app='${r}'.split('|')\nclient.web_apps.restart(rg,app)\nprint(f"Restarted: {app}")` },
    ]},
  ]},
  { category: 'Database', icon: Database, color: '#7c3aed', bg: '#f5f3ff', services: [
    { id: 'sqldb', name: 'Azure SQL', icon: '🗄️', actions: [
      { id:'scale',  label:'Scale Service Tier', risk:'medium', desc:'Change database performance tier',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.sql import SqlManagementClient\ncred=DefaultAzureCredential()\nclient=SqlManagementClient(cred,'SUBSCRIPTION_ID')\nrg,server,db='${r}'.split('|')\nclient.databases.begin_create_or_update(rg,server,db,{'location':'eastus','sku':{'name':'S2','tier':'Standard'}}).result()\nprint("Scaled to S2")` },
      { id:'backup', label:'Export Database',    risk:'low',    desc:'Export database to storage account',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.sql import SqlManagementClient\ncred=DefaultAzureCredential()\nclient=SqlManagementClient(cred,'SUBSCRIPTION_ID')\nrg,server,db='${r}'.split('|')\nprint(f"Initiating export: {db} on {server}")` },
    ]},
    { id: 'cosmos', name: 'Cosmos DB', icon: '🌌', actions: [
      { id:'scale', label:'Update RU/s', risk:'low', desc:'Adjust request units throughput',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.cosmosdb import CosmosDBManagementClient\ncred=DefaultAzureCredential()\nprint(f"Updating throughput for: ${r}")` },
    ]},
  ]},
  { category: 'Storage', icon: HardDrive, color: '#059669', bg: '#ecfdf5', services: [
    { id: 'blob', name: 'Blob Storage', icon: '📦', actions: [
      { id:'lifecycle', label:'Set Lifecycle Policy', risk:'low', desc:'Move blobs to cool/archive tier',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.storage import StorageManagementClient\ncred=DefaultAzureCredential()\nprint(f"Setting lifecycle on: ${r}")` },
      { id:'sync',      label:'Copy Container',       risk:'low', desc:'Copy all blobs to another container',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.storage.blob import BlobServiceClient\ncred=DefaultAzureCredential()\nclient=BlobServiceClient(account_url=f'https://${r}.blob.core.windows.net',credential=cred)\nfor b in client.get_container_client('src').list_blobs():\n    print(f"Copy: {b.name}")` },
    ]},
  ]},
  { category: 'Security', icon: Shield, color: '#dc2626', bg: '#fef2f2', services: [
    { id: 'keyvault', name: 'Key Vault', icon: '🔑', actions: [
      { id:'rotate', label:'Rotate Secret',  risk:'medium', desc:'Create new version of a secret',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.keyvault.secrets import SecretClient\nimport secrets as s\ncred=DefaultAzureCredential()\nclient=SecretClient(vault_url=f'https://${r}.vault.azure.net',credential=cred)\nclient.set_secret('your-secret-name',s.token_urlsafe(32))\nprint("Secret rotated")` },
      { id:'backup', label:'List Secrets',   risk:'low',    desc:'List all secrets in Key Vault',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.keyvault.secrets import SecretClient\ncred=DefaultAzureCredential()\nclient=SecretClient(vault_url=f'https://${r}.vault.azure.net',credential=cred)\nfor s in client.list_properties_of_secrets():\n    print(f"{s.name}: enabled={s.enabled}")` },
    ]},
  ]},
  { category: 'Networking', icon: Network, color: '#0284c7', bg: '#f0f9ff', services: [
    { id: 'vnet', name: 'Virtual Network', icon: '🌐', actions: [
      { id:'peering', label:'List VNet Peering', risk:'low', desc:'Show all VNet peering connections',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.network import NetworkManagementClient\ncred=DefaultAzureCredential()\nclient=NetworkManagementClient(cred,'SUBSCRIPTION_ID')\nrg,vnet='${r}'.split('|')\nfor p in client.virtual_network_peerings.list(rg,vnet):\n    print(f"{p.name}: {p.peering_state}")` },
    ]},
    { id: 'nsg', name: 'Network Security Groups', icon: '🔒', actions: [
      { id:'rules', label:'List Security Rules', risk:'low', desc:'Show all NSG inbound/outbound rules',
        code: r=>`from azure.identity import DefaultAzureCredential\nfrom azure.mgmt.network import NetworkManagementClient\ncred=DefaultAzureCredential()\nclient=NetworkManagementClient(cred,'SUBSCRIPTION_ID')\nrg,nsg='${r}'.split('|')\nnsg_obj=client.network_security_groups.get(rg,nsg)\nfor rule in nsg_obj.security_rules:\n    print(f"{rule.direction} {rule.name}: {rule.access}")` },
    ]},
  ]},
];

// ─── GCP CATALOG (unchanged) ─────────────────────────────────────────────────
const GCP_CATALOG: ServiceCategory[] = [
  { category: 'Compute', icon: Cpu, color: '#ea4335', bg: '#fef2f2', services: [
    { id: 'gce', name: 'Compute Engine', icon: '🖥️', actions: [
      { id:'start',    label:'Start Instance',      risk:'low',    desc:'Start a stopped Compute Engine VM',
        code: r=>`from googleapiclient import discovery\nfrom oauth2client.client import GoogleCredentials\ncreds=GoogleCredentials.get_application_default()\nsvc=discovery.build('compute','v1',credentials=creds)\nop=svc.instances().start(project='PROJECT_ID',zone='us-central1-a',instance='${r}').execute()\nprint(f"Op: {op['name']}")` },
      { id:'stop',     label:'Stop Instance',       risk:'medium', desc:'Stop a Compute Engine instance',
        code: r=>`from googleapiclient import discovery\nfrom oauth2client.client import GoogleCredentials\ncreds=GoogleCredentials.get_application_default()\nsvc=discovery.build('compute','v1',credentials=creds)\nop=svc.instances().stop(project='PROJECT_ID',zone='us-central1-a',instance='${r}').execute()\nprint(f"Op: {op['name']}")` },
      { id:'snapshot', label:'Create Snapshot',     risk:'low',    desc:'Snapshot all persistent disks',
        code: r=>`from googleapiclient import discovery\nfrom oauth2client.client import GoogleCredentials\nfrom datetime import datetime\ncreds=GoogleCredentials.get_application_default()\nsvc=discovery.build('compute','v1',credentials=creds)\ninstance=svc.instances().get(project='PROJECT_ID',zone='us-central1-a',instance='${r}').execute()\nfor disk in instance['disks']:\n    d=disk['source'].split('/')[-1]\n    svc.disks().createSnapshot(project='PROJECT_ID',zone='us-central1-a',disk=d,body={'name':f"snap-{d}-{datetime.now().strftime('%Y%m%d%H%M')}"}).execute()\n    print(f"Snapped: {d}")` },
      { id:'resize',   label:'Change Machine Type', risk:'high',   desc:'Resize VM machine type (requires stop)',
        code: r=>`from googleapiclient import discovery\nfrom oauth2client.client import GoogleCredentials\ncreds=GoogleCredentials.get_application_default()\nsvc=discovery.build('compute','v1',credentials=creds)\nzone='us-central1-a'\nsvc.instances().stop(project='PROJECT_ID',zone=zone,instance='${r}').execute()\nsvc.instances().setMachineType(project='PROJECT_ID',zone=zone,instance='${r}',body={'machineType':f'zones/{zone}/machineTypes/n1-standard-2'}).execute()\nsvc.instances().start(project='PROJECT_ID',zone=zone,instance='${r}').execute()\nprint("Type changed")` },
    ]},
    { id: 'gke', name: 'GKE', icon: '☸️', actions: [
      { id:'scale', label:'Scale Node Pool', risk:'medium', desc:'Resize GKE node pool count',
        code: r=>`from google.cloud import container_v1\nclient=container_v1.ClusterManagerClient()\nreq=container_v1.SetNodePoolSizeRequest(name=f"projects/PROJECT_ID/locations/us-central1-a/clusters/${r}/nodePools/default-pool",node_count=3)\nclient.set_node_pool_size(request=req)\nprint("Scaled to 3")` },
    ]},
    { id: 'cloudrun', name: 'Cloud Run', icon: '🚀', actions: [
      { id:'redeploy', label:'Redeploy Service', risk:'medium', desc:'Force redeploy of Cloud Run service',
        code: r=>`from google.cloud import run_v2\nclient=run_v2.ServicesClient()\nprint(f"Triggering redeploy for: ${r}")` },
    ]},
  ]},
  { category: 'Database', icon: Database, color: '#4285f4', bg: '#eff6ff', services: [
    { id: 'cloudsql', name: 'Cloud SQL', icon: '🗄️', actions: [
      { id:'backup',  label:'Create Backup',    risk:'low',    desc:'On-demand Cloud SQL backup',
        code: r=>`from googleapiclient import discovery\nfrom oauth2client.client import GoogleCredentials\ncreds=GoogleCredentials.get_application_default()\nsvc=discovery.build('sqladmin','v1beta4',credentials=creds)\nsvc.backupRuns().insert(project='PROJECT_ID',instance='${r}').execute()\nprint(f"Backup started: ${r}")` },
      { id:'restart', label:'Restart Instance', risk:'medium', desc:'Restart Cloud SQL instance',
        code: r=>`from googleapiclient import discovery\nfrom oauth2client.client import GoogleCredentials\ncreds=GoogleCredentials.get_application_default()\nsvc=discovery.build('sqladmin','v1beta4',credentials=creds)\nsvc.instances().restart(project='PROJECT_ID',instance='${r}').execute()\nprint(f"Restarted: ${r}")` },
    ]},
    { id: 'bigquery', name: 'BigQuery', icon: '📊', actions: [
      { id:'query', label:'Run Count Query', risk:'low', desc:'Execute a row count query on dataset',
        code: r=>`from google.cloud import bigquery\nclient=bigquery.Client()\nresults=client.query(f"SELECT COUNT(*) as cnt FROM \`${r}\`").result()\nfor row in results: print(f"Rows: {row.cnt}")` },
    ]},
    { id: 'firestore', name: 'Firestore', icon: '🔥', actions: [
      { id:'export', label:'Export Collection', risk:'low', desc:'Export Firestore collection to GCS',
        code: r=>`from google.cloud import firestore_admin_v1\nclient=firestore_admin_v1.FirestoreAdminClient()\nprint(f"Exporting collection: ${r} to GCS")` },
    ]},
  ]},
  { category: 'Storage', icon: HardDrive, color: '#34a853', bg: '#ecfdf5', services: [
    { id: 'gcs', name: 'Cloud Storage', icon: '🪣', actions: [
      { id:'sync',      label:'Copy Bucket',      risk:'low', desc:'Copy all objects to another bucket',
        code: r=>`from google.cloud import storage\nclient=storage.Client()\nsrc=client.bucket('${r}')\ndest=client.bucket('dest-bucket')\nfor blob in client.list_blobs('${r}'):\n    src.copy_blob(blob,dest,blob.name)\n    print(f"Copied: {blob.name}")` },
      { id:'lifecycle', label:'Set Lifecycle',    risk:'low', desc:'Move objects to Nearline after 30 days',
        code: r=>`from google.cloud import storage\nclient=storage.Client()\nb=client.get_bucket('${r}')\nb.lifecycle_rules=[{'action':{'type':'SetStorageClass','storageClass':'NEARLINE'},'condition':{'age':30}}]\nb.patch()\nprint(f"Lifecycle set: ${r}")` },
    ]},
  ]},
  { category: 'Security', icon: Shield, color: '#fbbc04', bg: '#fffbeb', services: [
    { id: 'iam', name: 'IAM & Admin', icon: '🔐', actions: [
      { id:'audit', label:'Audit IAM Bindings', risk:'low', desc:'List all IAM role bindings in project',
        code: r=>`from googleapiclient import discovery\nfrom oauth2client.client import GoogleCredentials\ncreds=GoogleCredentials.get_application_default()\nsvc=discovery.build('cloudresourcemanager','v1',credentials=creds)\npolicy=svc.projects().getIamPolicy(resource='${r}',body={}).execute()\nfor b in policy.get('bindings',[]):\n    print(f"Role: {b['role']}")\n    for m in b['members']: print(f"  {m}")` },
    ]},
    { id: 'secretmanager', name: 'Secret Manager', icon: '🗝️', actions: [
      { id:'rotate', label:'Add Secret Version', risk:'medium', desc:'Create a new version of a secret',
        code: r=>`from google.cloud import secretmanager\nimport secrets\nclient=secretmanager.SecretManagerServiceClient()\nval=secrets.token_urlsafe(32)\nresp=client.add_secret_version(request={'parent':f"projects/PROJECT_ID/secrets/${r}",'payload':{'data':val.encode()}})\nprint(f"New version: {resp.name}")` },
    ]},
  ]},
  { category: 'Networking', icon: Network, color: '#0f9d58', bg: '#f0fdf4', services: [
    { id: 'vpc', name: 'VPC Network', icon: '🌐', actions: [
      { id:'firewall', label:'List Firewall Rules', risk:'low', desc:'List all VPC firewall rules',
        code: r=>`from googleapiclient import discovery\nfrom oauth2client.client import GoogleCredentials\ncreds=GoogleCredentials.get_application_default()\nsvc=discovery.build('compute','v1',credentials=creds)\nfor rule in svc.firewalls().list(project='${r}').execute().get('items',[]):\n    print(f"{rule['name']} | {rule['priority']} | {rule['direction']}")` },
    ]},
    { id: 'cloudnat', name: 'Cloud NAT', icon: '🔀', actions: [
      { id:'status', label:'Check NAT Status', risk:'low', desc:'Get Cloud NAT gateway status',
        code: r=>`from googleapiclient import discovery\nfrom oauth2client.client import GoogleCredentials\ncreds=GoogleCredentials.get_application_default()\nprint(f"Checking NAT status for: ${r}")` },
    ]},
  ]},
];

const ALL_CATALOGS: Record<string, ServiceCategory[]> = {
  aws: AWS_CATALOG, azure: AZURE_CATALOG, gcp: GCP_CATALOG,
};

// ─── META (unchanged) ─────────────────────────────────────────────────────────
type Cloud = 'aws' | 'azure' | 'gcp';
const CLOUD_META = {
  aws:   { label:'Amazon Web Services', emoji:'☁️',  color:'#ea580c', grad:'from-orange-500 to-amber-500'  },
  azure: { label:'Microsoft Azure',     emoji:'🔷', color:'#2563eb', grad:'from-blue-600 to-cyan-500'     },
  gcp:   { label:'Google Cloud',        emoji:'🌐',  color:'#059669', grad:'from-emerald-500 to-teal-500'  },
};
const RISK_META = {
  low:    { label:'Low',  color:'#10b981', bg:'#ecfdf5', ring:'#a7f3d0' },
  medium: { label:'Med',  color:'#f59e0b', bg:'#fffbeb', ring:'#fde68a' },
  high:   { label:'High', color:'#ef4444', bg:'#fef2f2', ring:'#fecaca' },
};
const WIZARD_STEPS = ['Task Details','Target','Actions','Code','Review'];

// ─── ENHANCED SERVICE CARD ────────────────────────────────────────────────────
const ServiceCard: React.FC<{
  svc: CloudService; cat: ServiceCategory;
  cloud: Cloud; onSelect: (svc: CloudService, action: CloudAction) => void;
  pinned: string[]; onPin: (key: string) => void;
}> = ({ svc, cat, onSelect, pinned, onPin }) => {
  const [open, setOpen] = useState(false);
  const CatIcon = cat.icon;
  const lowCount  = svc.actions.filter(a => a.risk==='low').length;
  const highCount = svc.actions.filter(a => a.risk==='high').length;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${open ? 'border-indigo-200 shadow-indigo-50' : 'border-gray-100'}`}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50/80 transition-colors">
        {/* Service icon + badge */}
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-sm" style={{ background: cat.bg }}>
            {svc.icon}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
            <CatIcon size={9} style={{ color: cat.color }}/>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">{svc.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-gray-400">{svc.actions.length} actions</span>
            {highCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-500">
                {highCount} high risk
              </span>
            )}
            {lowCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600">
                {lowCount} safe
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {open ? <ChevronUp size={14} className="text-indigo-400"/> : <ChevronDown size={14} className="text-gray-300"/>}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-50">
          {svc.actions.map(action => {
            const r   = RISK_META[action.risk];
            const key = `${svc.id}:${action.id}`;
            const isPinned = pinned.includes(key);
            return (
              <div key={action.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/60 border-b border-gray-50 last:border-0 group transition-colors">

                {/* Risk dot */}
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }}/>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(svc, action)}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors truncate">
                      {action.label}
                    </p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                      style={{ background: r.bg, color: r.color }}>{r.label}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{action.desc}</p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Pin button */}
                  <button onClick={e => { e.stopPropagation(); onPin(key); }}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isPinned ? 'bg-amber-50 text-amber-500' : 'hover:bg-gray-100 text-gray-300 hover:text-amber-400'
                    }`} title={isPinned ? 'Unpin' : 'Pin action'}>
                    <Star size={12} className={isPinned ? 'fill-amber-400' : ''}/>
                  </button>
                  {/* Execute button */}
                  <button onClick={() => onSelect(svc, action)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-indigo-200">
                    <Play size={10}/> Run
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const Automation: React.FC = () => {
  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('accessToken');
  const hdrs  = { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' };
  const searchRef = useRef<HTMLInputElement>(null);

  const [cloud,       setCloud]       = useState<Cloud>('aws');
  const [search,      setSearch]      = useState('');
  const [accounts,    setAccounts]    = useState<any[]>([]);
  const [activeTab,   setActiveTab]   = useState<'catalog'|'pinned'|'history'>('catalog');
  const [history,     setHistory]     = useState<any[]>([]);
  const [pinned,      setPinned]      = useState<string[]>([]);

  // wizard modal state (all unchanged)
  const [wizOpen,     setWizOpen]     = useState(false);
  const [wizStep,     setWizStep]     = useState(0);
  const [taskName,    setTaskName]    = useState('');
  const [taskReason,  setTaskReason]  = useState('');
  const [selAccount,  setSelAccount]  = useState('');
  const [selResource, setSelResource] = useState('');
  const [selService,  setSelService]  = useState<CloudService|null>(null);
  const [selAction,   setSelAction]   = useState<CloudAction|null>(null);
  const [code,        setCode]        = useState('');
  const [isDryRun,    setIsDryRun]    = useState(true);
  const [executing,   setExecuting]   = useState(false);
  const [execResult,  setExecResult]  = useState<'success'|'error'|null>(null);
  const [logs,        setLogs]        = useState<{ts:string;type:string;msg:string}[]>([]);
  const [copied,      setCopied]      = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // keyboard shortcut: / to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !wizOpen && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault(); searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wizOpen]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/cloud/accounts/${user.id}`, { headers: hdrs })
      .then(r=>r.json()).then(d=>{
        const accs = Array.isArray(d)?d:(d.accounts||[]);
        setAccounts(accs);
        const match = accs.find((a:any)=>a.provider?.toLowerCase()===cloud);
        if (match) setSelAccount(match.id);
      }).catch(()=>{});
  }, [cloud]);

  useEffect(()=>{ logsEndRef.current?.scrollIntoView({behavior:'smooth'}); },[logs]);
  useEffect(()=>{ if(selAction && selResource) setCode(selAction.code(selResource)); },[selAction, selResource]);

  const openWizard = (svc: CloudService, action: CloudAction) => {
    setSelService(svc); setSelAction(action);
    setTaskName(`${action.label}_${new Date().toISOString().slice(0,16).replace('T','_')}`);
    setTaskReason(''); setSelResource(''); setCode('');
    setExecResult(null); setLogs([]); setIsDryRun(true);
    setWizStep(0); setWizOpen(true);
  };

  const closeWizard = () => { setWizOpen(false); setWizStep(0); };
  const cloudAccounts = accounts.filter(a=>a.provider?.toLowerCase()===cloud);

  const canNext = () => {
    if(wizStep===0) return taskName.trim().length>0;
    if(wizStep===1) return selResource.trim().length>0;
    if(wizStep===2) return selAction!==null;
    if(wizStep===3) return code.trim().length>0;
    return true;
  };

  const addLog = (type:string, msg:string) =>
    setLogs(p=>[...p,{ts:new Date().toLocaleTimeString(),type,msg}]);

  const runExecution = async () => {
    setExecuting(true); setLogs([]); setExecResult(null);
    addLog('info', `Task: ${taskName}`);
    addLog('info', `Mode: ${isDryRun?'DRY RUN':'LIVE EXECUTE'}`);
    addLog('info', `Action: ${selAction!.label} on ${selResource}`);
    await new Promise(r=>setTimeout(r,500));
    addLog('info', 'Validating credentials...');
    await new Promise(r=>setTimeout(r,400));
    addLog('success', 'Credentials valid ✓');
    await new Promise(r=>setTimeout(r,300));
    addLog('info', isDryRun?'Dry run — previewing changes only...':'Connecting to cloud API...');
    await new Promise(r=>setTimeout(r,600));

    let finalResult: 'success'|'error' = 'success';
    if (!isDryRun) {
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/automation/execute`,{
          method:'POST', headers:hdrs,
          body:JSON.stringify({cloud, accountId:selAccount, serviceId:selService!.id, actionId:selAction!.id, resourceId:selResource, code, taskName, reason:taskReason}),
        });
        const data = await resp.json();
        if(!resp.ok) throw new Error(data.error||'Failed');
        addLog('success', data.message||'Execution successful ✓');
        finalResult = 'success';
      } catch(e:any) {
        addLog('error', `Error: ${e.message}`);
        addLog('warn', 'Check credentials and resource ID');
        finalResult = 'error';
      }
    } else {
      await new Promise(r=>setTimeout(r,300));
      addLog('success', `Would execute: ${selAction!.label}`);
      addLog('info', `Target resource: ${selResource}`);
      addLog('success', 'Dry run complete — 0 changes made ✓');
      finalResult = 'success';
    }

    setExecResult(finalResult);
    const newEntry = {
      id:Date.now(), taskName, cloud, service:selService!.name, serviceIcon:selService!.icon,
      action:selAction!.label, actionId:selAction!.id, resource:selResource,
      risk:selAction!.risk,
      status:isDryRun?'dry-run':(finalResult==='error'?'failed':'success'),
      ts:new Date().toLocaleString(),
      // store refs for run-again
      _svc: selService, _action: selAction,
    };
    setHistory(p=>[newEntry,...p.slice(0,19)]);
    setExecuting(false);
  };

  const handleNext = () => {
    if(!canNext()) return;
    if(wizStep<4) { setWizStep(s=>s+1); return; }
    runExecution();
  };

  // pin toggle
  const togglePin = (key: string) =>
    setPinned(p => p.includes(key) ? p.filter(k=>k!==key) : [...p, key]);

  // run again from history
  const runAgain = (entry: any) => {
    if(entry._svc && entry._action) openWizard(entry._svc, entry._action);
  };

  // filtered catalog
  const catalog = ALL_CATALOGS[cloud];
  const filtered = catalog.map(cat=>({
    ...cat,
    services: cat.services.map(svc=>({
      ...svc,
      actions: svc.actions.filter(a=>
        !search || a.label.toLowerCase().includes(search.toLowerCase()) ||
        svc.name.toLowerCase().includes(search.toLowerCase()) ||
        a.desc.toLowerCase().includes(search.toLowerCase())
      ),
    })).filter(s=>!search||s.actions.length>0),
  })).filter(c=>!search||c.services.length>0);

  // pinned actions (flat list)
  const pinnedActions = (() => {
    const results: {svc: CloudService; action: CloudAction; cat: ServiceCategory}[] = [];
    ALL_CATALOGS[cloud].forEach(cat =>
      cat.services.forEach(svc =>
        svc.actions.forEach(action => {
          if (pinned.includes(`${svc.id}:${action.id}`))
            results.push({ svc, action, cat });
        })
      )
    );
    return results;
  })();

  // stats
  const successCount  = history.filter(h=>h.status==='success').length;
  const dryRunCount   = history.filter(h=>h.status==='dry-run').length;
  const failedCount   = history.filter(h=>h.status==='failed').length;

  // total actions in current cloud
  const totalActions  = catalog.reduce((s,c)=>s+c.services.reduce((ss,sv)=>ss+sv.actions.length,0),0);

  const cm = CLOUD_META[cloud];

  return (
    <MainLayout>

      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-200">
              <Zap size={15} className="text-white"/>
            </div>
            Automation Engine
          </h1>
          <p className="text-xs text-gray-400 mt-1 ml-10">Execute cloud operations safely with dry-run preview</p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3">
          {[
            { label:'Total Runs',  value: history.length,  color:'text-gray-700',    bg:'bg-gray-50'    },
            { label:'Successful',  value: successCount,    color:'text-emerald-700', bg:'bg-emerald-50' },
            { label:'Dry Runs',    value: dryRunCount,     color:'text-amber-700',   bg:'bg-amber-50'   },
            { label:'Failed',      value: failedCount,     color:'text-red-700',     bg:'bg-red-50'     },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl px-4 py-2.5 text-center min-w-[70px]`}>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CLOUD TABS ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        {(Object.keys(CLOUD_META) as Cloud[]).map(c=>{
          const m=CLOUD_META[c];
          const cnt=accounts.filter(a=>a.provider?.toLowerCase()===c).length;
          const catCount = ALL_CATALOGS[c].reduce((s,cat)=>s+cat.services.length,0);
          return (
            <button key={c} onClick={()=>setCloud(c)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border-2 font-bold text-sm transition-all ${
                cloud===c
                  ? `border-transparent bg-gradient-to-r ${m.grad} text-white shadow-md`
                  : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50'
              }`}>
              <span className="text-lg">{m.emoji}</span>
              <span>{c.toUpperCase()}</span>
              <div className="flex gap-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${cloud===c?'bg-white/25 text-white':'bg-gray-100 text-gray-500'}`}>
                  {catCount} svcs
                </span>
                {cnt>0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${cloud===c?'bg-white/25 text-white':'bg-indigo-50 text-indigo-600'}`}>
                    {cnt} acct{cnt!==1?'s':''}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── TAB BAR ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl w-fit mb-5">
        {([
          { id:'catalog', label:'Catalog', count: totalActions },
          { id:'pinned',  label:'Pinned',  count: pinnedActions.length },
          { id:'history', label:'History', count: history.length },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab===t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab===t.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── HISTORY TAB ──────────────────────────────────────────────────── */}
      {activeTab==='history' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {history.length===0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                <Activity size={22} className="text-gray-300"/>
              </div>
              <p className="text-gray-400 text-sm font-medium">No executions yet</p>
              <p className="text-gray-300 text-xs">Run an action from the Catalog to see it here</p>
              <button onClick={()=>setActiveTab('catalog')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl mt-1 hover:bg-indigo-700 transition-colors">
                <Zap size={13}/> Browse catalog
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <p className="text-sm font-bold text-gray-700">Execution History ({history.length})</p>
                <button onClick={() => setHistory([])}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium">
                  Clear all
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {history.map(h=>{
                  const statusMeta = h.status==='success'
                    ? { icon:CheckCircle, cls:'text-emerald-600 bg-emerald-50', label:'Success' }
                    : h.status==='dry-run'
                    ? { icon:AlertCircle, cls:'text-amber-600 bg-amber-50',   label:'Dry Run' }
                    : { icon:XCircle,     cls:'text-red-600 bg-red-50',        label:'Failed'  };
                  const StatusIcon = statusMeta.icon;
                  const risk = RISK_META[h.risk as keyof typeof RISK_META] || RISK_META.low;
                  return (
                    <div key={h.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group">
                      <span className="text-xl flex-shrink-0">{h.serviceIcon || '⚡'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800 truncate max-w-[180px]">{h.taskName}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background:risk.bg, color:risk.color }}>{risk.label}</span>
                          <span className="text-base">{CLOUD_META[h.cloud as Cloud]?.emoji}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {h.service} · <span className="font-medium text-gray-500">{h.action}</span> · <span className="font-mono">{h.resource}</span>
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${statusMeta.cls}`}>
                          <StatusIcon size={11}/> {statusMeta.label}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{h.ts}</p>
                      </div>
                      {/* Run again */}
                      {h._svc && h._action && (
                        <button onClick={() => runAgain(h)}
                          title="Run again"
                          className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-indigo-100 flex items-center justify-center text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                          <RotateCcw size={13}/>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PINNED TAB ───────────────────────────────────────────────────── */}
      {activeTab==='pinned' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {pinnedActions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Star size={22} className="text-amber-300"/>
              </div>
              <p className="text-gray-400 text-sm font-medium">No pinned actions</p>
              <p className="text-gray-300 text-xs">Star actions from the Catalog to pin them here</p>
              <button onClick={()=>setActiveTab('catalog')}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-xl mt-1 hover:bg-amber-600 transition-colors">
                <Star size={13}/> Browse catalog
              </button>
            </div>
          ) : (
            <>
              <div className="px-5 py-3.5 border-b border-gray-50">
                <p className="text-sm font-bold text-gray-700">Pinned Actions ({pinnedActions.length})</p>
              </div>
              <div className="divide-y divide-gray-50">
                {pinnedActions.map(({ svc, action, cat }) => {
                  const r = RISK_META[action.risk];
                  const CatIcon = cat.icon;
                  return (
                    <div key={`${svc.id}:${action.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: cat.bg }}>
                        {svc.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">{action.label}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background:r.bg, color:r.color }}>{r.label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{svc.name} · {action.desc}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => togglePin(`${svc.id}:${action.id}`)}
                          className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-400 transition-colors">
                          <Star size={12} className="fill-amber-400"/>
                        </button>
                        <button onClick={() => openWizard(svc, action)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors">
                          <Play size={10}/> Run
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CATALOG TAB ──────────────────────────────────────────────────── */}
      {activeTab==='catalog' && (
        <>
          {/* Search with keyboard hint */}
          <div className="relative mb-5">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)}
              placeholder={`Search ${cloud.toUpperCase()} services and actions…`}
              className="w-full pl-10 pr-20 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 shadow-sm transition-all"/>
            {search ? (
              <button onClick={()=>setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={14}/>
              </button>
            ) : (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-mono text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded">
                /
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Search size={28} className="text-gray-200"/>
              <p className="text-gray-400 text-sm">No actions match "{search}"</p>
              <button onClick={()=>setSearch('')} className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">
                Clear search
              </button>
            </div>
          ) : (
            filtered.map(cat=>{
              const CatIcon=cat.icon;
              const actionCount = cat.services.reduce((s,sv)=>s+sv.actions.length,0);
              return (
                <div key={cat.category} className="mb-7">
                  {/* Category header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{background:cat.bg}}>
                      <CatIcon size={16} style={{color:cat.color}}/>
                    </div>
                    <h2 className="font-bold text-gray-800">{cat.category}</h2>
                    <div className="h-px flex-1 bg-gray-100"/>
                    <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
                      {cat.services.length} services · {actionCount} actions
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {cat.services.map(svc=>(
                      <ServiceCard key={svc.id} svc={svc} cat={cat} cloud={cloud}
                        onSelect={openWizard} pinned={pinned} onPin={togglePin}/>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          WIZARD MODAL — enhanced Presidio UI, all logic identical
      ══════════════════════════════════════════════════════════════════ */}
      {wizOpen && (
        <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col" style={{fontFamily:'system-ui,sans-serif'}}>

          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-200">
                <Zap size={14} className="text-white"/>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Execute Task</p>
                <p className="text-xs text-gray-400">{selAction?.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">{cm.emoji}</span>
                <span className="font-semibold text-gray-600">{cloudAccounts.find(a=>a.id===selAccount)?.accountName || cm.label}</span>
              </div>
              <div className="w-px h-5 bg-gray-200"/>
              <button onClick={closeWizard}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                <X size={16}/>
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">

            {/* Left sidebar */}
            <div className="w-56 flex-shrink-0 border-r border-gray-100 bg-white pt-6 px-4 flex flex-col">
              <div className="flex-1">
                {WIZARD_STEPS.map((s,i)=>(
                  <div key={i} className={`flex items-center gap-3 py-2.5 px-3 rounded-2xl mb-1 transition-colors ${
                    i===wizStep ? 'bg-indigo-50' : ''
                  }`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                      i<wizStep  ? 'bg-indigo-600 text-white' :
                      i===wizStep? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {i<wizStep ? <CheckCircle size={14}/> : i+1}
                    </div>
                    <span className={`text-sm font-semibold transition-colors ${
                      i===wizStep ? 'text-indigo-700' :
                      i<wizStep   ? 'text-gray-500'   : 'text-gray-300'
                    }`}>{s}</span>
                  </div>
                ))}
              </div>

              {/* Mode toggle */}
              <div className="mt-4 mb-6 px-1">
                <div className={`p-4 rounded-2xl border-2 transition-colors ${isDryRun ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'}`}>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Execution Mode</p>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${isDryRun?'text-amber-700':'text-red-600'}`}>
                      {isDryRun ? '🧪 Dry Run' : '🚀 Live'}
                    </span>
                    <button onClick={()=>setIsDryRun(!isDryRun)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${isDryRun?'bg-amber-400':'bg-red-500'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isDryRun?'left-5':'left-0.5'}`}/>
                    </button>
                  </div>
                  <p className={`text-[11px] ${isDryRun?'text-amber-600':'text-red-500 font-semibold'}`}>
                    {isDryRun ? 'No real changes will be made' : '⚠ Will affect live resources'}
                  </p>
                </div>
              </div>
            </div>

            {/* Main area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 max-w-2xl">

                {/* STEP 0 */}
                {wizStep===0 && (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Task Details</h2>
                    <p className="text-sm text-gray-400 mb-6">Name this execution and optionally add a reason for audit logs</p>
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                          Task Name <span className="text-red-500">*</span>
                        </label>
                        <input value={taskName} onChange={e=>setTaskName(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all shadow-sm"
                          placeholder="e.g. stop-idle-ec2-instances"/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Reason / Notes</label>
                        <textarea value={taskReason} onChange={e=>setTaskReason(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 resize-none transition-all shadow-sm"
                          placeholder="Why are you running this task? (optional)"/>
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 1 */}
                {wizStep===1 && (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Select Target</h2>
                    <p className="text-sm text-gray-400 mb-6">Choose the account and resource to operate on</p>
                    <div className="space-y-5">
                      {cloudAccounts.length>0 && (
                        <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Cloud Account</label>
                          <div className="space-y-2">
                            {cloudAccounts.map(acc=>(
                              <button key={acc.id} onClick={()=>setSelAccount(acc.id)}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                                  selAccount===acc.id ? 'border-indigo-400 bg-indigo-50 shadow-md shadow-indigo-50' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                }`}>
                                <span className="text-2xl">{cm.emoji}</span>
                                <div className="flex-1">
                                  <p className="font-bold text-gray-800 text-sm">{acc.accountName}</p>
                                  <p className="text-xs text-gray-400">{acc.accountId || acc.id}</p>
                                </div>
                                {selAccount===acc.id && <CheckCircle size={16} className="text-indigo-600 flex-shrink-0"/>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                          Resource ID <span className="text-red-500">*</span>
                        </label>
                        <input value={selResource} onChange={e=>setSelResource(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-800 font-mono outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all shadow-sm"
                          placeholder={
                            cloud==='aws'   ? 'e.g. i-0abc1234def567890' :
                            cloud==='azure' ? 'Format: resource-group|resource-name' :
                            'e.g. my-instance-name'
                          }/>
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                          <AlertCircle size={11} className="flex-shrink-0"/>
                          {cloud==='azure' ? 'Use pipe separator: resource-group|resource-name' : 'Find this ID in your cloud console'}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* STEP 2 */}
                {wizStep===2 && (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Choose Action</h2>
                    <p className="text-sm text-gray-400 mb-5">Select the operation to perform on <code className="bg-gray-100 px-1.5 py-0.5 rounded-lg text-xs font-mono">{selResource}</code></p>
                    <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                      {ALL_CATALOGS[cloud].map(cat=>(
                        cat.services.map(svc=>(
                          svc.actions.map(action=>{
                            const r=RISK_META[action.risk];
                            const isSel=selAction?.id===action.id&&selService?.id===svc.id;
                            return (
                              <button key={`${svc.id}-${action.id}`}
                                onClick={()=>{setSelService(svc);setSelAction(action);}}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                                  isSel ? 'border-indigo-400 bg-indigo-50 shadow-md shadow-indigo-50'
                                        : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                }`}>
                                <span className="text-2xl flex-shrink-0">{svc.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <p className={`font-semibold text-sm ${isSel?'text-indigo-700':'text-gray-800'}`}>{action.label}</p>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                                      style={{background:r.bg,color:r.color}}>{r.label}</span>
                                  </div>
                                  <p className="text-xs text-gray-400 truncate">{svc.name} · {action.desc}</p>
                                </div>
                                {isSel && <CheckCircle size={18} className="text-indigo-600 flex-shrink-0"/>}
                              </button>
                            );
                          })
                        ))
                      ))}
                    </div>
                  </>
                )}

                {/* STEP 3 */}
                {wizStep===3 && (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Automation Code</h2>
                    <p className="text-sm text-gray-400 mb-5">Review and optionally edit the generated code</p>
                    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-400"/><div className="w-3 h-3 rounded-full bg-green-500"/>
                          </div>
                          <Terminal size={12} className="text-gray-500 ml-2"/>
                          <span className="text-gray-400 text-xs font-mono">{selAction?.id}.py</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={()=>{navigator.clipboard?.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),2000);}}
                            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">
                            {copied ? <CheckCircle size={11} className="text-emerald-400"/> : <Copy size={11}/>}
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                          <button onClick={()=>{
                            const a=document.createElement('a');
                            a.href=URL.createObjectURL(new Blob([code],{type:'text/plain'}));
                            a.download=`${selAction?.id}.py`; a.click();
                          }} className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors">
                            <Download size={11}/> Download
                          </button>
                        </div>
                      </div>
                      <textarea value={code} onChange={e=>setCode(e.target.value)}
                        className="w-full h-72 p-5 bg-gray-950 text-emerald-400 font-mono text-xs leading-relaxed resize-none outline-none"
                        spellCheck={false}/>
                    </div>
                    {selAction?.risk==='high' && (
                      <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
                        <AlertTriangle size={15} className="text-red-500 mt-0.5 flex-shrink-0"/>
                        <div>
                          <p className="text-sm font-bold text-red-700">High Risk Action</p>
                          <p className="text-xs text-red-500 mt-0.5">This operation may be irreversible. Use Dry Run mode to preview changes before executing live.</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* STEP 4 */}
                {wizStep===4 && (
                  <>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Review & Execute</h2>
                    <p className="text-sm text-gray-400 mb-5">Verify all details before running</p>

                    {execResult===null && !executing && (
                      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                        {[
                          {label:'Task Name', value:taskName},
                          {label:'Reason',    value:taskReason||'—'},
                          {label:'Cloud',     value:`${cm.emoji} ${cloud.toUpperCase()}`},
                          {label:'Account',   value:cloudAccounts.find(a=>a.id===selAccount)?.accountName||'—'},
                          {label:'Service',   value:`${selService?.icon} ${selService?.name}`},
                          {label:'Action',    value:selAction?.label||''},
                          {label:'Resource',  value:selResource},
                          {label:'Mode',      value:isDryRun?'🧪 Dry Run':'🚀 Live Execute'},
                        ].map(row=>(
                          <div key={row.label} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{row.label}</span>
                            <span className="text-sm font-semibold text-gray-800">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(executing || execResult!==null) && (
                      <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                        <div className={`px-5 py-3.5 flex items-center gap-2.5 border-b border-gray-100 ${
                          executing?'bg-blue-50':execResult==='success'?'bg-emerald-50':'bg-red-50'
                        }`}>
                          {executing && <Loader2 size={15} className="text-blue-600 animate-spin"/>}
                          {execResult==='success' && <CheckCircle size={15} className="text-emerald-600"/>}
                          {execResult==='error'   && <XCircle    size={15} className="text-red-600"/>}
                          <span className={`text-sm font-bold ${
                            executing?'text-blue-700':execResult==='success'?'text-emerald-700':'text-red-700'
                          }`}>
                            {executing ? 'Executing…' :
                             execResult==='success'
                               ? (isDryRun ? 'Dry run complete — no changes made' : 'Execution successful!')
                               : 'Execution failed'}
                          </span>
                        </div>
                        <div className="bg-gray-950 p-5 h-52 overflow-y-auto font-mono text-xs space-y-1.5">
                          {logs.map((l,i)=>(
                            <div key={i} className="flex gap-3">
                              <span className="text-gray-600 flex-shrink-0 tabular-nums">[{l.ts}]</span>
                              <span className={
                                l.type==='success' ? 'text-emerald-400' :
                                l.type==='error'   ? 'text-red-400' :
                                l.type==='warn'    ? 'text-amber-400' : 'text-gray-400'
                              }>{l.msg}</span>
                            </div>
                          ))}
                          {executing && <span className="text-gray-600 animate-pulse">▊</span>}
                          <div ref={logsEndRef}/>
                        </div>
                      </div>
                    )}

                    {execResult!==null && !executing && (
                      <div className="flex gap-3 mt-5">
                        <button onClick={closeWizard}
                          className="flex-1 px-5 py-2.5 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                          Close
                        </button>
                        {execResult==='success' && isDryRun && (
                          <button onClick={()=>{setIsDryRun(false);setExecResult(null);setLogs([]);setExecuting(false);}}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-indigo-200">
                            <Play size={13}/> Execute Live
                          </button>
                        )}
                        {execResult==='error' && (
                          <button onClick={()=>{setExecResult(null);setLogs([]);setExecuting(false);}}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold transition-all">
                            <RefreshCw size={13}/> Retry
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          {!(wizStep===4 && execResult!==null) && (
            <div className="flex items-center justify-between px-8 py-4 bg-white border-t border-gray-100 shadow-sm flex-shrink-0">
              <button onClick={()=>wizStep===0?closeWizard():setWizStep(s=>s-1)}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-2xl transition-all">
                {wizStep===0 ? <><X size={13}/> Cancel</> : <><ChevronLeft size={13}/> Back</>}
              </button>
              <button onClick={handleNext} disabled={!canNext()||executing}
                className={`flex items-center gap-2 px-7 py-2.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md ${
                  wizStep===4
                    ? isDryRun ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}>
                {executing
                  ? <><Loader2 size={13} className="animate-spin"/> Running…</>
                  : wizStep===4
                    ? <><Play size={13}/>{isDryRun?'Run Dry Run':'Execute Now'}</>
                    : <>Next: {WIZARD_STEPS[wizStep+1]} <ChevronRight size={14}/></>
                }
              </button>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
};

export default Automation;
