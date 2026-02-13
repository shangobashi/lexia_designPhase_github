import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BrainCircuit, Check, Download, Gauge, PlayCircle, Radar, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { buildApiUrl } from '@/lib/api-base-url';
import { Case } from '@/types/case';
import {
  CaseTask as DbCaseTask,
  CaseTaskStatus,
  DeadlineEvidence as DbDeadlineEvidence,
  DeadlineSource as DbDeadlineSource,
  TaskEvent as DbTaskEvent,
  TaskPolicyEvent as DbTaskPolicyEvent,
  TaskPolicy as DbTaskPolicy,
  createTaskPolicyEvents,
  createTaskEvents,
  completeCaseTask,
  getUserDeadlineEvidence,
  getUserDeadlineSources,
  getUserCaseTasks,
  getUserCases,
  getUserTaskPolicyEvents,
  getUserTaskEventsPage,
  getUserTaskPolicies,
  getUserStorageUsage,
  trimUserTaskEvents,
  upsertCaseTasks,
  upsertTaskPolicies,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase';

// Simple date formatter
const formatDate = (dateString: string, locale: string) => {
  return new Date(dateString).toLocaleDateString(locale);
};

const formatDateTime = (dateString: string, locale: string) => {
  return new Date(dateString).toLocaleString(locale);
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const TASK_SOURCE: TaskSeedSource = 'system_sla';

type QueueStatus = 'overdue' | 'upcoming' | 'scheduled';
type QueuePlaybookId = 'timeline-extraction' | 'strategy-matrix';
type TaskSeedSource = 'system_sla';
type CaseLifecycleStatus = 'active' | 'pending';

interface TaskPolicyConfig {
  slaDays: number;
  reminderWindowDays: number;
}
type TaskPolicyPresetId = 'balanced' | 'expedited' | 'light';
interface TaskPolicyPreset {
  id: TaskPolicyPresetId;
  config: Record<CaseLifecycleStatus, TaskPolicyConfig>;
}

const DEFAULT_TASK_POLICY_CONFIG: Record<CaseLifecycleStatus, TaskPolicyConfig> = {
  active: {
    slaDays: 5,
    reminderWindowDays: 2,
  },
  pending: {
    slaDays: 3,
    reminderWindowDays: 1,
  },
};

const POLICY_MIN_SLA_DAYS = 1;
const POLICY_MAX_SLA_DAYS = 30;
const POLICY_MIN_REMINDER_DAYS = 0;
const POLICY_MAX_REMINDER_DAYS = 14;
const TASK_POLICY_PRESETS: TaskPolicyPreset[] = [
  {
    id: 'balanced',
    config: {
      active: { slaDays: 5, reminderWindowDays: 2 },
      pending: { slaDays: 3, reminderWindowDays: 1 },
    },
  },
  {
    id: 'expedited',
    config: {
      active: { slaDays: 3, reminderWindowDays: 1 },
      pending: { slaDays: 2, reminderWindowDays: 1 },
    },
  },
  {
    id: 'light',
    config: {
      active: { slaDays: 10, reminderWindowDays: 3 },
      pending: { slaDays: 7, reminderWindowDays: 2 },
    },
  },
];
const TASK_POLICY_SOURCE_PRIORITY: Record<string, number> = {
  custom_ui: 4,
  custom: 3,
  policy_ui: 3,
  system_sla: 1,
};

interface CaseTaskSeed {
  caseId: string;
  playbookId: QueuePlaybookId;
  source: TaskSeedSource;
  status: CaseTaskStatus;
  priority: number;
  dueAt: string;
  metadata: Record<string, string | number>;
}

interface DashboardActionItem {
  id: string;
  caseId: string;
  taskId?: string;
  caseTitle: string;
  description: string;
  status: QueueStatus;
  route: string;
  dueDateLabel: string;
  priorityScore: number;
}

interface DeadlineGuardItem {
  id: string;
  caseId: string;
  caseTitle: string;
  taskId?: string;
  dueDateLabel: string;
  urgency: QueueStatus;
  confidenceScore: number;
  evidenceState: 'verified' | 'review';
  sourceDocument: string;
  deadlineType: 'procedural' | 'followup';
  jurisdictionRuleRef: string;
  citationAnchor: string | null;
  persistedEvidenceCount: number;
  derivedFrom: string;
  route: string;
}

interface CompletionHistoryItem {
  id: string;
  caseId: string;
  caseTitle: string;
  eventType: DbTaskEvent['event_type'];
  eventLabel: string;
  playbookId: string;
  playbookLabel: string;
  occurredAt: string;
  occurredAtLabel: string;
}

interface PolicyChangeHistoryItem {
  id: string;
  statusLabel: string;
  changeLabel: string;
  changedAtLabel: string;
  changedAt: string;
}

type HistoryEventFilter = 'all' | DbTaskEvent['event_type'];
type HistoryTimeFilter = 'all' | '30d' | '90d';
type AutoRetentionCadence = 'manual' | 'daily' | 'weekly' | 'monthly';
type AuditDigestCadence = 'off' | 'weekly' | 'monthly';

interface PlaybookOption {
  id: string;
  label: string;
}

type NightRuntimeHealth = 'pass' | 'warn' | 'fail';
type NightRuntimeLaneId = 'message' | 'cron' | 'selfprompt';
type NightRuntimeLaneStatus = 'healthy' | 'degraded' | 'failing' | 'stale' | 'unavailable';

interface NightRuntimeLaneSummary {
  lane: NightRuntimeLaneId;
  status: NightRuntimeLaneStatus;
  task_ids: string[];
  last_task: string | null;
  last_state: string | null;
  last_detail: string | null;
  last_seen_at: string | null;
  minutes_since_seen: number | null;
  recent_failures: number;
  recent_successes: number;
  expected_period_minutes: number | null;
  grace_minutes: number | null;
  stale_after_minutes: number | null;
}

interface NightRuntimeStatusSnapshot {
  timestamp: string;
  health?: NightRuntimeHealth;
  stale_after_minutes?: number;
  grace_minutes?: number;
  window_minutes?: number;
  iteration: number;
  started_at: string;
  finished_at: string;
  consecutive_failures: number;
  last_iteration_failures: number;
  lanes?: Partial<Record<NightRuntimeLaneId, NightRuntimeLaneSummary>>;
}

const HISTORY_EVENT_FILTERS: HistoryEventFilter[] = ['all', 'completed', 'reopened', 'synced', 'created'];
const HISTORY_TIME_FILTERS: HistoryTimeFilter[] = ['30d', '90d', 'all'];
const TASK_EVENT_RETENTION_DAYS = 180;
const TASK_EVENT_RETENTION_LATEST = 200;
const TASK_EVENT_RETENTION_OPTIONS = [30, 90, 180, 365] as const;
const AUTO_RETENTION_CADENCE_OPTIONS: AutoRetentionCadence[] = ['manual', 'daily', 'weekly', 'monthly'];
const AUTO_RETENTION_DEFAULT_CADENCE: AutoRetentionCadence = 'weekly';
const AUDIT_DIGEST_CADENCE_OPTIONS: AuditDigestCadence[] = ['off', 'weekly', 'monthly'];
const AUDIT_DIGEST_DEFAULT_CADENCE: AuditDigestCadence = 'weekly';
const NIGHT_RUNTIME_LANE_IDS: NightRuntimeLaneId[] = ['message', 'cron', 'selfprompt'];
const TRUST_GOVERNANCE_DIGEST_ACTIONS = new Set([
  'trust_admin_granted',
  'trust_admin_revoked',
  'trust_registry_rotated',
  'trust_registry_rolled_back',
]);

const normalizeEventPayload = (payload: unknown): Record<string, unknown> => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  return payload as Record<string, unknown>;
};

const resolveTaskEventPlaybookId = (
  event: DbTaskEvent,
  taskById: Map<string, DbCaseTask>
) => {
  if (event.playbook_id && event.playbook_id.length > 0) {
    return event.playbook_id;
  }

  const payload = normalizeEventPayload(event.payload);
  const payloadPlaybookId = payload.playbookId;
  if (typeof payloadPlaybookId === 'string' && payloadPlaybookId.length > 0) {
    return payloadPlaybookId;
  }

  const linkedTask = taskById.get(event.task_id);
  if (linkedTask?.playbook_id) return linkedTask.playbook_id;
  return 'unknown';
};

const resolvePlaybookLabel = (playbookId: string, t: any) => {
  if (playbookId === 'timeline-extraction') return t.dashboard.workflowLaunchpad.items.deadlineWatch.title;
  if (playbookId === 'strategy-matrix') return t.dashboard.opsRadar.priorities.strategyBranching.title;
  if (playbookId === 'risk-scan') return t.dashboard.opsRadar.priorities.exposureReview.title;
  if (playbookId === 'research-memo') return t.dashboard.workflowLaunchpad.items.researchMemo.title;
  if (playbookId === 'client-brief') return t.dashboard.opsRadar.priorities.clientBriefing.title;
  return playbookId === 'unknown' ? t.dashboard.actionQueue.unknownPlaybook : playbookId;
};

const resolveHistoryEventLabel = (eventType: DbTaskEvent['event_type'], t: any) => {
  if (eventType === 'completed') return t.dashboard.actionQueue.historyEventCompleted;
  if (eventType === 'reopened') return t.dashboard.actionQueue.historyEventReopened;
  if (eventType === 'synced') return t.dashboard.actionQueue.historyEventSynced;
  return t.dashboard.actionQueue.historyEventCreated;
};

const resolveHistoryWindowStart = (filter: HistoryTimeFilter) => {
  if (filter === 'all') return Number.NEGATIVE_INFINITY;
  const days = filter === '30d' ? 30 : 90;
  return Date.now() - (days * DAY_IN_MS);
};

const resolveHistoryWindowDays = (filter: HistoryTimeFilter) => {
  if (filter === '30d') return 30;
  if (filter === '90d') return 90;
  return undefined;
};

const resolveAutoRetentionIntervalMs = (cadence: AutoRetentionCadence) => {
  if (cadence === 'daily') return 1 * DAY_IN_MS;
  if (cadence === 'weekly') return 7 * DAY_IN_MS;
  if (cadence === 'monthly') return 30 * DAY_IN_MS;
  return Number.POSITIVE_INFINITY;
};

const resolveAuditDigestIntervalMs = (cadence: AuditDigestCadence) => {
  if (cadence === 'weekly') return 7 * DAY_IN_MS;
  if (cadence === 'monthly') return 30 * DAY_IN_MS;
  return Number.POSITIVE_INFINITY;
};

const buildAutoRetentionSettingsStorageKey = (userId: string) =>
  `kingsley:auto-retention-settings:${userId}`;

const buildAuditDigestSettingsStorageKey = (userId: string) =>
  `kingsley:audit-digest-settings:${userId}`;

const formatFingerprint = (fingerprint?: string) => {
  if (!fingerprint || fingerprint.length < 16) return fingerprint ?? '';
  return `${fingerprint.slice(0, 12)}...${fingerprint.slice(-12)}`;
};

const resolveSignerRegistryStatusLabel = (status: string | null | undefined, t: any) => {
  if (status === 'active') return t.dashboard.actionQueue.signatureSignerStatusActive;
  if (status === 'expired') return t.dashboard.actionQueue.signatureSignerStatusExpired;
  if (status === 'not_yet_valid') return t.dashboard.actionQueue.signatureSignerStatusNotYetValid;
  if (status === 'revoked') return t.dashboard.actionQueue.signatureSignerStatusRevoked;
  if (status === 'not_listed') return t.dashboard.actionQueue.signatureSignerStatusNotListed;
  return t.dashboard.actionQueue.signatureVerifyNotChecked;
};

const resolveTrustRegistryAdminAccessSourceLabel = (source: string | null | undefined, t: any) => {
  if (source === 'profile_claim') return t.dashboard.actionQueue.signatureRegistryAccessSourceProfileClaim;
  if (source === 'env_allowlist') return t.dashboard.actionQueue.signatureRegistryAccessSourceEnvFallback;
  return t.dashboard.actionQueue.signatureRegistryAccessSourceUnknown;
};

const resolveTrustRegistryEventSnapshotId = (event: AuditTrustRegistryEvent): string => {
  if (typeof event.snapshot_id === 'string' && event.snapshot_id.trim().length > 0) {
    return event.snapshot_id.trim();
  }
  if (typeof event.note !== 'string' || event.note.length === 0) return '';
  const snapshotMatch = event.note.match(/snapshot=([a-z0-9_-]+)/i);
  return snapshotMatch?.[1] ?? '';
};

const buildVerificationReceiptPrintHtml = (
  receipt: AuditVerificationReceipt,
  t: any,
  locale: string
) => {
  const statusText = receipt.verification_passed
    ? t.dashboard.actionQueue.signatureVerifyResultPass
    : t.dashboard.actionQueue.signatureVerifyResultFail;
  const passLabel = t.dashboard.actionQueue.signatureVerifyCheckPass;
  const failLabel = t.dashboard.actionQueue.signatureVerifyCheckFail;
  const notCheckedLabel = t.dashboard.actionQueue.signatureVerifyNotChecked;
  const toCheckLabel = (value: boolean | null) => {
    if (value === null) return notCheckedLabel;
    return value ? passLabel : failLabel;
  };

  const receiptId = receipt.receipt_id;
  const verifiedAt = formatDateTime(receipt.verified_at, locale);
  const signerLifecycle = resolveSignerRegistryStatusLabel(receipt.checks.signer_registry_status, t);
  const escaped = (value: string | null | undefined) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  return `<!doctype html>
<html lang="${locale.startsWith('fr') ? 'fr' : 'en'}">
  <head>
    <meta charset="utf-8" />
    <title>Kingsley Audit Verification Receipt</title>
    <style>
      body { font-family: "Segoe UI", Arial, sans-serif; margin: 24px; color: #0f172a; }
      h1 { font-size: 20px; margin: 0 0 8px; }
      h2 { font-size: 14px; margin: 18px 0 8px; }
      p { margin: 4px 0; font-size: 12px; }
      .status { font-weight: 700; margin-top: 8px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
      .block { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-top: 10px; }
      .mono { font-family: Consolas, Menlo, monospace; font-size: 11px; }
      @media print {
        body { margin: 12mm; }
      }
    </style>
  </head>
  <body>
    <h1>Kingsley - ${escaped(t.dashboard.actionQueue.signatureVerifyDownloadReceipt)}</h1>
    <p class="status">${escaped(statusText)}</p>
    <div class="block">
      <div class="grid">
        <p><strong>${escaped(t.dashboard.actionQueue.signatureVerifyReceiptIdLabel)}:</strong> <span class="mono">${escaped(receiptId)}</span></p>
        <p><strong>${escaped(t.dashboard.actionQueue.signatureTrustPolicyLabel)}:</strong> ${escaped(receipt.trust_policy.mode)}</p>
        <p><strong>${escaped(t.dashboard.actionQueue.signatureSignerLifecycleLabel)}:</strong> ${escaped(signerLifecycle)}</p>
        <p><strong>${escaped(t.dashboard.actionQueue.signatureKeyIdLabel)}:</strong> ${escaped(receipt.signer.key_id)}</p>
      </div>
    </div>
    <h2>${escaped(t.dashboard.actionQueue.signatureTitle)}</h2>
    <div class="block">
      <p><strong>${escaped(t.dashboard.actionQueue.signatureAlgorithmLabel)}:</strong> ${escaped(receipt.signer.algorithm)}</p>
      <p><strong>${escaped(t.dashboard.actionQueue.signatureFingerprintLabel)}:</strong> <span class="mono">${escaped(receipt.signer.public_key_sha256)}</span></p>
      <p><strong>${escaped(t.dashboard.actionQueue.signatureVerifyCheckSignature)}:</strong> ${escaped(toCheckLabel(receipt.checks.signature_valid))}</p>
      <p><strong>${escaped(t.dashboard.actionQueue.signatureVerifyCheckBinding)}:</strong> ${escaped(toCheckLabel(receipt.checks.payload_binds_manifest_hash))}</p>
      <p><strong>${escaped(t.dashboard.actionQueue.signatureVerifyCheckCsv)}:</strong> ${escaped(toCheckLabel(receipt.checks.csv_hash_matches_manifest))}</p>
      <p><strong>${escaped(t.dashboard.actionQueue.signatureVerifyCheckTrust)}:</strong> ${escaped(toCheckLabel(receipt.checks.trust_check_passed))}</p>
    </div>
    <h2>${escaped(t.dashboard.actionQueue.completionHistoryTitle)}</h2>
    <div class="block">
      <p><strong>${escaped(t.dashboard.actionQueue.dueLabel)}:</strong> ${escaped(verifiedAt)}</p>
      <p><strong>Bundle Type:</strong> ${escaped(receipt.manifest.bundle_type)}</p>
      <p><strong>Export Type:</strong> ${escaped(receipt.manifest.export_type)}</p>
      <p><strong>Manifest SHA-256:</strong> <span class="mono">${escaped(receipt.manifest.manifest_sha256)}</span></p>
      <p><strong>CSV SHA-256:</strong> <span class="mono">${escaped(receipt.csv_sha256)}</span></p>
      <p><strong>Row Count:</strong> ${escaped(receipt.manifest.row_count ? String(receipt.manifest.row_count) : '-')}</p>
    </div>
  </body>
</html>`;
};

const caseTaskKey = (caseId: string, playbookId: string, source: string) =>
  `${caseId}::${playbookId}::${source}`;

const normalizeQueueStatus = (daysUntilDue: number, reminderWindowDays: number): QueueStatus => {
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= reminderWindowDays) return 'upcoming';
  return 'scheduled';
};

const cloneTaskPolicyConfig = (
  config: Record<CaseLifecycleStatus, TaskPolicyConfig>
): Record<CaseLifecycleStatus, TaskPolicyConfig> => ({
  active: {
    slaDays: config.active.slaDays,
    reminderWindowDays: config.active.reminderWindowDays,
  },
  pending: {
    slaDays: config.pending.slaDays,
    reminderWindowDays: config.pending.reminderWindowDays,
  },
});

const sanitizeTaskPolicyConfig = (
  config: Record<CaseLifecycleStatus, TaskPolicyConfig>
): Record<CaseLifecycleStatus, TaskPolicyConfig> => {
  const sanitizeEntry = (entry: TaskPolicyConfig): TaskPolicyConfig => {
    const slaDays = Math.min(
      POLICY_MAX_SLA_DAYS,
      Math.max(POLICY_MIN_SLA_DAYS, Math.round(entry.slaDays))
    );
    const reminderWindowDays = Math.min(
      Math.min(POLICY_MAX_REMINDER_DAYS, slaDays - 1),
      Math.max(POLICY_MIN_REMINDER_DAYS, Math.round(entry.reminderWindowDays))
    );

    return { slaDays, reminderWindowDays };
  };

  return {
    active: sanitizeEntry(config.active),
    pending: sanitizeEntry(config.pending),
  };
};

const isTaskPolicyConfigEqual = (
  left: Record<CaseLifecycleStatus, TaskPolicyConfig>,
  right: Record<CaseLifecycleStatus, TaskPolicyConfig>
) =>
  left.active.slaDays === right.active.slaDays
  && left.active.reminderWindowDays === right.active.reminderWindowDays
  && left.pending.slaDays === right.pending.slaDays
  && left.pending.reminderWindowDays === right.pending.reminderWindowDays;

const getTaskPolicySourcePriority = (source: string) =>
  TASK_POLICY_SOURCE_PRIORITY[source] ?? 2;

const buildTaskPolicyConfig = (policies: DbTaskPolicy[]): Record<CaseLifecycleStatus, TaskPolicyConfig> => {
  if (!policies || policies.length === 0) {
    return cloneTaskPolicyConfig(DEFAULT_TASK_POLICY_CONFIG);
  }

  const nextConfig = cloneTaskPolicyConfig(DEFAULT_TASK_POLICY_CONFIG);
  const prioritizedPolicies = [...policies]
    .filter((policy) => policy.case_status === 'active' || policy.case_status === 'pending')
    .sort((left, right) => {
      if (left.case_status !== right.case_status) {
        return left.case_status.localeCompare(right.case_status);
      }

      const sourceDelta = getTaskPolicySourcePriority(right.source) - getTaskPolicySourcePriority(left.source);
      if (sourceDelta !== 0) return sourceDelta;

      const leftUpdatedAt = Date.parse(left.updated_at);
      const rightUpdatedAt = Date.parse(right.updated_at);
      return (Number.isNaN(rightUpdatedAt) ? 0 : rightUpdatedAt) - (Number.isNaN(leftUpdatedAt) ? 0 : leftUpdatedAt);
    });

  const selectedByStatus = new Map<CaseLifecycleStatus, DbTaskPolicy>();
  prioritizedPolicies.forEach((policy) => {
    if (policy.case_status !== 'active' && policy.case_status !== 'pending') return;
    if (selectedByStatus.has(policy.case_status)) return;
    selectedByStatus.set(policy.case_status, policy);
  });

  selectedByStatus.forEach((policy) => {
    nextConfig[policy.case_status] = {
      slaDays: Math.max(1, policy.sla_days),
      reminderWindowDays: Math.max(0, policy.reminder_window_days),
    };
  });

  return sanitizeTaskPolicyConfig(nextConfig);
};

const buildCaseTaskSeeds = (
  cases: Case[],
  taskPolicyConfig: Record<CaseLifecycleStatus, TaskPolicyConfig>
): CaseTaskSeed[] => {
  const nowMs = Date.now();

  return cases
    .filter((caseItem) => caseItem.status === 'active' || caseItem.status === 'pending')
    .map((caseItem) => {
      const lastActivityRaw = caseItem.updatedAt || caseItem.createdAt;
      const lastActivityMs = Date.parse(lastActivityRaw);
      const safeLastActivityMs = Number.isNaN(lastActivityMs) ? nowMs : lastActivityMs;
      const policy =
        caseItem.status === 'active'
          ? taskPolicyConfig.active
          : taskPolicyConfig.pending;

      const dueAtMs = safeLastActivityMs + policy.slaDays * DAY_IN_MS;
      const daysUntilDue = Math.ceil((dueAtMs - nowMs) / DAY_IN_MS);
      const status = normalizeQueueStatus(daysUntilDue, policy.reminderWindowDays);

      // Impact x urgency weighting inspired by service-desk priority matrix operations.
      const urgency = daysUntilDue < 0 ? 4 : daysUntilDue <= 1 ? 3 : daysUntilDue <= 3 ? 2 : 1;
      const impactBase = caseItem.status === 'active' ? 3 : 2;
      const documentSignal = caseItem.documents.length >= 4 ? 1 : caseItem.documents.length > 0 ? 0.5 : 0;
      const consultationSignal = caseItem.messages.length >= 10 ? 1 : caseItem.messages.length >= 4 ? 0.5 : 0;
      const impact = Math.min(4, impactBase + documentSignal + consultationSignal);
      const priority = Math.min(100, Math.round((impact * urgency / 16) * 100));
      const playbookId: QueuePlaybookId = caseItem.status === 'active' ? 'timeline-extraction' : 'strategy-matrix';

      return {
        caseId: caseItem.id,
        playbookId,
        source: TASK_SOURCE,
        status,
        priority,
        dueAt: new Date(dueAtMs).toISOString(),
        metadata: {
          lastActivityAt: lastActivityRaw,
          caseStatus: caseItem.status,
          slaDays: policy.slaDays,
          reminderWindowDays: policy.reminderWindowDays,
          messagesCount: caseItem.messages.length,
          documentsCount: caseItem.documents.length,
        },
      };
    });
};

const toCountArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'count' in value[0]) {
    const countValue = Number((value[0] as { count?: number }).count ?? 0);
    return new Array(Number.isFinite(countValue) ? countValue : 0).fill(null);
  }

  return value;
};

const interpolateTemplate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template
  );

const toCsvCell = (value: string | number | null | undefined) => {
  const normalized = String(value ?? '');
  if (!/[",\n]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, '""')}"`;
};

const buildCsvContent = (
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
) => [
  headers.map((cell) => toCsvCell(cell)).join(','),
  ...rows.map((row) => row.map((cell) => toCsvCell(cell)).join(',')),
].join('\n');

const triggerBrowserDownload = (filename: string, content: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const toSha256Hex = async (content: string) => {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(content));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

interface ExportSignatureMetadata {
  algorithm: string;
  payloadEncoding: string;
  keyId: string;
  publicKeyPem: string;
  signedAt: string;
  signature: string;
  payload: Record<string, unknown>;
}

interface AuditSigningStatusMetadata {
  enabled: boolean;
  algorithm: string;
  keyId?: string;
  payloadEncoding?: string;
  publicKeyPem?: string;
  publicKeySha256?: string;
  trustPolicyMode?: string;
  trustRegistryConfigured?: boolean;
  keyIdTrusted?: boolean | null;
  publicKeyTrusted?: boolean | null;
  signerRegistryStatus?: string | null;
  trustCheckPassed?: boolean;
}

interface AuditVerificationReceipt {
  receipt_id: string;
  receipt_version: number;
  verified_at: string;
  verification_passed: boolean;
  checks: {
    signature_valid: boolean;
    payload_binds_manifest_hash: boolean;
    csv_hash_matches_manifest: boolean | null;
    key_id_trusted: boolean | null;
    public_key_trusted: boolean | null;
    signer_registry_status: string | null;
    trust_check_passed: boolean;
  };
  signer: {
    key_id: string;
    algorithm: string;
    payload_encoding: string;
    public_key_sha256: string;
  };
  manifest: {
    bundle_type: string | null;
    export_type: string | null;
    generated_at: string | null;
    manifest_sha256: string;
    row_count: number | null;
  };
  trust_policy: {
    mode: string;
    trust_registry_configured: boolean;
    enforced_for_pass_fail: boolean;
  };
  payload: Record<string, unknown>;
  csv_sha256: string | null;
}

interface AuditTrustedSignerEntry {
  key_id: string;
  public_key_sha256: string;
  not_before: string;
  not_after: string;
  status: string;
  source?: string;
}

interface AuditTrustRegistrySnapshot {
  management_enabled: boolean;
  trust_policy_mode: string;
  trust_registry_configured: boolean;
  env_entries_count: number;
  runtime_entries_count: number;
  env_entries: AuditTrustedSignerEntry[];
  runtime_entries: AuditTrustedSignerEntry[];
  admin_access?: {
    source?: string;
    role_lookup_available?: boolean;
  };
}

interface AuditTrustRegistryEvent {
  action: string;
  actor_user_id: string | null;
  entries_count: number;
  note: string | null;
  created_at: string;
  target_user_id?: string | null;
  target_email?: string | null;
  snapshot_id?: string | null;
  admin_access_source?: string | null;
}

interface AuditTrustRegistryHistoryPage {
  events: AuditTrustRegistryEvent[];
  nextOffset: number;
  hasMore: boolean;
}
interface AuditReadinessExportHistoryEntry {
  id: string;
  signature_mode: 'local_checksum' | 'server_attested';
  cadence: 'off' | 'weekly' | 'monthly';
  playbook_scope: string;
  case_scope: 'all' | 'case-linked' | 'ad-hoc';
  event_count: number;
  csv_sha256: string;
  manifest_sha256: string;
  artifact_id?: string | null;
  artifact_receipt_sha256?: string | null;
  artifact_retention_expires_at?: string | null;
  artifact_signature_algorithm?: string | null;
  artifact_signature_key_id?: string | null;
  created_at: string;
}

type AuditArtifactRetentionHealth = 'active' | 'expiring' | 'expired' | 'unknown';

interface AuditReadinessExportHistoryPage {
  events: AuditReadinessExportHistoryEntry[];
  nextOffset: number;
  hasMore: boolean;
}

interface AuditExportArtifactEntry {
  id: string;
  artifact_type: string;
  case_ref: string | null;
  event_count: number;
  csv_sha256: string;
  manifest_sha256: string;
  receipt_sha256: string;
  signature_algorithm: string;
  signature_key_id: string | null;
  retention_expires_at: string;
  created_at: string;
}

interface AuditExportArtifactPage {
  artifacts: AuditExportArtifactEntry[];
  nextOffset: number;
  hasMore: boolean;
}

interface AuditExportArtifactReceipt {
  artifact_id: string;
  artifact_type: string;
  case_ref: string | null;
  event_count: number;
  csv_sha256: string;
  manifest_sha256: string;
  receipt_sha256: string;
  created_at: string;
  retention_expires_at: string;
  signature: {
    algorithm: string;
    key_id: string | null;
    value: string;
  };
  payload: Record<string, unknown>;
}

interface AuditTrustGovernanceDigestCounts {
  admin_mutation_count: number;
  rollback_count: number;
  rotation_count: number;
}

interface AuditTrustGovernanceDigestRunbook {
  latest_rotation_at: string | null;
  latest_rotation_snapshot_id: string | null;
  latest_rollback_at: string | null;
  latest_rollback_snapshot_id: string | null;
  runtime_entries_count: number;
  runtime_active_now_count: number;
}

interface AuditTrustGovernanceDigest {
  generated_at: string;
  events: AuditTrustRegistryEvent[];
  returned_count: number;
  total_count: number;
  counts: AuditTrustGovernanceDigestCounts;
  rotation_runbook: AuditTrustGovernanceDigestRunbook;
}

interface AuditTrustAdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  is_trust_admin: boolean;
  updated_at: string;
}

interface AuditTrustAdminDirectoryResponse {
  admins: AuditTrustAdminProfile[];
  adminAccessSource: string | null;
  roleLookupAvailable: boolean;
}

interface AuditTrustRegistryRollbackSnapshot {
  snapshot_id: string;
  created_at: string;
  actor_user_id: string | null;
  entries_count: number;
  note: string | null;
  source: string;
}

interface AuditTrustRegistryRotationDraftPreview {
  entries: AuditTrustRegistryDraftEntry[];
  issues: Array<{ level: 'error' | 'warning'; label: string }>;
}

interface AuditTrustRegistryRotationPreflightSummary {
  total_entries: number;
  env_entries_count: number;
  runtime_entries_count: number;
  active_now_count: number;
  active_in_24h_count: number;
  staged_entries_count: number;
  revoked_entries_count: number;
  disabled_entries_count: number;
}

interface AuditTrustRegistryRotationPreflight {
  valid: boolean;
  summary: AuditTrustRegistryRotationPreflightSummary;
  warnings: string[];
  errors: string[];
}

type AuditTrustedSignerStatus = 'active' | 'revoked' | 'disabled';
type TrustRegistryValidationIssue =
  | 'identity_required'
  | 'fingerprint_invalid'
  | 'not_before_invalid'
  | 'not_after_invalid'
  | 'window_invalid'
  | 'duplicate';

interface AuditTrustRegistryDraftEntry {
  id: string;
  keyId: string;
  publicKeySha256: string;
  notBefore: string;
  notAfter: string;
  status: AuditTrustedSignerStatus;
}

const TRUST_REGISTRY_FINGERPRINT_REGEX = /^[a-f0-9]{64}$/i;
const TRUST_ADMIN_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MAX_TRUST_REGISTRY_ENTRIES = 200;
const TRUST_REGISTRY_ROTATION_MIN_OVERLAP_DAYS = 1;
const TRUST_REGISTRY_ROTATION_MAX_OVERLAP_DAYS = 90;
const AUDIT_TRUST_REGISTRY_STATUS_OPTIONS: AuditTrustedSignerStatus[] = ['active', 'revoked', 'disabled'];

const createAuditTrustRegistryDraftId = () =>
  `signer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeAuditTrustedSignerStatus = (status: string | null | undefined): AuditTrustedSignerStatus => {
  if (status === 'revoked' || status === 'disabled') return status;
  return 'active';
};

const toTrustRegistryLocalDateTimeInput = (rawValue: string) => {
  const value = rawValue.trim();
  if (value.length === 0) return '';
  const parsedMs = Date.parse(value);
  if (Number.isNaN(parsedMs)) return '';
  const date = new Date(parsedMs);
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return localDate.toISOString().slice(0, 16);
};

const toTrustRegistryIsoTimestamp = (rawValue: string) => {
  const value = rawValue.trim();
  if (value.length === 0) return '';
  const parsedMs = Date.parse(value);
  if (Number.isNaN(parsedMs)) return null;
  return new Date(parsedMs).toISOString();
};

const createEmptyTrustRegistryDraftEntry = (): AuditTrustRegistryDraftEntry => ({
  id: createAuditTrustRegistryDraftId(),
  keyId: '',
  publicKeySha256: '',
  notBefore: '',
  notAfter: '',
  status: 'active',
});

const mapTrustedSignerEntryToDraftEntry = (
  entry: AuditTrustedSignerEntry
): AuditTrustRegistryDraftEntry => ({
  id: createAuditTrustRegistryDraftId(),
  keyId: entry.key_id ?? '',
  publicKeySha256: entry.public_key_sha256 ?? '',
  notBefore: toTrustRegistryLocalDateTimeInput(entry.not_before ?? ''),
  notAfter: toTrustRegistryLocalDateTimeInput(entry.not_after ?? ''),
  status: normalizeAuditTrustedSignerStatus(entry.status),
});

const buildTrustRegistryDraftEntries = (entries: AuditTrustedSignerEntry[]) =>
  entries.map((entry) => mapTrustedSignerEntryToDraftEntry(entry));

const isTrustRegistryDraftEntryBlank = (entry: AuditTrustRegistryDraftEntry) =>
  entry.keyId.trim().length === 0
  && entry.publicKeySha256.trim().length === 0
  && entry.notBefore.trim().length === 0
  && entry.notAfter.trim().length === 0;

const validateTrustRegistryDraftEntries = (
  entries: AuditTrustRegistryDraftEntry[]
): Record<string, TrustRegistryValidationIssue[]> => {
  const issuesByEntry: Record<string, TrustRegistryValidationIssue[]> = {};
  const seenIdentityKeys = new Set<string>();

  for (const entry of entries) {
    const issues: TrustRegistryValidationIssue[] = [];
    const keyId = entry.keyId.trim();
    const fingerprint = entry.publicKeySha256.trim().toLowerCase();
    const hasIdentity = keyId.length > 0 || fingerprint.length > 0;
    const isBlankEntry = isTrustRegistryDraftEntryBlank(entry);

    if (!isBlankEntry && !hasIdentity) {
      issues.push('identity_required');
    }

    if (fingerprint.length > 0 && !TRUST_REGISTRY_FINGERPRINT_REGEX.test(fingerprint)) {
      issues.push('fingerprint_invalid');
    }

    const notBeforeIso = toTrustRegistryIsoTimestamp(entry.notBefore);
    const notAfterIso = toTrustRegistryIsoTimestamp(entry.notAfter);
    if (entry.notBefore.trim().length > 0 && notBeforeIso === null) {
      issues.push('not_before_invalid');
    }
    if (entry.notAfter.trim().length > 0 && notAfterIso === null) {
      issues.push('not_after_invalid');
    }
    if (
      typeof notBeforeIso === 'string'
      && notBeforeIso.length > 0
      && typeof notAfterIso === 'string'
      && notAfterIso.length > 0
      && Date.parse(notBeforeIso) > Date.parse(notAfterIso)
    ) {
      issues.push('window_invalid');
    }

    if (hasIdentity) {
      const dedupeKey = `${keyId.toLowerCase()}|${fingerprint}`;
      if (seenIdentityKeys.has(dedupeKey)) {
        issues.push('duplicate');
      } else {
        seenIdentityKeys.add(dedupeKey);
      }
    }

    if (issues.length > 0) {
      issuesByEntry[entry.id] = issues;
    }
  }

  return issuesByEntry;
};

const toAuditTrustedSignerEntryPayload = (entry: AuditTrustRegistryDraftEntry): AuditTrustedSignerEntry => {
  const normalizedNotBefore = toTrustRegistryIsoTimestamp(entry.notBefore);
  const normalizedNotAfter = toTrustRegistryIsoTimestamp(entry.notAfter);
  return {
    key_id: entry.keyId.trim(),
    public_key_sha256: entry.publicKeySha256.trim().toLowerCase(),
    not_before: typeof normalizedNotBefore === 'string' ? normalizedNotBefore : '',
    not_after: typeof normalizedNotAfter === 'string' ? normalizedNotAfter : '',
    status: normalizeAuditTrustedSignerStatus(entry.status),
  };
};

const resolveTrustRegistryStatusOptionLabel = (status: AuditTrustedSignerStatus, t: any) => {
  if (status === 'active') return t.dashboard.actionQueue.signatureSignerStatusActive;
  if (status === 'revoked') return t.dashboard.actionQueue.signatureSignerStatusRevoked;
  return t.dashboard.actionQueue.signatureSignerStatusDisabled;
};

const resolveTrustRegistryValidationIssueLabel = (issue: TrustRegistryValidationIssue, t: any) => {
  if (issue === 'identity_required') return t.dashboard.actionQueue.signatureRegistryValidationIdentity;
  if (issue === 'fingerprint_invalid') return t.dashboard.actionQueue.signatureRegistryValidationFingerprint;
  if (issue === 'not_before_invalid') return t.dashboard.actionQueue.signatureRegistryValidationNotBefore;
  if (issue === 'not_after_invalid') return t.dashboard.actionQueue.signatureRegistryValidationNotAfter;
  if (issue === 'window_invalid') return t.dashboard.actionQueue.signatureRegistryValidationWindow;
  return t.dashboard.actionQueue.signatureRegistryValidationDuplicate;
};

const resolveTrustRegistryRotationFindingLabel = (issueCode: string, t: any) => {
  if (issueCode === 'runtime_entries_empty') return t.dashboard.actionQueue.signatureRotationPreflightRuntimeEmpty;
  if (issueCode === 'no_active_signer_now') return t.dashboard.actionQueue.signatureRotationPreflightNoActiveNow;
  if (issueCode === 'no_active_signer_in_24h') return t.dashboard.actionQueue.signatureRotationPreflightNoActive24h;
  if (issueCode === 'no_staged_entries') return t.dashboard.actionQueue.signatureRotationPreflightNoStaged;
  return issueCode;
};

const buildTrustRegistryRotationPreview = (
  params: {
    currentKeyId: string;
    currentFingerprint: string;
    nextKeyId: string;
    nextFingerprint: string;
    activateAt: string;
    overlapDays: number;
  },
  t: any
): AuditTrustRegistryRotationDraftPreview => {
  const issues: Array<{ level: 'error' | 'warning'; label: string }> = [];
  const nextKeyId = params.nextKeyId.trim();
  const nextFingerprint = params.nextFingerprint.trim().toLowerCase();
  const currentKeyId = params.currentKeyId.trim();
  const currentFingerprint = params.currentFingerprint.trim().toLowerCase();

  if (nextKeyId.length === 0 && nextFingerprint.length === 0) {
    issues.push({
      level: 'error',
      label: t.dashboard.actionQueue.signatureRotationIssueNextIdentityRequired,
    });
  }
  if (nextFingerprint.length > 0 && !TRUST_REGISTRY_FINGERPRINT_REGEX.test(nextFingerprint)) {
    issues.push({
      level: 'error',
      label: t.dashboard.actionQueue.signatureRotationIssueNextFingerprintInvalid,
    });
  }
  if (currentFingerprint.length > 0 && !TRUST_REGISTRY_FINGERPRINT_REGEX.test(currentFingerprint)) {
    issues.push({
      level: 'warning',
      label: t.dashboard.actionQueue.signatureRotationIssueCurrentFingerprintInvalid,
    });
  }

  const normalizedOverlapDays = Number.isFinite(Number(params.overlapDays))
    ? Number(params.overlapDays)
    : Number.NaN;
  if (
    Number.isNaN(normalizedOverlapDays)
    || normalizedOverlapDays < TRUST_REGISTRY_ROTATION_MIN_OVERLAP_DAYS
    || normalizedOverlapDays > TRUST_REGISTRY_ROTATION_MAX_OVERLAP_DAYS
  ) {
    issues.push({
      level: 'error',
      label: interpolateTemplate(t.dashboard.actionQueue.signatureRotationIssueOverlapRange, {
        min: TRUST_REGISTRY_ROTATION_MIN_OVERLAP_DAYS,
        max: TRUST_REGISTRY_ROTATION_MAX_OVERLAP_DAYS,
      }),
    });
  }

  const activateAtIso = toTrustRegistryIsoTimestamp(params.activateAt);
  if (activateAtIso === null || activateAtIso.length === 0) {
    issues.push({
      level: 'error',
      label: t.dashboard.actionQueue.signatureRotationIssueActivateAtInvalid,
    });
  }

  if (activateAtIso && typeof activateAtIso === 'string') {
    const activateAtMs = Date.parse(activateAtIso);
    if (!Number.isNaN(activateAtMs) && activateAtMs < Date.now() - DAY_IN_MS) {
      issues.push({
        level: 'warning',
        label: t.dashboard.actionQueue.signatureRotationIssueActivateAtPast,
      });
    }
  }

  if (
    nextKeyId.length > 0
    && currentKeyId.length > 0
    && nextKeyId.toLowerCase() === currentKeyId.toLowerCase()
    && nextFingerprint.length > 0
    && currentFingerprint.length > 0
    && nextFingerprint === currentFingerprint
  ) {
    issues.push({
      level: 'error',
      label: t.dashboard.actionQueue.signatureRotationIssueDuplicateIdentity,
    });
  }

  const hasCurrentIdentity = currentKeyId.length > 0 || currentFingerprint.length > 0;
  if (!hasCurrentIdentity) {
    issues.push({
      level: 'warning',
      label: t.dashboard.actionQueue.signatureRotationIssueCurrentSignerMissing,
    });
  }

  if (!activateAtIso || typeof activateAtIso !== 'string' || Number.isNaN(normalizedOverlapDays)) {
    return { entries: [], issues };
  }

  const currentNotAfterIso = new Date(
    Date.parse(activateAtIso) + (normalizedOverlapDays * DAY_IN_MS)
  ).toISOString();
  const rotationEntries: AuditTrustRegistryDraftEntry[] = [];

  if (hasCurrentIdentity) {
    rotationEntries.push({
      id: createAuditTrustRegistryDraftId(),
      keyId: currentKeyId,
      publicKeySha256: currentFingerprint,
      notBefore: '',
      notAfter: toTrustRegistryLocalDateTimeInput(currentNotAfterIso),
      status: 'active',
    });
  }
  rotationEntries.push({
    id: createAuditTrustRegistryDraftId(),
    keyId: nextKeyId,
    publicKeySha256: nextFingerprint,
    notBefore: toTrustRegistryLocalDateTimeInput(activateAtIso),
    notAfter: '',
    status: 'active',
  });

  return {
    entries: rotationEntries,
    issues,
  };
};

const requestExportManifestSignature = async (
  manifestHashSha256: string,
  exportType: string,
  generatedAt: string,
  rowCount: number,
  context: Record<string, string | number | boolean>
): Promise<ExportSignatureMetadata | null> => {
  if (!isSupabaseConfigured) return null;

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return null;

  const response = await fetch(buildApiUrl('/api/audit/sign-manifest'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      manifestHashSha256,
      exportType,
      generatedAt,
      rowCount,
      context,
    }),
  });

  if (!response.ok) return null;

  const payload = await response.json() as Record<string, unknown>;
  if (
    typeof payload.signature !== 'string'
    || typeof payload.key_id !== 'string'
    || typeof payload.public_key_pem !== 'string'
    || typeof payload.algorithm !== 'string'
    || typeof payload.payload_encoding !== 'string'
    || typeof payload.signed_at !== 'string'
    || !payload.payload
    || typeof payload.payload !== 'object'
  ) {
    return null;
  }

  return {
    algorithm: payload.algorithm,
    payloadEncoding: payload.payload_encoding,
    keyId: payload.key_id,
    publicKeyPem: payload.public_key_pem,
    signedAt: payload.signed_at,
    signature: payload.signature,
    payload: payload.payload as Record<string, unknown>,
  };
};

const fetchAuditSigningStatus = async (): Promise<AuditSigningStatusMetadata | null> => {
  const response = await fetch(buildApiUrl('/api/audit/signing-status'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return null;

  const payload = await response.json() as Record<string, unknown>;
  if (typeof payload.enabled !== 'boolean' || typeof payload.algorithm !== 'string') {
    return null;
  }

  return {
    enabled: payload.enabled,
    algorithm: payload.algorithm,
    keyId: typeof payload.key_id === 'string' ? payload.key_id : undefined,
    payloadEncoding: typeof payload.payload_encoding === 'string' ? payload.payload_encoding : undefined,
    publicKeyPem: typeof payload.public_key_pem === 'string' ? payload.public_key_pem : undefined,
    publicKeySha256: typeof payload.public_key_sha256 === 'string' ? payload.public_key_sha256 : undefined,
    trustPolicyMode: payload.trust_policy
      && typeof payload.trust_policy === 'object'
      && typeof (payload.trust_policy as Record<string, unknown>).mode === 'string'
      ? (payload.trust_policy as Record<string, unknown>).mode as string
      : undefined,
    trustRegistryConfigured: payload.trust_policy
      && typeof payload.trust_policy === 'object'
      && typeof (payload.trust_policy as Record<string, unknown>).trust_registry_configured === 'boolean'
      ? (payload.trust_policy as Record<string, unknown>).trust_registry_configured as boolean
      : undefined,
    keyIdTrusted: payload.trust_policy
      && typeof payload.trust_policy === 'object'
      && typeof (payload.trust_policy as Record<string, unknown>).key_id_trusted === 'boolean'
      ? (payload.trust_policy as Record<string, unknown>).key_id_trusted as boolean
      : null,
    publicKeyTrusted: payload.trust_policy
      && typeof payload.trust_policy === 'object'
      && typeof (payload.trust_policy as Record<string, unknown>).public_key_trusted === 'boolean'
      ? (payload.trust_policy as Record<string, unknown>).public_key_trusted as boolean
      : null,
    signerRegistryStatus: payload.trust_policy
      && typeof payload.trust_policy === 'object'
      && typeof (payload.trust_policy as Record<string, unknown>).signer_registry_status === 'string'
      ? (payload.trust_policy as Record<string, unknown>).signer_registry_status as string
      : null,
    trustCheckPassed: payload.trust_policy
      && typeof payload.trust_policy === 'object'
      && typeof (payload.trust_policy as Record<string, unknown>).trust_check_passed === 'boolean'
      ? (payload.trust_policy as Record<string, unknown>).trust_check_passed as boolean
      : undefined,
  };
};

const verifyAuditManifestBundle = async (
  manifest: Record<string, unknown>,
  csvContent?: string
): Promise<AuditVerificationReceipt> => {
  const response = await fetch(buildApiUrl('/api/audit/verify-manifest'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      manifest,
      csvContent: csvContent && csvContent.length > 0 ? csvContent : undefined,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = typeof payload.error === 'string'
      ? payload.error
      : 'Unable to verify audit manifest bundle right now.';
    throw new Error(error);
  }

  const payload = await response.json() as AuditVerificationReceipt;
  if (!payload || typeof payload.receipt_id !== 'string') {
    throw new Error('Verification service returned an invalid receipt.');
  }

  return payload;
};

const fetchAuditTrustRegistry = async (): Promise<AuditTrustRegistrySnapshot | null> => {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return null;

  const response = await fetch(buildApiUrl('/api/audit/trust-registry'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return null;
  const payload = await response.json() as AuditTrustRegistrySnapshot;
  if (!payload || typeof payload.management_enabled !== 'boolean') return null;
  return payload;
};

const saveAuditTrustRegistry = async (entries: AuditTrustedSignerEntry[], note?: string): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return false;

  const response = await fetch(buildApiUrl('/api/audit/trust-registry'), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entries,
      note,
    }),
  });

  return response.ok;
};

const fetchAuditTrustRegistryHistoryPage = async (
  params: { limit: number; offset: number; retentionDays?: number }
): Promise<AuditTrustRegistryHistoryPage> => {
  if (!isSupabaseConfigured) return { events: [], nextOffset: params.offset, hasMore: false };
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return { events: [], nextOffset: 0, hasMore: false };

  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });
  if (typeof params.retentionDays === 'number') {
    query.set('retention_days', String(params.retentionDays));
  }

  const response = await fetch(buildApiUrl(`/api/audit/trust-registry/history?${query.toString()}`), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return { events: [], nextOffset: params.offset, hasMore: false };
  const payload = await response.json() as {
    events?: AuditTrustRegistryEvent[];
    next_offset?: number;
    has_more?: boolean;
  };
  return {
    events: Array.isArray(payload.events) ? payload.events : [],
    nextOffset: Number.isFinite(Number(payload.next_offset)) ? Number(payload.next_offset) : params.offset,
    hasMore: Boolean(payload.has_more),
  };
};

const fetchAuditReadinessExportHistoryPage = async (
  params: { limit: number; offset: number; signatureMode?: 'all' | 'server_attested' | 'local_checksum'; manifestHash?: string }
): Promise<AuditReadinessExportHistoryPage> => {
  if (!isSupabaseConfigured) return { events: [], nextOffset: params.offset, hasMore: false };
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return { events: [], nextOffset: params.offset, hasMore: false };

  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });
  if (params.signatureMode && params.signatureMode !== 'all') {
    query.set('signature_mode', params.signatureMode);
  }
  if (params.manifestHash && params.manifestHash.trim().length > 0) {
    query.set('manifest_hash', params.manifestHash.trim().toLowerCase());
  }

  const response = await fetch(buildApiUrl(`/api/audit/readiness-exports?${query.toString()}`), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return { events: [], nextOffset: params.offset, hasMore: false };
  const payload = await response.json() as {
    events?: AuditReadinessExportHistoryEntry[];
    next_offset?: number;
    has_more?: boolean;
  };

  return {
    events: Array.isArray(payload.events) ? payload.events : [],
    nextOffset: Number.isFinite(Number(payload.next_offset)) ? Number(payload.next_offset) : params.offset,
    hasMore: Boolean(payload.has_more),
  };
};

const fetchAuditExportArtifactsPage = async (
  params: { limit: number; offset: number; caseRef?: string }
): Promise<AuditExportArtifactPage> => {
  if (!isSupabaseConfigured) return { artifacts: [], nextOffset: params.offset, hasMore: false };
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return { artifacts: [], nextOffset: params.offset, hasMore: false };

  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });
  if (params.caseRef && params.caseRef.trim().length > 0) {
    query.set('case_ref', params.caseRef.trim());
  }

  const response = await fetch(buildApiUrl(`/api/audit/export-artifacts?${query.toString()}`), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return { artifacts: [], nextOffset: params.offset, hasMore: false };
  const payload = await response.json() as {
    artifacts?: AuditExportArtifactEntry[];
    next_offset?: number;
    has_more?: boolean;
  };

  return {
    artifacts: Array.isArray(payload.artifacts) ? payload.artifacts : [],
    nextOffset: Number.isFinite(Number(payload.next_offset)) ? Number(payload.next_offset) : params.offset,
    hasMore: Boolean(payload.has_more),
  };
};

const fetchAuditExportArtifactReceipt = async (
  artifactId: string
): Promise<AuditExportArtifactReceipt | null> => {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return null;

  const response = await fetch(buildApiUrl(`/api/audit/export-artifacts/${artifactId}/receipt`), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return null;
  const payload = await response.json() as Partial<AuditExportArtifactReceipt>;
  if (!payload || typeof payload.artifact_id !== 'string') return null;
  return payload as AuditExportArtifactReceipt;
};

const resolveAuditArtifactRetentionHealth = (
  retentionExpiresAt: string | null | undefined
): AuditArtifactRetentionHealth => {
  if (typeof retentionExpiresAt !== 'string' || retentionExpiresAt.trim().length === 0) return 'unknown';
  const parsedMs = Date.parse(retentionExpiresAt);
  if (Number.isNaN(parsedMs)) return 'unknown';
  const remainingMs = parsedMs - Date.now();
  if (remainingMs <= 0) return 'expired';
  if (remainingMs <= (14 * DAY_IN_MS)) return 'expiring';
  return 'active';
};

const resolveAuditArtifactRetentionHealthLabel = (health: AuditArtifactRetentionHealth, t: any) => {
  if (health === 'expired') return t.dashboard.actionQueue.readinessExportHistoryRetentionExpired;
  if (health === 'expiring') return t.dashboard.actionQueue.readinessExportHistoryRetentionExpiring;
  if (health === 'unknown') return t.dashboard.actionQueue.readinessExportHistoryRetentionUnknown;
  return t.dashboard.actionQueue.readinessExportHistoryRetentionActive;
};
const fetchAuditTrustGovernanceDigest = async (
  retentionDays: number
): Promise<AuditTrustGovernanceDigest | null> => {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return null;

  const query = new URLSearchParams({
    retention_days: String(retentionDays),
    limit: '500',
  });

  try {
    const response = await fetch(buildApiUrl(`/api/audit/trust-registry/governance-digest?${query.toString()}`), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;

    const payload = await response.json() as Partial<AuditTrustGovernanceDigest>;
    if (!payload || !Array.isArray(payload.events)) return null;

    return {
      generated_at: typeof payload.generated_at === 'string' ? payload.generated_at : new Date().toISOString(),
      events: payload.events,
      returned_count: Number.isFinite(Number(payload.returned_count)) ? Number(payload.returned_count) : payload.events.length,
      total_count: Number.isFinite(Number(payload.total_count)) ? Number(payload.total_count) : payload.events.length,
      counts: {
        admin_mutation_count: Number.isFinite(Number(payload.counts?.admin_mutation_count))
          ? Number(payload.counts?.admin_mutation_count)
          : 0,
        rollback_count: Number.isFinite(Number(payload.counts?.rollback_count))
          ? Number(payload.counts?.rollback_count)
          : 0,
        rotation_count: Number.isFinite(Number(payload.counts?.rotation_count))
          ? Number(payload.counts?.rotation_count)
          : 0,
      },
      rotation_runbook: {
        latest_rotation_at: typeof payload.rotation_runbook?.latest_rotation_at === 'string'
          ? payload.rotation_runbook.latest_rotation_at
          : null,
        latest_rotation_snapshot_id: typeof payload.rotation_runbook?.latest_rotation_snapshot_id === 'string'
          ? payload.rotation_runbook.latest_rotation_snapshot_id
          : null,
        latest_rollback_at: typeof payload.rotation_runbook?.latest_rollback_at === 'string'
          ? payload.rotation_runbook.latest_rollback_at
          : null,
        latest_rollback_snapshot_id: typeof payload.rotation_runbook?.latest_rollback_snapshot_id === 'string'
          ? payload.rotation_runbook.latest_rollback_snapshot_id
          : null,
        runtime_entries_count: Number.isFinite(Number(payload.rotation_runbook?.runtime_entries_count))
          ? Number(payload.rotation_runbook?.runtime_entries_count)
          : 0,
        runtime_active_now_count: Number.isFinite(Number(payload.rotation_runbook?.runtime_active_now_count))
          ? Number(payload.rotation_runbook?.runtime_active_now_count)
          : 0,
      },
    };
  } catch {
    return null;
  }
};

const trimAuditTrustRegistryHistory = async (keepDays: number, keepLatest = 200): Promise<number | null> => {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return null;

  const response = await fetch(buildApiUrl('/api/audit/trust-registry/history/trim'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keep_days: keepDays,
      keep_latest: keepLatest,
    }),
  });
  if (!response.ok) return null;

  const payload = await response.json() as { removed_count?: number };
  return Number.isFinite(Number(payload.removed_count)) ? Number(payload.removed_count) : null;
};

const fetchAuditTrustAdmins = async (): Promise<AuditTrustAdminDirectoryResponse | null> => {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return null;

  try {
    const response = await fetch(buildApiUrl('/api/audit/trust-admins'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;
    const payload = await response.json() as {
      admins?: AuditTrustAdminProfile[];
      admin_access_source?: string;
      role_lookup_available?: boolean;
    };
    return {
      admins: Array.isArray(payload.admins) ? payload.admins : [],
      adminAccessSource: typeof payload.admin_access_source === 'string' ? payload.admin_access_source : null,
      roleLookupAvailable: Boolean(payload.role_lookup_available),
    };
  } catch {
    return null;
  }
};

const updateAuditTrustAdminByEmail = async (
  targetEmail: string,
  isTrustAdmin: boolean,
  note?: string
): Promise<{ success: boolean; status: number }> => {
  if (!isSupabaseConfigured) return { success: false, status: 0 };
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return { success: false, status: 401 };

  try {
    const response = await fetch(buildApiUrl('/api/audit/trust-admins'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_email: targetEmail,
        is_trust_admin: isTrustAdmin,
        note: note && note.trim().length > 0 ? note.trim() : undefined,
      }),
    });

    return {
      success: response.ok,
      status: response.status,
    };
  } catch {
    return { success: false, status: 0 };
  }
};

const fetchAuditTrustRegistrySnapshots = async (limit = 20): Promise<AuditTrustRegistryRollbackSnapshot[] | null> => {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return null;

  try {
    const query = new URLSearchParams({ limit: String(limit) });
    const response = await fetch(buildApiUrl(`/api/audit/trust-registry/snapshots?${query.toString()}`), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;
    const payload = await response.json() as { snapshots?: AuditTrustRegistryRollbackSnapshot[] };
    return Array.isArray(payload.snapshots) ? payload.snapshots : [];
  } catch {
    return null;
  }
};

const rollbackAuditTrustRegistrySnapshot = async (
  snapshotId: string,
  note?: string
): Promise<{ success: boolean; status: number }> => {
  if (!isSupabaseConfigured) return { success: false, status: 0 };
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return { success: false, status: 401 };

  try {
    const response = await fetch(buildApiUrl('/api/audit/trust-registry/rollback'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snapshot_id: snapshotId,
        note: note && note.trim().length > 0 ? note.trim() : undefined,
      }),
    });

    return {
      success: response.ok,
      status: response.status,
    };
  } catch {
    return { success: false, status: 0 };
  }
};

const runAuditTrustRegistryRotationPreflight = async (
  entries: AuditTrustedSignerEntry[]
): Promise<AuditTrustRegistryRotationPreflight | null> => {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return null;

  try {
    const response = await fetch(buildApiUrl('/api/audit/trust-registry/rotation/preflight'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entries,
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json() as AuditTrustRegistryRotationPreflight;
    if (!payload || !payload.summary) return null;
    return payload;
  } catch {
    return null;
  }
};

const applyAuditTrustRegistryRotation = async (
  entries: AuditTrustedSignerEntry[],
  note?: string
): Promise<{ success: boolean; status: number; snapshotId: string | null }> => {
  if (!isSupabaseConfigured) return { success: false, status: 0, snapshotId: null };
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return { success: false, status: 401, snapshotId: null };

  try {
    const response = await fetch(buildApiUrl('/api/audit/trust-registry/rotate'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entries,
        note: note && note.trim().length > 0 ? note.trim() : undefined,
      }),
    });

    const payload = await response.json().catch(() => ({})) as { snapshot_id?: string };
    return {
      success: response.ok,
      status: response.status,
      snapshotId: typeof payload.snapshot_id === 'string' ? payload.snapshot_id : null,
    };
  } catch {
    return { success: false, status: 0, snapshotId: null };
  }
};

const downloadCsv = (
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
) => {
  const csvContent = buildCsvContent(headers, rows);
  triggerBrowserDownload(filename, csvContent, 'text/csv;charset=utf-8;');
  return csvContent;
};

const downloadSignedCsvBundle = async (
  baseFilename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  generatedAt: string,
  context: Record<string, string | number | boolean>,
  exportType: string,
  options?: { suppressDownload?: boolean }
) => {
  const csvFilename = `${baseFilename}.csv`;
  const manifestFilename = `${baseFilename}.manifest.json`;
  const csvContent = buildCsvContent(headers, rows);
  if (!options?.suppressDownload) {
    triggerBrowserDownload(csvFilename, csvContent, 'text/csv;charset=utf-8;');
  }
  const sha256 = await toSha256Hex(csvContent);
  const signature = await requestExportManifestSignature(
    sha256,
    exportType,
    generatedAt,
    rows.length,
    context
  );
  const manifest = JSON.stringify({
    version: 1,
    generated_at: generatedAt,
    bundle_type: 'kingsley_audit_export',
    csv_file: csvFilename,
    algorithm: 'SHA-256',
    sha256,
    row_count: rows.length,
    column_count: headers.length,
    context,
    signer: signature
      ? {
        mode: 'server_attested',
        algorithm: signature.algorithm,
        payload_encoding: signature.payloadEncoding,
        key_id: signature.keyId,
        public_key_pem: signature.publicKeyPem,
        signed_at: signature.signedAt,
        signature: signature.signature,
        payload: signature.payload,
      }
      : {
        mode: 'local_integrity_only',
      },
  }, null, 2);
  if (!options?.suppressDownload) {
    triggerBrowserDownload(manifestFilename, manifest, 'application/json;charset=utf-8;');
  }
  return signature !== null;
};

const normalizeNightRuntimeLanes = (
  rawLanes: unknown
): Partial<Record<NightRuntimeLaneId, NightRuntimeLaneSummary>> | undefined => {
  if (!rawLanes || typeof rawLanes !== 'object') return undefined;
  const laneRecord = rawLanes as Record<string, unknown>;
  const normalizedLanes: Partial<Record<NightRuntimeLaneId, NightRuntimeLaneSummary>> = {};

  NIGHT_RUNTIME_LANE_IDS.forEach((laneId) => {
    const rawLane = laneRecord[laneId];
    if (!rawLane || typeof rawLane !== 'object') return;

    const lane = rawLane as Record<string, unknown>;
    const status = typeof lane.status === 'string'
      && ['healthy', 'degraded', 'failing', 'stale', 'unavailable'].includes(lane.status)
      ? lane.status as NightRuntimeLaneStatus
      : 'unavailable';
    const recentFailures = Number.isFinite(Number(lane.recent_failures))
      ? Number(lane.recent_failures)
      : 0;
    const recentSuccesses = Number.isFinite(Number(lane.recent_successes))
      ? Number(lane.recent_successes)
      : 0;
    const minutesSinceSeen = Number.isFinite(Number(lane.minutes_since_seen))
      ? Number(lane.minutes_since_seen)
      : null;
    const expectedPeriodMinutes = Number.isFinite(Number(lane.expected_period_minutes))
      ? Number(lane.expected_period_minutes)
      : null;
    const graceMinutes = Number.isFinite(Number(lane.grace_minutes))
      ? Number(lane.grace_minutes)
      : null;
    const staleAfterMinutes = Number.isFinite(Number(lane.stale_after_minutes))
      ? Number(lane.stale_after_minutes)
      : null;

    normalizedLanes[laneId] = {
      lane: laneId,
      status,
      task_ids: Array.isArray(lane.task_ids)
        ? lane.task_ids.filter((item): item is string => typeof item === 'string')
        : [],
      last_task: typeof lane.last_task === 'string' ? lane.last_task : null,
      last_state: typeof lane.last_state === 'string' ? lane.last_state : null,
      last_detail: typeof lane.last_detail === 'string' ? lane.last_detail : null,
      last_seen_at: typeof lane.last_seen_at === 'string' ? lane.last_seen_at : null,
      minutes_since_seen: minutesSinceSeen,
      recent_failures: recentFailures,
      recent_successes: recentSuccesses,
      expected_period_minutes: expectedPeriodMinutes,
      grace_minutes: graceMinutes,
      stale_after_minutes: staleAfterMinutes,
    };
  });

  return normalizedLanes;
};

const normalizeNightRuntimeStatus = (rawPayload: unknown): NightRuntimeStatusSnapshot | null => {
  if (!rawPayload || typeof rawPayload !== 'object') return null;

  const payload = rawPayload as Record<string, unknown>;
  const runtimeSource = payload.runtime && typeof payload.runtime === 'object'
    ? payload.runtime as Record<string, unknown>
    : payload;

  const timestamp = typeof runtimeSource.timestamp === 'string'
    ? runtimeSource.timestamp
    : typeof payload.timestamp === 'string'
      ? payload.timestamp
      : null;
  if (!timestamp) return null;

  const iteration = Number(runtimeSource.iteration);
  if (!Number.isFinite(iteration)) return null;

  const startedAt = typeof runtimeSource.started_at === 'string'
    ? runtimeSource.started_at
    : timestamp;
  const finishedAt = typeof runtimeSource.finished_at === 'string'
    ? runtimeSource.finished_at
    : timestamp;
  const lastIterationFailures = Number.isFinite(Number(runtimeSource.last_iteration_failures))
    ? Number(runtimeSource.last_iteration_failures)
    : 0;
  const consecutiveFailures = Number.isFinite(Number(runtimeSource.consecutive_failures))
    ? Number(runtimeSource.consecutive_failures)
    : 0;
  const health = payload.health === 'pass' || payload.health === 'warn' || payload.health === 'fail'
    ? payload.health
    : undefined;
  const staleAfterMinutes = Number.isFinite(Number(payload.stale_after_minutes))
    ? Number(payload.stale_after_minutes)
    : undefined;
  const graceMinutes = Number.isFinite(Number(payload.grace_minutes))
    ? Number(payload.grace_minutes)
    : undefined;
  const windowMinutes = Number.isFinite(Number(payload.window_minutes))
    ? Number(payload.window_minutes)
    : undefined;

  return {
    timestamp,
    health,
    stale_after_minutes: staleAfterMinutes,
    grace_minutes: graceMinutes,
    window_minutes: windowMinutes,
    iteration,
    started_at: startedAt,
    finished_at: finishedAt,
    consecutive_failures: consecutiveFailures,
    last_iteration_failures: lastIterationFailures,
    lanes: normalizeNightRuntimeLanes(payload.lanes),
  };
};

const isCaseTasksTableMissingError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  return code === '42P01' || code === '42703' || code === 'PGRST204' || code === 'PGRST202';
};

// Simple AI Setup Banner component
const AISetupBanner = ({ theme, t }: { theme: string; t: any }) => {
  return (
    <div className={`${theme === 'dark' ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-200'} border rounded-xl p-4 mb-6`}>
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 ${theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100'} rounded-lg flex items-center justify-center`}>
          <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div className="flex-1">
          <h3 className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-blue-200' : 'text-blue-900'}`}>{t.dashboard.aiSetup.title}</h3>
          <p className={`text-xs ${theme === 'dark' ? 'text-blue-300/80' : 'text-blue-700'}`}>{t.dashboard.aiSetup.description}</p>
        </div>
        <button className={`text-xs ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} font-clash font-medium`}>{t.dashboard.aiSetup.configure}</button>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [caseTasks, setCaseTasks] = useState<DbCaseTask[]>([]);
  const [taskPolicyConfig, setTaskPolicyConfig] = useState<Record<CaseLifecycleStatus, TaskPolicyConfig>>(
    () => cloneTaskPolicyConfig(DEFAULT_TASK_POLICY_CONFIG)
  );
  const [draftTaskPolicyConfig, setDraftTaskPolicyConfig] = useState<Record<CaseLifecycleStatus, TaskPolicyConfig>>(
    () => cloneTaskPolicyConfig(DEFAULT_TASK_POLICY_CONFIG)
  );
  const [taskEvents, setTaskEvents] = useState<DbTaskEvent[]>([]);
  const [taskPolicyEvents, setTaskPolicyEvents] = useState<DbTaskPolicyEvent[]>([]);
  const [deadlineSources, setDeadlineSources] = useState<DbDeadlineSource[]>([]);
  const [deadlineEvidence, setDeadlineEvidence] = useState<DbDeadlineEvidence[]>([]);
  const [isCaseTasksSupported, setIsCaseTasksSupported] = useState(true);
  const [isTaskPoliciesSupported, setIsTaskPoliciesSupported] = useState(true);
  const [isTaskEventsSupported, setIsTaskEventsSupported] = useState(true);
  const [isTaskPolicyEventsSupported, setIsTaskPolicyEventsSupported] = useState(true);
  const [isDeadlineProvenanceSupported, setIsDeadlineProvenanceSupported] = useState(true);
  const [isPolicyEditorOpen, setIsPolicyEditorOpen] = useState(false);
  const [isSavingTaskPolicies, setIsSavingTaskPolicies] = useState(false);
  const [policySaveError, setPolicySaveError] = useState<string | null>(null);
  const [policySaveSuccess, setPolicySaveSuccess] = useState(false);
  const [historyEventFilter, setHistoryEventFilter] = useState<HistoryEventFilter>('completed');
  const [historyCaseFilter, setHistoryCaseFilter] = useState<string>('all');
  const [historyPlaybookFilter, setHistoryPlaybookFilter] = useState<string>('all');
  const [historyTimeFilter, setHistoryTimeFilter] = useState<HistoryTimeFilter>('90d');
  const [taskEventRetentionDays, setTaskEventRetentionDays] = useState<number>(TASK_EVENT_RETENTION_DAYS);
  const [autoRetentionCadence, setAutoRetentionCadence] = useState<AutoRetentionCadence>(AUTO_RETENTION_DEFAULT_CADENCE);
  const [lastAutoRetentionRunAt, setLastAutoRetentionRunAt] = useState<string | null>(null);
  const [auditDigestCadence, setAuditDigestCadence] = useState<AuditDigestCadence>(AUDIT_DIGEST_DEFAULT_CADENCE);
  const [digestIncludeCompletions, setDigestIncludeCompletions] = useState(true);
  const [digestIncludePolicies, setDigestIncludePolicies] = useState(true);
  const [digestIncludeGovernance, setDigestIncludeGovernance] = useState(true);
  const [lastAuditDigestRunAt, setLastAuditDigestRunAt] = useState<string | null>(null);
  const [isAuditDigestSettingsLoaded, setIsAuditDigestSettingsLoaded] = useState(false);
  const [taskEventsPageOffset, setTaskEventsPageOffset] = useState(0);
  const [taskEventsHasMore, setTaskEventsHasMore] = useState(false);
  const [isLoadingMoreTaskEvents, setIsLoadingMoreTaskEvents] = useState(false);
  const [isPruningTaskEvents, setIsPruningTaskEvents] = useState(false);
  const [taskEventPruneMessage, setTaskEventPruneMessage] = useState<string | null>(null);
  const [historyExportMessage, setHistoryExportMessage] = useState<string | null>(null);
  const [auditSigningStatus, setAuditSigningStatus] = useState<AuditSigningStatusMetadata | null>(null);
  const [isAuditSigningStatusUnavailable, setIsAuditSigningStatusUnavailable] = useState(false);
  const [auditTrustRegistrySnapshot, setAuditTrustRegistrySnapshot] = useState<AuditTrustRegistrySnapshot | null>(null);
  const [auditTrustRegistryDraftEntries, setAuditTrustRegistryDraftEntries] = useState<AuditTrustRegistryDraftEntry[]>([]);
  const [auditTrustRegistryChangeNote, setAuditTrustRegistryChangeNote] = useState('');
  const [auditTrustRegistryMessage, setAuditTrustRegistryMessage] = useState<string | null>(null);
  const [isSavingAuditTrustRegistry, setIsSavingAuditTrustRegistry] = useState(false);
  const [isAuditTrustRegistryAdmin, setIsAuditTrustRegistryAdmin] = useState(false);
  const [auditTrustRegistryHistory, setAuditTrustRegistryHistory] = useState<AuditTrustRegistryEvent[]>([]);
  const [auditTrustRegistryHistoryOffset, setAuditTrustRegistryHistoryOffset] = useState(0);
  const [auditTrustRegistryHistoryHasMore, setAuditTrustRegistryHistoryHasMore] = useState(false);
  const [isLoadingAuditTrustRegistryHistory, setIsLoadingAuditTrustRegistryHistory] = useState(false);
  const [isPruningAuditTrustRegistryHistory, setIsPruningAuditTrustRegistryHistory] = useState(false);
  const [auditTrustRegistryHistoryRetentionDays, setAuditTrustRegistryHistoryRetentionDays] = useState(180);
  const [auditReadinessExportHistory, setAuditReadinessExportHistory] = useState<AuditReadinessExportHistoryEntry[]>([]);
  const [auditReadinessExportOffset, setAuditReadinessExportOffset] = useState(0);
  const [auditReadinessExportHasMore, setAuditReadinessExportHasMore] = useState(false);
  const [isLoadingAuditReadinessExportHistory, setIsLoadingAuditReadinessExportHistory] = useState(false);
  const [isLoadingMoreAuditReadinessExportHistory, setIsLoadingMoreAuditReadinessExportHistory] = useState(false);
  const [isDownloadingAuditArtifactReceiptId, setIsDownloadingAuditArtifactReceiptId] = useState<string | null>(null);
  const [readinessExportSignatureFilter, setReadinessExportSignatureFilter] = useState<'all' | 'server_attested' | 'local_checksum'>('all');
  const [readinessExportManifestFilter, setReadinessExportManifestFilter] = useState('');
  const [auditExportArtifacts, setAuditExportArtifacts] = useState<AuditExportArtifactEntry[]>([]);
  const [auditExportArtifactsOffset, setAuditExportArtifactsOffset] = useState(0);
  const [auditExportArtifactsHasMore, setAuditExportArtifactsHasMore] = useState(false);
  const [isLoadingAuditExportArtifacts, setIsLoadingAuditExportArtifacts] = useState(false);
  const [isLoadingMoreAuditExportArtifacts, setIsLoadingMoreAuditExportArtifacts] = useState(false);
  const [auditTrustAdminProfiles, setAuditTrustAdminProfiles] = useState<AuditTrustAdminProfile[]>([]);
  const [auditTrustAdminTargetEmail, setAuditTrustAdminTargetEmail] = useState('');
  const [auditTrustAdminChangeNote, setAuditTrustAdminChangeNote] = useState('');
  const [auditTrustAdminMessage, setAuditTrustAdminMessage] = useState<string | null>(null);
  const [isLoadingAuditTrustAdmins, setIsLoadingAuditTrustAdmins] = useState(false);
  const [isSavingAuditTrustAdmin, setIsSavingAuditTrustAdmin] = useState(false);
  const [auditTrustRegistrySnapshots, setAuditTrustRegistrySnapshots] = useState<AuditTrustRegistryRollbackSnapshot[]>([]);
  const [isLoadingAuditTrustRegistrySnapshots, setIsLoadingAuditTrustRegistrySnapshots] = useState(false);
  const [isRollingBackTrustRegistrySnapshot, setIsRollingBackTrustRegistrySnapshot] = useState(false);
  const [auditTrustRegistryRollbackNote, setAuditTrustRegistryRollbackNote] = useState('');
  const [trustRegistryRotationPreflight, setTrustRegistryRotationPreflight] = useState<AuditTrustRegistryRotationPreflight | null>(null);
  const [isRunningTrustRegistryRotationPreflight, setIsRunningTrustRegistryRotationPreflight] = useState(false);
  const [isApplyingTrustRegistryRotation, setIsApplyingTrustRegistryRotation] = useState(false);
  const [trustRotationCurrentKeyId, setTrustRotationCurrentKeyId] = useState('');
  const [trustRotationCurrentFingerprint, setTrustRotationCurrentFingerprint] = useState('');
  const [trustRotationNextKeyId, setTrustRotationNextKeyId] = useState('');
  const [trustRotationNextFingerprint, setTrustRotationNextFingerprint] = useState('');
  const [trustRotationActivateAt, setTrustRotationActivateAt] = useState(() => toTrustRegistryLocalDateTimeInput(new Date().toISOString()));
  const [trustRotationOverlapDays, setTrustRotationOverlapDays] = useState(14);
  const [verificationManifestFileName, setVerificationManifestFileName] = useState<string | null>(null);
  const [verificationCsvFileName, setVerificationCsvFileName] = useState<string | null>(null);
  const [verificationManifestInput, setVerificationManifestInput] = useState<Record<string, unknown> | null>(null);
  const [verificationCsvInput, setVerificationCsvInput] = useState<string | null>(null);
  const [verificationReceipt, setVerificationReceipt] = useState<AuditVerificationReceipt | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifyingBundle, setIsVerifyingBundle] = useState(false);
  const [isCompletingTaskId, setIsCompletingTaskId] = useState<string | null>(null);
  const [expandedDeadlineGuardId, setExpandedDeadlineGuardId] = useState<string | null>(null);
  const [nightRuntimeStatus, setNightRuntimeStatus] = useState<NightRuntimeStatusSnapshot | null>(null);
  const [nightRuntimeUnavailable, setNightRuntimeUnavailable] = useState(false);
  const caseTasksRef = useRef<DbCaseTask[]>([]);
  const isAutoGeneratingAuditDigestRef = useRef(false);
  const [storageUsage, setStorageUsage] = useState({ files: 0, totalSize: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const locale = language === 'fr' ? 'fr-BE' : 'en-US';
  const taskEventsQueryOptions = useMemo(() => ({
    eventType: historyEventFilter === 'all' ? undefined : historyEventFilter,
    caseId: historyCaseFilter === 'all' ? undefined : historyCaseFilter,
    playbookId: historyPlaybookFilter === 'all' ? undefined : historyPlaybookFilter,
    windowDays: resolveHistoryWindowDays(historyTimeFilter),
  }), [historyCaseFilter, historyEventFilter, historyPlaybookFilter, historyTimeFilter]);

  const appendTaskEvents = useCallback((incomingEvents: DbTaskEvent[]) => {
    if (incomingEvents.length === 0) return;
    const taskById = new Map(caseTasksRef.current.map((task) => [task.id, task]));
    const filteredIncomingEvents = incomingEvents.filter((event) => {
      if (taskEventsQueryOptions.eventType && event.event_type !== taskEventsQueryOptions.eventType) {
        return false;
      }

      if (taskEventsQueryOptions.caseId && event.case_id !== taskEventsQueryOptions.caseId) {
        return false;
      }

      if (taskEventsQueryOptions.playbookId) {
        const playbookId = resolveTaskEventPlaybookId(event, taskById);
        if (playbookId !== taskEventsQueryOptions.playbookId) {
          return false;
        }
      }

      if (taskEventsQueryOptions.windowDays) {
        const eventTimestamp = Date.parse(event.created_at);
        const windowStart = Date.now() - taskEventsQueryOptions.windowDays * DAY_IN_MS;
        if (!Number.isNaN(eventTimestamp) && eventTimestamp < windowStart) {
          return false;
        }
      }

      return true;
    });

    if (filteredIncomingEvents.length === 0) return;

    setTaskEvents((previousEvents) => {
      const merged = [...filteredIncomingEvents, ...previousEvents];
      const deduped = Array.from(new Map(merged.map((event) => [event.id, event])).values());
      return deduped
        .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
        .slice(0, 50);
    });
    setTaskEventsPageOffset((previousOffset) => previousOffset + filteredIncomingEvents.length);
  }, [taskEventsQueryOptions]);

  useEffect(() => {
    const fetchCases = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      if (user.isGuest) {
        setAllCases([]);
        setRecentCases([]);
        setCaseTasks([]);
        setTaskPolicyConfig(cloneTaskPolicyConfig(DEFAULT_TASK_POLICY_CONFIG));
        setDraftTaskPolicyConfig(cloneTaskPolicyConfig(DEFAULT_TASK_POLICY_CONFIG));
        setTaskEvents([]);
        setTaskEventsPageOffset(0);
        setTaskEventsHasMore(false);
        setIsLoadingMoreTaskEvents(false);
        setTaskPolicyEvents([]);
        setDeadlineSources([]);
        setDeadlineEvidence([]);
        setIsCaseTasksSupported(true);
        setIsTaskPoliciesSupported(true);
        setIsTaskEventsSupported(true);
        setIsTaskPolicyEventsSupported(true);
        setIsDeadlineProvenanceSupported(true);
        setIsPolicyEditorOpen(false);
        setPolicySaveError(null);
        setPolicySaveSuccess(false);
        setTaskEventPruneMessage(null);
        setAuditSigningStatus(null);
        setIsAuditSigningStatusUnavailable(false);
        setIsAuditTrustRegistryAdmin(false);
        setAuditTrustRegistrySnapshot(null);
        setAuditTrustRegistryHistory([]);
        setAuditTrustRegistryHistoryOffset(0);
        setAuditTrustRegistryHistoryHasMore(false);
        setIsLoadingAuditTrustRegistryHistory(false);
        setIsPruningAuditTrustRegistryHistory(false);
        setAuditTrustRegistryHistoryRetentionDays(180);
        setAuditTrustAdminProfiles([]);
        setAuditTrustAdminTargetEmail('');
        setAuditTrustAdminChangeNote('');
        setAuditTrustAdminMessage(null);
        setIsLoadingAuditTrustAdmins(false);
        setIsSavingAuditTrustAdmin(false);
        setAuditTrustRegistrySnapshots([]);
        setIsLoadingAuditTrustRegistrySnapshots(false);
        setIsRollingBackTrustRegistrySnapshot(false);
        setAuditTrustRegistryRollbackNote('');
        setTrustRegistryRotationPreflight(null);
        setIsRunningTrustRegistryRotationPreflight(false);
        setIsApplyingTrustRegistryRotation(false);
        setTrustRotationCurrentKeyId('');
        setTrustRotationCurrentFingerprint('');
        setTrustRotationNextKeyId('');
        setTrustRotationNextFingerprint('');
        setTrustRotationActivateAt(toTrustRegistryLocalDateTimeInput(new Date().toISOString()));
        setTrustRotationOverlapDays(14);
        setAuditTrustRegistryDraftEntries([]);
        setAuditTrustRegistryChangeNote('');
        setAuditTrustRegistryMessage(null);
        setIsSavingAuditTrustRegistry(false);
        setVerificationManifestFileName(null);
        setVerificationCsvFileName(null);
        setVerificationManifestInput(null);
        setVerificationCsvInput(null);
        setVerificationReceipt(null);
        setVerificationError(null);
        setIsVerifyingBundle(false);
        setAutoRetentionCadence(AUTO_RETENTION_DEFAULT_CADENCE);
        setLastAutoRetentionRunAt(null);
        setStorageUsage({ files: 0, totalSize: 0 });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [cases, usage, tasksResult, policyResult, taskEventsResult, taskPolicyEventsResult, deadlineSourcesResult, deadlineEvidenceResult] = await Promise.all([
          getUserCases(),
          getUserStorageUsage(),
          getUserCaseTasks()
            .then((tasks) => ({ supported: true as const, tasks }))
            .catch((error) => {
              if (isCaseTasksTableMissingError(error)) {
                return { supported: false as const, tasks: [] as DbCaseTask[] };
              }
              throw error;
            }),
          getUserTaskPolicies()
            .then((policies) => ({ supported: true as const, policies }))
            .catch((error) => {
              if (isCaseTasksTableMissingError(error)) {
                return { supported: false as const, policies: [] as DbTaskPolicy[] };
              }
              throw error;
            }),
          getUserTaskEventsPage({ limit: 40, offset: 0 })
            .then((page) => ({
              supported: true as const,
              events: page.events,
              nextOffset: page.nextOffset,
              hasMore: page.hasMore,
            }))
            .catch((error) => {
              if (isCaseTasksTableMissingError(error)) {
                return {
                  supported: false as const,
                  events: [] as DbTaskEvent[],
                  nextOffset: 0,
                  hasMore: false,
                };
              }
              throw error;
            }),
          getUserTaskPolicyEvents(8)
            .then((events) => ({ supported: true as const, events }))
            .catch((error) => {
              if (isCaseTasksTableMissingError(error)) {
                return { supported: false as const, events: [] as DbTaskPolicyEvent[] };
              }
              throw error;
            }),
          getUserDeadlineSources()
            .then((sources) => ({ supported: true as const, sources }))
            .catch((error) => {
              if (isCaseTasksTableMissingError(error)) {
                return { supported: false as const, sources: [] as DbDeadlineSource[] };
              }
              throw error;
            }),
          getUserDeadlineEvidence()
            .then((evidence) => ({ supported: true as const, evidence }))
            .catch((error) => {
              if (isCaseTasksTableMissingError(error)) {
                return { supported: false as const, evidence: [] as DbDeadlineEvidence[] };
              }
              throw error;
            }),
        ]);

        const convertedCases = cases.map(dbCase => ({
          id: dbCase.id,
          caseId: dbCase.case_id,
          title: dbCase.title,
          description: dbCase.description,
          status: dbCase.status as 'active' | 'pending' | 'closed',
          createdAt: dbCase.created_at,
          updatedAt: dbCase.updated_at,
          messages: toCountArray(dbCase.messages),
          documents: toCountArray(dbCase.documents),
          userId: dbCase.user_id
        }));

        setAllCases(convertedCases);
        setRecentCases(convertedCases.slice(0, 3));
        setStorageUsage(usage);
        setCaseTasks(tasksResult.tasks);
        const resolvedPolicyConfig = buildTaskPolicyConfig(policyResult.policies);
        setTaskPolicyConfig(resolvedPolicyConfig);
        setDraftTaskPolicyConfig(resolvedPolicyConfig);
        setTaskEvents(taskEventsResult.events);
        setTaskEventsPageOffset(taskEventsResult.nextOffset);
        setTaskEventsHasMore(taskEventsResult.hasMore);
        setIsLoadingMoreTaskEvents(false);
        setTaskPolicyEvents(taskPolicyEventsResult.events);
        setDeadlineSources(deadlineSourcesResult.sources);
        setDeadlineEvidence(deadlineEvidenceResult.evidence);
        setIsCaseTasksSupported(tasksResult.supported);
        setIsTaskPoliciesSupported(policyResult.supported);
        setIsTaskEventsSupported(taskEventsResult.supported);
        setIsTaskPolicyEventsSupported(taskPolicyEventsResult.supported);
        setIsDeadlineProvenanceSupported(deadlineSourcesResult.supported && deadlineEvidenceResult.supported);
        setPolicySaveError(null);
      } catch (error) {
        console.error('Error fetching cases', error);
        setAllCases([]);
        setRecentCases([]);
        setCaseTasks([]);
        setTaskPolicyConfig(cloneTaskPolicyConfig(DEFAULT_TASK_POLICY_CONFIG));
        setDraftTaskPolicyConfig(cloneTaskPolicyConfig(DEFAULT_TASK_POLICY_CONFIG));
        setTaskEvents([]);
        setTaskEventsPageOffset(0);
        setTaskEventsHasMore(false);
        setIsLoadingMoreTaskEvents(false);
        setTaskPolicyEvents([]);
        setDeadlineSources([]);
        setDeadlineEvidence([]);
        setIsCaseTasksSupported(true);
        setIsTaskPoliciesSupported(true);
        setIsTaskEventsSupported(true);
        setIsTaskPolicyEventsSupported(true);
        setIsDeadlineProvenanceSupported(true);
        setIsPolicyEditorOpen(false);
        setPolicySaveError(null);
        setPolicySaveSuccess(false);
        setTaskEventPruneMessage(null);
        setStorageUsage({ files: 0, totalSize: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCases();
  }, [user]);

  useEffect(() => {
    if (!user || user.isGuest) return;

    const storageKey = buildAutoRetentionSettingsStorageKey(user.id);
    try {
      const rawSettings = window.localStorage.getItem(storageKey);
      if (!rawSettings) {
        setAutoRetentionCadence(AUTO_RETENTION_DEFAULT_CADENCE);
        setLastAutoRetentionRunAt(null);
        return;
      }

      const parsedSettings = JSON.parse(rawSettings) as {
        cadence?: AutoRetentionCadence;
        retentionDays?: number;
        lastRunAt?: string | null;
      };

      if (
        typeof parsedSettings.retentionDays === 'number'
        && TASK_EVENT_RETENTION_OPTIONS.some((optionDays) => optionDays === parsedSettings.retentionDays)
      ) {
        setTaskEventRetentionDays(parsedSettings.retentionDays);
      }
      if (parsedSettings.cadence && AUTO_RETENTION_CADENCE_OPTIONS.includes(parsedSettings.cadence)) {
        setAutoRetentionCadence(parsedSettings.cadence);
      } else {
        setAutoRetentionCadence(AUTO_RETENTION_DEFAULT_CADENCE);
      }
      setLastAutoRetentionRunAt(
        typeof parsedSettings.lastRunAt === 'string' && parsedSettings.lastRunAt.length > 0
          ? parsedSettings.lastRunAt
          : null
      );
    } catch {
      setAutoRetentionCadence(AUTO_RETENTION_DEFAULT_CADENCE);
      setLastAutoRetentionRunAt(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.isGuest) return;
    const storageKey = buildAutoRetentionSettingsStorageKey(user.id);
    const payload = {
      cadence: autoRetentionCadence,
      retentionDays: taskEventRetentionDays,
      lastRunAt: lastAutoRetentionRunAt,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore localStorage failures and keep runtime behavior in-memory.
    }
  }, [autoRetentionCadence, lastAutoRetentionRunAt, taskEventRetentionDays, user]);

  useEffect(() => {
    if (!user || user.isGuest) {
      setIsAuditDigestSettingsLoaded(true);
      return;
    }

    const storageKey = buildAuditDigestSettingsStorageKey(user.id);
    try {
      const rawSettings = window.localStorage.getItem(storageKey);
      if (!rawSettings) {
        setAuditDigestCadence(AUDIT_DIGEST_DEFAULT_CADENCE);
        setDigestIncludeCompletions(true);
        setDigestIncludePolicies(true);
        setDigestIncludeGovernance(true);
        setLastAuditDigestRunAt(null);
        setIsAuditDigestSettingsLoaded(true);
        return;
      }

      const parsedSettings = JSON.parse(rawSettings) as {
        cadence?: AuditDigestCadence;
        includeCompletions?: boolean;
        includePolicies?: boolean;
        includeGovernance?: boolean;
        lastRunAt?: string | null;
      };

      if (parsedSettings.cadence && AUDIT_DIGEST_CADENCE_OPTIONS.includes(parsedSettings.cadence)) {
        setAuditDigestCadence(parsedSettings.cadence);
      } else {
        setAuditDigestCadence(AUDIT_DIGEST_DEFAULT_CADENCE);
      }
      setDigestIncludeCompletions(parsedSettings.includeCompletions !== false);
      setDigestIncludePolicies(parsedSettings.includePolicies !== false);
      setDigestIncludeGovernance(parsedSettings.includeGovernance !== false);
      setLastAuditDigestRunAt(
        typeof parsedSettings.lastRunAt === 'string' && parsedSettings.lastRunAt.length > 0
          ? parsedSettings.lastRunAt
          : null
      );
    } catch {
      setAuditDigestCadence(AUDIT_DIGEST_DEFAULT_CADENCE);
      setDigestIncludeCompletions(true);
      setDigestIncludePolicies(true);
      setDigestIncludeGovernance(true);
      setLastAuditDigestRunAt(null);
    } finally {
      setIsAuditDigestSettingsLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.isGuest) return;

    const storageKey = buildAuditDigestSettingsStorageKey(user.id);
    const payload = {
      cadence: auditDigestCadence,
      includeCompletions: digestIncludeCompletions,
      includePolicies: digestIncludePolicies,
      includeGovernance: digestIncludeGovernance,
      lastRunAt: lastAuditDigestRunAt,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore localStorage failures and keep runtime behavior in-memory.
    }
  }, [
    auditDigestCadence,
    digestIncludeCompletions,
    digestIncludePolicies,
    digestIncludeGovernance,
    lastAuditDigestRunAt,
    user,
  ]);

  useEffect(() => {
    if (!policySaveSuccess) return;
    const timer = window.setTimeout(() => {
      setPolicySaveSuccess(false);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [policySaveSuccess]);

  useEffect(() => {
    if (!taskEventPruneMessage) return;
    const timer = window.setTimeout(() => {
      setTaskEventPruneMessage(null);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [taskEventPruneMessage]);

  useEffect(() => {
    if (!historyExportMessage) return;
    const timer = window.setTimeout(() => {
      setHistoryExportMessage(null);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [historyExportMessage]);

  useEffect(() => {
    if (!auditTrustAdminMessage) return;
    const timer = window.setTimeout(() => {
      setAuditTrustAdminMessage(null);
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [auditTrustAdminMessage]);

  useEffect(() => {
    setTrustRegistryRotationPreflight(null);
  }, [
    trustRotationActivateAt,
    trustRotationCurrentFingerprint,
    trustRotationCurrentKeyId,
    trustRotationNextFingerprint,
    trustRotationNextKeyId,
    trustRotationOverlapDays,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadAuditSigningStatus = async () => {
      try {
        const [status, trustRegistry] = await Promise.all([
          fetchAuditSigningStatus(),
          fetchAuditTrustRegistry(),
        ]);
        if (cancelled) return;
        if (!status) {
          setIsAuditSigningStatusUnavailable(true);
          setAuditSigningStatus(null);
        } else {
          setAuditSigningStatus(status);
          setIsAuditSigningStatusUnavailable(false);
        }

        if (trustRegistry) {
          setIsAuditTrustRegistryAdmin(true);
          setAuditTrustRegistrySnapshot(trustRegistry);
          const runtimeEntries = Array.isArray(trustRegistry.runtime_entries)
            ? trustRegistry.runtime_entries
            : [];
          setAuditTrustRegistryDraftEntries(buildTrustRegistryDraftEntries(runtimeEntries));
          setAuditTrustRegistryChangeNote('');
          setAuditTrustRegistryMessage(null);
          setIsLoadingAuditTrustAdmins(true);
          setIsLoadingAuditTrustRegistrySnapshots(true);
          const [historyPage, trustAdminDirectory, trustRegistrySnapshots] = await Promise.all([
            fetchAuditTrustRegistryHistoryPage({
              limit: 25,
              offset: 0,
              retentionDays: auditTrustRegistryHistoryRetentionDays,
            }),
            fetchAuditTrustAdmins(),
            fetchAuditTrustRegistrySnapshots(20),
          ]);
          if (!cancelled) {
            setAuditTrustRegistryHistory(historyPage.events);
            setAuditTrustRegistryHistoryOffset(historyPage.nextOffset);
            setAuditTrustRegistryHistoryHasMore(historyPage.hasMore);
            setAuditTrustAdminProfiles(trustAdminDirectory?.admins ?? []);
            setAuditTrustRegistrySnapshots(trustRegistrySnapshots ?? []);
            setAuditTrustAdminTargetEmail('');
            setAuditTrustAdminChangeNote('');
            setAuditTrustAdminMessage(null);
            setAuditTrustRegistryRollbackNote('');
            setTrustRegistryRotationPreflight(null);
            setIsRunningTrustRegistryRotationPreflight(false);
            setIsApplyingTrustRegistryRotation(false);
            setTrustRotationCurrentKeyId((status?.keyId ?? '').trim());
            setTrustRotationCurrentFingerprint((status?.publicKeySha256 ?? '').trim().toLowerCase());
            setTrustRotationNextKeyId('');
            setTrustRotationNextFingerprint('');
            setTrustRotationActivateAt(toTrustRegistryLocalDateTimeInput(new Date().toISOString()));
            setTrustRotationOverlapDays(14);
          }
          if (!cancelled) {
            setIsLoadingAuditTrustAdmins(false);
            setIsLoadingAuditTrustRegistrySnapshots(false);
          }
        } else {
          setIsAuditTrustRegistryAdmin(false);
          setAuditTrustRegistrySnapshot(null);
          setAuditTrustRegistryDraftEntries([]);
          setAuditTrustRegistryChangeNote('');
          setAuditTrustRegistryHistory([]);
          setAuditTrustRegistryHistoryOffset(0);
          setAuditTrustRegistryHistoryHasMore(false);
          setAuditTrustAdminProfiles([]);
          setAuditTrustRegistrySnapshots([]);
          setAuditTrustAdminTargetEmail('');
          setAuditTrustAdminChangeNote('');
          setAuditTrustAdminMessage(null);
          setIsLoadingAuditTrustAdmins(false);
          setIsSavingAuditTrustAdmin(false);
          setIsLoadingAuditTrustRegistrySnapshots(false);
          setIsRollingBackTrustRegistrySnapshot(false);
          setAuditTrustRegistryRollbackNote('');
          setTrustRegistryRotationPreflight(null);
          setIsRunningTrustRegistryRotationPreflight(false);
          setIsApplyingTrustRegistryRotation(false);
          setTrustRotationCurrentKeyId('');
          setTrustRotationCurrentFingerprint('');
          setTrustRotationNextKeyId('');
          setTrustRotationNextFingerprint('');
          setTrustRotationActivateAt(toTrustRegistryLocalDateTimeInput(new Date().toISOString()));
          setTrustRotationOverlapDays(14);
        }
      } catch {
        if (cancelled) return;
        setIsAuditSigningStatusUnavailable(true);
        setAuditSigningStatus(null);
        setIsAuditTrustRegistryAdmin(false);
        setAuditTrustRegistrySnapshot(null);
        setAuditTrustRegistryDraftEntries([]);
        setAuditTrustAdminProfiles([]);
        setAuditTrustRegistrySnapshots([]);
        setAuditTrustAdminTargetEmail('');
        setAuditTrustAdminChangeNote('');
        setAuditTrustAdminMessage(null);
        setIsLoadingAuditTrustAdmins(false);
        setIsSavingAuditTrustAdmin(false);
        setIsLoadingAuditTrustRegistrySnapshots(false);
        setIsRollingBackTrustRegistrySnapshot(false);
        setAuditTrustRegistryRollbackNote('');
        setTrustRegistryRotationPreflight(null);
        setIsRunningTrustRegistryRotationPreflight(false);
        setIsApplyingTrustRegistryRotation(false);
        setTrustRotationCurrentKeyId('');
        setTrustRotationCurrentFingerprint('');
        setTrustRotationNextKeyId('');
        setTrustRotationNextFingerprint('');
        setTrustRotationActivateAt(toTrustRegistryLocalDateTimeInput(new Date().toISOString()));
        setTrustRotationOverlapDays(14);
      }
    };

    void loadAuditSigningStatus();
    return () => {
      cancelled = true;
    };
  }, [auditTrustRegistryHistoryRetentionDays]);

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;

    const fetchStaticNightStatus = async () => {
      const response = await fetch(`/night-status.json?ts=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`night-status fetch failed: ${response.status}`);
      }

      return response.json();
    };

    const fetchNightStatus = async () => {
      try {
        const apiResponse = await fetch(buildApiUrl(`/api/night/status?ts=${Date.now()}`), {
          cache: 'no-store',
        });

        let payload: unknown;
        if (apiResponse.ok) {
          payload = await apiResponse.json();
        } else {
          payload = await fetchStaticNightStatus();
        }

        const normalizedPayload = normalizeNightRuntimeStatus(payload);
        if (!normalizedPayload) {
          throw new Error('night runtime payload format invalid');
        }
        if (!isMounted) return;
        setNightRuntimeStatus(normalizedPayload);
        setNightRuntimeUnavailable(false);
      } catch {
        try {
          const fallbackPayload = await fetchStaticNightStatus();
          const normalizedPayload = normalizeNightRuntimeStatus(fallbackPayload);
          if (!normalizedPayload) {
            throw new Error('night runtime fallback payload format invalid');
          }
          if (!isMounted) return;
          setNightRuntimeStatus(normalizedPayload);
          setNightRuntimeUnavailable(false);
        } catch {
          if (!isMounted) return;
          setNightRuntimeUnavailable(true);
        }
      }
    };

    void fetchNightStatus();
    intervalId = window.setInterval(() => {
      void fetchNightStatus();
    }, 30000);

    return () => {
      isMounted = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const isTaskPolicyDraftDirty = useMemo(
    () => !isTaskPolicyConfigEqual(draftTaskPolicyConfig, taskPolicyConfig),
    [draftTaskPolicyConfig, taskPolicyConfig]
  );
  const isTaskPolicyEditorDisabled = !isTaskPoliciesSupported || !user || user.isGuest;
  const auditTrustRegistryDraftIssues = useMemo(
    () => validateTrustRegistryDraftEntries(auditTrustRegistryDraftEntries),
    [auditTrustRegistryDraftEntries]
  );
  const auditTrustRegistryValidationIssueCount = useMemo(
    () => Object.values(auditTrustRegistryDraftIssues).reduce((total, entryIssues) => total + entryIssues.length, 0),
    [auditTrustRegistryDraftIssues]
  );
  const isAuditTrustRegistryDraftOverLimit = auditTrustRegistryDraftEntries.length > MAX_TRUST_REGISTRY_ENTRIES;
  const hasAuditTrustRegistryDraftIssues = isAuditTrustRegistryDraftOverLimit || auditTrustRegistryValidationIssueCount > 0;
  const canSaveAuditTrustRegistry = isAuditTrustRegistryAdmin
    && !isSavingAuditTrustRegistry
    && !hasAuditTrustRegistryDraftIssues;

  const updateDraftTaskPolicyField = useCallback((
    status: CaseLifecycleStatus,
    field: keyof TaskPolicyConfig,
    rawValue: string
  ) => {
    const parsedValue = Number.parseInt(rawValue, 10);
    const normalizedValue = Number.isNaN(parsedValue)
      ? (field === 'slaDays' ? POLICY_MIN_SLA_DAYS : POLICY_MIN_REMINDER_DAYS)
      : parsedValue;

    setDraftTaskPolicyConfig((previousConfig) => {
      const nextConfig = cloneTaskPolicyConfig(previousConfig);
      const currentEntry = nextConfig[status];
      if (field === 'slaDays') {
        currentEntry.slaDays = Math.min(POLICY_MAX_SLA_DAYS, Math.max(POLICY_MIN_SLA_DAYS, normalizedValue));
        currentEntry.reminderWindowDays = Math.min(
          currentEntry.reminderWindowDays,
          currentEntry.slaDays - 1
        );
      } else {
        currentEntry.reminderWindowDays = Math.min(
          POLICY_MAX_REMINDER_DAYS,
          Math.max(POLICY_MIN_REMINDER_DAYS, normalizedValue)
        );
      }
      return nextConfig;
    });
    setPolicySaveError(null);
    setPolicySaveSuccess(false);
  }, []);

  const handleResetTaskPolicies = useCallback(() => {
    setDraftTaskPolicyConfig(cloneTaskPolicyConfig(DEFAULT_TASK_POLICY_CONFIG));
    setPolicySaveError(null);
    setPolicySaveSuccess(false);
  }, []);

  const handleApplyTaskPolicyPreset = useCallback((preset: TaskPolicyPreset) => {
    setDraftTaskPolicyConfig(sanitizeTaskPolicyConfig(preset.config));
    setPolicySaveError(null);
    setPolicySaveSuccess(false);
  }, []);

  const handleSaveTaskPolicies = useCallback(async () => {
    if (isTaskPolicyEditorDisabled || isSavingTaskPolicies) return;

    const normalizedConfig = sanitizeTaskPolicyConfig(draftTaskPolicyConfig);
    const previousConfig = cloneTaskPolicyConfig(taskPolicyConfig);
    const hasInvalidReminderWindow = (
      normalizedConfig.active.reminderWindowDays >= normalizedConfig.active.slaDays
      || normalizedConfig.pending.reminderWindowDays >= normalizedConfig.pending.slaDays
    );
    if (hasInvalidReminderWindow) {
      setPolicySaveError(t.dashboard.actionQueue.policyValidationError);
      return;
    }

    setPolicySaveError(null);
    setPolicySaveSuccess(false);
    setIsSavingTaskPolicies(true);
    try {
      const savedPolicies = await upsertTaskPolicies([
        {
          caseStatus: 'active',
          source: 'custom_ui',
          slaDays: normalizedConfig.active.slaDays,
          reminderWindowDays: normalizedConfig.active.reminderWindowDays,
          isActive: true,
          metadata: { updatedFrom: 'dashboard_action_queue' },
        },
        {
          caseStatus: 'pending',
          source: 'custom_ui',
          slaDays: normalizedConfig.pending.slaDays,
          reminderWindowDays: normalizedConfig.pending.reminderWindowDays,
          isActive: true,
          metadata: { updatedFrom: 'dashboard_action_queue' },
        },
      ]);
      const nextPolicyConfig = buildTaskPolicyConfig(savedPolicies);
      setTaskPolicyConfig(nextPolicyConfig);
      setDraftTaskPolicyConfig(nextPolicyConfig);
      setPolicySaveSuccess(true);

      if (isTaskPolicyEventsSupported) {
        const policyAuditPayload = (['active', 'pending'] as const)
          .filter((status) => (
            previousConfig[status].slaDays !== nextPolicyConfig[status].slaDays
            || previousConfig[status].reminderWindowDays !== nextPolicyConfig[status].reminderWindowDays
          ))
          .map((status) => ({
            caseStatus: status,
            previousSlaDays: previousConfig[status].slaDays,
            previousReminderWindowDays: previousConfig[status].reminderWindowDays,
            newSlaDays: nextPolicyConfig[status].slaDays,
            newReminderWindowDays: nextPolicyConfig[status].reminderWindowDays,
            eventSource: 'dashboard-policy',
            metadata: {
              updatedFrom: 'dashboard_action_queue',
            },
          }));

        if (policyAuditPayload.length > 0) {
          try {
            const insertedPolicyEvents = await createTaskPolicyEvents(policyAuditPayload);
            setTaskPolicyEvents((previousEvents) =>
              [...insertedPolicyEvents, ...previousEvents].slice(0, 12)
            );
          } catch (policyEventError) {
            if (isCaseTasksTableMissingError(policyEventError)) {
              setIsTaskPolicyEventsSupported(false);
              setTaskPolicyEvents([]);
            } else {
              console.error('Failed to create task policy audit events', policyEventError);
            }
          }
        }
      }
    } catch (error) {
      if (isCaseTasksTableMissingError(error)) {
        setIsTaskPoliciesSupported(false);
        setPolicySaveError(t.dashboard.actionQueue.policyFallback);
        return;
      }
      console.error('Failed to save task policies', error);
      setPolicySaveError(t.dashboard.actionQueue.policySaveError);
    } finally {
      setIsSavingTaskPolicies(false);
    }
  }, [
    taskPolicyConfig,
    isTaskPolicyEventsSupported,
    draftTaskPolicyConfig,
    isSavingTaskPolicies,
    isTaskPolicyEditorDisabled,
    t.dashboard.actionQueue.policyFallback,
    t.dashboard.actionQueue.policySaveError,
    t.dashboard.actionQueue.policyValidationError,
  ]);

  const activeCasesCount = allCases.filter((caseItem) => caseItem.status === 'active').length;
  const totalConsultations = allCases.reduce((total, caseItem) => total + caseItem.messages.length, 0);
  const storageUsedMb = storageUsage.totalSize / (1024 * 1024);
  const nightRuntimeHealth = useMemo(() => {
    if (!nightRuntimeStatus) {
      return {
        badgeLabel: t.dashboard.nightRuntime.unavailable,
        badgeClass: theme === 'dark'
          ? 'bg-slate-700/70 text-slate-200'
          : 'bg-slate-100 text-slate-700',
      };
    }

    if (nightRuntimeStatus.health === 'fail') {
      return {
        badgeLabel: t.dashboard.nightRuntime.critical,
        badgeClass: theme === 'dark'
          ? 'bg-red-500/20 text-red-200'
          : 'bg-red-50 text-red-700',
      };
    }

    if (nightRuntimeStatus.health === 'pass') {
      return {
        badgeLabel: t.dashboard.nightRuntime.active,
        badgeClass: theme === 'dark'
          ? 'bg-emerald-500/20 text-emerald-200'
          : 'bg-emerald-50 text-emerald-700',
      };
    }

    const lastUpdateMs = Date.parse(nightRuntimeStatus.finished_at || nightRuntimeStatus.timestamp);
    const minutesSinceUpdate = Number.isNaN(lastUpdateMs)
      ? Number.POSITIVE_INFINITY
      : Math.max(0, Math.round((Date.now() - lastUpdateMs) / 60000));
    const isFresh = minutesSinceUpdate <= 10;
    const hasFailures = nightRuntimeStatus.last_iteration_failures > 0 || nightRuntimeStatus.consecutive_failures > 0;

    if (isFresh && !hasFailures) {
      return {
        badgeLabel: t.dashboard.nightRuntime.active,
        badgeClass: theme === 'dark'
          ? 'bg-emerald-500/20 text-emerald-200'
          : 'bg-emerald-50 text-emerald-700',
      };
    }

    return {
      badgeLabel: t.dashboard.nightRuntime.attention,
      badgeClass: theme === 'dark'
        ? 'bg-amber-500/20 text-amber-200'
        : 'bg-amber-50 text-amber-700',
    };
  }, [
    nightRuntimeStatus,
    t.dashboard.nightRuntime.active,
    t.dashboard.nightRuntime.attention,
    t.dashboard.nightRuntime.critical,
    t.dashboard.nightRuntime.unavailable,
    theme,
  ]);
  const resolveNightLaneLabel = useCallback((laneId: NightRuntimeLaneId) => {
    if (laneId === 'message') return t.dashboard.nightRuntime.laneMessage;
    if (laneId === 'cron') return t.dashboard.nightRuntime.laneCron;
    return t.dashboard.nightRuntime.laneSelfprompt;
  }, [
    t.dashboard.nightRuntime.laneCron,
    t.dashboard.nightRuntime.laneMessage,
    t.dashboard.nightRuntime.laneSelfprompt,
  ]);
  const resolveNightLaneStatusLabel = useCallback((status: NightRuntimeLaneStatus) => {
    if (status === 'healthy') return t.dashboard.nightRuntime.laneStatusHealthy;
    if (status === 'degraded') return t.dashboard.nightRuntime.laneStatusDegraded;
    if (status === 'failing') return t.dashboard.nightRuntime.laneStatusFailing;
    if (status === 'stale') return t.dashboard.nightRuntime.laneStatusStale;
    return t.dashboard.nightRuntime.laneStatusUnavailable;
  }, [
    t.dashboard.nightRuntime.laneStatusDegraded,
    t.dashboard.nightRuntime.laneStatusFailing,
    t.dashboard.nightRuntime.laneStatusHealthy,
    t.dashboard.nightRuntime.laneStatusStale,
    t.dashboard.nightRuntime.laneStatusUnavailable,
  ]);
  const resolveNightLaneStatusClass = useCallback((status: NightRuntimeLaneStatus) => {
    if (status === 'healthy') {
      return theme === 'dark'
        ? 'bg-emerald-500/20 text-emerald-200'
        : 'bg-emerald-50 text-emerald-700';
    }
    if (status === 'degraded' || status === 'stale') {
      return theme === 'dark'
        ? 'bg-amber-500/20 text-amber-200'
        : 'bg-amber-50 text-amber-700';
    }
    if (status === 'failing') {
      return theme === 'dark'
        ? 'bg-red-500/20 text-red-200'
        : 'bg-red-50 text-red-700';
    }
    return theme === 'dark'
      ? 'bg-slate-700/70 text-slate-200'
      : 'bg-slate-100 text-slate-700';
  }, [theme]);
  const caseTaskSeeds = useMemo(
    () => buildCaseTaskSeeds(allCases, taskPolicyConfig),
    [allCases, taskPolicyConfig]
  );

  useEffect(() => {
    caseTasksRef.current = caseTasks;
  }, [caseTasks]);

  useEffect(() => {
    if (!user || user.isGuest || !isCaseTasksSupported) return;

    const syncCaseTasks = async () => {
      try {
        if (caseTaskSeeds.length === 0) {
          setCaseTasks([]);
          return;
        }

        const existingTaskMap = new Map(
          caseTasksRef.current.map((task) => [
            caseTaskKey(task.case_id, task.playbook_id, task.source),
            task,
          ])
        );

        const mergedSeeds = caseTaskSeeds.map((seed) => {
          const existingTask = existingTaskMap.get(
            caseTaskKey(seed.caseId, seed.playbookId, seed.source)
          );

          if (!existingTask?.completed_at) {
            return { ...seed, completedAt: null };
          }

          const completedAtMs = Date.parse(existingTask.completed_at);
          const lastActivityRaw = String(seed.metadata.lastActivityAt ?? '');
          const lastActivityMs = Date.parse(lastActivityRaw);
          const keepCompleted = !Number.isNaN(completedAtMs)
            && !Number.isNaN(lastActivityMs)
            && completedAtMs >= lastActivityMs;

          if (!keepCompleted) {
            return { ...seed, completedAt: null };
          }

          return {
            ...seed,
            status: 'completed' as const,
            completedAt: existingTask.completed_at ?? new Date().toISOString(),
          };
        });

        const syncedTasks = await upsertCaseTasks(mergedSeeds);
        setCaseTasks(syncedTasks);

        if (isTaskEventsSupported) {
          const syncEvents = syncedTasks.flatMap((task) => {
            const taskKey = caseTaskKey(task.case_id, task.playbook_id, task.source);
            const previousTask = existingTaskMap.get(taskKey);

            if (!previousTask) {
              return [{
                taskId: task.id,
                caseId: task.case_id,
                playbookId: task.playbook_id,
                eventType: 'created' as const,
                eventSource: 'dashboard-sync',
                payload: {
                  playbookId: task.playbook_id,
                  source: task.source,
                },
              }];
            }

            if (previousTask.completed_at && task.status !== 'completed') {
              return [{
                taskId: task.id,
                caseId: task.case_id,
                playbookId: task.playbook_id,
                eventType: 'reopened' as const,
                eventSource: 'dashboard-sync',
                payload: {
                  playbookId: task.playbook_id,
                  previousCompletedAt: previousTask.completed_at,
                },
              }];
            }

            return [];
          });

          if (syncEvents.length === 0) return;
          try {
            const insertedEvents = await createTaskEvents(syncEvents);
            appendTaskEvents(insertedEvents);
          } catch (eventError) {
            if (isCaseTasksTableMissingError(eventError)) {
              setIsTaskEventsSupported(false);
              setTaskEvents([]);
            } else {
              console.error('Failed to write task sync events', eventError);
            }
          }
        }
      } catch (error) {
        if (isCaseTasksTableMissingError(error)) {
          setIsCaseTasksSupported(false);
          setCaseTasks([]);
          return;
        }
        console.error('Failed to sync case tasks', error);
      }
    };

    void syncCaseTasks();
  }, [appendTaskEvents, caseTaskSeeds, isCaseTasksSupported, isTaskEventsSupported, user]);

  const handleCompleteTask = useCallback(async (taskId: string) => {
    if (!isCaseTasksSupported) return;
    setIsCompletingTaskId(taskId);
    try {
      const completedTask = await completeCaseTask(taskId);
      setCaseTasks((previousTasks) => previousTasks.map((task) => (
        task.id === completedTask.id ? completedTask : task
      )));

      if (isTaskEventsSupported) {
        const insertedEvents = await createTaskEvents([
          {
            taskId: completedTask.id,
            caseId: completedTask.case_id,
            playbookId: completedTask.playbook_id,
            eventType: 'completed',
            eventSource: 'dashboard-action',
            payload: {
              playbookId: completedTask.playbook_id,
              completedAt: completedTask.completed_at,
            },
          },
        ]);
        appendTaskEvents(insertedEvents);
      }
    } catch (error) {
      if (isCaseTasksTableMissingError(error)) {
        setIsTaskEventsSupported(false);
        return;
      }
      console.error('Failed to complete task', error);
    } finally {
      setIsCompletingTaskId(null);
    }
  }, [appendTaskEvents, isCaseTasksSupported, isTaskEventsSupported]);

  const pruneTaskEvents = useCallback(async (mode: 'manual' | 'auto') => {
    if (!isTaskEventsSupported || !user || user.isGuest || isPruningTaskEvents) return;

    if (mode === 'manual') {
      setTaskEventPruneMessage(null);
    }
    setIsPruningTaskEvents(true);
    try {
      const trimmedCount = await trimUserTaskEvents(taskEventRetentionDays, TASK_EVENT_RETENTION_LATEST);
      const refreshedEventsPage = await getUserTaskEventsPage({
        limit: 40,
        offset: 0,
        eventType: taskEventsQueryOptions.eventType,
        caseId: taskEventsQueryOptions.caseId,
        playbookId: taskEventsQueryOptions.playbookId,
        windowDays: taskEventsQueryOptions.windowDays,
      });
      setTaskEvents(refreshedEventsPage.events);
      setTaskEventsPageOffset(refreshedEventsPage.nextOffset);
      setTaskEventsHasMore(refreshedEventsPage.hasMore);

      const runAt = new Date().toISOString();
      if (mode === 'auto') {
        setLastAutoRetentionRunAt(runAt);
        setTaskEventPruneMessage(
          interpolateTemplate(t.dashboard.actionQueue.historyAutoRetentionSuccess, {
            count: trimmedCount,
            days: taskEventRetentionDays,
          })
        );
      } else {
        setTaskEventPruneMessage(
          interpolateTemplate(t.dashboard.actionQueue.historyRetentionSuccess, {
            count: trimmedCount,
            days: taskEventRetentionDays,
          })
        );
      }
    } catch (error) {
      if (isCaseTasksTableMissingError(error)) {
        setIsTaskEventsSupported(false);
        setTaskEvents([]);
        setTaskEventsPageOffset(0);
        setTaskEventsHasMore(false);
        setTaskEventPruneMessage(t.dashboard.actionQueue.historyRetentionUnsupported);
        return;
      }
      console.error('Failed to prune task events', error);
      setTaskEventPruneMessage(t.dashboard.actionQueue.historyRetentionError);
    } finally {
      setIsPruningTaskEvents(false);
    }
  }, [
    isPruningTaskEvents,
    isTaskEventsSupported,
    taskEventRetentionDays,
    taskEventsQueryOptions.caseId,
    taskEventsQueryOptions.eventType,
    taskEventsQueryOptions.playbookId,
    taskEventsQueryOptions.windowDays,
    t.dashboard.actionQueue.historyAutoRetentionSuccess,
    t.dashboard.actionQueue.historyRetentionError,
    t.dashboard.actionQueue.historyRetentionSuccess,
    t.dashboard.actionQueue.historyRetentionUnsupported,
    user,
  ]);

  const handlePruneTaskEvents = useCallback(async () => {
    await pruneTaskEvents('manual');
  }, [pruneTaskEvents]);

  useEffect(() => {
    if (!isTaskEventsSupported || !user || user.isGuest || isPruningTaskEvents) return;
    if (autoRetentionCadence === 'manual') return;

    const intervalMs = resolveAutoRetentionIntervalMs(autoRetentionCadence);
    const lastRunMs = lastAutoRetentionRunAt ? Date.parse(lastAutoRetentionRunAt) : Number.NaN;
    const hasValidLastRun = Number.isFinite(lastRunMs);
    const shouldRun = !hasValidLastRun || (Date.now() - lastRunMs >= intervalMs);
    if (!shouldRun) return;

    void pruneTaskEvents('auto');
  }, [
    autoRetentionCadence,
    isPruningTaskEvents,
    isTaskEventsSupported,
    lastAutoRetentionRunAt,
    pruneTaskEvents,
    user,
  ]);

  useEffect(() => {
    if (!user || user.isGuest || !isTaskEventsSupported) return;

    let cancelled = false;

    const fetchFilteredTaskEvents = async () => {
      try {
        const page = await getUserTaskEventsPage({
          limit: 40,
          offset: 0,
          eventType: taskEventsQueryOptions.eventType,
          caseId: taskEventsQueryOptions.caseId,
          playbookId: taskEventsQueryOptions.playbookId,
          windowDays: taskEventsQueryOptions.windowDays,
        });

        if (cancelled) return;
        setTaskEvents(page.events);
        setTaskEventsPageOffset(page.nextOffset);
        setTaskEventsHasMore(page.hasMore);
      } catch (error) {
        if (isCaseTasksTableMissingError(error)) {
          if (cancelled) return;
          setIsTaskEventsSupported(false);
          setTaskEvents([]);
          setTaskEventsPageOffset(0);
          setTaskEventsHasMore(false);
          return;
        }
        console.error('Failed to fetch filtered task events', error);
      }
    };

    void fetchFilteredTaskEvents();

    return () => {
      cancelled = true;
    };
  }, [isTaskEventsSupported, taskEventsQueryOptions, user]);

  const handleLoadMoreTaskEvents = useCallback(async () => {
    if (!user || user.isGuest || !isTaskEventsSupported || !taskEventsHasMore || isLoadingMoreTaskEvents) return;

    setIsLoadingMoreTaskEvents(true);
    try {
      const page = await getUserTaskEventsPage({
        limit: 40,
        offset: taskEventsPageOffset,
        eventType: taskEventsQueryOptions.eventType,
        caseId: taskEventsQueryOptions.caseId,
        playbookId: taskEventsQueryOptions.playbookId,
        windowDays: taskEventsQueryOptions.windowDays,
      });

      setTaskEvents((previousEvents) => {
        const merged = [...previousEvents, ...page.events];
        return Array.from(new Map(merged.map((event) => [event.id, event])).values());
      });
      setTaskEventsPageOffset(page.nextOffset);
      setTaskEventsHasMore(page.hasMore);
    } catch (error) {
      if (isCaseTasksTableMissingError(error)) {
        setIsTaskEventsSupported(false);
        setTaskEvents([]);
        setTaskEventsPageOffset(0);
        setTaskEventsHasMore(false);
        return;
      }
      console.error('Failed to load more task events', error);
    } finally {
      setIsLoadingMoreTaskEvents(false);
    }
  }, [
    isLoadingMoreTaskEvents,
    isTaskEventsSupported,
    taskEventsHasMore,
    taskEventsPageOffset,
    taskEventsQueryOptions,
    user,
  ]);

  const priorityActions = useMemo(() => {
    return [
      {
        id: 'deadline-pressure',
        title: t.dashboard.opsRadar.priorities.deadlinePressure.title,
        description: t.dashboard.opsRadar.priorities.deadlinePressure.description,
        score: Math.min(98, 52 + activeCasesCount * 9),
        eta: t.dashboard.opsRadar.priorities.deadlinePressure.eta,
        route: '/chat?playbook=timeline-extraction',
      },
      {
        id: 'exposure-review',
        title: t.dashboard.opsRadar.priorities.exposureReview.title,
        description: t.dashboard.opsRadar.priorities.exposureReview.description,
        score: Math.min(95, 45 + Math.floor(totalConsultations / 2)),
        eta: t.dashboard.opsRadar.priorities.exposureReview.eta,
        route: '/chat?playbook=risk-scan',
      },
      {
        id: 'strategy-branching',
        title: t.dashboard.opsRadar.priorities.strategyBranching.title,
        description: t.dashboard.opsRadar.priorities.strategyBranching.description,
        score: Math.min(93, 40 + activeCasesCount * 8),
        eta: t.dashboard.opsRadar.priorities.strategyBranching.eta,
        route: '/chat?playbook=strategy-matrix',
      },
      {
        id: 'client-brief-sync',
        title: t.dashboard.opsRadar.priorities.clientBriefing.title,
        description: t.dashboard.opsRadar.priorities.clientBriefing.description,
        score: Math.min(88, 36 + Math.floor(storageUsedMb / 4)),
        eta: t.dashboard.opsRadar.priorities.clientBriefing.eta,
        route: '/chat?playbook=client-brief',
      },
    ].sort((a, b) => b.score - a.score);
  }, [activeCasesCount, totalConsultations, storageUsedMb, t]);

  const workflowLaunchers = useMemo(() => ([
    {
      id: 'workflow-research',
      title: t.dashboard.workflowLaunchpad.items.researchMemo.title,
      description: t.dashboard.workflowLaunchpad.items.researchMemo.description,
      route: '/chat?playbook=research-memo',
      cadence: t.dashboard.workflowLaunchpad.items.researchMemo.cadence,
      icon: BrainCircuit,
    },
    {
      id: 'workflow-risk',
      title: t.dashboard.workflowLaunchpad.items.riskRefresh.title,
      description: t.dashboard.workflowLaunchpad.items.riskRefresh.description,
      route: '/chat?playbook=risk-scan',
      cadence: t.dashboard.workflowLaunchpad.items.riskRefresh.cadence,
      icon: Gauge,
    },
    {
      id: 'workflow-timeline',
      title: t.dashboard.workflowLaunchpad.items.deadlineWatch.title,
      description: t.dashboard.workflowLaunchpad.items.deadlineWatch.description,
      route: '/chat?playbook=timeline-extraction',
      cadence: t.dashboard.workflowLaunchpad.items.deadlineWatch.cadence,
      icon: Radar,
    },
  ]), [t]);

  const knowledgePulse = useMemo(() => ([
    {
      id: 'signal-cases',
      label: t.dashboard.knowledgePulse.signals.caseMomentum.label,
      value: Math.min(100, 34 + activeCasesCount * 11),
      insight: interpolateTemplate(t.dashboard.knowledgePulse.signals.caseMomentum.insight, {
        count: Math.max(activeCasesCount, 1),
      }),
    },
    {
      id: 'signal-consults',
      label: t.dashboard.knowledgePulse.signals.consultationVelocity.label,
      value: Math.min(100, 26 + Math.floor(totalConsultations * 1.8)),
      insight: interpolateTemplate(t.dashboard.knowledgePulse.signals.consultationVelocity.insight, {
        count: Math.max(totalConsultations, 1),
      }),
    },
    {
      id: 'signal-docs',
      label: t.dashboard.knowledgePulse.signals.evidenceDensity.label,
      value: Math.min(100, 20 + Math.floor(storageUsage.files * 4)),
      insight: interpolateTemplate(t.dashboard.knowledgePulse.signals.evidenceDensity.insight, {
        count: Math.max(storageUsage.files, 1),
      }),
    },
  ]), [activeCasesCount, storageUsage.files, t, totalConsultations]);

  const actionQueue = useMemo<DashboardActionItem[]>(() => {
    const nowMs = Date.now();
    const caseMap = new Map(allCases.map((caseItem) => [caseItem.id, caseItem]));
    const statusWeight: Record<QueueStatus, number> = { overdue: 3, upcoming: 2, scheduled: 1 };

    const buildReminderLabel = (dueAtMs: number) => {
      const daysUntilDue = Math.ceil((dueAtMs - nowMs) / DAY_IN_MS);
      if (daysUntilDue < 0) {
        return interpolateTemplate(t.dashboard.actionQueue.reminderOverdueDays, { days: Math.abs(daysUntilDue) });
      }
      if (daysUntilDue === 0) {
        return t.dashboard.actionQueue.reminderDueToday;
      }
      return interpolateTemplate(t.dashboard.actionQueue.reminderDueInDays, { days: daysUntilDue });
    };

    const persistedQueue = isCaseTasksSupported
      ? caseTasks
        .filter((task) => task.status !== 'completed')
        .map((task) => {
          const linkedCase = caseMap.get(task.case_id);
          if (!linkedCase || (linkedCase.status !== 'active' && linkedCase.status !== 'pending')) return null;
          const policy = linkedCase.status === 'active'
            ? taskPolicyConfig.active
            : taskPolicyConfig.pending;

          const dueAtMs = Date.parse(task.due_at);
          const safeDueAtMs = Number.isNaN(dueAtMs) ? nowMs : dueAtMs;
          const daysUntilDue = Math.ceil((safeDueAtMs - nowMs) / DAY_IN_MS);
          const status = task.status === 'overdue' || task.status === 'upcoming' || task.status === 'scheduled'
            ? task.status
            : normalizeQueueStatus(daysUntilDue, policy.reminderWindowDays);

          const reminderLabel = buildReminderLabel(safeDueAtMs);
          const lastActivity = linkedCase.updatedAt || linkedCase.createdAt;
          const description = interpolateTemplate(t.dashboard.actionQueue.caseDescription, {
            reminder: reminderLabel,
            lastActivity: formatDate(lastActivity, locale),
          });

          return {
            id: `queue-${task.id}`,
            caseId: linkedCase.id,
            taskId: task.id,
            caseTitle: linkedCase.title,
            description,
            status,
            route: `/chat?playbook=${encodeURIComponent(task.playbook_id)}&caseId=${encodeURIComponent(linkedCase.id)}`,
            dueDateLabel: formatDate(new Date(safeDueAtMs).toISOString(), locale),
            priorityScore: task.priority,
          } satisfies DashboardActionItem;
        })
        .filter((task): task is DashboardActionItem => Boolean(task))
      : [];

    if (persistedQueue.length > 0) {
      return persistedQueue
        .sort((a, b) => {
          const statusDelta = statusWeight[b.status] - statusWeight[a.status];
          if (statusDelta !== 0) return statusDelta;
          return b.priorityScore - a.priorityScore;
        })
        .slice(0, 4);
    }

    return caseTaskSeeds
      .map((seed) => {
        const linkedCase = caseMap.get(seed.caseId);
        if (!linkedCase) return null;

        const dueAtMs = Date.parse(seed.dueAt);
        const safeDueAtMs = Number.isNaN(dueAtMs) ? nowMs : dueAtMs;
        const reminderLabel = buildReminderLabel(safeDueAtMs);
        const lastActivity = linkedCase.updatedAt || linkedCase.createdAt;
        const description = interpolateTemplate(t.dashboard.actionQueue.caseDescription, {
          reminder: reminderLabel,
          lastActivity: formatDate(lastActivity, locale),
        });

        return {
          id: `queue-${seed.caseId}-${seed.playbookId}`,
          caseId: linkedCase.id,
          caseTitle: linkedCase.title,
          description,
          status: seed.status === 'completed' ? 'scheduled' : seed.status,
          route: `/chat?playbook=${seed.playbookId}&caseId=${encodeURIComponent(linkedCase.id)}`,
          dueDateLabel: formatDate(seed.dueAt, locale),
          priorityScore: seed.priority,
        } satisfies DashboardActionItem;
      })
      .filter((task): task is DashboardActionItem => Boolean(task))
      .sort((a, b) => {
        const statusDelta = statusWeight[b.status] - statusWeight[a.status];
        if (statusDelta !== 0) return statusDelta;
        return b.priorityScore - a.priorityScore;
      })
      .slice(0, 4);
  }, [
    allCases,
    caseTaskSeeds,
    caseTasks,
    isCaseTasksSupported,
    locale,
    taskPolicyConfig,
    t.dashboard.actionQueue.caseDescription,
    t.dashboard.actionQueue.reminderDueInDays,
    t.dashboard.actionQueue.reminderDueToday,
    t.dashboard.actionQueue.reminderOverdueDays,
  ]);

  const deadlineGuardItems = useMemo<DeadlineGuardItem[]>(() => {
    const caseMap = new Map(allCases.map((caseItem) => [caseItem.id, caseItem]));
    const sourceByTaskId = new Map(
      deadlineSources.map((source) => [source.task_id, source])
    );
    const evidenceCountByTaskId = new Map<string, number>();
    deadlineEvidence.forEach((item) => {
      evidenceCountByTaskId.set(item.task_id, (evidenceCountByTaskId.get(item.task_id) ?? 0) + 1);
    });

    return actionQueue
      .slice()
      .sort((left, right) => {
        const statusWeight: Record<QueueStatus, number> = { overdue: 3, upcoming: 2, scheduled: 1 };
        const byStatus = statusWeight[right.status] - statusWeight[left.status];
        if (byStatus !== 0) return byStatus;
        return right.priorityScore - left.priorityScore;
      })
      .slice(0, 3)
      .map((task) => {
        const linkedCase = caseMap.get(task.caseId);
        const persistedSource = task.taskId ? sourceByTaskId.get(task.taskId) : undefined;
        const persistedEvidenceCount = task.taskId ? (evidenceCountByTaskId.get(task.taskId) ?? 0) : 0;
        const newestDocument = (linkedCase?.documents ?? [])
          .filter((doc): doc is { name?: string; uploadedAt?: string } => Boolean(doc && typeof doc === 'object'))
          .slice()
          .sort((leftDoc, rightDoc) => Date.parse(rightDoc.uploadedAt ?? '') - Date.parse(leftDoc.uploadedAt ?? ''))[0];
        const fallbackSourceDocument = newestDocument?.name ?? t.dashboard.deadlineGuard.sourceDocumentNone;
        const sourceDocument = persistedSource?.source_document ?? fallbackSourceDocument;
        const fallbackDeadlineType = task.status === 'overdue' || task.status === 'upcoming' ? 'procedural' : 'followup';
        const deadlineType = persistedSource?.deadline_type === 'statutory'
          ? 'procedural'
          : persistedSource?.deadline_type ?? fallbackDeadlineType;
        const fallbackRuleRef = linkedCase?.status === 'pending'
          ? `kingsley.sla.pending.${taskPolicyConfig.pending.slaDays}d`
          : `kingsley.sla.active.${taskPolicyConfig.active.slaDays}d`;
        const jurisdictionRuleRef = persistedSource?.jurisdiction_rule_ref ?? fallbackRuleRef;
        const derivedFrom = persistedSource
          ? interpolateTemplate(t.dashboard.deadlineGuard.derivedFromPersisted, {
            count: persistedEvidenceCount,
          })
          : interpolateTemplate(t.dashboard.deadlineGuard.derivedFrom, {
            messages: linkedCase?.messages?.length ?? 0,
            documents: linkedCase?.documents?.length ?? 0,
          });
        const confidenceScore = Math.max(
          62,
          Math.min(97, task.priorityScore + (task.status === 'overdue' ? -4 : task.status === 'upcoming' ? 1 : 5)),
        );

        return {
          id: `deadline-guard-${task.id}`,
          caseId: task.caseId,
          taskId: task.taskId,
          caseTitle: task.caseTitle,
          dueDateLabel: task.dueDateLabel,
          urgency: task.status,
          confidenceScore,
          evidenceState: persistedEvidenceCount > 0 || task.status === 'scheduled' ? 'verified' : 'review',
          sourceDocument,
          deadlineType,
          jurisdictionRuleRef,
          citationAnchor: persistedSource?.citation_anchor ?? null,
          persistedEvidenceCount,
          derivedFrom,
          route: task.route,
        };
      });
  }, [
    actionQueue,
    allCases,
    deadlineEvidence,
    deadlineSources,
    t.dashboard.deadlineGuard.derivedFrom,
    t.dashboard.deadlineGuard.derivedFromPersisted,
    t.dashboard.deadlineGuard.sourceDocumentNone,
    taskPolicyConfig.active.slaDays,
    taskPolicyConfig.pending.slaDays,
  ]);

  const historyCaseOptions = useMemo(() => (
    allCases
      .map((caseItem) => ({ id: caseItem.id, label: caseItem.title }))
      .sort((left, right) => left.label.localeCompare(right.label))
  ), [allCases]);

  const historyPlaybookOptions = useMemo<PlaybookOption[]>(() => {
    const taskById = new Map(caseTasks.map((task) => [task.id, task]));
    const playbookIds = new Set<string>();

    caseTasks.forEach((task) => {
      if (task.playbook_id) playbookIds.add(task.playbook_id);
    });

    taskEvents.forEach((event) => {
      playbookIds.add(resolveTaskEventPlaybookId(event, taskById));
    });

    return Array.from(playbookIds)
      .filter((playbookId) => playbookId !== 'unknown')
      .sort((left, right) => left.localeCompare(right))
      .map((playbookId) => ({
        id: playbookId,
        label: resolvePlaybookLabel(playbookId, t),
      }));
  }, [caseTasks, t, taskEvents]);

  useEffect(() => {
    if (historyCaseFilter === 'all') return;
    if (historyCaseOptions.some((caseOption) => caseOption.id === historyCaseFilter)) return;
    setHistoryCaseFilter('all');
  }, [historyCaseFilter, historyCaseOptions]);

  useEffect(() => {
    if (historyPlaybookFilter === 'all') return;
    if (historyPlaybookOptions.some((playbookOption) => playbookOption.id === historyPlaybookFilter)) return;
    setHistoryPlaybookFilter('all');
  }, [historyPlaybookFilter, historyPlaybookOptions]);

  const completionHistory = useMemo<CompletionHistoryItem[]>(() => {
    const caseTitleById = new Map(allCases.map((caseItem) => [caseItem.id, caseItem.title]));
    const taskById = new Map(caseTasks.map((task) => [task.id, task]));
    const windowStartMs = resolveHistoryWindowStart(historyTimeFilter);

    const eventHistory = taskEvents
      .map((event) => {
        const createdAtMs = Date.parse(event.created_at);
        const safeCreatedAtMs = Number.isNaN(createdAtMs) ? 0 : createdAtMs;
        const playbookId = resolveTaskEventPlaybookId(event, taskById);
        return {
          id: event.id,
          caseId: event.case_id,
          caseTitle: caseTitleById.get(event.case_id) ?? t.dashboard.actionQueue.untitledCase,
          eventType: event.event_type,
          eventLabel: resolveHistoryEventLabel(event.event_type, t),
          playbookId,
          playbookLabel: resolvePlaybookLabel(playbookId, t),
          occurredAt: event.created_at,
          occurredAtMs: safeCreatedAtMs,
          occurredAtLabel: formatDate(event.created_at, locale),
        };
      })
      .filter((item) => (
        (historyEventFilter === 'all' || item.eventType === historyEventFilter)
        && (historyCaseFilter === 'all' || item.caseId === historyCaseFilter)
        && (historyPlaybookFilter === 'all' || item.playbookId === historyPlaybookFilter)
        && item.occurredAtMs >= windowStartMs
      ))
      .sort((left, right) => right.occurredAtMs - left.occurredAtMs)
      .slice(0, 6)
      .map(({ occurredAtMs: _occurredAtMs, ...entry }) => entry);

    if (taskEvents.length > 0 || !isCaseTasksSupported) {
      return eventHistory;
    }

    return caseTasks
      .filter((task) => task.status === 'completed' && Boolean(task.completed_at))
      .map((task) => {
        const occurredAt = task.completed_at ?? task.updated_at;
        const occurredAtMs = Date.parse(occurredAt);
        const safeOccurredAtMs = Number.isNaN(occurredAtMs) ? 0 : occurredAtMs;
        return {
          id: `task-${task.id}`,
          caseId: task.case_id,
          caseTitle: caseTitleById.get(task.case_id) ?? t.dashboard.actionQueue.untitledCase,
          eventType: 'completed' as const,
          eventLabel: resolveHistoryEventLabel('completed', t),
          playbookId: task.playbook_id,
          playbookLabel: resolvePlaybookLabel(task.playbook_id, t),
          occurredAt,
          occurredAtMs: safeOccurredAtMs,
          occurredAtLabel: formatDate(occurredAt, locale),
        };
      })
      .filter((item) => (
        (historyEventFilter === 'all' || item.eventType === historyEventFilter)
        && (historyCaseFilter === 'all' || item.caseId === historyCaseFilter)
        && (historyPlaybookFilter === 'all' || item.playbookId === historyPlaybookFilter)
        && item.occurredAtMs >= windowStartMs
      ))
      .sort((left, right) => right.occurredAtMs - left.occurredAtMs)
      .slice(0, 6)
      .map(({ occurredAtMs: _occurredAtMs, ...entry }) => entry);
  }, [
    allCases,
    caseTasks,
    historyCaseFilter,
    historyEventFilter,
    historyPlaybookFilter,
    historyTimeFilter,
    isCaseTasksSupported,
    locale,
    t,
    taskEvents,
  ]);

  const policyChangeHistory = useMemo<PolicyChangeHistoryItem[]>(() => {
    return taskPolicyEvents
      .slice(0, 4)
      .map((policyEvent) => {
        const statusLabel = policyEvent.case_status === 'active'
          ? t.dashboard.actionQueue.policyStatusActive
          : policyEvent.case_status === 'pending'
            ? t.dashboard.actionQueue.policyStatusPending
            : policyEvent.case_status;
        return {
          id: policyEvent.id,
          statusLabel,
          changeLabel: interpolateTemplate(t.dashboard.actionQueue.policyHistoryItem, {
            previousSla: policyEvent.previous_sla_days ?? '-',
            previousReminder: policyEvent.previous_reminder_window_days ?? '-',
            nextSla: policyEvent.new_sla_days,
            nextReminder: policyEvent.new_reminder_window_days,
          }),
          changedAtLabel: formatDate(policyEvent.created_at, locale),
          changedAt: policyEvent.created_at,
        };
      });
  }, [locale, t.dashboard.actionQueue.policyHistoryItem, t.dashboard.actionQueue.policyStatusActive, t.dashboard.actionQueue.policyStatusPending, taskPolicyEvents]);

  const handleExportCompletionHistory = useCallback(async () => {
    if (completionHistory.length === 0) {
      setHistoryExportMessage(t.dashboard.actionQueue.historyExportEmpty);
      return;
    }

    try {
      const generatedAt = new Date().toISOString();
      const timestamp = generatedAt.replace(/[:.]/g, '-');
      const wasServerSigned = await downloadSignedCsvBundle(
        `kingsley-completion-history-${timestamp}`,
        ['case_id', 'case_title', 'event_type', 'event_label', 'playbook_id', 'playbook_label', 'occurred_at'],
        completionHistory.map((historyItem) => [
          historyItem.caseId,
          historyItem.caseTitle,
          historyItem.eventType,
          historyItem.eventLabel,
          historyItem.playbookId,
          historyItem.playbookLabel,
          historyItem.occurredAt,
        ]),
        generatedAt,
        {
          export_type: 'completion_history',
          event_filter: historyEventFilter,
          case_filter: historyCaseFilter,
          playbook_filter: historyPlaybookFilter,
          time_window: historyTimeFilter,
        },
        'completion_history'
      );
      setHistoryExportMessage(interpolateTemplate(
        wasServerSigned
          ? t.dashboard.actionQueue.historyExportServerSignedSuccess
          : t.dashboard.actionQueue.historyExportSignedSuccess,
        { count: completionHistory.length }
      ));
    } catch (error) {
      console.error('Failed to export completion history CSV', error);
      setHistoryExportMessage(t.dashboard.actionQueue.historyExportError);
    }
  }, [
    completionHistory,
    historyCaseFilter,
    t.dashboard.actionQueue.historyExportEmpty,
    t.dashboard.actionQueue.historyExportError,
    t.dashboard.actionQueue.historyExportSignedSuccess,
    t.dashboard.actionQueue.historyExportServerSignedSuccess,
    historyEventFilter,
    historyPlaybookFilter,
    historyTimeFilter,
  ]);

  const handleExportPolicyHistory = useCallback(async () => {
    if (policyChangeHistory.length === 0) {
      setHistoryExportMessage(t.dashboard.actionQueue.historyExportEmpty);
      return;
    }

    try {
      const generatedAt = new Date().toISOString();
      const timestamp = generatedAt.replace(/[:.]/g, '-');
      const wasServerSigned = await downloadSignedCsvBundle(
        `kingsley-policy-history-${timestamp}`,
        ['status', 'change', 'changed_at'],
        policyChangeHistory.map((historyItem) => [
          historyItem.statusLabel,
          historyItem.changeLabel,
          historyItem.changedAt,
        ]),
        generatedAt,
        {
          export_type: 'policy_history',
          event_filter: historyEventFilter,
          case_filter: historyCaseFilter,
          playbook_filter: historyPlaybookFilter,
          time_window: historyTimeFilter,
        },
        'policy_history'
      );
      setHistoryExportMessage(interpolateTemplate(
        wasServerSigned
          ? t.dashboard.actionQueue.historyExportServerSignedSuccess
          : t.dashboard.actionQueue.historyExportSignedSuccess,
        { count: policyChangeHistory.length }
      ));
    } catch (error) {
      console.error('Failed to export policy history CSV', error);
      setHistoryExportMessage(t.dashboard.actionQueue.historyExportError);
    }
  }, [
    historyCaseFilter,
    historyEventFilter,
    historyPlaybookFilter,
    historyTimeFilter,
    policyChangeHistory,
    t.dashboard.actionQueue.historyExportEmpty,
    t.dashboard.actionQueue.historyExportError,
    t.dashboard.actionQueue.historyExportSignedSuccess,
    t.dashboard.actionQueue.historyExportServerSignedSuccess,
  ]);

  const handleDownloadAuditVerificationKey = useCallback(() => {
    if (!auditSigningStatus?.enabled || !auditSigningStatus.publicKeyPem) return;
    triggerBrowserDownload(
      `kingsley-audit-signing-public-key-${auditSigningStatus.keyId ?? 'ed25519'}.pem`,
      auditSigningStatus.publicKeyPem,
      'application/x-pem-file;charset=utf-8;'
    );
  }, [auditSigningStatus]);

  const handleManifestFileChange = useCallback(async (file: File | null) => {
    setVerificationError(null);
    setVerificationReceipt(null);
    if (!file) {
      setVerificationManifestFileName(null);
      setVerificationManifestInput(null);
      return;
    }

    if (file.size > 1024 * 1024) {
      setVerificationManifestFileName(file.name);
      setVerificationManifestInput(null);
      setVerificationError(t.dashboard.actionQueue.signatureVerifyManifestTooLarge);
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('invalid');
      }

      setVerificationManifestFileName(file.name);
      setVerificationManifestInput(parsed);
    } catch {
      setVerificationManifestFileName(file.name);
      setVerificationManifestInput(null);
      setVerificationError(t.dashboard.actionQueue.signatureVerifyManifestInvalid);
    }
  }, [
    t.dashboard.actionQueue.signatureVerifyManifestInvalid,
    t.dashboard.actionQueue.signatureVerifyManifestTooLarge,
  ]);

  const handleCsvFileChange = useCallback(async (file: File | null) => {
    setVerificationError(null);
    setVerificationReceipt(null);
    if (!file) {
      setVerificationCsvFileName(null);
      setVerificationCsvInput(null);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setVerificationCsvFileName(file.name);
      setVerificationCsvInput(null);
      setVerificationError(t.dashboard.actionQueue.signatureVerifyCsvTooLarge);
      return;
    }

    try {
      const text = await file.text();
      setVerificationCsvFileName(file.name);
      setVerificationCsvInput(text);
    } catch {
      setVerificationCsvFileName(file.name);
      setVerificationCsvInput(null);
      setVerificationError(t.dashboard.actionQueue.signatureVerifyCsvInvalid);
    }
  }, [
    t.dashboard.actionQueue.signatureVerifyCsvInvalid,
    t.dashboard.actionQueue.signatureVerifyCsvTooLarge,
  ]);

  const handleVerifyAuditBundle = useCallback(async () => {
    if (!verificationManifestInput || isVerifyingBundle) return;

    setVerificationError(null);
    setVerificationReceipt(null);
    setIsVerifyingBundle(true);
    try {
      const receipt = await verifyAuditManifestBundle(
        verificationManifestInput,
        verificationCsvInput ?? undefined
      );
      setVerificationReceipt(receipt);
      setHistoryExportMessage(
        receipt.verification_passed
          ? t.dashboard.actionQueue.signatureVerifySuccess
          : t.dashboard.actionQueue.signatureVerifyFailed
      );
    } catch (error) {
      const errorMessage = error instanceof Error && error.message
        ? error.message
        : t.dashboard.actionQueue.signatureVerifyError;
      setVerificationError(errorMessage);
      setHistoryExportMessage(t.dashboard.actionQueue.signatureVerifyError);
    } finally {
      setIsVerifyingBundle(false);
    }
  }, [
    isVerifyingBundle,
    t.dashboard.actionQueue.signatureVerifyError,
    t.dashboard.actionQueue.signatureVerifyFailed,
    t.dashboard.actionQueue.signatureVerifySuccess,
    verificationCsvInput,
    verificationManifestInput,
  ]);

  const handleDownloadVerificationReceipt = useCallback(() => {
    if (!verificationReceipt) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    triggerBrowserDownload(
      `kingsley-audit-verification-receipt-${timestamp}.json`,
      JSON.stringify(verificationReceipt, null, 2),
      'application/json;charset=utf-8;'
    );
  }, [verificationReceipt]);

  const handlePrintVerificationReceipt = useCallback(() => {
    if (!verificationReceipt) return;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=760');
    if (!printWindow) {
      setVerificationError(t.dashboard.actionQueue.signatureVerifyPrintBlocked);
      return;
    }

    const html = buildVerificationReceiptPrintHtml(verificationReceipt, t, locale);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [locale, t, verificationReceipt]);

  const handleExportTrustRegistryHistory = useCallback(() => {
    if (auditTrustRegistryHistory.length === 0) {
      setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRegistryHistoryEmpty);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCsv(
      `kingsley-trust-registry-history-${timestamp}.csv`,
      ['created_at', 'action', 'actor_user_id', 'entries_count', 'note'],
      auditTrustRegistryHistory.map((item) => [
        item.created_at,
        item.action,
        item.actor_user_id ?? '',
        item.entries_count,
        item.note ?? '',
      ])
    );
    setAuditTrustRegistryMessage(interpolateTemplate(
      t.dashboard.actionQueue.historyExportSuccess,
      { count: auditTrustRegistryHistory.length }
    ));
  }, [auditTrustRegistryHistory, t.dashboard.actionQueue.historyExportSuccess, t.dashboard.actionQueue.signatureRegistryHistoryEmpty]);

  const handleLoadMoreTrustRegistryHistory = useCallback(async () => {
    if (!isAuditTrustRegistryAdmin || isLoadingAuditTrustRegistryHistory || !auditTrustRegistryHistoryHasMore) return;

    setIsLoadingAuditTrustRegistryHistory(true);
    try {
      const nextPage = await fetchAuditTrustRegistryHistoryPage({
        limit: 25,
        offset: auditTrustRegistryHistoryOffset,
        retentionDays: auditTrustRegistryHistoryRetentionDays,
      });
      setAuditTrustRegistryHistory((previousHistory) => {
        const merged = [...previousHistory, ...nextPage.events];
        return Array.from(new Map(merged.map((item) => [`${item.created_at}-${item.action}-${item.actor_user_id ?? ''}`, item])).values());
      });
      setAuditTrustRegistryHistoryOffset(nextPage.nextOffset);
      setAuditTrustRegistryHistoryHasMore(nextPage.hasMore);
    } finally {
      setIsLoadingAuditTrustRegistryHistory(false);
    }
  }, [
    auditTrustRegistryHistoryHasMore,
    auditTrustRegistryHistoryOffset,
    auditTrustRegistryHistoryRetentionDays,
    isAuditTrustRegistryAdmin,
    isLoadingAuditTrustRegistryHistory,
  ]);

  const loadReadinessExportHistory = useCallback(async (offset = 0, append = false) => {
    if (!user || user.isGuest) {
      setAuditReadinessExportHistory([]);
      setAuditReadinessExportOffset(0);
      setAuditReadinessExportHasMore(false);
      return;
    }

    if (append) {
      setIsLoadingMoreAuditReadinessExportHistory(true);
    } else {
      setIsLoadingAuditReadinessExportHistory(true);
    }

    try {
      const page = await fetchAuditReadinessExportHistoryPage({
        limit: 10,
        offset,
        signatureMode: readinessExportSignatureFilter,
        manifestHash: readinessExportManifestFilter,
      });

      setAuditReadinessExportHistory((previous) => {
        const merged = append ? [...previous, ...page.events] : page.events;
        return Array.from(new Map(merged.map((entry) => [entry.id, entry])).values());
      });
      setAuditReadinessExportOffset(page.nextOffset);
      setAuditReadinessExportHasMore(page.hasMore);
    } finally {
      if (append) {
        setIsLoadingMoreAuditReadinessExportHistory(false);
      } else {
        setIsLoadingAuditReadinessExportHistory(false);
      }
    }
  }, [readinessExportManifestFilter, readinessExportSignatureFilter, user]);

  const handleLoadMoreReadinessExportHistory = useCallback(async () => {
    if (isLoadingAuditReadinessExportHistory || isLoadingMoreAuditReadinessExportHistory || !auditReadinessExportHasMore) return;
    await loadReadinessExportHistory(auditReadinessExportOffset, true);
  }, [
    auditReadinessExportHasMore,
    auditReadinessExportOffset,
    isLoadingAuditReadinessExportHistory,
    isLoadingMoreAuditReadinessExportHistory,
    loadReadinessExportHistory,
  ]);

  useEffect(() => {
    void loadReadinessExportHistory(0, false);
  }, [loadReadinessExportHistory]);

  const loadAuditExportArtifacts = useCallback(async (offset = 0, append = false) => {
    if (!user || user.isGuest) {
      setAuditExportArtifacts([]);
      setAuditExportArtifactsOffset(0);
      setAuditExportArtifactsHasMore(false);
      return;
    }

    if (append) {
      setIsLoadingMoreAuditExportArtifacts(true);
    } else {
      setIsLoadingAuditExportArtifacts(true);
    }

    try {
      const page = await fetchAuditExportArtifactsPage({
        limit: 8,
        offset,
      });
      setAuditExportArtifacts((previous) => {
        const merged = append ? [...previous, ...page.artifacts] : page.artifacts;
        return Array.from(new Map(merged.map((entry) => [entry.id, entry])).values());
      });
      setAuditExportArtifactsOffset(page.nextOffset);
      setAuditExportArtifactsHasMore(page.hasMore);
    } finally {
      if (append) {
        setIsLoadingMoreAuditExportArtifacts(false);
      } else {
        setIsLoadingAuditExportArtifacts(false);
      }
    }
  }, [user]);

  const handleLoadMoreAuditExportArtifacts = useCallback(async () => {
    if (isLoadingAuditExportArtifacts || isLoadingMoreAuditExportArtifacts || !auditExportArtifactsHasMore) return;
    await loadAuditExportArtifacts(auditExportArtifactsOffset, true);
  }, [
    auditExportArtifactsHasMore,
    auditExportArtifactsOffset,
    isLoadingAuditExportArtifacts,
    isLoadingMoreAuditExportArtifacts,
    loadAuditExportArtifacts,
  ]);

  const handleDownloadAuditExportArtifactReceipt = useCallback(async (artifactId: string) => {
    if (isDownloadingAuditArtifactReceiptId) return;
    setIsDownloadingAuditArtifactReceiptId(artifactId);
    try {
      const receipt = await fetchAuditExportArtifactReceipt(artifactId);
      if (!receipt) {
        setHistoryExportMessage(t.dashboard.actionQueue.auditExportArtifactsReceiptUnavailable);
        return;
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      triggerBrowserDownload(
        `kingsley-audit-export-receipt-${artifactId}-${timestamp}.json`,
        JSON.stringify(receipt, null, 2),
        'application/json;charset=utf-8;'
      );
      setHistoryExportMessage(t.dashboard.actionQueue.auditExportArtifactsReceiptDownloaded);
    } finally {
      setIsDownloadingAuditArtifactReceiptId(null);
    }
  }, [
    isDownloadingAuditArtifactReceiptId,
    t.dashboard.actionQueue.auditExportArtifactsReceiptDownloaded,
    t.dashboard.actionQueue.auditExportArtifactsReceiptUnavailable,
  ]);

  const handleDownloadReadinessArtifactReceipt = useCallback(async (entry: AuditReadinessExportHistoryEntry) => {
    if (!entry.artifact_id) {
      setHistoryExportMessage(t.dashboard.actionQueue.readinessExportHistoryReceiptUnavailable);
      return;
    }
    await handleDownloadAuditExportArtifactReceipt(entry.artifact_id);
  }, [
    handleDownloadAuditExportArtifactReceipt,
    t.dashboard.actionQueue.readinessExportHistoryReceiptUnavailable,
  ]);

  useEffect(() => {
    void loadAuditExportArtifacts(0, false);
  }, [loadAuditExportArtifacts]);
  const handleTrimTrustRegistryHistory = useCallback(async () => {
    if (!isAuditTrustRegistryAdmin || isPruningAuditTrustRegistryHistory) return;
    setIsPruningAuditTrustRegistryHistory(true);
    try {
      const removedCount = await trimAuditTrustRegistryHistory(auditTrustRegistryHistoryRetentionDays, 200);
      if (removedCount === null) {
        setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRegistryHistoryTrimError);
        return;
      }

      const refreshed = await fetchAuditTrustRegistryHistoryPage({
        limit: 25,
        offset: 0,
        retentionDays: auditTrustRegistryHistoryRetentionDays,
      });
      setAuditTrustRegistryHistory(refreshed.events);
      setAuditTrustRegistryHistoryOffset(refreshed.nextOffset);
      setAuditTrustRegistryHistoryHasMore(refreshed.hasMore);
      setAuditTrustRegistryMessage(interpolateTemplate(
        t.dashboard.actionQueue.signatureRegistryHistoryTrimSuccess,
        { count: removedCount, days: auditTrustRegistryHistoryRetentionDays }
      ));
    } finally {
      setIsPruningAuditTrustRegistryHistory(false);
    }
  }, [
    auditTrustRegistryHistoryRetentionDays,
    isAuditTrustRegistryAdmin,
    isPruningAuditTrustRegistryHistory,
    t.dashboard.actionQueue.signatureRegistryHistoryTrimError,
    t.dashboard.actionQueue.signatureRegistryHistoryTrimSuccess,
  ]);

  const handleRefreshTrustAdmins = useCallback(async () => {
    if (!isAuditTrustRegistryAdmin || isLoadingAuditTrustAdmins) return;
    setIsLoadingAuditTrustAdmins(true);
    try {
      const trustAdminDirectory = await fetchAuditTrustAdmins();
      if (!trustAdminDirectory) {
        setAuditTrustAdminMessage(t.dashboard.actionQueue.signatureTrustAdminsLoadError);
        return;
      }

      setAuditTrustAdminProfiles(trustAdminDirectory.admins);
      setAuditTrustAdminMessage(null);
    } finally {
      setIsLoadingAuditTrustAdmins(false);
    }
  }, [
    isAuditTrustRegistryAdmin,
    isLoadingAuditTrustAdmins,
    t.dashboard.actionQueue.signatureTrustAdminsLoadError,
  ]);

  const handleSetTrustAdminByEmail = useCallback(async (isTrustAdmin: boolean) => {
    if (!isAuditTrustRegistryAdmin || isSavingAuditTrustAdmin) return;
    const normalizedEmail = auditTrustAdminTargetEmail.trim().toLowerCase();
    if (!TRUST_ADMIN_EMAIL_REGEX.test(normalizedEmail)) {
      setAuditTrustAdminMessage(t.dashboard.actionQueue.signatureTrustAdminsInvalidEmail);
      return;
    }

    setIsSavingAuditTrustAdmin(true);
    setAuditTrustAdminMessage(null);
    try {
      const updateResult = await updateAuditTrustAdminByEmail(
        normalizedEmail,
        isTrustAdmin,
        auditTrustAdminChangeNote
      );
      if (!updateResult.success) {
        if (updateResult.status === 404) {
          setAuditTrustAdminMessage(t.dashboard.actionQueue.signatureTrustAdminsNotFound);
          return;
        }
        if (updateResult.status === 409) {
          setAuditTrustAdminMessage(t.dashboard.actionQueue.signatureTrustAdminsLastAdminGuard);
          return;
        }
        if (updateResult.status === 503) {
          setAuditTrustAdminMessage(t.dashboard.actionQueue.signatureTrustAdminsMigrationRequired);
          return;
        }
        setAuditTrustAdminMessage(t.dashboard.actionQueue.signatureTrustAdminsUpdateError);
        return;
      }

      const trustAdminDirectory = await fetchAuditTrustAdmins();
      if (trustAdminDirectory) {
        setAuditTrustAdminProfiles(trustAdminDirectory.admins);
      }
      setAuditTrustAdminTargetEmail('');
      setAuditTrustAdminChangeNote('');
      setAuditTrustAdminMessage(interpolateTemplate(
        isTrustAdmin
          ? t.dashboard.actionQueue.signatureTrustAdminsGrantSuccess
          : t.dashboard.actionQueue.signatureTrustAdminsRevokeSuccess,
        { email: normalizedEmail }
      ));
    } finally {
      setIsSavingAuditTrustAdmin(false);
    }
  }, [
    auditTrustAdminChangeNote,
    auditTrustAdminTargetEmail,
    isAuditTrustRegistryAdmin,
    isSavingAuditTrustAdmin,
    t.dashboard.actionQueue.signatureTrustAdminsGrantSuccess,
    t.dashboard.actionQueue.signatureTrustAdminsInvalidEmail,
    t.dashboard.actionQueue.signatureTrustAdminsLastAdminGuard,
    t.dashboard.actionQueue.signatureTrustAdminsMigrationRequired,
    t.dashboard.actionQueue.signatureTrustAdminsNotFound,
    t.dashboard.actionQueue.signatureTrustAdminsRevokeSuccess,
    t.dashboard.actionQueue.signatureTrustAdminsUpdateError,
  ]);

  const handleStageTrustRegistryRotationPlan = useCallback(() => {
    if (!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry || isApplyingTrustRegistryRotation) return;
    const preview = buildTrustRegistryRotationPreview({
      currentKeyId: trustRotationCurrentKeyId,
      currentFingerprint: trustRotationCurrentFingerprint,
      nextKeyId: trustRotationNextKeyId,
      nextFingerprint: trustRotationNextFingerprint,
      activateAt: trustRotationActivateAt,
      overlapDays: trustRotationOverlapDays,
    }, t);
    const firstError = preview.issues.find((issue) => issue.level === 'error');
    if (firstError) {
      setAuditTrustRegistryMessage(firstError.label);
      return;
    }
    if (preview.entries.length === 0) {
      setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRotationApplyError);
      return;
    }

    setAuditTrustRegistryDraftEntries(preview.entries);
    setAuditTrustRegistryChangeNote((previousNote) => (
      previousNote.trim().length > 0
        ? previousNote
        : interpolateTemplate(t.dashboard.actionQueue.signatureRotationDefaultNote, {
          overlapDays: trustRotationOverlapDays,
        })
    ));
    setAuditTrustRegistryMessage(interpolateTemplate(
      t.dashboard.actionQueue.signatureRotationApplied,
      { count: preview.entries.length, overlapDays: trustRotationOverlapDays }
    ));
  }, [
    isApplyingTrustRegistryRotation,
    isAuditTrustRegistryAdmin,
    isSavingAuditTrustRegistry,
    t,
    t.dashboard.actionQueue.signatureRotationApplied,
    t.dashboard.actionQueue.signatureRotationApplyError,
    t.dashboard.actionQueue.signatureRotationDefaultNote,
    trustRotationActivateAt,
    trustRotationCurrentFingerprint,
    trustRotationCurrentKeyId,
    trustRotationNextFingerprint,
    trustRotationNextKeyId,
    trustRotationOverlapDays,
  ]);

  const handleRunTrustRegistryRotationPreflight = useCallback(async () => {
    if (!isAuditTrustRegistryAdmin || isRunningTrustRegistryRotationPreflight || isApplyingTrustRegistryRotation) return;
    const preview = buildTrustRegistryRotationPreview({
      currentKeyId: trustRotationCurrentKeyId,
      currentFingerprint: trustRotationCurrentFingerprint,
      nextKeyId: trustRotationNextKeyId,
      nextFingerprint: trustRotationNextFingerprint,
      activateAt: trustRotationActivateAt,
      overlapDays: trustRotationOverlapDays,
    }, t);
    const firstError = preview.issues.find((issue) => issue.level === 'error');
    if (firstError) {
      setAuditTrustRegistryMessage(firstError.label);
      return;
    }
    if (preview.entries.length === 0) {
      setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRotationApplyError);
      return;
    }

    setIsRunningTrustRegistryRotationPreflight(true);
    try {
      const payloadEntries = preview.entries.map((entry) => toAuditTrustedSignerEntryPayload(entry));
      const preflight = await runAuditTrustRegistryRotationPreflight(payloadEntries);
      if (!preflight) {
        setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRotationPreflightError);
        return;
      }

      setTrustRegistryRotationPreflight(preflight);
      if (preflight.valid) {
        setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRotationPreflightSuccess);
        return;
      }

      const firstServerError = preflight.errors[0];
      if (typeof firstServerError === 'string') {
        setAuditTrustRegistryMessage(resolveTrustRegistryRotationFindingLabel(firstServerError, t));
      } else {
        setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRotationPreflightError);
      }
    } finally {
      setIsRunningTrustRegistryRotationPreflight(false);
    }
  }, [
    isApplyingTrustRegistryRotation,
    isAuditTrustRegistryAdmin,
    isRunningTrustRegistryRotationPreflight,
    t,
    t.dashboard.actionQueue.signatureRotationApplyError,
    t.dashboard.actionQueue.signatureRotationPreflightError,
    t.dashboard.actionQueue.signatureRotationPreflightSuccess,
    trustRotationActivateAt,
    trustRotationCurrentFingerprint,
    trustRotationCurrentKeyId,
    trustRotationNextFingerprint,
    trustRotationNextKeyId,
    trustRotationOverlapDays,
  ]);

  const handleApplyTrustRegistryRotationPlan = useCallback(async () => {
    if (
      !isAuditTrustRegistryAdmin
      || isSavingAuditTrustRegistry
      || isApplyingTrustRegistryRotation
      || isRunningTrustRegistryRotationPreflight
    ) {
      return;
    }
    const preview = buildTrustRegistryRotationPreview({
      currentKeyId: trustRotationCurrentKeyId,
      currentFingerprint: trustRotationCurrentFingerprint,
      nextKeyId: trustRotationNextKeyId,
      nextFingerprint: trustRotationNextFingerprint,
      activateAt: trustRotationActivateAt,
      overlapDays: trustRotationOverlapDays,
    }, t);
    const firstError = preview.issues.find((issue) => issue.level === 'error');
    if (firstError) {
      setAuditTrustRegistryMessage(firstError.label);
      return;
    }
    if (preview.entries.length === 0) {
      setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRotationApplyError);
      return;
    }

    setIsApplyingTrustRegistryRotation(true);
    try {
      const payloadEntries = preview.entries.map((entry) => toAuditTrustedSignerEntryPayload(entry));
      const preflight = trustRegistryRotationPreflight ?? await runAuditTrustRegistryRotationPreflight(payloadEntries);
      if (!preflight) {
        setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRotationPreflightError);
        return;
      }
      setTrustRegistryRotationPreflight(preflight);
      if (!preflight.valid) {
        const firstServerError = preflight.errors[0];
        if (typeof firstServerError === 'string') {
          setAuditTrustRegistryMessage(resolveTrustRegistryRotationFindingLabel(firstServerError, t));
        } else {
          setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRotationPreflightError);
        }
        return;
      }

      const rotationNote = auditTrustRegistryChangeNote.trim().length > 0
        ? auditTrustRegistryChangeNote.trim()
        : interpolateTemplate(t.dashboard.actionQueue.signatureRotationDefaultNote, {
          overlapDays: trustRotationOverlapDays,
        });
      const rotationResult = await applyAuditTrustRegistryRotation(payloadEntries, rotationNote);
      if (!rotationResult.success) {
        if (rotationResult.status === 400) {
          setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRotationPreflightError);
          return;
        }
        if (rotationResult.status === 503) {
          setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureTrustAdminsMigrationRequired);
          return;
        }
        setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRotationApplyError);
        return;
      }

      const [refreshedStatus, refreshedRegistry, refreshedHistory, refreshedSnapshots] = await Promise.all([
        fetchAuditSigningStatus(),
        fetchAuditTrustRegistry(),
        fetchAuditTrustRegistryHistoryPage({
          limit: 25,
          offset: 0,
          retentionDays: auditTrustRegistryHistoryRetentionDays,
        }),
        fetchAuditTrustRegistrySnapshots(20),
      ]);
      if (refreshedStatus) {
        setAuditSigningStatus(refreshedStatus);
      }
      if (refreshedRegistry) {
        setAuditTrustRegistrySnapshot(refreshedRegistry);
        const runtimeEntries = Array.isArray(refreshedRegistry.runtime_entries)
          ? refreshedRegistry.runtime_entries
          : [];
        setAuditTrustRegistryDraftEntries(buildTrustRegistryDraftEntries(runtimeEntries));
      }
      setAuditTrustRegistryHistory(refreshedHistory.events);
      setAuditTrustRegistryHistoryOffset(refreshedHistory.nextOffset);
      setAuditTrustRegistryHistoryHasMore(refreshedHistory.hasMore);
      if (refreshedSnapshots) {
        setAuditTrustRegistrySnapshots(refreshedSnapshots);
      }
      setAuditTrustRegistryChangeNote('');
      setAuditTrustRegistryMessage(interpolateTemplate(
        t.dashboard.actionQueue.signatureRotationApplySuccess,
        { snapshotId: rotationResult.snapshotId ?? '-' }
      ));
    } finally {
      setIsApplyingTrustRegistryRotation(false);
    }
  }, [
    auditTrustRegistryChangeNote,
    auditTrustRegistryHistoryRetentionDays,
    isApplyingTrustRegistryRotation,
    isAuditTrustRegistryAdmin,
    isRunningTrustRegistryRotationPreflight,
    isSavingAuditTrustRegistry,
    t,
    t.dashboard.actionQueue.signatureRotationApplyError,
    t.dashboard.actionQueue.signatureRotationApplySuccess,
    t.dashboard.actionQueue.signatureRotationDefaultNote,
    t.dashboard.actionQueue.signatureRotationPreflightError,
    t.dashboard.actionQueue.signatureTrustAdminsMigrationRequired,
    trustRegistryRotationPreflight,
    trustRotationActivateAt,
    trustRotationCurrentFingerprint,
    trustRotationCurrentKeyId,
    trustRotationNextFingerprint,
    trustRotationNextKeyId,
    trustRotationOverlapDays,
  ]);

  const handleRefreshTrustRegistrySnapshots = useCallback(async () => {
    if (!isAuditTrustRegistryAdmin || isLoadingAuditTrustRegistrySnapshots) return;
    setIsLoadingAuditTrustRegistrySnapshots(true);
    try {
      const snapshots = await fetchAuditTrustRegistrySnapshots(20);
      if (!snapshots) {
        setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureSnapshotsLoadError);
        return;
      }
      setAuditTrustRegistrySnapshots(snapshots);
      setAuditTrustRegistryMessage(null);
    } finally {
      setIsLoadingAuditTrustRegistrySnapshots(false);
    }
  }, [
    isAuditTrustRegistryAdmin,
    isLoadingAuditTrustRegistrySnapshots,
    t.dashboard.actionQueue.signatureSnapshotsLoadError,
  ]);

  const handleRollbackTrustRegistrySnapshot = useCallback(async (snapshotId: string) => {
    if (!isAuditTrustRegistryAdmin || isRollingBackTrustRegistrySnapshot) return;
    setIsRollingBackTrustRegistrySnapshot(true);
    try {
      const rollbackResult = await rollbackAuditTrustRegistrySnapshot(
        snapshotId,
        auditTrustRegistryRollbackNote
      );
      if (!rollbackResult.success) {
        if (rollbackResult.status === 404) {
          setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureSnapshotsRollbackNotFound);
          return;
        }
        if (rollbackResult.status === 503) {
          setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureTrustAdminsMigrationRequired);
          return;
        }
        setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureSnapshotsRollbackError);
        return;
      }

      const [refreshedStatus, refreshedRegistry, refreshedHistory, refreshedSnapshots] = await Promise.all([
        fetchAuditSigningStatus(),
        fetchAuditTrustRegistry(),
        fetchAuditTrustRegistryHistoryPage({
          limit: 25,
          offset: 0,
          retentionDays: auditTrustRegistryHistoryRetentionDays,
        }),
        fetchAuditTrustRegistrySnapshots(20),
      ]);

      if (refreshedStatus) {
        setAuditSigningStatus(refreshedStatus);
      }
      if (refreshedRegistry) {
        setAuditTrustRegistrySnapshot(refreshedRegistry);
        const runtimeEntries = Array.isArray(refreshedRegistry.runtime_entries)
          ? refreshedRegistry.runtime_entries
          : [];
        setAuditTrustRegistryDraftEntries(buildTrustRegistryDraftEntries(runtimeEntries));
      }
      setAuditTrustRegistryHistory(refreshedHistory.events);
      setAuditTrustRegistryHistoryOffset(refreshedHistory.nextOffset);
      setAuditTrustRegistryHistoryHasMore(refreshedHistory.hasMore);
      if (refreshedSnapshots) {
        setAuditTrustRegistrySnapshots(refreshedSnapshots);
      }

      setAuditTrustRegistryRollbackNote('');
      setTrustRegistryRotationPreflight(null);
      setAuditTrustRegistryMessage(interpolateTemplate(
        t.dashboard.actionQueue.signatureSnapshotsRollbackSuccess,
        { snapshotId }
      ));
    } finally {
      setIsRollingBackTrustRegistrySnapshot(false);
    }
  }, [
    auditTrustRegistryHistoryRetentionDays,
    auditTrustRegistryRollbackNote,
    isAuditTrustRegistryAdmin,
    isRollingBackTrustRegistrySnapshot,
    t.dashboard.actionQueue.signatureSnapshotsRollbackError,
    t.dashboard.actionQueue.signatureSnapshotsRollbackNotFound,
    t.dashboard.actionQueue.signatureSnapshotsRollbackSuccess,
    t.dashboard.actionQueue.signatureTrustAdminsMigrationRequired,
  ]);

  const handleAddTrustRegistryDraftEntry = useCallback(() => {
    if (auditTrustRegistryDraftEntries.length >= MAX_TRUST_REGISTRY_ENTRIES) {
      setAuditTrustRegistryMessage(interpolateTemplate(
        t.dashboard.actionQueue.signatureRegistryValidationEntryLimit,
        { max: MAX_TRUST_REGISTRY_ENTRIES }
      ));
      return;
    }

    setAuditTrustRegistryMessage(null);
    setAuditTrustRegistryDraftEntries((previousEntries) => [
      ...previousEntries,
      createEmptyTrustRegistryDraftEntry(),
    ]);
  }, [
    auditTrustRegistryDraftEntries.length,
    t.dashboard.actionQueue.signatureRegistryValidationEntryLimit,
  ]);

  const handleRemoveTrustRegistryDraftEntry = useCallback((entryId: string) => {
    setAuditTrustRegistryMessage(null);
    setAuditTrustRegistryDraftEntries((previousEntries) =>
      previousEntries.filter((entry) => entry.id !== entryId)
    );
  }, []);

  const handleTrustRegistryDraftEntryChange = useCallback((
    entryId: string,
    field: keyof Omit<AuditTrustRegistryDraftEntry, 'id'>,
    value: string
  ) => {
    setAuditTrustRegistryMessage(null);
    setAuditTrustRegistryDraftEntries((previousEntries) =>
      previousEntries.map((entry) =>
        entry.id === entryId
          ? {
            ...entry,
            [field]: field === 'status'
              ? normalizeAuditTrustedSignerStatus(value)
              : value,
          }
          : entry
      )
    );
  }, []);

  const handleLoadCurrentSignerIntoRegistry = useCallback(() => {
    const currentKeyId = (auditSigningStatus?.keyId ?? '').trim();
    const currentFingerprint = (auditSigningStatus?.publicKeySha256 ?? '').trim().toLowerCase();
    if (currentKeyId.length === 0 && currentFingerprint.length === 0) {
      setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRegistryLoadCurrentSignerUnavailable);
      return;
    }
    if (auditTrustRegistryDraftEntries.length >= MAX_TRUST_REGISTRY_ENTRIES) {
      setAuditTrustRegistryMessage(interpolateTemplate(
        t.dashboard.actionQueue.signatureRegistryValidationEntryLimit,
        { max: MAX_TRUST_REGISTRY_ENTRIES }
      ));
      return;
    }

    const duplicateExists = auditTrustRegistryDraftEntries.some((entry) => {
      const keyId = entry.keyId.trim().toLowerCase();
      const fingerprint = entry.publicKeySha256.trim().toLowerCase();
      return keyId === currentKeyId.toLowerCase() && fingerprint === currentFingerprint;
    });
    if (duplicateExists) {
      setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRegistryLoadCurrentSignerDuplicate);
      return;
    }

    setAuditTrustRegistryDraftEntries((previousEntries) => [
      ...previousEntries,
      {
        id: createAuditTrustRegistryDraftId(),
        keyId: currentKeyId,
        publicKeySha256: currentFingerprint,
        notBefore: '',
        notAfter: '',
        status: 'active',
      },
    ]);
    setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRegistryLoadCurrentSignerSuccess);
  }, [
    auditSigningStatus?.keyId,
    auditSigningStatus?.publicKeySha256,
    auditTrustRegistryDraftEntries,
    t.dashboard.actionQueue.signatureRegistryLoadCurrentSignerDuplicate,
    t.dashboard.actionQueue.signatureRegistryLoadCurrentSignerSuccess,
    t.dashboard.actionQueue.signatureRegistryLoadCurrentSignerUnavailable,
    t.dashboard.actionQueue.signatureRegistryValidationEntryLimit,
  ]);

  const handleSaveAuditTrustRegistry = useCallback(async () => {
    if (!user || user.isGuest || !canSaveAuditTrustRegistry) return;

    setAuditTrustRegistryMessage(null);
    setIsSavingAuditTrustRegistry(true);
    try {
      if (isAuditTrustRegistryDraftOverLimit) {
        setAuditTrustRegistryMessage(interpolateTemplate(
          t.dashboard.actionQueue.signatureRegistryValidationEntryLimit,
          { max: MAX_TRUST_REGISTRY_ENTRIES }
        ));
        return;
      }

      const firstIssue = Object.values(auditTrustRegistryDraftIssues).flat()[0];
      if (firstIssue) {
        setAuditTrustRegistryMessage(resolveTrustRegistryValidationIssueLabel(firstIssue, t));
        return;
      }

      const normalizedEntries = auditTrustRegistryDraftEntries
        .filter((entry) => !isTrustRegistryDraftEntryBlank(entry))
        .map((entry) => toAuditTrustedSignerEntryPayload(entry));

      const saved = await saveAuditTrustRegistry(
        normalizedEntries,
        auditTrustRegistryChangeNote.trim().length > 0
          ? auditTrustRegistryChangeNote.trim()
          : 'dashboard_registry_form'
      );
      if (!saved) {
        setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRegistrySaveError);
        return;
      }

      const refreshedStatus = await fetchAuditSigningStatus();
      if (refreshedStatus) {
        setAuditSigningStatus(refreshedStatus);
      }
      const refreshedRegistry = await fetchAuditTrustRegistry();
      if (refreshedRegistry) {
        setAuditTrustRegistrySnapshot(refreshedRegistry);
        const runtimeEntries = Array.isArray(refreshedRegistry.runtime_entries)
          ? refreshedRegistry.runtime_entries
          : [];
        setAuditTrustRegistryDraftEntries(buildTrustRegistryDraftEntries(runtimeEntries));
      }
      const refreshedHistory = await fetchAuditTrustRegistryHistoryPage({
        limit: 25,
        offset: 0,
        retentionDays: auditTrustRegistryHistoryRetentionDays,
      });
      setAuditTrustRegistryHistory(refreshedHistory.events);
      setAuditTrustRegistryHistoryOffset(refreshedHistory.nextOffset);
      setAuditTrustRegistryHistoryHasMore(refreshedHistory.hasMore);
      const refreshedSnapshots = await fetchAuditTrustRegistrySnapshots(20);
      if (refreshedSnapshots) {
        setAuditTrustRegistrySnapshots(refreshedSnapshots);
      }
      setAuditTrustRegistryChangeNote('');
      setTrustRegistryRotationPreflight(null);
      setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRegistrySaved);
    } catch {
      setAuditTrustRegistryMessage(t.dashboard.actionQueue.signatureRegistrySaveError);
    } finally {
      setIsSavingAuditTrustRegistry(false);
    }
  }, [
    auditTrustRegistryChangeNote,
    auditTrustRegistryDraftEntries,
    auditTrustRegistryDraftIssues,
    auditTrustRegistryHistoryRetentionDays,
    canSaveAuditTrustRegistry,
    isAuditTrustRegistryDraftOverLimit,
    t.dashboard.actionQueue.signatureRegistrySaved,
    t.dashboard.actionQueue.signatureRegistrySaveError,
    t.dashboard.actionQueue.signatureRegistryValidationEntryLimit,
    user,
    t,
  ]);

  const handleClearTrustRegistryDraft = useCallback(() => {
    setAuditTrustRegistryMessage(null);
    setAuditTrustRegistryDraftEntries([]);
  }, []);

  const trustRegistryDraftIssueCountLabel = useMemo(() => interpolateTemplate(
    t.dashboard.actionQueue.signatureRegistryValidationIssueCount,
    { count: auditTrustRegistryValidationIssueCount }
  ), [
    auditTrustRegistryValidationIssueCount,
    t.dashboard.actionQueue.signatureRegistryValidationIssueCount,
  ]);

  const trustRegistryScopeLabel = useMemo(() => interpolateTemplate(
    t.dashboard.actionQueue.signatureRegistryScopeSummary,
    {
      envCount: auditTrustRegistrySnapshot?.env_entries_count ?? 0,
      runtimeCount: auditTrustRegistrySnapshot?.runtime_entries_count ?? 0,
      mode: auditTrustRegistrySnapshot?.trust_policy_mode ?? (auditSigningStatus?.trustPolicyMode ?? 'advisory'),
    }
  ), [
    auditSigningStatus?.trustPolicyMode,
    auditTrustRegistrySnapshot?.env_entries_count,
    auditTrustRegistrySnapshot?.runtime_entries_count,
    auditTrustRegistrySnapshot?.trust_policy_mode,
    t.dashboard.actionQueue.signatureRegistryScopeSummary,
  ]);

  const trustRegistryAccessSourceLabel = useMemo(() => interpolateTemplate(
    t.dashboard.actionQueue.signatureRegistryAccessSourceLabel,
    {
      source: resolveTrustRegistryAdminAccessSourceLabel(
        auditTrustRegistrySnapshot?.admin_access?.source,
        t
      ),
    }
  ), [
    auditTrustRegistrySnapshot?.admin_access?.source,
    t,
    t.dashboard.actionQueue.signatureRegistryAccessSourceLabel,
  ]);

  const trustRegistryAccessFallbackWarning = useMemo(() => {
    if (auditTrustRegistrySnapshot?.admin_access?.source !== 'env_allowlist') return null;
    return t.dashboard.actionQueue.signatureRegistryAccessSourceFallbackWarning;
  }, [
    auditTrustRegistrySnapshot?.admin_access?.source,
    t.dashboard.actionQueue.signatureRegistryAccessSourceFallbackWarning,
  ]);

  const trustRegistryRotationPreview = useMemo(() => buildTrustRegistryRotationPreview({
    currentKeyId: trustRotationCurrentKeyId,
    currentFingerprint: trustRotationCurrentFingerprint,
    nextKeyId: trustRotationNextKeyId,
    nextFingerprint: trustRotationNextFingerprint,
    activateAt: trustRotationActivateAt,
    overlapDays: trustRotationOverlapDays,
  }, t), [
    t,
    trustRotationActivateAt,
    trustRotationCurrentFingerprint,
    trustRotationCurrentKeyId,
    trustRotationNextFingerprint,
    trustRotationNextKeyId,
    trustRotationOverlapDays,
  ]);

  const trustRegistryRotationErrorCount = useMemo(
    () => trustRegistryRotationPreview.issues.filter((issue) => issue.level === 'error').length,
    [trustRegistryRotationPreview.issues]
  );

  const sortedTrustRegistryDraftEntries = useMemo(
    () => auditTrustRegistryDraftEntries,
    [auditTrustRegistryDraftEntries]
  );

  const canUseCurrentSignerPreset = Boolean(auditSigningStatus?.keyId || auditSigningStatus?.publicKeySha256);

  const hasTrustRegistryEntries = sortedTrustRegistryDraftEntries.length > 0;

  const trustRegistryIssueBannerText = useMemo(() => {
    if (isAuditTrustRegistryDraftOverLimit) {
      return interpolateTemplate(
        t.dashboard.actionQueue.signatureRegistryValidationEntryLimit,
        { max: MAX_TRUST_REGISTRY_ENTRIES }
      );
    }
    if (auditTrustRegistryValidationIssueCount === 0) return null;
    return trustRegistryDraftIssueCountLabel;
  }, [
    auditTrustRegistryValidationIssueCount,
    isAuditTrustRegistryDraftOverLimit,
    t.dashboard.actionQueue.signatureRegistryValidationEntryLimit,
    trustRegistryDraftIssueCountLabel,
  ]);

  const trustRegistryEntryCountLabel = useMemo(() => interpolateTemplate(
    t.dashboard.actionQueue.signatureRegistryEntryCount,
    { count: sortedTrustRegistryDraftEntries.length, max: MAX_TRUST_REGISTRY_ENTRIES }
  ), [
    sortedTrustRegistryDraftEntries.length,
    t.dashboard.actionQueue.signatureRegistryEntryCount,
  ]);

  const trustRegistrySaveDisabledReason = useMemo(() => {
    if (!user || user.isGuest) return t.dashboard.actionQueue.signatureRegistryAuthRequired;
    if (!isAuditTrustRegistryAdmin) return t.dashboard.actionQueue.signatureRegistryAdminRequired;
    if (isAuditTrustRegistryDraftOverLimit) {
      return interpolateTemplate(
        t.dashboard.actionQueue.signatureRegistryValidationEntryLimit,
        { max: MAX_TRUST_REGISTRY_ENTRIES }
      );
    }
    if (auditTrustRegistryValidationIssueCount > 0) return trustRegistryDraftIssueCountLabel;
    return null;
  }, [
    auditTrustRegistryValidationIssueCount,
    isAuditTrustRegistryAdmin,
    isAuditTrustRegistryDraftOverLimit,
    t.dashboard.actionQueue.signatureRegistryAdminRequired,
    t.dashboard.actionQueue.signatureRegistryAuthRequired,
    t.dashboard.actionQueue.signatureRegistryValidationEntryLimit,
    trustRegistryDraftIssueCountLabel,
    user,
  ]);

  const fetchAuditTrustGovernanceDigestEvents = useCallback(async (): Promise<AuditTrustRegistryEvent[]> => {
    if (!isAuditTrustRegistryAdmin) return [];

    const mergedEvents: AuditTrustRegistryEvent[] = [...auditTrustRegistryHistory];
    let nextOffset = auditTrustRegistryHistoryOffset;
    let hasMore = auditTrustRegistryHistoryHasMore;
    let pageBudget = 8;

    while (hasMore && pageBudget > 0) {
      const page = await fetchAuditTrustRegistryHistoryPage({
        limit: 50,
        offset: nextOffset,
        retentionDays: auditTrustRegistryHistoryRetentionDays,
      });
      if (page.events.length === 0) break;
      mergedEvents.push(...page.events);
      nextOffset = page.nextOffset;
      hasMore = page.hasMore;
      pageBudget -= 1;
    }

    return Array.from(
      new Map(
        mergedEvents.map((event) => [
          `${event.created_at}-${event.action}-${event.actor_user_id ?? ''}-${event.note ?? ''}`,
          event,
        ])
      ).values()
    ).filter((event) => TRUST_GOVERNANCE_DIGEST_ACTIONS.has(event.action));
  }, [
    auditTrustRegistryHistory,
    auditTrustRegistryHistoryHasMore,
    auditTrustRegistryHistoryOffset,
    auditTrustRegistryHistoryRetentionDays,
    isAuditTrustRegistryAdmin,
  ]);

  const handleGenerateAuditDigest = useCallback(async (options?: { suppressDownload?: boolean }) => {
    if (!digestIncludeCompletions && !digestIncludePolicies && !digestIncludeGovernance) {
      setHistoryExportMessage(t.dashboard.actionQueue.digestSelectionRequired);
      return;
    }

    const completionRows = digestIncludeCompletions
      ? completionHistory.map((historyItem) => ({
        section: 'completion',
        case_id: historyItem.caseId,
        case_title: historyItem.caseTitle,
        event_type: historyItem.eventType,
        event_label: historyItem.eventLabel,
        playbook_id: historyItem.playbookId,
        playbook_label: historyItem.playbookLabel,
        occurred_at: historyItem.occurredAt,
        policy_scope: '',
        policy_change: '',
        policy_changed_at: '',
      }))
      : [];
    const policyRows = digestIncludePolicies
      ? policyChangeHistory.map((historyItem) => ({
        section: 'policy',
        case_id: '',
        case_title: '',
        event_type: '',
        event_label: '',
        playbook_id: '',
        playbook_label: '',
        occurred_at: '',
        policy_scope: historyItem.statusLabel,
        policy_change: historyItem.changeLabel,
        policy_changed_at: historyItem.changedAt,
      }))
      : [];
    try {
      const governanceDigest = digestIncludeGovernance
        ? await fetchAuditTrustGovernanceDigest(auditTrustRegistryHistoryRetentionDays)
        : null;
      const governanceEvents = digestIncludeGovernance
        ? (governanceDigest?.events ?? await fetchAuditTrustGovernanceDigestEvents())
        : [];
      const governanceRows = governanceEvents.map((historyItem) => ({
        section: 'governance',
        case_id: '',
        case_title: '',
        event_type: historyItem.action,
        event_label: historyItem.action.replaceAll('_', ' '),
        playbook_id: '',
        playbook_label: '',
        occurred_at: historyItem.created_at,
        policy_scope: '',
        policy_change: '',
        policy_changed_at: '',
        governance_action: historyItem.action,
        governance_actor_user_id: historyItem.actor_user_id ?? '',
        governance_target_user_id: historyItem.target_user_id ?? '',
        governance_target_email: historyItem.target_email ?? '',
        governance_snapshot_id: resolveTrustRegistryEventSnapshotId(historyItem),
        governance_note: historyItem.note ?? '',
      }));
      const governanceAdminMutationsCount = governanceDigest?.counts.admin_mutation_count
        ?? governanceEvents.filter((event) =>
          event.action === 'trust_admin_granted' || event.action === 'trust_admin_revoked'
        ).length;
      const governanceRollbacksCount = governanceDigest?.counts.rollback_count
        ?? governanceEvents.filter((event) =>
          event.action === 'trust_registry_rolled_back'
        ).length;
      const governanceRotationsCount = governanceDigest?.counts.rotation_count
        ?? governanceEvents.filter((event) =>
          event.action === 'trust_registry_rotated'
        ).length;
      const latestRotationEvent = governanceEvents.find((event) =>
        event.action === 'trust_registry_rotated'
      );
      const latestRollbackEvent = governanceEvents.find((event) =>
        event.action === 'trust_registry_rolled_back'
      );
      const rotationRunbookLatestRotationAt = governanceDigest?.rotation_runbook.latest_rotation_at
        ?? latestRotationEvent?.created_at
        ?? '';
      const rotationRunbookLatestRotationSnapshot = governanceDigest?.rotation_runbook.latest_rotation_snapshot_id
        ?? (latestRotationEvent ? resolveTrustRegistryEventSnapshotId(latestRotationEvent) : '');
      const rotationRunbookLatestRollbackAt = governanceDigest?.rotation_runbook.latest_rollback_at
        ?? latestRollbackEvent?.created_at
        ?? '';
      const rotationRunbookLatestRollbackSnapshot = governanceDigest?.rotation_runbook.latest_rollback_snapshot_id
        ?? (latestRollbackEvent ? resolveTrustRegistryEventSnapshotId(latestRollbackEvent) : '');
      const rotationRunbookRuntimeEntries = governanceDigest?.rotation_runbook.runtime_entries_count
        ?? (auditTrustRegistrySnapshot?.runtime_entries_count ?? 0);
      const rotationRunbookRuntimeActiveNow = governanceDigest?.rotation_runbook.runtime_active_now_count ?? '';

      const totalRecords = completionRows.length + policyRows.length + governanceRows.length;
      if (totalRecords === 0) {
        setHistoryExportMessage(t.dashboard.actionQueue.historyExportEmpty);
        return;
      }

      const generatedAt = new Date().toISOString();
      const timestamp = generatedAt.replace(/[:.]/g, '-');
      const windowLabel = historyTimeFilter === '30d'
        ? t.dashboard.actionQueue.historyFilterTime30d
        : historyTimeFilter === '90d'
          ? t.dashboard.actionQueue.historyFilterTime90d
          : t.dashboard.actionQueue.historyFilterTimeAll;
      const summaryRows = [
        {
          section: 'summary',
          case_id: '',
          case_title: '',
          event_type: '',
          event_label: '',
          playbook_id: '',
          playbook_label: '',
          occurred_at: '',
          policy_scope: '',
          policy_change: '',
          policy_changed_at: '',
          generated_at: generatedAt,
          cadence: auditDigestCadence,
          window: windowLabel,
          event_filter: historyEventFilter,
          case_filter: historyCaseFilter,
          playbook_filter: historyPlaybookFilter,
          retention_days: taskEventRetentionDays,
          auto_retention_cadence: autoRetentionCadence,
          last_auto_retention_run_at: lastAutoRetentionRunAt ?? '',
          trust_admin_count: auditTrustAdminProfiles.length,
          trust_admin_access_source: auditTrustRegistrySnapshot?.admin_access?.source ?? '',
          trust_registry_env_entries: auditTrustRegistrySnapshot?.env_entries_count ?? 0,
          trust_registry_runtime_entries: auditTrustRegistrySnapshot?.runtime_entries_count ?? 0,
          rotation_preflight_valid: trustRegistryRotationPreflight?.valid ? 'true' : 'false',
          rotation_active_now: trustRegistryRotationPreflight?.summary.active_now_count ?? '',
          rotation_active_24h: trustRegistryRotationPreflight?.summary.active_in_24h_count ?? '',
          governance_event_count: governanceRows.length,
          governance_event_total_count: governanceDigest?.total_count ?? governanceRows.length,
          governance_admin_mutation_count: governanceAdminMutationsCount,
          governance_rollback_count: governanceRollbacksCount,
          governance_rotation_count: governanceRotationsCount,
          rotation_runbook_current_signer: trustRotationCurrentKeyId.trim() || trustRotationCurrentFingerprint.trim(),
          rotation_runbook_next_signer: trustRotationNextKeyId.trim() || trustRotationNextFingerprint.trim(),
          rotation_runbook_activate_at: trustRotationActivateAt,
          rotation_runbook_overlap_days: trustRotationOverlapDays,
          rotation_runbook_latest_rotation_at: rotationRunbookLatestRotationAt,
          rotation_runbook_latest_rotation_snapshot: rotationRunbookLatestRotationSnapshot,
          rotation_runbook_latest_rollback_at: rotationRunbookLatestRollbackAt,
          rotation_runbook_latest_rollback_snapshot: rotationRunbookLatestRollbackSnapshot,
          rotation_runbook_runtime_entries: rotationRunbookRuntimeEntries,
          rotation_runbook_runtime_active_now: rotationRunbookRuntimeActiveNow,
          rotation_runbook_snapshot_inventory: auditTrustRegistrySnapshots.length,
        },
      ];

      const headers = [
        'section',
        'generated_at',
        'cadence',
        'window',
        'event_filter',
        'case_filter',
        'playbook_filter',
        'retention_days',
        'auto_retention_cadence',
        'last_auto_retention_run_at',
        'trust_admin_count',
        'trust_admin_access_source',
        'trust_registry_env_entries',
        'trust_registry_runtime_entries',
        'rotation_preflight_valid',
        'rotation_active_now',
        'rotation_active_24h',
        'governance_event_count',
        'governance_event_total_count',
        'governance_admin_mutation_count',
        'governance_rollback_count',
        'governance_rotation_count',
        'rotation_runbook_current_signer',
        'rotation_runbook_next_signer',
        'rotation_runbook_activate_at',
        'rotation_runbook_overlap_days',
        'rotation_runbook_latest_rotation_at',
        'rotation_runbook_latest_rotation_snapshot',
        'rotation_runbook_latest_rollback_at',
        'rotation_runbook_latest_rollback_snapshot',
        'rotation_runbook_runtime_entries',
        'rotation_runbook_runtime_active_now',
        'rotation_runbook_snapshot_inventory',
        'governance_action',
        'governance_actor_user_id',
        'governance_target_user_id',
        'governance_target_email',
        'governance_snapshot_id',
        'governance_note',
        'case_id',
        'case_title',
        'event_type',
        'event_label',
        'playbook_id',
        'playbook_label',
        'occurred_at',
        'policy_scope',
        'policy_change',
        'policy_changed_at',
      ];

      const allRows = [...summaryRows, ...completionRows, ...policyRows, ...governanceRows];
      const wasServerSigned = await downloadSignedCsvBundle(
        `kingsley-audit-digest-${timestamp}`,
        headers,
        allRows.map((row) => headers.map((header) => (row as Record<string, string | number>)[header] ?? '')),
        generatedAt,
        {
          export_type: 'audit_digest',
          cadence: auditDigestCadence,
          event_filter: historyEventFilter,
          case_filter: historyCaseFilter,
          playbook_filter: historyPlaybookFilter,
          time_window: historyTimeFilter,
          include_completions: digestIncludeCompletions,
          include_policies: digestIncludePolicies,
          include_governance: digestIncludeGovernance,
          retention_days: taskEventRetentionDays,
          auto_retention_cadence: autoRetentionCadence,
          trust_admin_count: auditTrustAdminProfiles.length,
          trust_admin_access_source: auditTrustRegistrySnapshot?.admin_access?.source ?? '',
          trust_registry_env_entries: auditTrustRegistrySnapshot?.env_entries_count ?? 0,
          trust_registry_runtime_entries: auditTrustRegistrySnapshot?.runtime_entries_count ?? 0,
          rotation_preflight_valid: trustRegistryRotationPreflight?.valid === true,
          rotation_active_now: trustRegistryRotationPreflight?.summary.active_now_count ?? 0,
          rotation_active_24h: trustRegistryRotationPreflight?.summary.active_in_24h_count ?? 0,
          governance_event_count: governanceRows.length,
          governance_event_total_count: governanceDigest?.total_count ?? governanceRows.length,
          governance_admin_mutation_count: governanceAdminMutationsCount,
          governance_rollback_count: governanceRollbacksCount,
          governance_rotation_count: governanceRotationsCount,
          rotation_runbook_current_signer: trustRotationCurrentKeyId.trim() || trustRotationCurrentFingerprint.trim(),
          rotation_runbook_next_signer: trustRotationNextKeyId.trim() || trustRotationNextFingerprint.trim(),
          rotation_runbook_activate_at: trustRotationActivateAt,
          rotation_runbook_overlap_days: trustRotationOverlapDays,
          rotation_runbook_latest_rotation_at: rotationRunbookLatestRotationAt,
          rotation_runbook_latest_rotation_snapshot: rotationRunbookLatestRotationSnapshot,
          rotation_runbook_latest_rollback_at: rotationRunbookLatestRollbackAt,
          rotation_runbook_latest_rollback_snapshot: rotationRunbookLatestRollbackSnapshot,
          rotation_runbook_runtime_entries: rotationRunbookRuntimeEntries,
          rotation_runbook_runtime_active_now: rotationRunbookRuntimeActiveNow,
          rotation_runbook_snapshot_inventory: auditTrustRegistrySnapshots.length,
        },
        'audit_digest',
        options
      );

      setLastAuditDigestRunAt(generatedAt);
      setHistoryExportMessage(
        interpolateTemplate(t.dashboard.actionQueue.digestGeneratedSuccess, {
          count: totalRecords,
          cadence: auditDigestCadence === 'off'
            ? t.dashboard.actionQueue.digestCadenceOff
            : auditDigestCadence === 'monthly'
              ? t.dashboard.actionQueue.digestCadenceMonthly
              : t.dashboard.actionQueue.digestCadenceWeekly,
          signature: wasServerSigned
            ? t.dashboard.actionQueue.digestSignatureServer
            : t.dashboard.actionQueue.digestSignatureLocal,
        })
      );
    } catch (error) {
      console.error('Failed to generate audit digest', error);
      setHistoryExportMessage(t.dashboard.actionQueue.historyExportError);
    }
  }, [
    auditDigestCadence,
    autoRetentionCadence,
    auditTrustAdminProfiles.length,
    auditTrustRegistrySnapshot?.admin_access?.source,
    auditTrustRegistrySnapshot?.env_entries_count,
    auditTrustRegistrySnapshot?.runtime_entries_count,
    completionHistory,
    digestIncludeCompletions,
    digestIncludeGovernance,
    digestIncludePolicies,
    fetchAuditTrustGovernanceDigest,
    fetchAuditTrustGovernanceDigestEvents,
    auditTrustRegistryHistoryRetentionDays,
    historyCaseFilter,
    historyEventFilter,
    historyPlaybookFilter,
    historyTimeFilter,
    lastAutoRetentionRunAt,
    policyChangeHistory,
    taskEventRetentionDays,
    auditTrustRegistrySnapshots.length,
    trustRotationActivateAt,
    trustRotationCurrentFingerprint,
    trustRotationCurrentKeyId,
    trustRotationNextFingerprint,
    trustRotationNextKeyId,
    trustRotationOverlapDays,
    trustRegistryRotationPreflight?.summary.active_in_24h_count,
    trustRegistryRotationPreflight?.summary.active_now_count,
    trustRegistryRotationPreflight?.valid,
    t.dashboard.actionQueue.digestCadenceMonthly,
    t.dashboard.actionQueue.digestCadenceOff,
    t.dashboard.actionQueue.digestCadenceWeekly,
    t.dashboard.actionQueue.digestGeneratedSuccess,
    t.dashboard.actionQueue.digestSignatureLocal,
    t.dashboard.actionQueue.digestSignatureServer,
    t.dashboard.actionQueue.digestSelectionRequired,
    t.dashboard.actionQueue.historyExportEmpty,
    t.dashboard.actionQueue.historyExportError,
    t.dashboard.actionQueue.historyFilterTime30d,
    t.dashboard.actionQueue.historyFilterTime90d,
    t.dashboard.actionQueue.historyFilterTimeAll,
  ]);

  useEffect(() => {
    if (!isAuditDigestSettingsLoaded || !user || user.isGuest) return;
    if (auditDigestCadence === 'off') return;
    if (!digestIncludeCompletions && !digestIncludePolicies && !digestIncludeGovernance) return;
    if (isAutoGeneratingAuditDigestRef.current) return;

    const intervalMs = resolveAuditDigestIntervalMs(auditDigestCadence);
    if (!Number.isFinite(intervalMs)) return;

    const lastRunMs = lastAuditDigestRunAt ? Date.parse(lastAuditDigestRunAt) : Number.NaN;
    if (Number.isFinite(lastRunMs) && Date.now() - lastRunMs < intervalMs) return;

    isAutoGeneratingAuditDigestRef.current = true;
    handleGenerateAuditDigest({ suppressDownload: true })
      .finally(() => {
        isAutoGeneratingAuditDigestRef.current = false;
      });
  }, [
    auditDigestCadence,
    digestIncludeCompletions,
    digestIncludeGovernance,
    digestIncludePolicies,
    handleGenerateAuditDigest,
    isAuditDigestSettingsLoaded,
    lastAuditDigestRunAt,
    user,
  ]);

  const matterFlowColumns = useMemo(() => {
    const statusConfig = [
      {
        id: 'active' as const,
        label: t.dashboard.matterFlow.columns.active,
        badgeClasses: theme === 'dark' ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-50 text-blue-700',
      },
      {
        id: 'pending' as const,
        label: t.dashboard.matterFlow.columns.pending,
        badgeClasses: theme === 'dark' ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-50 text-amber-700',
      },
      {
        id: 'closed' as const,
        label: t.dashboard.matterFlow.columns.closed,
        badgeClasses: theme === 'dark' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-50 text-emerald-700',
      },
    ];

    return statusConfig.map((status) => {
      const casesForStatus = allCases.filter((caseItem) => caseItem.status === status.id);
      return {
        ...status,
        count: casesForStatus.length,
        cases: casesForStatus.slice(0, 4),
      };
    });
  }, [allCases, t.dashboard.matterFlow.columns.active, t.dashboard.matterFlow.columns.closed, t.dashboard.matterFlow.columns.pending, theme]);

  return (
          <main className="p-4 sm:p-6">
            {/* AI Setup Banner */}
            <AISetupBanner theme={theme} t={t} />

            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} mb-6 rounded-2xl p-4 sm:p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className={`text-base font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                    {t.dashboard.nightRuntime.title}
                  </h2>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t.dashboard.nightRuntime.description}
                  </p>
                </div>
                <span className={`${nightRuntimeHealth.badgeClass} rounded-full px-2.5 py-1 text-[11px] font-clash font-semibold tracking-[0.08em] uppercase`}>
                  {nightRuntimeHealth.badgeLabel}
                </span>
              </div>

              {nightRuntimeStatus ? (
                <>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className={`${theme === 'dark' ? 'bg-slate-900/45 border-slate-700/60 text-slate-200' : 'bg-white/80 border-slate-200/90 text-slate-700'} rounded-xl border p-2.5`}>
                      <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{t.dashboard.nightRuntime.iterationLabel}</p>
                      <p className="text-sm font-clash font-semibold">{nightRuntimeStatus.iteration}</p>
                    </div>
                    <div className={`${theme === 'dark' ? 'bg-slate-900/45 border-slate-700/60 text-slate-200' : 'bg-white/80 border-slate-200/90 text-slate-700'} rounded-xl border p-2.5`}>
                      <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{t.dashboard.nightRuntime.failureLabel}</p>
                      <p className="text-sm font-clash font-semibold">
                        {interpolateTemplate(t.dashboard.nightRuntime.failureValue, {
                          last: nightRuntimeStatus.last_iteration_failures,
                          consecutive: nightRuntimeStatus.consecutive_failures,
                        })}
                      </p>
                    </div>
                    <div className={`${theme === 'dark' ? 'bg-slate-900/45 border-slate-700/60 text-slate-200' : 'bg-white/80 border-slate-200/90 text-slate-700'} rounded-xl border p-2.5`}>
                      <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>{t.dashboard.nightRuntime.heartbeatLabel}</p>
                      <p className="text-sm font-clash font-semibold">
                        {formatDateTime(nightRuntimeStatus.finished_at || nightRuntimeStatus.timestamp, locale)}
                      </p>
                    </div>
                  </div>
                  {nightRuntimeStatus.lanes && (
                    <div className="mt-3">
                      <p className={`text-[11px] font-clash font-semibold tracking-[0.08em] uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t.dashboard.nightRuntime.laneSectionTitle}
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {NIGHT_RUNTIME_LANE_IDS.map((laneId) => {
                          const lane = nightRuntimeStatus.lanes?.[laneId];
                          if (!lane) return null;
                          return (
                            <div
                              key={laneId}
                              className={`${theme === 'dark' ? 'bg-slate-900/45 border-slate-700/60' : 'bg-white/80 border-slate-200/90'} rounded-xl border p-2.5`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                  {resolveNightLaneLabel(laneId)}
                                </p>
                                <span className={`${resolveNightLaneStatusClass(lane.status)} rounded-full px-2 py-0.5 text-[10px] font-clash font-semibold uppercase tracking-[0.08em]`}>
                                  {resolveNightLaneStatusLabel(lane.status)}
                                </span>
                              </div>
                              <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                {interpolateTemplate(t.dashboard.nightRuntime.laneFailureValue, {
                                  fail: lane.recent_failures,
                                  ok: lane.recent_successes,
                                })}
                              </p>
                              <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                {interpolateTemplate(t.dashboard.nightRuntime.laneWindowValue, {
                                  period: lane.expected_period_minutes ?? '-',
                                  grace: lane.grace_minutes ?? '-',
                                  stale: lane.stale_after_minutes ?? '-',
                                })}
                              </p>
                              <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                {interpolateTemplate(t.dashboard.nightRuntime.laneStateValue, {
                                  state: lane.last_state ?? '-',
                                })}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className={`mt-3 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                  {nightRuntimeUnavailable
                    ? t.dashboard.nightRuntime.unavailableHint
                    : t.dashboard.nightRuntime.loading}
                </p>
              )}
            </div>

                <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-5`}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className={`text-base font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                        {t.dashboard.deadlineGuard.title}
                      </h2>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t.dashboard.deadlineGuard.description}
                      </p>
                      {!isDeadlineProvenanceSupported && (
                        <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-amber-200' : 'text-amber-700'}`}>
                          {t.dashboard.deadlineGuard.provenanceFallback}
                        </p>
                      )}
                    </div>
                    <span className={`${theme === 'dark' ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-50 text-amber-700'} inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-clash font-semibold uppercase tracking-[0.08em]`}>
                      <AlertTriangle className="h-3 w-3" />
                      {interpolateTemplate(t.dashboard.deadlineGuard.alertBadge, {
                        count: deadlineGuardItems.filter((item) => item.urgency !== 'scheduled').length,
                      })}
                    </span>
                  </div>
                  {deadlineGuardItems.length === 0 ? (
                    <div className={`${theme === 'dark' ? 'bg-slate-900/50 text-slate-300 border-slate-700/60' : 'bg-slate-50 text-slate-600 border-slate-200'} rounded-xl border p-3 text-xs`}>
                      {t.dashboard.deadlineGuard.empty}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {deadlineGuardItems.map((item) => {
                        const urgencyLabel = item.urgency === 'overdue'
                          ? t.dashboard.deadlineGuard.urgencyOverdue
                          : item.urgency === 'upcoming'
                            ? t.dashboard.deadlineGuard.urgencyUpcoming
                            : t.dashboard.deadlineGuard.urgencyScheduled;
                        const urgencyClasses = item.urgency === 'overdue'
                          ? (theme === 'dark' ? 'bg-rose-500/20 text-rose-200' : 'bg-rose-50 text-rose-700')
                          : item.urgency === 'upcoming'
                            ? (theme === 'dark' ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-50 text-amber-700')
                            : (theme === 'dark' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-50 text-emerald-700');
                        const evidenceLabel = item.evidenceState === 'verified'
                          ? t.dashboard.deadlineGuard.evidenceVerified
                          : t.dashboard.deadlineGuard.evidenceReview;

                        return (
                          <div key={item.id} className={`${theme === 'dark' ? 'bg-slate-900/45 border-slate-700/60' : 'bg-white/80 border-slate-200/90'} rounded-xl border p-3`}>
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <p className={`min-w-0 text-sm font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                                {item.caseTitle}
                              </p>
                              <span className={`${urgencyClasses} shrink-0 rounded-full px-2 py-0.5 text-[10px] font-clash font-semibold uppercase tracking-[0.08em]`}>
                                {urgencyLabel}
                              </span>
                            </div>
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                              <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                {t.dashboard.deadlineGuard.dueLabel}: {item.dueDateLabel}
                              </span>
                              <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>?</span>
                              <span className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                {interpolateTemplate(t.dashboard.deadlineGuard.confidenceLabel, {
                                  score: item.confidenceScore,
                                })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                {evidenceLabel}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedDeadlineGuardId((currentId) => (
                                    currentId === item.id ? null : item.id
                                  ))}
                                  className={`${theme === 'dark' ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-clash font-semibold transition-colors`}
                                >
                                  {expandedDeadlineGuardId === item.id
                                    ? t.dashboard.deadlineGuard.hideEvidence
                                    : t.dashboard.deadlineGuard.showEvidence}
                                </button>
                                <Link
                                  to={item.route}
                                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-clash font-semibold text-white transition-colors hover:bg-indigo-700"
                                >
                                  {t.dashboard.deadlineGuard.reviewAction}
                                </Link>
                              </div>
                            </div>
                            {expandedDeadlineGuardId === item.id && (
                              <div className={`${theme === 'dark' ? 'bg-slate-950/70 border-slate-700/60' : 'bg-slate-50 border-slate-200'} mt-2 rounded-lg border p-2.5`}>
                                <p className={`mb-2 text-[10px] font-clash font-semibold uppercase tracking-[0.08em] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {t.dashboard.deadlineGuard.provenanceTitle}
                                </p>
                                <div className="space-y-1.5 text-[11px]">
                                  <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{t.dashboard.deadlineGuard.sourceDocumentLabel}:</span> {item.sourceDocument}
                                  </p>
                                  <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{t.dashboard.deadlineGuard.deadlineTypeLabel}:</span> {item.deadlineType === 'procedural'
                                      ? t.dashboard.deadlineGuard.deadlineTypeProcedural
                                      : t.dashboard.deadlineGuard.deadlineTypeFollowup}
                                  </p>
                                  <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{t.dashboard.deadlineGuard.jurisdictionRuleLabel}:</span> <code>{item.jurisdictionRuleRef}</code>
                                  </p>
                                  <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{t.dashboard.deadlineGuard.citationAnchorLabel}:</span> {item.citationAnchor ?? t.dashboard.deadlineGuard.citationAnchorNone}
                                  </p>
                                  <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <span className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>{t.dashboard.deadlineGuard.evidenceEntriesLabel}:</span> {item.persistedEvidenceCount}
                                  </p>
                                  <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {item.derivedFrom}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-5`}>
                  <div className="mb-3 flex items-center gap-2">
                    <Radar className={`h-4 w-4 ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'}`} />
                    <h2 className={`text-base font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                      {t.dashboard.actionQueue.title}
                    </h2>
                  </div>
                  <p className={`mb-3 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t.dashboard.actionQueue.description}
                  </p>
                  <p className={`mb-3 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                    {interpolateTemplate(t.dashboard.actionQueue.policySummary, {
                      activeDays: taskPolicyConfig.active.slaDays,
                      pendingDays: taskPolicyConfig.pending.slaDays,
                    })}
                  </p>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPolicyEditorOpen((isOpen) => !isOpen);
                        setPolicySaveError(null);
                        setPolicySaveSuccess(false);
                      }}
                      disabled={!isTaskPoliciesSupported}
                      className={`${theme === 'dark' ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {isPolicyEditorOpen
                        ? t.dashboard.actionQueue.policyEditorToggleClose
                        : t.dashboard.actionQueue.policyEditorToggleOpen}
                    </button>
                    {isTaskPolicyDraftDirty && (
                      <span className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-amber-200' : 'text-amber-700'}`}>
                        {t.dashboard.actionQueue.policyUnsaved}
                      </span>
                    )}
                  </div>
                  {isPolicyEditorOpen && (
                    <div className={`${theme === 'dark' ? 'bg-slate-900/45 border-slate-700/60' : 'bg-white/80 border-slate-200/90'} mb-3 rounded-xl border p-3`}>
                      <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t.dashboard.actionQueue.policyEditorDescription}
                      </p>
                      <div className="mt-3">
                        <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                          {t.dashboard.actionQueue.policyPresetLabel}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {TASK_POLICY_PRESETS.map((preset) => {
                            const isSelected = isTaskPolicyConfigEqual(
                              draftTaskPolicyConfig,
                              sanitizeTaskPolicyConfig(preset.config)
                            );
                            const presetLabel = preset.id === 'balanced'
                              ? t.dashboard.actionQueue.policyPresetBalanced
                              : preset.id === 'expedited'
                                ? t.dashboard.actionQueue.policyPresetExpedited
                                : t.dashboard.actionQueue.policyPresetLight;
                            const presetHint = preset.id === 'balanced'
                              ? t.dashboard.actionQueue.policyPresetBalancedHint
                              : preset.id === 'expedited'
                                ? t.dashboard.actionQueue.policyPresetExpeditedHint
                                : t.dashboard.actionQueue.policyPresetLightHint;

                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleApplyTaskPolicyPreset(preset)}
                                disabled={isTaskPolicyEditorDisabled || isSavingTaskPolicies}
                                className={`${isSelected
                                  ? (theme === 'dark'
                                    ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100'
                                    : 'border-indigo-500 bg-indigo-50 text-indigo-700')
                                  : (theme === 'dark'
                                    ? 'border-slate-700 bg-slate-800/70 text-slate-200 hover:bg-slate-700/80'
                                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100')} rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                <p className="font-clash font-semibold">{presetLabel}</p>
                                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{presetHint}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {(['active', 'pending'] as const).map((status) => {
                          const statusLabel = status === 'active'
                            ? t.dashboard.actionQueue.policyStatusActive
                            : t.dashboard.actionQueue.policyStatusPending;
                          const policy = draftTaskPolicyConfig[status];
                          const reminderMax = Math.max(POLICY_MIN_REMINDER_DAYS, policy.slaDays - 1);

                          return (
                            <div
                              key={status}
                              className={`${theme === 'dark' ? 'bg-slate-800/70 border-slate-700/70' : 'bg-slate-50 border-slate-200'} rounded-lg border p-3`}
                            >
                              <p className={`text-xs font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                {statusLabel}
                              </p>
                              <label className={`mt-2 block text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                {t.dashboard.actionQueue.policySlaLabel}
                              </label>
                              <input
                                type="number"
                                min={POLICY_MIN_SLA_DAYS}
                                max={POLICY_MAX_SLA_DAYS}
                                value={policy.slaDays}
                                onChange={(event) => updateDraftTaskPolicyField(status, 'slaDays', event.currentTarget.value)}
                                disabled={isTaskPolicyEditorDisabled || isSavingTaskPolicies}
                                className={`${theme === 'dark'
                                  ? 'border-slate-600 bg-slate-900 text-slate-100'
                                  : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60`}
                              />
                              <label className={`mt-2 block text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                {t.dashboard.actionQueue.policyReminderLabel}
                              </label>
                              <input
                                type="number"
                                min={POLICY_MIN_REMINDER_DAYS}
                                max={reminderMax}
                                value={policy.reminderWindowDays}
                                onChange={(event) => updateDraftTaskPolicyField(status, 'reminderWindowDays', event.currentTarget.value)}
                                disabled={isTaskPolicyEditorDisabled || isSavingTaskPolicies}
                                className={`${theme === 'dark'
                                  ? 'border-slate-600 bg-slate-900 text-slate-100'
                                  : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <p className={`mt-3 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                        {t.dashboard.actionQueue.policyEditorHint}
                      </p>
                      {policySaveError && (
                        <p className={`mt-2 text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-rose-300' : 'text-rose-700'}`}>
                          {policySaveError}
                        </p>
                      )}
                      {policySaveSuccess && (
                        <p className={`mt-2 text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                          {t.dashboard.actionQueue.policySaved}
                        </p>
                      )}
                      {!isTaskPolicyEventsSupported && (
                        <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
                          {t.dashboard.actionQueue.policyAuditFallback}
                        </p>
                      )}
                      <div className={`${theme === 'dark' ? 'bg-slate-800/70 border-slate-700/70' : 'bg-slate-50 border-slate-200'} mt-3 rounded-lg border p-2.5`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                            {t.dashboard.actionQueue.policyHistoryTitle}
                          </p>
                          <button
                            type="button"
                            onClick={handleExportPolicyHistory}
                            disabled={policyChangeHistory.length === 0}
                            className={`${theme === 'dark'
                              ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                              : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            <Download className="h-3 w-3" />
                            {t.dashboard.actionQueue.historyExportPolicies}
                          </button>
                        </div>
                        {policyChangeHistory.length === 0 ? (
                          <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.policyHistoryEmpty}
                          </p>
                        ) : (
                          <div className="mt-1 space-y-1">
                            {policyChangeHistory.map((historyItem) => (
                              <p
                                key={historyItem.id}
                                className={`text-[11px] ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}
                              >
                                <span className="font-clash font-semibold">{historyItem.statusLabel}:</span> {historyItem.changeLabel} ({historyItem.changedAtLabel})
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      {user?.isGuest && (
                        <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                          {t.dashboard.actionQueue.policyGuestNotice}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSaveTaskPolicies()}
                          disabled={!isTaskPolicyDraftDirty || isTaskPolicyEditorDisabled || isSavingTaskPolicies}
                          className={`${theme === 'dark'
                            ? 'bg-indigo-500/25 text-indigo-100 hover:bg-indigo-500/35'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'} inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {isSavingTaskPolicies
                            ? t.dashboard.actionQueue.policySaving
                            : t.dashboard.actionQueue.policySave}
                        </button>
                        <button
                          type="button"
                          onClick={handleResetTaskPolicies}
                          disabled={isSavingTaskPolicies}
                          className={`${theme === 'dark'
                            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {t.dashboard.actionQueue.policyReset}
                        </button>
                      </div>
                    </div>
                  )}
                  {!isCaseTasksSupported && (
                    <p className={`mb-3 text-[11px] ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
                      {t.dashboard.actionQueue.fallbackMode}
                    </p>
                  )}
                  {!isTaskPoliciesSupported && (
                    <p className={`mb-3 text-[11px] ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
                      {t.dashboard.actionQueue.policyFallback}
                    </p>
                  )}
                  {!isTaskEventsSupported && (
                    <p className={`mb-3 text-[11px] ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
                      {t.dashboard.actionQueue.historyFallback}
                    </p>
                  )}
                  <div className="space-y-2">
                    {actionQueue.length === 0 ? (
                      <div className={`${theme === 'dark' ? 'bg-slate-900/45 border-slate-700/60 text-slate-300' : 'bg-white/80 border-slate-200/90 text-slate-700'} rounded-xl border p-3`}>
                        <p className="text-sm font-clash font-semibold">{t.dashboard.actionQueue.emptyTitle}</p>
                        <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                          {t.dashboard.actionQueue.emptyDescription}
                        </p>
                      </div>
                    ) : actionQueue.map((task) => {
                      const isOverdue = task.status === 'overdue';
                      const isUpcoming = task.status === 'upcoming';
                      const statusLabel = isOverdue
                        ? t.dashboard.actionQueue.statusOverdue
                        : isUpcoming
                          ? t.dashboard.actionQueue.statusUpcoming
                          : t.dashboard.actionQueue.statusScheduled;

                      const statusClasses = isOverdue
                        ? (theme === 'dark'
                          ? 'bg-rose-500/20 text-rose-200'
                          : 'bg-rose-50 text-rose-700')
                        : isUpcoming
                          ? (theme === 'dark'
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'bg-amber-50 text-amber-700')
                          : (theme === 'dark'
                            ? 'bg-slate-700 text-slate-200'
                            : 'bg-slate-100 text-slate-700');

                      return (
                        <div
                          key={task.id}
                          className={`${theme === 'dark' ? 'bg-slate-900/45 border-slate-700/60' : 'bg-white/80 border-slate-200/90'} rounded-xl border p-3`}
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`text-sm font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                                {task.caseTitle}
                              </p>
                              <p className={`mt-0.5 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                {task.description}
                              </p>
                            </div>
                            <span className={`${statusClasses} shrink-0 rounded-full px-2 py-0.5 text-[10px] font-clash font-semibold tracking-[0.08em] uppercase`}>
                              {statusLabel}
                            </span>
                          </div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                              {t.dashboard.actionQueue.dueLabel}: {task.dueDateLabel}
                            </p>
                            <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                              {t.dashboard.actionQueue.priorityLabel}: {task.priorityScore}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={task.route}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-clash font-semibold text-white transition-colors hover:bg-indigo-700"
                            >
                              <PlayCircle className="h-3 w-3" />
                              {t.dashboard.actionQueue.runNow}
                            </Link>
                            {task.taskId && (
                              <button
                                type="button"
                                onClick={() => void handleCompleteTask(task.taskId)}
                                disabled={isCompletingTaskId === task.taskId}
                                className={`${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'} inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                <Check className="h-3 w-3" />
                                {isCompletingTaskId === task.taskId
                                  ? t.dashboard.actionQueue.completing
                                  : t.dashboard.actionQueue.complete}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-slate-900/45 border-slate-700/60' : 'bg-white/80 border-slate-200/90'} mt-3 rounded-xl border p-3`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={`text-xs font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                        {t.dashboard.actionQueue.completionHistoryTitle}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleExportCompletionHistory}
                          disabled={completionHistory.length === 0}
                          className={`${theme === 'dark'
                            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <Download className="h-3 w-3" />
                          {t.dashboard.actionQueue.historyExportCompletions}
                        </button>
                        <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                          {t.dashboard.actionQueue.historyRetentionWindowLabel}
                          <select
                            value={String(taskEventRetentionDays)}
                            onChange={(event) => setTaskEventRetentionDays(Number(event.currentTarget.value))}
                            disabled={!isTaskEventsSupported || isPruningTaskEvents || !user || user.isGuest}
                            className={`${theme === 'dark'
                              ? 'border-slate-600 bg-slate-900 text-slate-100'
                              : 'border-slate-300 bg-white text-slate-800'} ml-2 rounded-lg border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {TASK_EVENT_RETENTION_OPTIONS.map((optionDays) => (
                              <option key={optionDays} value={optionDays}>
                                {interpolateTemplate(t.dashboard.actionQueue.historyRetentionWindowDays, { days: optionDays })}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                          {t.dashboard.actionQueue.historyAutoRetentionLabel}
                          <select
                            value={autoRetentionCadence}
                            onChange={(event) => setAutoRetentionCadence(event.currentTarget.value as AutoRetentionCadence)}
                            disabled={!isTaskEventsSupported || isPruningTaskEvents || !user || user.isGuest}
                            className={`${theme === 'dark'
                              ? 'border-slate-600 bg-slate-900 text-slate-100'
                              : 'border-slate-300 bg-white text-slate-800'} ml-2 rounded-lg border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {AUTO_RETENTION_CADENCE_OPTIONS.map((cadenceOption) => (
                              <option key={cadenceOption} value={cadenceOption}>
                                {cadenceOption === 'daily'
                                  ? t.dashboard.actionQueue.historyAutoRetentionDaily
                                  : cadenceOption === 'weekly'
                                    ? t.dashboard.actionQueue.historyAutoRetentionWeekly
                                    : cadenceOption === 'monthly'
                                      ? t.dashboard.actionQueue.historyAutoRetentionMonthly
                                      : t.dashboard.actionQueue.historyAutoRetentionManual}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => void handlePruneTaskEvents()}
                          disabled={!isTaskEventsSupported || isPruningTaskEvents || !user || user.isGuest}
                          className={`${theme === 'dark'
                            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {isPruningTaskEvents
                            ? t.dashboard.actionQueue.historyRetentionRunning
                            : t.dashboard.actionQueue.historyRetentionAction}
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t.dashboard.actionQueue.historyFilterEventLabel}
                        <select
                          value={historyEventFilter}
                          onChange={(event) => setHistoryEventFilter(event.currentTarget.value as HistoryEventFilter)}
                          className={`${theme === 'dark'
                            ? 'border-slate-600 bg-slate-900 text-slate-100'
                            : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-sm`}
                        >
                          {HISTORY_EVENT_FILTERS.map((filterOption) => (
                            <option key={filterOption} value={filterOption}>
                              {filterOption === 'all'
                                ? t.dashboard.actionQueue.historyFilterEventAll
                                : resolveHistoryEventLabel(filterOption, t)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t.dashboard.actionQueue.historyFilterTimeLabel}
                        <select
                          value={historyTimeFilter}
                          onChange={(event) => setHistoryTimeFilter(event.currentTarget.value as HistoryTimeFilter)}
                          className={`${theme === 'dark'
                            ? 'border-slate-600 bg-slate-900 text-slate-100'
                            : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-sm`}
                        >
                          {HISTORY_TIME_FILTERS.map((filterOption) => (
                            <option key={filterOption} value={filterOption}>
                              {filterOption === '30d'
                                ? t.dashboard.actionQueue.historyFilterTime30d
                                : filterOption === '90d'
                                  ? t.dashboard.actionQueue.historyFilterTime90d
                                  : t.dashboard.actionQueue.historyFilterTimeAll}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t.dashboard.actionQueue.historyFilterCaseLabel}
                        <select
                          value={historyCaseFilter}
                          onChange={(event) => setHistoryCaseFilter(event.currentTarget.value)}
                          className={`${theme === 'dark'
                            ? 'border-slate-600 bg-slate-900 text-slate-100'
                            : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-sm`}
                        >
                          <option value="all">{t.dashboard.actionQueue.historyFilterCaseAll}</option>
                          {historyCaseOptions.map((caseOption) => (
                            <option key={caseOption.id} value={caseOption.id}>
                              {caseOption.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t.dashboard.actionQueue.historyFilterPlaybookLabel}
                        <select
                          value={historyPlaybookFilter}
                          onChange={(event) => setHistoryPlaybookFilter(event.currentTarget.value)}
                          className={`${theme === 'dark'
                            ? 'border-slate-600 bg-slate-900 text-slate-100'
                            : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-sm`}
                        >
                          <option value="all">{t.dashboard.actionQueue.historyFilterPlaybookAll}</option>
                          {historyPlaybookOptions.map((playbookOption) => (
                            <option key={playbookOption.id} value={playbookOption.id}>
                              {playbookOption.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className={`${theme === 'dark' ? 'bg-slate-950/60 border-slate-700/60' : 'bg-slate-50/90 border-slate-200'} mt-3 rounded-lg border p-2.5`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                          {t.dashboard.actionQueue.digestTitle}
                        </p>
                        <button
                          type="button"
                          onClick={handleGenerateAuditDigest}
                          disabled={(!digestIncludeCompletions && !digestIncludePolicies && !digestIncludeGovernance) || (!user || user.isGuest)}
                          className={`${theme === 'dark'
                            ? 'bg-indigo-500/25 text-indigo-100 hover:bg-indigo-500/35'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {t.dashboard.actionQueue.digestGenerateNow}
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                          {t.dashboard.actionQueue.digestCadenceLabel}
                          <select
                            value={auditDigestCadence}
                            onChange={(event) => setAuditDigestCadence(event.currentTarget.value as AuditDigestCadence)}
                            disabled={!user || user.isGuest}
                            className={`${theme === 'dark'
                              ? 'border-slate-600 bg-slate-900 text-slate-100'
                              : 'border-slate-300 bg-white text-slate-800'} ml-2 rounded-lg border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {AUDIT_DIGEST_CADENCE_OPTIONS.map((cadenceOption) => (
                              <option key={cadenceOption} value={cadenceOption}>
                                {cadenceOption === 'off'
                                  ? t.dashboard.actionQueue.digestCadenceOff
                                  : cadenceOption === 'monthly'
                                    ? t.dashboard.actionQueue.digestCadenceMonthly
                                    : t.dashboard.actionQueue.digestCadenceWeekly}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className={`inline-flex items-center gap-1 text-[11px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            <input
                              type="checkbox"
                              checked={digestIncludeCompletions}
                              onChange={(event) => setDigestIncludeCompletions(event.currentTarget.checked)}
                              disabled={!user || user.isGuest}
                              className="h-3.5 w-3.5 rounded border-slate-400"
                            />
                            {t.dashboard.actionQueue.digestIncludeCompletions}
                          </label>
                          <label className={`inline-flex items-center gap-1 text-[11px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            <input
                              type="checkbox"
                              checked={digestIncludePolicies}
                              onChange={(event) => setDigestIncludePolicies(event.currentTarget.checked)}
                              disabled={!user || user.isGuest}
                              className="h-3.5 w-3.5 rounded border-slate-400"
                            />
                            {t.dashboard.actionQueue.digestIncludePolicies}
                          </label>
                          <label className={`inline-flex items-center gap-1 text-[11px] ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            <input
                              type="checkbox"
                              checked={digestIncludeGovernance}
                              onChange={(event) => setDigestIncludeGovernance(event.currentTarget.checked)}
                              disabled={!user || user.isGuest}
                              className="h-3.5 w-3.5 rounded border-slate-400"
                            />
                            {t.dashboard.actionQueue.digestIncludeGovernance}
                          </label>
                        </div>
                      </div>
                      <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                        {interpolateTemplate(t.dashboard.actionQueue.digestLastRun, {
                          date: lastAuditDigestRunAt
                            ? formatDateTime(lastAuditDigestRunAt, locale)
                            : t.dashboard.actionQueue.historyAutoRetentionPending,
                        })}
                      </p>
                    </div>
                    <div className={`${theme === 'dark' ? 'bg-slate-950/60 border-slate-700/60' : 'bg-slate-50/90 border-slate-200'} mt-3 rounded-lg border p-2.5`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                          {t.dashboard.actionQueue.signatureTitle}
                        </p>
                        {auditSigningStatus?.enabled && auditSigningStatus.publicKeyPem && (
                          <button
                            type="button"
                            onClick={handleDownloadAuditVerificationKey}
                            className={`${theme === 'dark'
                              ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                              : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors`}
                          >
                            <Download className="h-3 w-3" />
                            {t.dashboard.actionQueue.signatureDownloadKey}
                          </button>
                        )}
                      </div>
                      <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        {isAuditSigningStatusUnavailable
                          ? t.dashboard.actionQueue.signatureUnavailable
                          : auditSigningStatus?.enabled
                            ? t.dashboard.actionQueue.signatureEnabled
                            : t.dashboard.actionQueue.signatureDisabled}
                      </p>
                      {auditSigningStatus?.enabled && (
                        <div className="mt-1 space-y-1">
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.signatureAlgorithmLabel}: {auditSigningStatus.algorithm}
                          </p>
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.signatureKeyIdLabel}: {auditSigningStatus.keyId ?? '-'}
                          </p>
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.signatureFingerprintLabel}: {formatFingerprint(auditSigningStatus.publicKeySha256)}
                          </p>
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.signatureTrustPolicyLabel}: {auditSigningStatus.trustPolicyMode
                              ? auditSigningStatus.trustPolicyMode
                              : t.dashboard.actionQueue.signatureVerifyNotChecked}
                          </p>
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.signatureSignerLifecycleLabel}: {resolveSignerRegistryStatusLabel(auditSigningStatus.signerRegistryStatus, t)}
                          </p>
                          {auditSigningStatus.trustRegistryConfigured && (
                            <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                              {t.dashboard.actionQueue.signatureTrustRegistryStatus}: {auditSigningStatus.trustCheckPassed === false
                                ? t.dashboard.actionQueue.signatureVerifyCheckFail
                                : t.dashboard.actionQueue.signatureVerifyCheckPass}
                            </p>
                          )}
                        </div>
                      )}
                      <div className={`${theme === 'dark' ? 'bg-slate-900/50 border-slate-700/60' : 'bg-white border-slate-200'} mt-3 rounded-lg border p-2.5`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                            {t.dashboard.actionQueue.readinessExportHistoryTitle}
                          </p>
                          <button
                            type="button"
                            onClick={() => void loadReadinessExportHistory(0, false)}
                            disabled={isLoadingAuditReadinessExportHistory || !user || user.isGuest}
                            className={`${theme === 'dark'
                              ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                              : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {isLoadingAuditReadinessExportHistory
                              ? t.dashboard.actionQueue.readinessExportHistoryLoading
                              : t.dashboard.actionQueue.readinessExportHistoryRefresh}
                          </button>
                        </div>
                        <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          {t.dashboard.actionQueue.readinessExportHistoryHint}
                        </p>
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            {t.dashboard.actionQueue.readinessExportHistorySignatureFilterLabel}
                            <select
                              value={readinessExportSignatureFilter}
                              onChange={(event) => setReadinessExportSignatureFilter(event.currentTarget.value as 'all' | 'server_attested' | 'local_checksum')}
                              className={`${theme === 'dark'
                                ? 'border-slate-600 bg-slate-900 text-slate-100'
                                : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-sm`}
                            >
                              <option value="all">{t.dashboard.actionQueue.readinessExportHistorySignatureFilterAll}</option>
                              <option value="server_attested">{t.dashboard.actionQueue.readinessExportHistorySignatureFilterServer}</option>
                              <option value="local_checksum">{t.dashboard.actionQueue.readinessExportHistorySignatureFilterLocal}</option>
                            </select>
                          </label>
                          <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            {t.dashboard.actionQueue.readinessExportHistoryManifestFilterLabel}
                            <input
                              type="text"
                              value={readinessExportManifestFilter}
                              onChange={(event) => setReadinessExportManifestFilter(event.currentTarget.value)}
                              placeholder={t.dashboard.actionQueue.readinessExportHistoryManifestFilterPlaceholder}
                              className={`${theme === 'dark'
                                ? 'border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-500'
                                : 'border-slate-300 bg-white text-slate-800 placeholder:text-gray-400'} mt-1 w-full rounded-lg border px-2 py-1 text-sm`}
                            />
                          </label>
                        </div>
                        <div className="mt-2 space-y-1">
                          {auditReadinessExportHistory.length === 0 ? (
                            <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                              {t.dashboard.actionQueue.readinessExportHistoryEmpty}
                            </p>
                          ) : (
                            auditReadinessExportHistory.map((entry) => {
                              const retentionHealth = resolveAuditArtifactRetentionHealth(entry.artifact_retention_expires_at);
                              const retentionHealthClass = retentionHealth === 'expired'
                                ? (theme === 'dark' ? 'text-rose-300' : 'text-rose-700')
                                : retentionHealth === 'expiring'
                                  ? (theme === 'dark' ? 'text-amber-300' : 'text-amber-700')
                                  : retentionHealth === 'active'
                                    ? (theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700')
                                    : (theme === 'dark' ? 'text-slate-400' : 'text-gray-500');
                              return (
                              <div key={entry.id} className={`${theme === 'dark' ? 'border-slate-700/60 bg-slate-950/40 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'} rounded-lg border px-2 py-1.5`}>
                                <p className="text-[11px] font-clash font-semibold">
                                  {formatDateTime(entry.created_at, locale)}
                                </p>
                                <p className="text-[10px]">
                                  {t.dashboard.actionQueue.readinessExportHistoryItemScope}: {entry.playbook_scope} / {entry.case_scope}
                                </p>
                                <p className="text-[10px]">
                                  {t.dashboard.actionQueue.readinessExportHistoryItemSignature}: {entry.signature_mode === 'server_attested'
                                    ? t.dashboard.actionQueue.readinessExportHistorySignatureFilterServer
                                    : t.dashboard.actionQueue.readinessExportHistorySignatureFilterLocal}
                                </p>
                                <p className="text-[10px]">
                                  {t.dashboard.actionQueue.readinessExportHistoryItemEvents}: {entry.event_count}
                                </p>
                                <p className="truncate text-[10px]">
                                  {t.dashboard.actionQueue.readinessExportHistoryItemManifestHash}: {entry.manifest_sha256}
                                </p>
                                {entry.artifact_id ? (
                                  <>
                                    <p className="truncate text-[10px]">
                                      {t.dashboard.actionQueue.readinessExportHistoryItemReceipt}: {entry.artifact_receipt_sha256 ?? '-'}
                                    </p>
                                    <p className="text-[10px]">
                                      {t.dashboard.actionQueue.readinessExportHistoryItemRetention}: {entry.artifact_retention_expires_at
                                        ? formatDateTime(entry.artifact_retention_expires_at, locale)
                                        : '-'}
                                    </p>
                                    <p className={`text-[10px] ${retentionHealthClass}`}>
                                      {t.dashboard.actionQueue.readinessExportHistoryItemRetentionHealth}: {resolveAuditArtifactRetentionHealthLabel(retentionHealth, t)}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => void handleDownloadReadinessArtifactReceipt(entry)}
                                      disabled={isDownloadingAuditArtifactReceiptId === entry.artifact_id}
                                      className={`${theme === 'dark'
                                        ? 'text-cyan-300 hover:text-cyan-200'
                                        : 'text-cyan-700 hover:text-cyan-900'} mt-1 text-[10px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
                                    >
                                      {isDownloadingAuditArtifactReceiptId === entry.artifact_id
                                        ? t.dashboard.actionQueue.readinessExportHistoryReceiptDownloading
                                        : t.dashboard.actionQueue.readinessExportHistoryReceiptDownload}
                                    </button>
                                  </>
                                ) : (
                                  <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                    {t.dashboard.actionQueue.readinessExportHistoryNoArtifact}
                                  </p>
                                )}
                              </div>
                            );
                            })
                          )}
                          {auditReadinessExportHasMore && (
                            <button
                              type="button"
                              onClick={() => void handleLoadMoreReadinessExportHistory()}
                              disabled={isLoadingAuditReadinessExportHistory || isLoadingMoreAuditReadinessExportHistory}
                              className={`${theme === 'dark'
                                ? 'text-cyan-300 hover:text-cyan-200'
                                : 'text-cyan-700 hover:text-cyan-900'} text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {isLoadingMoreAuditReadinessExportHistory
                                ? t.dashboard.actionQueue.readinessExportHistoryLoadingMore
                                : t.dashboard.actionQueue.readinessExportHistoryLoadMore}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className={`${theme === 'dark' ? 'bg-slate-900/50 border-slate-700/60' : 'bg-white border-slate-200'} mt-3 rounded-lg border p-2.5`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                            {t.dashboard.actionQueue.auditExportArtifactsTitle}
                          </p>
                          <button
                            type="button"
                            onClick={() => void loadAuditExportArtifacts(0, false)}
                            disabled={isLoadingAuditExportArtifacts || !user || user.isGuest}
                            className={`${theme === 'dark'
                              ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                              : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {isLoadingAuditExportArtifacts
                              ? t.dashboard.actionQueue.auditExportArtifactsLoading
                              : t.dashboard.actionQueue.auditExportArtifactsRefresh}
                          </button>
                        </div>
                        <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          {t.dashboard.actionQueue.auditExportArtifactsHint}
                        </p>
                        <div className="mt-2 space-y-1">
                          {auditExportArtifacts.length === 0 ? (
                            <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                              {t.dashboard.actionQueue.auditExportArtifactsEmpty}
                            </p>
                          ) : (
                            auditExportArtifacts.map((artifact) => (
                              <div key={artifact.id} className={`${theme === 'dark' ? 'border-slate-700/60 bg-slate-950/40 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'} rounded-lg border px-2 py-1.5`}>
                                <p className="text-[11px] font-clash font-semibold">
                                  {formatDateTime(artifact.created_at, locale)}
                                </p>
                                <p className="text-[10px]">
                                  {t.dashboard.actionQueue.auditExportArtifactsItemCase}: {artifact.case_ref ?? t.dashboard.actionQueue.auditExportArtifactsCaseAny}
                                </p>
                                <p className="text-[10px]">
                                  {t.dashboard.actionQueue.auditExportArtifactsItemEvents}: {artifact.event_count}
                                </p>
                                <p className="text-[10px] truncate">
                                  {t.dashboard.actionQueue.auditExportArtifactsItemReceipt}: {artifact.receipt_sha256}
                                </p>
                                <p className="text-[10px]">
                                  {t.dashboard.actionQueue.auditExportArtifactsItemRetention}: {formatDateTime(artifact.retention_expires_at, locale)}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => void handleDownloadAuditExportArtifactReceipt(artifact.id)}
                                  disabled={isDownloadingAuditArtifactReceiptId === artifact.id}
                                  className={`${theme === 'dark'
                                    ? 'text-cyan-300 hover:text-cyan-200'
                                    : 'text-cyan-700 hover:text-cyan-900'} mt-1 text-[10px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                  {isDownloadingAuditArtifactReceiptId === artifact.id
                                    ? t.dashboard.actionQueue.auditExportArtifactsReceiptDownloading
                                    : t.dashboard.actionQueue.auditExportArtifactsReceiptDownload}
                                </button>
                              </div>
                            ))
                          )}
                          {auditExportArtifactsHasMore && (
                            <button
                              type="button"
                              onClick={() => void handleLoadMoreAuditExportArtifacts()}
                              disabled={isLoadingAuditExportArtifacts || isLoadingMoreAuditExportArtifacts}
                              className={`${theme === 'dark'
                                ? 'text-cyan-300 hover:text-cyan-200'
                                : 'text-cyan-700 hover:text-cyan-900'} text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {isLoadingMoreAuditExportArtifacts
                                ? t.dashboard.actionQueue.auditExportArtifactsLoadingMore
                                : t.dashboard.actionQueue.auditExportArtifactsLoadMore}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className={`${theme === 'dark' ? 'bg-slate-900/50 border-slate-700/60' : 'bg-white border-slate-200'} mt-3 rounded-lg border p-2.5`}>
                        <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                          {t.dashboard.actionQueue.signatureRegistryTitle}
                        </p>
                        <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          {t.dashboard.actionQueue.signatureRegistryHint}
                        </p>
                        <p className={`mt-1 text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                          {trustRegistryScopeLabel}
                        </p>
                        <p className={`mt-1 text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                          {trustRegistryAccessSourceLabel}
                        </p>
                        {trustRegistryAccessFallbackWarning && (
                          <p className={`mt-1 text-[10px] ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
                            {trustRegistryAccessFallbackWarning}
                          </p>
                        )}
                        <div className={`${theme === 'dark' ? 'bg-slate-950/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'} mt-2 rounded-lg border p-2`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                              {t.dashboard.actionQueue.signatureTrustAdminsTitle}
                            </p>
                            <button
                              type="button"
                              onClick={() => void handleRefreshTrustAdmins()}
                              disabled={!isAuditTrustRegistryAdmin || isLoadingAuditTrustAdmins || isSavingAuditTrustAdmin}
                              className={`${theme === 'dark'
                                ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                                : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {isLoadingAuditTrustAdmins
                                ? t.dashboard.actionQueue.signatureTrustAdminsLoading
                                : t.dashboard.actionQueue.signatureTrustAdminsRefresh}
                            </button>
                          </div>
                          <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            {t.dashboard.actionQueue.signatureTrustAdminsHint}
                          </p>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                              {t.dashboard.actionQueue.signatureTrustAdminsEmailLabel}
                              <input
                                type="email"
                                value={auditTrustAdminTargetEmail}
                                onChange={(event) => setAuditTrustAdminTargetEmail(event.currentTarget.value)}
                                placeholder={t.dashboard.actionQueue.signatureTrustAdminsEmailPlaceholder}
                                disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustAdmin}
                                className={`${theme === 'dark'
                                  ? 'border-slate-600 bg-slate-900 text-slate-100'
                                  : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                              />
                            </label>
                            <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                              {t.dashboard.actionQueue.signatureTrustAdminsNoteLabel}
                              <input
                                type="text"
                                value={auditTrustAdminChangeNote}
                                onChange={(event) => setAuditTrustAdminChangeNote(event.currentTarget.value)}
                                placeholder={t.dashboard.actionQueue.signatureTrustAdminsNotePlaceholder}
                                disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustAdmin}
                                className={`${theme === 'dark'
                                  ? 'border-slate-600 bg-slate-900 text-slate-100'
                                  : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                              />
                            </label>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleSetTrustAdminByEmail(true)}
                              disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustAdmin}
                              className={`${theme === 'dark'
                                ? 'bg-emerald-500/25 text-emerald-100 hover:bg-emerald-500/35'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {isSavingAuditTrustAdmin
                                ? t.dashboard.actionQueue.signatureTrustAdminsSaving
                                : t.dashboard.actionQueue.signatureTrustAdminsGrant}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSetTrustAdminByEmail(false)}
                              disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustAdmin}
                              className={`${theme === 'dark'
                                ? 'bg-rose-500/20 text-rose-100 hover:bg-rose-500/30'
                                : 'bg-rose-600 text-white hover:bg-rose-700'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {isSavingAuditTrustAdmin
                                ? t.dashboard.actionQueue.signatureTrustAdminsSaving
                                : t.dashboard.actionQueue.signatureTrustAdminsRevoke}
                            </button>
                          </div>
                          <p className={`mt-2 text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.signatureTrustAdminsCurrentListLabel}
                          </p>
                          {auditTrustAdminProfiles.length === 0 ? (
                            <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                              {t.dashboard.actionQueue.signatureTrustAdminsEmpty}
                            </p>
                          ) : (
                            <div className="mt-1 space-y-1">
                              {auditTrustAdminProfiles.map((adminProfile) => (
                                <div
                                  key={adminProfile.id}
                                  className={`${theme === 'dark'
                                    ? 'border-slate-700 bg-slate-900/40'
                                    : 'border-slate-200 bg-white'} rounded-lg border p-2`}
                                >
                                  <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                    {adminProfile.full_name && adminProfile.full_name.trim().length > 0
                                      ? adminProfile.full_name
                                      : adminProfile.email}
                                  </p>
                                  <p className={`text-[11px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                    {adminProfile.email}
                                  </p>
                                  <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                    {interpolateTemplate(
                                      t.dashboard.actionQueue.signatureTrustAdminsUpdatedAt,
                                      { date: formatDateTime(adminProfile.updated_at, locale) }
                                    )}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          {auditTrustAdminMessage && (
                            <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                              {auditTrustAdminMessage}
                            </p>
                          )}
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-slate-950/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'} mt-2 rounded-lg border p-2`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                              {t.dashboard.actionQueue.signatureRotationTitle}
                            </p>
                            <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                              {trustRegistryRotationPreflight
                                ? interpolateTemplate(
                                  t.dashboard.actionQueue.signatureRotationPreflightSummary,
                                  {
                                    activeNow: trustRegistryRotationPreflight.summary.active_now_count,
                                    active24h: trustRegistryRotationPreflight.summary.active_in_24h_count,
                                    staged: trustRegistryRotationPreflight.summary.staged_entries_count,
                                  }
                                )
                                : interpolateTemplate(
                                  t.dashboard.actionQueue.signatureRotationIssueSummary,
                                  { count: trustRegistryRotationPreview.issues.length, errors: trustRegistryRotationErrorCount }
                                )}
                            </span>
                          </div>
                          <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            {t.dashboard.actionQueue.signatureRotationHint}
                          </p>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                              {t.dashboard.actionQueue.signatureRotationCurrentKeyLabel}
                              <input
                                type="text"
                                value={trustRotationCurrentKeyId}
                                onChange={(event) => setTrustRotationCurrentKeyId(event.currentTarget.value)}
                                disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                                className={`${theme === 'dark'
                                  ? 'border-slate-600 bg-slate-900 text-slate-100'
                                  : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                              />
                            </label>
                            <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                              {t.dashboard.actionQueue.signatureRotationCurrentFingerprintLabel}
                              <input
                                type="text"
                                value={trustRotationCurrentFingerprint}
                                onChange={(event) => setTrustRotationCurrentFingerprint(event.currentTarget.value)}
                                disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                                placeholder={t.dashboard.actionQueue.signatureRegistryFingerprintPlaceholder}
                                className={`${theme === 'dark'
                                  ? 'border-slate-600 bg-slate-900 text-slate-100'
                                  : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 font-mono text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                              />
                            </label>
                            <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                              {t.dashboard.actionQueue.signatureRotationNextKeyLabel}
                              <input
                                type="text"
                                value={trustRotationNextKeyId}
                                onChange={(event) => setTrustRotationNextKeyId(event.currentTarget.value)}
                                disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                                className={`${theme === 'dark'
                                  ? 'border-emerald-600 bg-slate-900 text-slate-100'
                                  : 'border-emerald-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                              />
                            </label>
                            <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                              {t.dashboard.actionQueue.signatureRotationNextFingerprintLabel}
                              <input
                                type="text"
                                value={trustRotationNextFingerprint}
                                onChange={(event) => setTrustRotationNextFingerprint(event.currentTarget.value)}
                                disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                                placeholder={t.dashboard.actionQueue.signatureRegistryFingerprintPlaceholder}
                                className={`${theme === 'dark'
                                  ? 'border-emerald-600 bg-slate-900 text-slate-100'
                                  : 'border-emerald-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 font-mono text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                              />
                            </label>
                            <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                              {t.dashboard.actionQueue.signatureRotationActivateAtLabel}
                              <input
                                type="datetime-local"
                                value={trustRotationActivateAt}
                                onChange={(event) => setTrustRotationActivateAt(event.currentTarget.value)}
                                disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                                className={`${theme === 'dark'
                                  ? 'border-slate-600 bg-slate-900 text-slate-100'
                                  : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                              />
                            </label>
                            <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                              {t.dashboard.actionQueue.signatureRotationOverlapDaysLabel}
                              <input
                                type="number"
                                min={TRUST_REGISTRY_ROTATION_MIN_OVERLAP_DAYS}
                                max={TRUST_REGISTRY_ROTATION_MAX_OVERLAP_DAYS}
                                value={trustRotationOverlapDays}
                                onChange={(event) => setTrustRotationOverlapDays(Number(event.currentTarget.value))}
                                disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                                className={`${theme === 'dark'
                                  ? 'border-slate-600 bg-slate-900 text-slate-100'
                                  : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                              />
                            </label>
                          </div>
                          {trustRegistryRotationPreview.issues.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {trustRegistryRotationPreview.issues.map((issue, index) => (
                                <p
                                  key={`${issue.level}-${index}`}
                                  className={`text-[11px] ${issue.level === 'error'
                                    ? (theme === 'dark' ? 'text-rose-300' : 'text-rose-700')
                                    : (theme === 'dark' ? 'text-amber-300' : 'text-amber-700')}`}
                                >
                                  {issue.label}
                                </p>
                              ))}
                            </div>
                          )}
                          {trustRegistryRotationPreflight && (
                            <div className="mt-2 space-y-1">
                              {trustRegistryRotationPreflight.errors.map((issueCode, index) => (
                                <p
                                  key={`rotation-server-error-${issueCode}-${index}`}
                                  className={`text-[11px] ${theme === 'dark' ? 'text-rose-300' : 'text-rose-700'}`}
                                >
                                  {resolveTrustRegistryRotationFindingLabel(issueCode, t)}
                                </p>
                              ))}
                              {trustRegistryRotationPreflight.warnings.map((issueCode, index) => (
                                <p
                                  key={`rotation-server-warning-${issueCode}-${index}`}
                                  className={`text-[11px] ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}
                                >
                                  {resolveTrustRegistryRotationFindingLabel(issueCode, t)}
                                </p>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleRunTrustRegistryRotationPreflight()}
                              disabled={!isAuditTrustRegistryAdmin || isRunningTrustRegistryRotationPreflight || isApplyingTrustRegistryRotation || isSavingAuditTrustRegistry}
                              className={`${theme === 'dark'
                                ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                                : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {isRunningTrustRegistryRotationPreflight
                                ? t.dashboard.actionQueue.signatureRotationPreflightRunning
                                : t.dashboard.actionQueue.signatureRotationPreflightRun}
                            </button>
                            <button
                              type="button"
                              onClick={handleStageTrustRegistryRotationPlan}
                              disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry || isApplyingTrustRegistryRotation}
                              className={`${theme === 'dark'
                                ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                                : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {t.dashboard.actionQueue.signatureRotationStageDraft}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleApplyTrustRegistryRotationPlan()}
                              disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry || isApplyingTrustRegistryRotation || isRunningTrustRegistryRotationPreflight}
                              className={`${theme === 'dark'
                                ? 'bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {isApplyingTrustRegistryRotation
                                ? t.dashboard.actionQueue.signatureRotationApplying
                                : t.dashboard.actionQueue.signatureRotationApplyNow}
                            </button>
                          </div>
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-slate-950/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'} mt-2 rounded-lg border p-2`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                              {t.dashboard.actionQueue.signatureSnapshotsTitle}
                            </p>
                            <button
                              type="button"
                              onClick={() => void handleRefreshTrustRegistrySnapshots()}
                              disabled={!isAuditTrustRegistryAdmin || isLoadingAuditTrustRegistrySnapshots || isRollingBackTrustRegistrySnapshot}
                              className={`${theme === 'dark'
                                ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                                : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {isLoadingAuditTrustRegistrySnapshots
                                ? t.dashboard.actionQueue.signatureSnapshotsLoading
                                : t.dashboard.actionQueue.signatureSnapshotsRefresh}
                            </button>
                          </div>
                          <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            {t.dashboard.actionQueue.signatureSnapshotsHint}
                          </p>
                          <label className={`mt-2 block text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            {t.dashboard.actionQueue.signatureSnapshotsRollbackNoteLabel}
                            <input
                              type="text"
                              value={auditTrustRegistryRollbackNote}
                              onChange={(event) => setAuditTrustRegistryRollbackNote(event.currentTarget.value)}
                              placeholder={t.dashboard.actionQueue.signatureSnapshotsRollbackNotePlaceholder}
                              disabled={!isAuditTrustRegistryAdmin || isRollingBackTrustRegistrySnapshot}
                              className={`${theme === 'dark'
                                ? 'border-slate-600 bg-slate-900 text-slate-100'
                                : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                            />
                          </label>
                          {auditTrustRegistrySnapshots.length === 0 ? (
                            <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                              {t.dashboard.actionQueue.signatureSnapshotsEmpty}
                            </p>
                          ) : (
                            <div className="mt-2 space-y-1">
                              {auditTrustRegistrySnapshots.map((snapshot) => (
                                <div
                                  key={snapshot.snapshot_id}
                                  className={`${theme === 'dark'
                                    ? 'border-slate-700 bg-slate-900/40'
                                    : 'border-slate-200 bg-white'} rounded-lg border p-2`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                      {snapshot.source}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => void handleRollbackTrustRegistrySnapshot(snapshot.snapshot_id)}
                                      disabled={!isAuditTrustRegistryAdmin || isRollingBackTrustRegistrySnapshot}
                                      className={`${theme === 'dark'
                                        ? 'bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
                                        : 'bg-amber-600 text-white hover:bg-amber-700'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                      {isRollingBackTrustRegistrySnapshot
                                        ? t.dashboard.actionQueue.signatureSnapshotsRollbackRunning
                                        : t.dashboard.actionQueue.signatureSnapshotsRollback}
                                    </button>
                                  </div>
                                  <p className={`mt-1 text-[11px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                    {snapshot.snapshot_id}
                                  </p>
                                  <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                    {interpolateTemplate(
                                      t.dashboard.actionQueue.signatureSnapshotsCreatedAt,
                                      { date: formatDateTime(snapshot.created_at, locale), count: snapshot.entries_count }
                                    )}
                                  </p>
                                  {snapshot.note && (
                                    <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                      {snapshot.note}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAddTrustRegistryDraftEntry}
                            disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry || auditTrustRegistryDraftEntries.length >= MAX_TRUST_REGISTRY_ENTRIES}
                            className={`${theme === 'dark'
                              ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                              : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {t.dashboard.actionQueue.signatureRegistryAddEntry}
                          </button>
                          <button
                            type="button"
                            onClick={handleLoadCurrentSignerIntoRegistry}
                            disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry || !canUseCurrentSignerPreset}
                            className={`${theme === 'dark'
                              ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                              : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {t.dashboard.actionQueue.signatureRegistryLoadCurrentSigner}
                          </button>
                          <button
                            type="button"
                            onClick={handleClearTrustRegistryDraft}
                            disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry || !hasTrustRegistryEntries}
                            className={`${theme === 'dark'
                              ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                              : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {t.dashboard.actionQueue.signatureRegistryClearDraft}
                          </button>
                          <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {trustRegistryEntryCountLabel}
                          </span>
                        </div>
                        <div className="mt-2 space-y-2">
                          {!hasTrustRegistryEntries ? (
                            <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                              {t.dashboard.actionQueue.signatureRegistryEmptyDraft}
                            </p>
                          ) : (
                            sortedTrustRegistryDraftEntries.map((entry, index) => {
                              const entryIssues = auditTrustRegistryDraftIssues[entry.id] ?? [];
                              return (
                                <div
                                  key={entry.id}
                                  className={`${theme === 'dark'
                                    ? 'border-slate-700 bg-slate-950/60'
                                    : 'border-slate-200 bg-slate-50'} rounded-lg border p-2`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                      {interpolateTemplate(t.dashboard.actionQueue.signatureRegistryEntryLabel, { index: index + 1 })}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTrustRegistryDraftEntry(entry.id)}
                                      disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                                      className={`${theme === 'dark'
                                        ? 'text-rose-300 hover:text-rose-200'
                                        : 'text-rose-700 hover:text-rose-800'} text-[11px] font-clash font-semibold disabled:cursor-not-allowed disabled:opacity-60`}
                                    >
                                      {t.dashboard.actionQueue.signatureRegistryRemoveEntry}
                                    </button>
                                  </div>
                                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                      {t.dashboard.actionQueue.signatureRegistryKeyIdLabel}
                                      <input
                                        type="text"
                                        value={entry.keyId}
                                        onChange={(event) => handleTrustRegistryDraftEntryChange(entry.id, 'keyId', event.currentTarget.value)}
                                        disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                                        className={`${theme === 'dark'
                                          ? 'border-slate-600 bg-slate-900 text-slate-100'
                                          : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                                      />
                                    </label>
                                    <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                      {t.dashboard.actionQueue.signatureRegistryFingerprintLabel}
                                      <input
                                        type="text"
                                        value={entry.publicKeySha256}
                                        onChange={(event) => handleTrustRegistryDraftEntryChange(entry.id, 'publicKeySha256', event.currentTarget.value)}
                                        disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                                        placeholder={t.dashboard.actionQueue.signatureRegistryFingerprintPlaceholder}
                                        className={`${theme === 'dark'
                                          ? 'border-slate-600 bg-slate-900 text-slate-100'
                                          : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 font-mono text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                                      />
                                    </label>
                                    <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                      {t.dashboard.actionQueue.signatureRegistryStatusLabel}
                                      <select
                                        value={entry.status}
                                        onChange={(event) => handleTrustRegistryDraftEntryChange(entry.id, 'status', event.currentTarget.value)}
                                        disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                                        className={`${theme === 'dark'
                                          ? 'border-slate-600 bg-slate-900 text-slate-100'
                                          : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                                      >
                                        {AUDIT_TRUST_REGISTRY_STATUS_OPTIONS.map((statusOption) => (
                                          <option key={statusOption} value={statusOption}>
                                            {resolveTrustRegistryStatusOptionLabel(statusOption, t)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                      {t.dashboard.actionQueue.signatureRegistryNotBeforeLabel}
                                      <input
                                        type="datetime-local"
                                        value={entry.notBefore}
                                        onChange={(event) => handleTrustRegistryDraftEntryChange(entry.id, 'notBefore', event.currentTarget.value)}
                                        disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                                        className={`${theme === 'dark'
                                          ? 'border-slate-600 bg-slate-900 text-slate-100'
                                          : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                                      />
                                    </label>
                                    <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                      {t.dashboard.actionQueue.signatureRegistryNotAfterLabel}
                                      <input
                                        type="datetime-local"
                                        value={entry.notAfter}
                                        onChange={(event) => handleTrustRegistryDraftEntryChange(entry.id, 'notAfter', event.currentTarget.value)}
                                        disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                                        className={`${theme === 'dark'
                                          ? 'border-slate-600 bg-slate-900 text-slate-100'
                                          : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                                      />
                                    </label>
                                  </div>
                                  {entryIssues.length > 0 && (
                                    <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-rose-300' : 'text-rose-700'}`}>
                                      {entryIssues.map((issue) => resolveTrustRegistryValidationIssueLabel(issue, t)).join(' ')}
                                    </p>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                        <label className={`mt-2 block text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                          {t.dashboard.actionQueue.signatureRegistryChangeNoteLabel}
                          <input
                            type="text"
                            value={auditTrustRegistryChangeNote}
                            onChange={(event) => setAuditTrustRegistryChangeNote(event.currentTarget.value)}
                            placeholder={t.dashboard.actionQueue.signatureRegistryChangeNotePlaceholder}
                            disabled={!isAuditTrustRegistryAdmin || isSavingAuditTrustRegistry}
                            className={`${theme === 'dark'
                              ? 'border-slate-600 bg-slate-900 text-slate-100'
                              : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                          />
                        </label>
                        {trustRegistryIssueBannerText && (
                          <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-amber-200' : 'text-amber-700'}`}>
                            {trustRegistryIssueBannerText}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSaveAuditTrustRegistry()}
                            disabled={!canSaveAuditTrustRegistry}
                            className={`${theme === 'dark'
                              ? 'bg-indigo-500/25 text-indigo-100 hover:bg-indigo-500/35'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {isSavingAuditTrustRegistry
                              ? t.dashboard.actionQueue.signatureRegistrySaving
                              : t.dashboard.actionQueue.signatureRegistrySave}
                          </button>
                          {trustRegistrySaveDisabledReason && (
                            <span className={`text-[11px] ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
                              {trustRegistrySaveDisabledReason}
                            </span>
                          )}
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-slate-950/50 border-slate-700/60' : 'bg-slate-50 border-slate-200'} mt-2 rounded-lg border p-2`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className={`text-[11px] font-clash font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                              {t.dashboard.actionQueue.signatureRegistryHistoryTitle}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                {t.dashboard.actionQueue.signatureRegistryHistoryRetentionLabel}
                                <select
                                  value={String(auditTrustRegistryHistoryRetentionDays)}
                                  onChange={(event) => setAuditTrustRegistryHistoryRetentionDays(Number(event.currentTarget.value))}
                                  disabled={!isAuditTrustRegistryAdmin || isPruningAuditTrustRegistryHistory}
                                  className={`${theme === 'dark'
                                    ? 'border-slate-600 bg-slate-900 text-slate-100'
                                    : 'border-slate-300 bg-white text-slate-800'} ml-1 rounded-lg border px-1.5 py-0.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                  {[30, 90, 180, 365].map((days) => (
                                    <option key={days} value={days}>
                                      {interpolateTemplate(t.dashboard.actionQueue.historyRetentionWindowDays, { days })}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                onClick={() => void handleTrimTrustRegistryHistory()}
                                disabled={!isAuditTrustRegistryAdmin || isPruningAuditTrustRegistryHistory}
                                className={`${theme === 'dark'
                                  ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                                  : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                {isPruningAuditTrustRegistryHistory
                                  ? t.dashboard.actionQueue.signatureRegistryHistoryTrimRunning
                                  : t.dashboard.actionQueue.signatureRegistryHistoryTrim}
                              </button>
                              <button
                                type="button"
                                onClick={handleExportTrustRegistryHistory}
                                disabled={auditTrustRegistryHistory.length === 0}
                                className={`${theme === 'dark'
                                  ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                                  : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                <Download className="h-3 w-3" />
                                {t.dashboard.actionQueue.signatureRegistryHistoryExport}
                              </button>
                            </div>
                          </div>
                          {auditTrustRegistryHistory.length === 0 ? (
                            <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                              {t.dashboard.actionQueue.signatureRegistryHistoryEmpty}
                            </p>
                          ) : (
                            <div className="mt-1 space-y-1">
                              {auditTrustRegistryHistory.map((event) => (
                                <p key={`${event.created_at}-${event.action}`} className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                                  {event.action} ({event.entries_count}) - {formatDateTime(event.created_at, locale)}
                                </p>
                              ))}
                              {auditTrustRegistryHistoryHasMore && (
                                <button
                                  type="button"
                                  onClick={() => void handleLoadMoreTrustRegistryHistory()}
                                  disabled={isLoadingAuditTrustRegistryHistory}
                                  className={`${theme === 'dark'
                                    ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                                    : 'bg-white text-slate-700 hover:bg-slate-100'} mt-1 inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                  {isLoadingAuditTrustRegistryHistory
                                    ? t.dashboard.actionQueue.signatureRegistryHistoryLoadingMore
                                    : t.dashboard.actionQueue.signatureRegistryHistoryLoadMore}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {auditTrustRegistryMessage && (
                          <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                            {auditTrustRegistryMessage}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                          {t.dashboard.actionQueue.signatureVerifyManifestLabel}
                          <input
                            type="file"
                            accept=".json,application/json"
                            onChange={(event) => {
                              void handleManifestFileChange(event.currentTarget.files?.[0] ?? null);
                              event.currentTarget.value = '';
                            }}
                            className={`${theme === 'dark'
                              ? 'border-slate-600 bg-slate-900 text-slate-100'
                              : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-sm`}
                          />
                          <span className={`mt-1 block text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {verificationManifestFileName ?? t.dashboard.actionQueue.signatureVerifyNoFile}
                          </span>
                        </label>
                        <label className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                          {t.dashboard.actionQueue.signatureVerifyCsvLabel}
                          <input
                            type="file"
                            accept=".csv,text/csv"
                            onChange={(event) => {
                              void handleCsvFileChange(event.currentTarget.files?.[0] ?? null);
                              event.currentTarget.value = '';
                            }}
                            className={`${theme === 'dark'
                              ? 'border-slate-600 bg-slate-900 text-slate-100'
                              : 'border-slate-300 bg-white text-slate-800'} mt-1 w-full rounded-lg border px-2 py-1 text-sm`}
                          />
                          <span className={`mt-1 block text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {verificationCsvFileName ?? t.dashboard.actionQueue.signatureVerifyNoFile}
                          </span>
                        </label>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleVerifyAuditBundle()}
                          disabled={!verificationManifestInput || isVerifyingBundle}
                          className={`${theme === 'dark'
                            ? 'bg-indigo-500/25 text-indigo-100 hover:bg-indigo-500/35'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {isVerifyingBundle
                            ? t.dashboard.actionQueue.signatureVerifyRunning
                            : t.dashboard.actionQueue.signatureVerifyAction}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadVerificationReceipt}
                          disabled={!verificationReceipt}
                          className={`${theme === 'dark'
                            ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                            : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          <Download className="h-3 w-3" />
                          {t.dashboard.actionQueue.signatureVerifyDownloadReceipt}
                        </button>
                        <button
                          type="button"
                          onClick={handlePrintVerificationReceipt}
                          disabled={!verificationReceipt}
                          className={`${theme === 'dark'
                            ? 'bg-slate-900 text-slate-200 hover:bg-slate-700'
                            : 'bg-white text-slate-700 hover:bg-slate-100'} inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {t.dashboard.actionQueue.signatureVerifyPrintReceipt}
                        </button>
                      </div>
                      {verificationError && (
                        <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-rose-300' : 'text-rose-700'}`}>
                          {verificationError}
                        </p>
                      )}
                      {verificationReceipt && (
                        <div className={`${theme === 'dark' ? 'bg-slate-900/70 border-slate-700/70' : 'bg-white border-slate-200'} mt-2 rounded-lg border p-2`}>
                          <p className={`text-[11px] font-clash font-semibold ${verificationReceipt.verification_passed
                            ? (theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700')
                            : (theme === 'dark' ? 'text-amber-200' : 'text-amber-700')}`}>
                            {verificationReceipt.verification_passed
                              ? t.dashboard.actionQueue.signatureVerifyResultPass
                              : t.dashboard.actionQueue.signatureVerifyResultFail}
                          </p>
                          <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            {t.dashboard.actionQueue.signatureVerifyReceiptIdLabel}: {formatFingerprint(verificationReceipt.receipt_id)}
                          </p>
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.signatureVerifyCheckSignature}: {verificationReceipt.checks.signature_valid
                              ? t.dashboard.actionQueue.signatureVerifyCheckPass
                              : t.dashboard.actionQueue.signatureVerifyCheckFail}
                          </p>
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.signatureVerifyCheckBinding}: {verificationReceipt.checks.payload_binds_manifest_hash
                              ? t.dashboard.actionQueue.signatureVerifyCheckPass
                              : t.dashboard.actionQueue.signatureVerifyCheckFail}
                          </p>
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.signatureVerifyCheckCsv}: {verificationReceipt.checks.csv_hash_matches_manifest === null
                              ? t.dashboard.actionQueue.signatureVerifyNotChecked
                              : verificationReceipt.checks.csv_hash_matches_manifest
                                ? t.dashboard.actionQueue.signatureVerifyCheckPass
                                : t.dashboard.actionQueue.signatureVerifyCheckFail}
                          </p>
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.signatureVerifyCheckTrust}: {verificationReceipt.checks.trust_check_passed
                              ? t.dashboard.actionQueue.signatureVerifyCheckPass
                              : t.dashboard.actionQueue.signatureVerifyCheckFail}
                          </p>
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.signatureSignerLifecycleLabel}: {resolveSignerRegistryStatusLabel(verificationReceipt.checks.signer_registry_status, t)}
                          </p>
                          <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                            {t.dashboard.actionQueue.signatureTrustPolicyLabel}: {verificationReceipt.trust_policy.mode}
                          </p>
                        </div>
                      )}
                    </div>
                    {taskEventPruneMessage && (
                      <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                        {taskEventPruneMessage}
                      </p>
                    )}
                    <p className={`mt-1 text-[11px] ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                      {interpolateTemplate(t.dashboard.actionQueue.historyAutoRetentionLastRun, {
                        date: lastAutoRetentionRunAt
                          ? formatDateTime(lastAutoRetentionRunAt, locale)
                          : t.dashboard.actionQueue.historyAutoRetentionPending,
                      })}
                    </p>
                    {historyExportMessage && (
                      <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}`}>
                        {historyExportMessage}
                      </p>
                    )}
                    {completionHistory.length === 0 ? (
                      <p className={`mt-2 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t.dashboard.actionQueue.completionHistoryEmpty}
                      </p>
                    ) : (
                      <div className="mt-2 space-y-1">
                        {completionHistory.map((historyItem) => (
                          <p
                            key={historyItem.id}
                            className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}
                          >
                            {interpolateTemplate(t.dashboard.actionQueue.completionHistoryItem, {
                              caseTitle: historyItem.caseTitle,
                              event: historyItem.eventLabel,
                              playbook: historyItem.playbookLabel,
                              date: historyItem.occurredAtLabel,
                            })}
                          </p>
                        ))}
                        {taskEventsHasMore && isTaskEventsSupported && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => void handleLoadMoreTaskEvents()}
                              disabled={isLoadingMoreTaskEvents}
                              className={`${theme === 'dark'
                                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60`}
                            >
                              {isLoadingMoreTaskEvents
                                ? t.dashboard.actionQueue.historyLoadingMore
                                : t.dashboard.actionQueue.historyLoadMore}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
            {/* Recent Cases */}
            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6`}>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t.dashboard.recentCases.title}</h2>
                <Link
                  to="/new-case"
                  className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-4 py-2 rounded-xl font-clash font-medium text-sm`}
                >
                  {t.dashboard.recentCases.newCase}
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-4 h-24 animate-pulse ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'}`} />
                  ))
                ) : recentCases.length > 0 ? (
                  recentCases.slice(0, 3).map((caseItem) => (
                    <div key={caseItem.id} className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-4`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-sm`}>{caseItem.title}</h3>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mt-1`}>{caseItem.description}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-clash font-medium ${
                          caseItem.status === 'active' ? 
                            (theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700') :
                          caseItem.status === 'pending' ? 
                            (theme === 'dark' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700') :
                            (theme === 'dark' ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700')
                        }`}>
                          {caseItem.status === 'active' ? t.dashboard.recentCases.inProgress :
                           caseItem.status === 'pending' ? t.dashboard.recentCases.review : t.dashboard.recentCases.completed}
                        </span>
                      </div>
                      <div className={`flex items-center justify-between text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span>{t.dashboard.recentCases.createdOn} {formatDate(caseItem.createdAt, locale)}</span>
                        <span>{caseItem.messages.length} {t.dashboard.recentCases.messagesLabel}</span>
                      </div>
                    </div>
                  ))
                ) : user?.isGuest ? (
                  <>
                    <div className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-4`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-sm`}>{t.dashboard.mockCases.case1.title}</h3>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mt-1`}>{t.dashboard.mockCases.case1.description}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-clash font-medium ${theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>{t.dashboard.recentCases.inProgress}</span>
                      </div>
                      <div className={`flex items-center justify-between text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span>{t.dashboard.mockCases.case1.date}</span>
                        <span>{t.dashboard.mockCases.case1.messages}</span>
                      </div>
                    </div>
                    
                    <div className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-4`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-sm`}>{t.dashboard.mockCases.case2.title}</h3>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mt-1`}>{t.dashboard.mockCases.case2.description}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-clash font-medium ${theme === 'dark' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700'}`}>{t.dashboard.recentCases.review}</span>
                      </div>
                      <div className={`flex items-center justify-between text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span>{t.dashboard.mockCases.case2.date}</span>
                        <span>{t.dashboard.mockCases.case2.messages}</span>
                      </div>
                    </div>
                    
                    <div className={`${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-4`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-sm`}>{t.dashboard.mockCases.case3.title}</h3>
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mt-1`}>{t.dashboard.mockCases.case3.description}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-clash font-medium ${theme === 'dark' ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'}`}>{t.dashboard.recentCases.completed}</span>
                      </div>
                      <div className={`flex items-center justify-between text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                        <span>{t.dashboard.mockCases.case3.date}</span>
                        <span>{t.dashboard.mockCases.case3.messages}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={`col-span-full ${theme === 'dark' ? 'dark-case-card' : 'case-card'} rounded-xl p-6 text-center`}>
                    <h3 className={`font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} text-base mb-2`}>
                      {t.cases.noCases}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-4`}>
                      {t.cases.noCasesDesc}
                    </p>
                    <Link
                      to="/new-case"
                      className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} inline-flex text-white px-4 py-2 rounded-xl font-clash font-medium text-sm`}
                    >
                      {t.cases.createCase}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} mt-8 rounded-2xl p-4 sm:p-6`}>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className={`text-xl font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                    {t.dashboard.matterFlow.title}
                  </h2>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                    {t.dashboard.matterFlow.description}
                  </p>
                </div>
                <Link
                  to="/cases"
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-clash font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  {t.dashboard.matterFlow.openCases}
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {matterFlowColumns.map((column) => (
                  <div
                    key={column.id}
                    className={`${theme === 'dark' ? 'bg-slate-900/45 border-slate-700/60' : 'bg-white/80 border-slate-200/90'} rounded-xl border p-3`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className={`text-sm font-clash font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                        {column.label}
                      </p>
                      <span className={`${column.badgeClasses} rounded-full px-2 py-0.5 text-[10px] font-clash font-semibold tracking-[0.08em] uppercase`}>
                        {column.count}
                      </span>
                    </div>
                    {column.cases.length > 0 ? (
                      <div className="space-y-2">
                        {column.cases.map((caseItem) => (
                          <Link
                            key={caseItem.id}
                            to={`/cases/${caseItem.id}`}
                            className={`${theme === 'dark' ? 'bg-slate-800/75 border-slate-700/70 text-slate-200 hover:bg-slate-700/70' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'} block rounded-lg border px-2.5 py-2 transition-colors`}
                          >
                            <p className="truncate text-xs font-clash font-semibold">{caseItem.title}</p>
                            <p className={`mt-1 line-clamp-2 text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                              {caseItem.description}
                            </p>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className={`${theme === 'dark' ? 'bg-slate-800/60 text-slate-400' : 'bg-slate-50 text-slate-500'} rounded-lg px-2.5 py-2 text-[11px]`}>
                        {t.dashboard.matterFlow.empty}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </main>
  );
}







