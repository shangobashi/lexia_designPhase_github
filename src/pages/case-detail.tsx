import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  CaseTask as DbCaseTask,
  TaskEvent as DbTaskEvent,
  completeCaseTask,
  createTaskEvents,
  getCaseById,
  getUserCaseTasks,
  getUserTaskEventsPage,
  isSupabaseConfigured,
  supabase,
  upsertCaseTasks,
} from '@/lib/supabase';
import { buildApiUrl } from '@/lib/api-base-url';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/contexts/theme-context';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Download,
  FileText,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  caseId: string;
}

interface Case {
  id: string;
  caseId: string;
  title: string;
  description: string;
  status: 'active' | 'pending' | 'closed';
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  documents: Array<{
    id: string;
    name: string;
    size: number;
    uploadedAt: string;
    type: string;
    tags: string[];
  }>;
  userId: string;
}

interface CommandActionItem {
  id: string;
  taskId: string | null;
  title: string;
  detail: string;
  state: 'overdue' | 'upcoming' | 'scheduled';
  dueLabel: string | null;
  priority: number;
}

interface AuditExportArtifactCreateResponse {
  id: string | null;
  created_at: string;
  retention_expires_at: string;
  receipt_sha256: string;
  signature_algorithm: string;
  signature_key_id: string | null;
}

type CommandEventFilter = 'all' | DbTaskEvent['event_type'];
type CommandWindowFilter = '7d' | '30d' | 'all';
type CommandSourceFilter = 'all' | 'dashboard' | 'case-detail-command-center' | 'dashboard-policy' | 'case_detail_seed' | 'automation' | 'system';

const CORE_CASE_PLAYBOOKS = ['timeline-extraction', 'strategy-matrix', 'research-memo'] as const;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const AUDIT_PAGE_SIZE = 20;

const windowFilterToDays = (windowFilter: CommandWindowFilter): number | undefined => {
  if (windowFilter === '7d') return 7;
  if (windowFilter === '30d') return 30;
  return undefined;
};

const toCsvCell = (value: string) => {
  if (!/[",\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
};

const downloadCsv = (
  filename: string,
  headers: string[],
  rows: string[][]
) => {
  const csv = [
    headers.map((header) => toCsvCell(header)).join(','),
    ...rows.map((row) => row.map((cell) => toCsvCell(cell)).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

const toSha256Hex = async (content: string) => {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(content));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const registerAuditExportArtifact = async (payload: {
  caseRef: string;
  eventCount: number;
  csvSha256: string;
  manifestSha256: string;
  exportScope: Record<string, unknown>;
}): Promise<AuditExportArtifactCreateResponse | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return null;

  const response = await fetch(buildApiUrl('/api/audit/export-artifacts'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      artifactType: 'case_audit_timeline',
      caseRef: payload.caseRef,
      eventCount: payload.eventCount,
      csvSha256: payload.csvSha256,
      manifestSha256: payload.manifestSha256,
      exportScope: payload.exportScope,
      retentionDays: 365,
    }),
  });

  if (!response.ok) return null;
  const body = await response.json() as Partial<AuditExportArtifactCreateResponse>;
  if (!body || typeof body.created_at !== 'string' || typeof body.retention_expires_at !== 'string') return null;

  return {
    id: typeof body.id === 'string' ? body.id : null,
    created_at: body.created_at,
    retention_expires_at: body.retention_expires_at,
    receipt_sha256: typeof body.receipt_sha256 === 'string' ? body.receipt_sha256 : '',
    signature_algorithm: typeof body.signature_algorithm === 'string' ? body.signature_algorithm : '',
    signature_key_id: typeof body.signature_key_id === 'string' ? body.signature_key_id : null,
  };
};

const persistReadinessExportHistory = async (payload: {
  eventCount: number;
  csvSha256: string;
  manifestSha256: string;
  artifactReceipt: AuditExportArtifactCreateResponse | null;
  exportScope: Record<string, unknown>;
}) => {
  if (!isSupabaseConfigured) return;
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return;

  await fetch(buildApiUrl('/api/audit/readiness-exports'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signatureMode: 'local_checksum',
      cadence: 'off',
      playbookScope: 'case_audit_timeline',
      caseScope: 'case-linked',
      eventCount: payload.eventCount,
      csvSha256: payload.csvSha256,
      manifestSha256: payload.manifestSha256,
      metadata: {
        export_scope: payload.exportScope,
        artifact_generated: Boolean(payload.artifactReceipt),
        audit_artifact: payload.artifactReceipt
          ? {
            id: payload.artifactReceipt.id,
            receipt_sha256: payload.artifactReceipt.receipt_sha256,
            retention_expires_at: payload.artifactReceipt.retention_expires_at,
            signature_algorithm: payload.artifactReceipt.signature_algorithm,
            signature_key_id: payload.artifactReceipt.signature_key_id,
          }
          : null,
      },
    }),
  }).catch(() => undefined);
};

const convertDbCaseToCase = (dbCase: any): Case => ({
  id: dbCase.id,
  caseId: dbCase.case_id,
  title: dbCase.title,
  description: dbCase.description,
  status: dbCase.status,
  createdAt: dbCase.created_at,
  updatedAt: dbCase.updated_at,
  messages: (dbCase.messages || []).map((msg: any) => ({
    id: msg.id,
    content: msg.content,
    sender: msg.sender,
    timestamp: msg.created_at,
    caseId: msg.case_id,
  })),
  documents: dbCase.documents || [],
  userId: dbCase.user_id,
});

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');
  const [commandTasks, setCommandTasks] = useState<DbCaseTask[]>([]);
  const [commandTaskEvents, setCommandTaskEvents] = useState<DbTaskEvent[]>([]);
  const [isCommandCenterLoading, setIsCommandCenterLoading] = useState(false);
  const [isTaskSchemaSupported, setIsTaskSchemaSupported] = useState(true);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [isSeedingTasks, setIsSeedingTasks] = useState(false);
  const [eventFilter, setEventFilter] = useState<CommandEventFilter>('all');
  const [windowFilter, setWindowFilter] = useState<CommandWindowFilter>('30d');
  const [sourceFilter, setSourceFilter] = useState<CommandSourceFilter>('all');
  const [taskEventsOffset, setTaskEventsOffset] = useState(0);
  const [taskEventsHasMore, setTaskEventsHasMore] = useState(false);
  const [isLoadingMoreTaskEvents, setIsLoadingMoreTaskEvents] = useState(false);
  const [isExportingAllAuditEvents, setIsExportingAllAuditEvents] = useState(false);

  const isCaseTaskSchemaMissingError = (error: unknown) => {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return message.includes('case_tasks') || message.includes('task_events') || message.includes('does not exist');
  };

  useEffect(() => {
    const fetchCase = async () => {
      setIsLoading(true);
      try {
        if (id === 'demo' || user?.isGuest) {
          const demoCase: Case = {
            id: 'BC-2024-001',
            caseId: 'BC-2024-001',
            title: t('cases.mockCases.mock-1.title'),
            description: t('cases.mockCases.mock-1.description'),
            status: 'active',
            createdAt: '2024-07-10T09:00:00.000Z',
            updatedAt: new Date().toISOString(),
            messages: [],
            documents: [
              {
                id: '1',
                name: 'Bail commercial original.pdf',
                size: 2400000,
                uploadedAt: '2024-07-10T09:30:00.000Z',
                type: 'pdf',
                tags: ['original', 'analyzed'],
              },
              {
                id: '2',
                name: 'Amendement clauses resiliation.docx',
                size: 856000,
                uploadedAt: '2024-07-12T11:15:00.000Z',
                type: 'docx',
                tags: ['draft', 'ai-generated'],
              },
              {
                id: '3',
                name: 'Etat des lieux entree.xlsx',
                size: 1200000,
                uploadedAt: '2024-07-11T14:20:00.000Z',
                type: 'xlsx',
                tags: ['annexe'],
              },
            ],
            userId: user?.id || 'guest',
          };
          setCaseData(demoCase);
        } else if (!user?.isGuest) {
          const dbCase = await getCaseById(id || '');
          const convertedCase = convertDbCaseToCase(dbCase);
          setCaseData(convertedCase);
        } else {
          throw new Error('Guests can only access demo case');
        }
      } catch (error) {
        console.error('Error fetching case', error);
        toast({
          title: t('caseDetail.notFoundToast'),
          description: t('caseDetail.notFoundToastDesc'),
          variant: 'destructive',
        });
        navigate('/cases');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchCase();
    }
  }, [id, navigate, t, toast, user]);

  const statusLabel = useMemo(() => {
    if (!caseData) return t('common.active');
    if (caseData.status === 'active') return t('common.active');
    if (caseData.status === 'pending') return t('common.pending');
    return t('common.closed');
  }, [caseData, t]);

  const timelineEvents = useMemo(
    () => [
      {
        title: t('caseDetail.timeline.aiAnalysis'),
        time: t('caseDetail.timeline.aiAnalysisTime'),
        description: t('caseDetail.timeline.aiAnalysisDesc'),
      },
      {
        title: t('caseDetail.timeline.docGenerated'),
        time: t('caseDetail.timeline.docGeneratedTime'),
        description: t('caseDetail.timeline.docGeneratedDesc'),
      },
      {
        title: t('caseDetail.timeline.clientConsultation'),
        time: t('caseDetail.timeline.clientConsultationTime'),
        description: t('caseDetail.timeline.clientConsultationDesc'),
      },
      {
        title: t('caseDetail.timeline.docUpload'),
        time: t('caseDetail.timeline.docUploadTime'),
        description: t('caseDetail.timeline.docUploadDesc'),
      },
      {
        title: t('caseDetail.timeline.caseCreated'),
        time: t('caseDetail.timeline.caseCreatedTime'),
        description: t('caseDetail.timeline.caseCreatedDesc'),
      },
    ],
    [t],
  );

  const deadlineSafetyItems = useMemo(
    () => [
      { key: 'itemOne', severity: 'high' as const },
      { key: 'itemTwo', severity: 'medium' as const },
      { key: 'itemThree', severity: 'ok' as const },
    ],
    [],
  );

  const resolvePlaybookLabel = (playbookId: string | null) => {
    if (!playbookId) return t('caseDetail.commandCenter.auditPlaybookUnknown');
    if (playbookId === 'timeline-extraction') return t('caseDetail.commandCenter.playbookTimelineExtraction');
    if (playbookId === 'strategy-matrix') return t('caseDetail.commandCenter.playbookStrategyMatrix');
    if (playbookId === 'research-memo') return t('caseDetail.commandCenter.playbookResearchMemo');
    if (playbookId === 'risk-scan') return t('caseDetail.commandCenter.playbookRiskScan');
    if (playbookId === 'client-brief') return t('caseDetail.commandCenter.playbookClientBrief');
    return playbookId
      .split('-')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  };

  const resolveEventLabel = (eventType: DbTaskEvent['event_type']) => {
    if (eventType === 'completed') return t('caseDetail.commandCenter.auditFilterCompleted');
    if (eventType === 'reopened') return t('caseDetail.commandCenter.auditFilterReopened');
    if (eventType === 'synced') return t('caseDetail.commandCenter.auditFilterSynced');
    return t('caseDetail.commandCenter.auditFilterCreated');
  };

  const resolveEventSourceLabel = (eventSource: string) => {
    if (eventSource === 'dashboard') return t('caseDetail.commandCenter.auditSourceDashboard');
    if (eventSource === 'case-detail-command-center') return t('caseDetail.commandCenter.auditSourceCaseDetail');
    if (eventSource === 'dashboard-policy') return t('caseDetail.commandCenter.auditSourcePolicy');
    if (eventSource === 'case_detail_seed') return t('caseDetail.commandCenter.auditSourceSeeding');
    if (eventSource === 'automation') return t('caseDetail.commandCenter.auditSourceAutomation');
    if (eventSource === 'system') return t('caseDetail.commandCenter.auditSourceSystem');
    return eventSource
      .split('-')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  };

  useEffect(() => {
    if (!caseData || !user || user.isGuest) {
      setCommandTasks([]);
      return;
    }

    const loadCommandTasks = async () => {
      setIsCommandCenterLoading(true);
      try {
        const initialTasks = await getUserCaseTasks(user.id);

        let caseScopedTasks = initialTasks.filter((task) => task.case_id === caseData.id);
        const shouldSeedTasks = caseScopedTasks.length === 0 && caseData.status !== 'closed';
        if (shouldSeedTasks) {
          setIsSeedingTasks(true);
          const now = Date.now();
          const description = caseData.description.toLowerCase();
          const profilePlaybooks = [...CORE_CASE_PLAYBOOKS];

          if (caseData.status === 'active') {
            profilePlaybooks.push('risk-scan');
          }
          if (caseData.messages.length >= 3 || caseData.status === 'pending') {
            profilePlaybooks.push('client-brief');
          }
          if (
            caseData.documents.length >= 2
            || description.includes('deadline')
            || description.includes('procedure')
            || description.includes('echeance')
          ) {
            profilePlaybooks.push('timeline-extraction');
          }

          const uniquePlaybooks = Array.from(new Set(profilePlaybooks));
          const seededTasks = uniquePlaybooks.map((playbookId, index) => ({
            caseId: caseData.id,
            playbookId,
            source: 'case_detail_seed',
            priority: Math.max(40, 84 - index * 7),
            status: 'upcoming' as const,
            dueAt: new Date(now + (index + 1) * DAY_IN_MS).toISOString(),
            metadata: {
              seededFrom: 'case-detail-command-center',
              caseStatus: caseData.status,
              profile: 'adaptive',
            },
          }));
          await upsertCaseTasks(seededTasks, user.id);
          const refreshedTasks = await getUserCaseTasks(user.id);
          caseScopedTasks = refreshedTasks.filter((task) => task.case_id === caseData.id);
        }

        setCommandTasks(caseScopedTasks);
        setIsTaskSchemaSupported(true);
      } catch (error) {
        if (isCaseTaskSchemaMissingError(error)) {
          setIsTaskSchemaSupported(false);
          setCommandTasks([]);
          setCommandTaskEvents([]);
          setTaskEventsOffset(0);
          setTaskEventsHasMore(false);
          return;
        }
        console.error('Error loading command center data', error);
      } finally {
        setIsSeedingTasks(false);
        setIsCommandCenterLoading(false);
      }
    };

    void loadCommandTasks();
  }, [caseData, user]);

  useEffect(() => {
    if (!caseData || !user || user.isGuest) {
      setCommandTaskEvents([]);
      setTaskEventsOffset(0);
      setTaskEventsHasMore(false);
      return;
    }

    const loadAuditEvents = async () => {
      try {
        const page = await getUserTaskEventsPage({
          caseId: caseData.id,
          eventType: eventFilter === 'all' ? undefined : eventFilter,
          eventSource: sourceFilter === 'all' ? undefined : sourceFilter,
          windowDays: windowFilterToDays(windowFilter),
          limit: AUDIT_PAGE_SIZE,
          offset: 0,
        }, user.id);
        setCommandTaskEvents(page.events);
        setTaskEventsOffset(page.nextOffset);
        setTaskEventsHasMore(page.hasMore);
      } catch (error) {
        if (isCaseTaskSchemaMissingError(error)) {
          setIsTaskSchemaSupported(false);
          setCommandTaskEvents([]);
          setTaskEventsOffset(0);
          setTaskEventsHasMore(false);
          return;
        }
        console.error('Error loading command center audit events', error);
      }
    };

    void loadAuditEvents();
  }, [caseData, eventFilter, sourceFilter, windowFilter, user]);

  const executionReadinessScore = useMemo(() => {
    if (!caseData) return 0;
    const evidenceCoverage = Math.min(40, caseData.documents.length * 12);
    const activityDensity = Math.min(35, caseData.messages.length * 7);
    const hoursSinceUpdate = (Date.now() - new Date(caseData.updatedAt).getTime()) / (1000 * 60 * 60);
    const freshness = hoursSinceUpdate <= 24 ? 25 : hoursSinceUpdate <= 72 ? 18 : 10;
    return Math.min(100, evidenceCoverage + activityDensity + freshness);
  }, [caseData]);

  const readinessBreakdown = useMemo(
    () => [
      {
        label: t('caseDetail.commandCenter.readinessDataHealth'),
        value: `${Math.min(100, caseData ? caseData.documents.length * 20 : 0)}%`,
      },
      {
        label: t('caseDetail.commandCenter.readinessActivity'),
        value: `${Math.min(100, caseData ? caseData.messages.length * 14 : 0)}%`,
      },
      {
        label: t('caseDetail.commandCenter.readinessDeadline'),
        value:
          executionReadinessScore >= 75
            ? t('caseDetail.commandCenter.readinessHigh')
            : executionReadinessScore >= 50
              ? t('caseDetail.commandCenter.readinessMedium')
              : t('caseDetail.commandCenter.readinessLow'),
      },
    ],
    [caseData, executionReadinessScore, t],
  );

  const commandActions = useMemo<CommandActionItem[]>(() => {
    const dueFormatter = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const playbookLabelMap: Record<string, string> = {
      'timeline-extraction': t('caseDetail.commandCenter.playbookTimelineExtraction'),
      'strategy-matrix': t('caseDetail.commandCenter.playbookStrategyMatrix'),
      'research-memo': t('caseDetail.commandCenter.playbookResearchMemo'),
      'risk-scan': t('caseDetail.commandCenter.playbookRiskScan'),
      'client-brief': t('caseDetail.commandCenter.playbookClientBrief'),
    };

    if (commandTasks.length === 0) {
      return [
        {
          id: 'fallback-1',
          taskId: null,
          title: t('caseDetail.commandCenter.nextActionItemOne'),
          detail: t('caseDetail.commandCenter.fallbackDetail'),
          state: 'upcoming',
          dueLabel: null,
          priority: 50,
        },
        {
          id: 'fallback-2',
          taskId: null,
          title: t('caseDetail.commandCenter.nextActionItemTwo'),
          detail: t('caseDetail.commandCenter.fallbackDetail'),
          state: 'scheduled',
          dueLabel: null,
          priority: 45,
        },
        {
          id: 'fallback-3',
          taskId: null,
          title: t('caseDetail.commandCenter.nextActionItemThree'),
          detail: t('caseDetail.commandCenter.fallbackDetail'),
          state: 'scheduled',
          dueLabel: null,
          priority: 40,
        },
      ];
    }

    return commandTasks
      .filter((task) => task.status !== 'completed')
      .sort((left, right) => {
        if (left.priority !== right.priority) return right.priority - left.priority;
        return new Date(left.due_at).getTime() - new Date(right.due_at).getTime();
      })
      .slice(0, 3)
      .map((task) => {
        const dueAtMs = new Date(task.due_at).getTime();
        const now = Date.now();
        let state: CommandActionItem['state'] = 'scheduled';
        if (dueAtMs < now) state = 'overdue';
        else if (dueAtMs - now <= 2 * 24 * 60 * 60 * 1000) state = 'upcoming';

        return {
          id: task.id,
          taskId: task.id,
          title: playbookLabelMap[task.playbook_id] ?? task.playbook_id,
          detail: t('caseDetail.commandCenter.dynamicDetail', { priority: String(task.priority) }),
          state,
          dueLabel: dueFormatter.format(new Date(task.due_at)),
          priority: task.priority,
        };
      });
  }, [commandTasks, t]);

  const coordinationInsights = useMemo(() => {
    if (commandTaskEvents.length === 0) {
      return [
        t('caseDetail.commandCenter.syncItemOne'),
        t('caseDetail.commandCenter.syncItemTwo'),
        t('caseDetail.commandCenter.syncItemThree'),
      ];
    }

    return commandTaskEvents.slice(0, 3).map((event) => {
      if (event.event_type === 'completed') return t('caseDetail.commandCenter.auditCompleted');
      if (event.event_type === 'reopened') return t('caseDetail.commandCenter.auditReopened');
      if (event.event_type === 'synced') return t('caseDetail.commandCenter.auditSynced');
      return t('caseDetail.commandCenter.auditCreated');
    });
  }, [commandTaskEvents, t]);

  const filteredAuditEvents = useMemo(() => commandTaskEvents, [commandTaskEvents]);

  const handleLoadMoreAuditEvents = async () => {
    if (!caseData || !user || user.isGuest || !taskEventsHasMore || isLoadingMoreTaskEvents) return;
    setIsLoadingMoreTaskEvents(true);
    try {
      const page = await getUserTaskEventsPage({
        caseId: caseData.id,
        eventType: eventFilter === 'all' ? undefined : eventFilter,
        eventSource: sourceFilter === 'all' ? undefined : sourceFilter,
        windowDays: windowFilterToDays(windowFilter),
        limit: AUDIT_PAGE_SIZE,
        offset: taskEventsOffset,
      }, user.id);
      setCommandTaskEvents((previous) => {
        const merged = [...previous, ...page.events];
        return Array.from(new Map(merged.map((event) => [event.id, event])).values());
      });
      setTaskEventsOffset(page.nextOffset);
      setTaskEventsHasMore(page.hasMore);
    } catch (error) {
      console.error('Error loading more task events', error);
    } finally {
      setIsLoadingMoreTaskEvents(false);
    }
  };

  const handleExportAuditTimelineCsv = () => {
    if (!caseData || filteredAuditEvents.length === 0) {
      toast({
        title: t('caseDetail.commandCenter.auditExportEmptyTitle'),
        description: t('caseDetail.commandCenter.auditExportEmptyDescription'),
      });
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const headers = ['case_id', 'event_type', 'event_label', 'event_source', 'event_source_label', 'playbook_id', 'playbook_label', 'created_at'];
    const rows = filteredAuditEvents.map((event) => [
      caseData.caseId,
      event.event_type,
      resolveEventLabel(event.event_type),
      event.event_source,
      resolveEventSourceLabel(event.event_source),
      event.playbook_id ?? '',
      resolvePlaybookLabel(event.playbook_id),
      event.created_at,
    ]);
    downloadCsv(`kingsley-case-audit-${caseData.caseId}-${timestamp}.csv`, headers, rows);
    toast({
      title: t('caseDetail.commandCenter.auditExportSuccessTitle'),
      description: t('caseDetail.commandCenter.auditExportSuccessDescription'),
    });
  };

  const handleExportAllAuditTimelineCsv = async () => {
    if (!caseData || !user || user.isGuest) return;
    setIsExportingAllAuditEvents(true);
    try {
      const merged = new Map<string, DbTaskEvent>();
      let offset = 0;
      let hasMore = true;
      let guard = 0;

      while (hasMore && guard < 100) {
        const page = await getUserTaskEventsPage({
          caseId: caseData.id,
          eventType: eventFilter === 'all' ? undefined : eventFilter,
          eventSource: sourceFilter === 'all' ? undefined : sourceFilter,
          windowDays: windowFilterToDays(windowFilter),
          limit: AUDIT_PAGE_SIZE,
          offset,
        }, user.id);
        page.events.forEach((event) => {
          merged.set(event.id, event);
        });
        hasMore = page.hasMore;
        offset = page.nextOffset;
        guard += 1;
      }

      const allEvents = Array.from(merged.values());
      if (allEvents.length === 0) {
        toast({
          title: t('caseDetail.commandCenter.auditExportEmptyTitle'),
          description: t('caseDetail.commandCenter.auditExportEmptyDescription'),
        });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const headers = ['case_id', 'event_type', 'event_label', 'event_source', 'event_source_label', 'playbook_id', 'playbook_label', 'created_at'];
      const rows = allEvents.map((event) => [
        caseData.caseId,
        event.event_type,
        resolveEventLabel(event.event_type),
        event.event_source,
        resolveEventSourceLabel(event.event_source),
        event.playbook_id ?? '',
        resolvePlaybookLabel(event.playbook_id),
        event.created_at,
      ]);

      downloadCsv(`kingsley-case-audit-full-${caseData.caseId}-${timestamp}.csv`, headers, rows);
      const exportScope: Record<string, unknown> = {
        event_filter: eventFilter,
        window_filter: windowFilter,
        source_filter: sourceFilter,
      };
      const csvDigestSource = [
        headers.join('|'),
        ...rows.map((row) => row.join('|')),
      ].join('\n');
      const manifestDigestSource = JSON.stringify({
        case_id: caseData.caseId,
        event_count: allEvents.length,
        exported_at: new Date().toISOString(),
        filters: exportScope,
      });
      const [csvSha256, manifestSha256] = await Promise.all([
        toSha256Hex(csvDigestSource),
        toSha256Hex(manifestDigestSource),
      ]);
      const artifactReceipt = await registerAuditExportArtifact({
        caseRef: caseData.caseId,
        eventCount: allEvents.length,
        csvSha256,
        manifestSha256,
        exportScope,
      });
      await persistReadinessExportHistory({
        eventCount: allEvents.length,
        csvSha256,
        manifestSha256,
        artifactReceipt,
        exportScope,
      });
      toast({
        title: t('caseDetail.commandCenter.auditExportFullSuccessTitle'),
        description: artifactReceipt?.id
          ? t('caseDetail.commandCenter.auditExportFullReceiptDescription', { count: String(allEvents.length), id: artifactReceipt.id })
          : t('caseDetail.commandCenter.auditExportFullSuccessDescription', { count: String(allEvents.length) }),
      });
    } catch (error) {
      console.error('Error exporting full audit timeline', error);
      toast({
        title: t('common.error'),
        description: t('caseDetail.commandCenter.auditExportFullErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsExportingAllAuditEvents(false);
    }
  };

  const handleCompleteCommandAction = async (action: CommandActionItem) => {
    if (!action.taskId || !caseData || !user || user.isGuest) {
      navigate(`/chat?case=${caseData?.id || ''}`);
      return;
    }

    setBusyTaskId(action.taskId);
    try {
      const completedTask = await completeCaseTask(action.taskId);
      setCommandTasks((previous) => previous.map((task) => (
        task.id === completedTask.id ? completedTask : task
      )));

      const [createdEvent] = await createTaskEvents([
        {
          taskId: completedTask.id,
          caseId: completedTask.case_id,
          playbookId: completedTask.playbook_id,
          eventType: 'completed',
          eventSource: 'case-detail-command-center',
          payload: {
            action: 'completed_from_case_detail',
            priority: completedTask.priority,
          },
        },
      ], user.id);
      if (createdEvent) {
        setCommandTaskEvents((previous) => [createdEvent, ...previous].slice(0, 6));
      }

      toast({
        title: t('caseDetail.commandCenter.actionCompletedTitle'),
        description: t('caseDetail.commandCenter.actionCompletedDescription'),
      });
    } catch (error) {
      if (isCaseTaskSchemaMissingError(error)) {
        setIsTaskSchemaSupported(false);
      }
      console.error('Error completing command center action', error);
      toast({
        title: t('common.error'),
        description: t('caseDetail.commandCenter.actionCompletedError'),
        variant: 'destructive',
      });
    } finally {
      setBusyTaskId(null);
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return (
          <div className="w-10 h-10 bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'docx':
        return (
          <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        );
      case 'xlsx':
        return (
          <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
        );
    }
  };

  const renderTag = (tag: string) => {
    const baseClasses = `${theme === 'dark' ? 'dark-tag' : 'light-tag'} px-2 py-1 text-xs rounded`;
    const tagClasses = `${baseClasses} ${tag}`;

    const tagLabels = {
      original: t('caseDetail.tags.original'),
      draft: t('caseDetail.tags.draft'),
      'ai-generated': t('caseDetail.tags.aiGenerated'),
      analyzed: t('caseDetail.tags.aiAnalyzed'),
      annexe: t('caseDetail.tags.annexe'),
    };

    return <span className={tagClasses}>{tagLabels[tag as keyof typeof tagLabels] || tag}</span>;
  };

  if (isLoading) {
    return (
      <div className={`${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'} min-h-screen flex items-center justify-center`}>
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className={`${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'} min-h-screen p-3 sm:p-6`}>
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-6 sm:p-12 text-center`}>
          <h2 className={`font-clash text-2xl font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-2`}>
            {t('caseDetail.notFound')}
          </h2>
          <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-gray-600'} mb-6`}>{t('caseDetail.notFoundDesc')}</p>
          <button
            onClick={() => navigate('/cases')}
            className={`font-clash ${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-6 py-3 rounded-xl font-medium flex items-center space-x-2 mx-auto`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{t('caseDetail.backToCases')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme === 'dark' ? 'dark-bg' : 'sophisticated-bg'} min-h-screen p-3 sm:p-6`}>
      <div className={`${theme === 'dark' ? 'dark-header' : 'light-header'} px-4 sm:px-6 py-4 rounded-2xl mb-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 sm:items-center sm:space-x-4">
            <button
              onClick={() => navigate('/cases')}
              className={`mt-0.5 sm:mt-0 ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className={`text-xl sm:text-2xl font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{caseData.title}</h1>
              <p className={`text-sm sm:text-base ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {t('caseDetail.caseNumber')}
                {caseData.caseId} • {t('caseDetail.createdOn')} {new Date(caseData.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className={`${theme === 'dark' ? 'dark-status-badge' : 'light-status-badge'} px-3 py-1 text-sm rounded-full font-medium`}>
              {statusLabel}
            </span>
            <button className={`${theme === 'dark' ? 'dark-secondary-button' : 'light-secondary-button'} px-4 py-2 rounded-lg ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
              <MoreHorizontal className="w-4 h-4 mr-2 inline" />
              {t('caseDetail.actions')}
            </button>
            <button
              onClick={() => navigate(`/chat?case=${caseData.id}`)}
              className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-4 py-2 rounded-lg font-medium`}
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {t('caseDetail.consultAI')}
            </button>
          </div>
        </div>
      </div>

      <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6 mb-8`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-4`}>{t('caseDetail.overview')}</h2>
            <p className={`${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'} mb-4`}>{caseData.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div>
                <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} mb-1`}>{t('caseDetail.client')}</h3>
                <p className={`${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} font-medium`}>Restaurant "Le Petit Bruxellois" SPRL</p>
              </div>
              <div>
                <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} mb-1`}>{t('caseDetail.owner')}</h3>
                <p className={`${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} font-medium`}>Immobiliere du Centre SA</p>
              </div>
              <div>
                <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} mb-1`}>{t('caseDetail.area')}</h3>
                <p className={`${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} font-medium`}>150 m2</p>
              </div>
              <div>
                <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} mb-1`}>{t('caseDetail.monthlyRent')}</h3>
                <p className={`${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} font-medium`}>2 500,00 EUR</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-4`}>{t('caseDetail.statistics')}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('caseDetail.progress')}</span>
                <span className={`font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>65%</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2">
                <div className={`${theme === 'dark' ? 'dark-progress-bar' : 'light-progress-bar'} h-2 rounded-full`} style={{ width: '65%' }} />
              </div>

              <div className="flex items-center justify-between">
                <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('caseDetail.tabs.documents')}</span>
                <span className={`font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{caseData.documents.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('caseDetail.aiMessages')}</span>
                <span className={`font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>12</span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('caseDetail.timeSpent')}</span>
                <span className={`font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>8h 30m</span>
              </div>
            </div>

            <div className={`mt-6 rounded-xl border p-4 ${theme === 'dark' ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-300 bg-amber-50/80'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-amber-200' : 'text-amber-900'}`}>{t('caseDetail.deadlineSafety.title')}</p>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-amber-100/80' : 'text-amber-800/80'}`}>{t('caseDetail.deadlineSafety.description')}</p>
                </div>
                <ShieldCheck className={`w-5 h-5 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`} />
              </div>

              <div className="mt-4 space-y-2">
                {deadlineSafetyItems.map((item) => (
                  <div
                    key={item.key}
                    className={`flex items-start gap-2 rounded-lg p-2 ${theme === 'dark' ? 'bg-slate-900/60' : 'bg-white/70'}`}
                  >
                    {item.severity === 'high' && <AlertTriangle className="h-4 w-4 mt-0.5 text-red-400" />}
                    {item.severity === 'medium' && <BellRing className="h-4 w-4 mt-0.5 text-amber-400" />}
                    {item.severity === 'ok' && <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-400" />}
                    <span className={`text-xs ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                      {t(`caseDetail.deadlineSafety.${item.key}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6 mb-8`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t('caseDetail.commandCenter.title')}</h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} mt-1`}>{t('caseDetail.commandCenter.description')}</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${theme === 'dark' ? 'bg-cyan-500/20 text-cyan-200' : 'bg-cyan-100 text-cyan-800'}`}>
            {executionReadinessScore}% {t('caseDetail.commandCenter.readinessTitle')}
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-white/90'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t('caseDetail.commandCenter.readinessTitle')}</h3>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{t('caseDetail.commandCenter.readinessSubtitle')}</p>
              </div>
              <ShieldCheck className={`h-5 w-5 ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`} />
            </div>
            <div className="mt-4 space-y-2">
              {readinessBreakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{item.label}</span>
                  <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-blue-500/30 bg-blue-950/20' : 'border-blue-200 bg-blue-50/80'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t('caseDetail.commandCenter.nextActionTitle')}</h3>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('caseDetail.commandCenter.nextActionSubtitle')}</p>
              </div>
              <Sparkles className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`} />
            </div>
            <div className="mt-4 space-y-2">
              {(isCommandCenterLoading || isSeedingTasks) && (
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {isSeedingTasks ? t('caseDetail.commandCenter.seeding') : t('caseDetail.commandCenter.loading')}
                </p>
              )}
              {!isCommandCenterLoading && !isSeedingTasks && commandActions.map((action) => (
                <div key={action.id} className={`rounded-lg p-2 ${theme === 'dark' ? 'bg-slate-900/60' : 'bg-white/80'}`}>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{action.title}</p>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{action.detail}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          action.state === 'overdue'
                            ? theme === 'dark' ? 'bg-red-500/20 text-red-200' : 'bg-red-100 text-red-800'
                            : action.state === 'upcoming'
                              ? theme === 'dark' ? 'bg-amber-500/20 text-amber-200' : 'bg-amber-100 text-amber-800'
                              : theme === 'dark' ? 'bg-slate-500/20 text-slate-200' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {action.state === 'overdue'
                            ? t('caseDetail.commandCenter.stateOverdue')
                            : action.state === 'upcoming'
                              ? t('caseDetail.commandCenter.stateUpcoming')
                              : t('caseDetail.commandCenter.stateScheduled')}
                        </span>
                        {action.dueLabel && (
                          <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {t('caseDetail.commandCenter.dueLabel')} {action.dueLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => void handleCompleteCommandAction(action)}
                      disabled={busyTaskId === action.taskId}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
                        theme === 'dark' ? 'bg-blue-500/30 text-blue-100 hover:bg-blue-500/40' : 'bg-blue-600 text-white hover:bg-blue-700'
                      } disabled:opacity-60`}
                    >
                      {busyTaskId === action.taskId
                        ? t('caseDetail.commandCenter.completingAction')
                        : t('caseDetail.commandCenter.completeAction')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate(`/chat?case=${caseData.id}`)}
              className={`mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${theme === 'dark' ? 'bg-blue-500/30 text-blue-100 hover:bg-blue-500/40' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {t('caseDetail.commandCenter.launchAction')}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'border-amber-500/30 bg-amber-950/20' : 'border-amber-200 bg-amber-50/80'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t('caseDetail.commandCenter.syncTitle')}</h3>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('caseDetail.commandCenter.syncSubtitle')}</p>
              </div>
              <BellRing className={`h-5 w-5 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`} />
            </div>
            <div className="mt-4 space-y-2">
              {coordinationInsights.map((step) => (
                <div key={step} className={`rounded-md px-2 py-1 text-xs ${theme === 'dark' ? 'bg-slate-900/70 text-slate-200' : 'bg-white/80 text-slate-700'}`}>
                  {step}
                </div>
              ))}
            </div>
            {!isTaskSchemaSupported && (
              <p className={`mt-3 text-[11px] ${theme === 'dark' ? 'text-amber-200' : 'text-amber-800'}`}>
                {t('caseDetail.commandCenter.schemaFallback')}
              </p>
            )}
          </div>
        </div>

        <div className={`mt-4 rounded-xl border p-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-950/40' : 'border-slate-200 bg-white/70'}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                {t('caseDetail.commandCenter.auditTimelineTitle')}
              </h3>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('caseDetail.commandCenter.auditTimelineSubtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="command-audit-event-filter">
                {t('caseDetail.commandCenter.auditFilterEvent')}
              </label>
              <select
                id="command-audit-event-filter"
                value={eventFilter}
                onChange={(event) => setEventFilter(event.currentTarget.value as CommandEventFilter)}
                className={`rounded-md border px-2 py-1 text-xs ${theme === 'dark' ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`}
              >
                <option value="all">{t('caseDetail.commandCenter.auditFilterAll')}</option>
                <option value="completed">{t('caseDetail.commandCenter.auditFilterCompleted')}</option>
                <option value="reopened">{t('caseDetail.commandCenter.auditFilterReopened')}</option>
                <option value="synced">{t('caseDetail.commandCenter.auditFilterSynced')}</option>
                <option value="created">{t('caseDetail.commandCenter.auditFilterCreated')}</option>
              </select>
              <label className="sr-only" htmlFor="command-audit-window-filter">
                {t('caseDetail.commandCenter.auditFilterWindow')}
              </label>
              <select
                id="command-audit-window-filter"
                value={windowFilter}
                onChange={(event) => setWindowFilter(event.currentTarget.value as CommandWindowFilter)}
                className={`rounded-md border px-2 py-1 text-xs ${theme === 'dark' ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`}
              >
                <option value="7d">{t('caseDetail.commandCenter.auditWindow7d')}</option>
                <option value="30d">{t('caseDetail.commandCenter.auditWindow30d')}</option>
                <option value="all">{t('caseDetail.commandCenter.auditWindowAll')}</option>
              </select>
              <label className="sr-only" htmlFor="command-audit-source-filter">
                {t('caseDetail.commandCenter.auditFilterSource')}
              </label>
              <select
                id="command-audit-source-filter"
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.currentTarget.value as CommandSourceFilter)}
                className={`rounded-md border px-2 py-1 text-xs ${theme === 'dark' ? 'border-slate-600 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`}
              >
                <option value="all">{t('caseDetail.commandCenter.auditSourceAll')}</option>
                <option value="dashboard">{t('caseDetail.commandCenter.auditSourceDashboard')}</option>
                <option value="case-detail-command-center">{t('caseDetail.commandCenter.auditSourceCaseDetail')}</option>
                <option value="dashboard-policy">{t('caseDetail.commandCenter.auditSourcePolicy')}</option>
                <option value="case_detail_seed">{t('caseDetail.commandCenter.auditSourceSeeding')}</option>
                <option value="automation">{t('caseDetail.commandCenter.auditSourceAutomation')}</option>
                <option value="system">{t('caseDetail.commandCenter.auditSourceSystem')}</option>
              </select>
              <button
                onClick={handleExportAuditTimelineCsv}
                disabled={filteredAuditEvents.length === 0}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                  theme === 'dark' ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                } disabled:opacity-60`}
              >
                <Download className="h-3.5 w-3.5" />
                {t('caseDetail.commandCenter.auditExportAction')}
              </button>
              <button
                onClick={() => void handleExportAllAuditTimelineCsv()}
                disabled={isExportingAllAuditEvents}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                  theme === 'dark' ? 'bg-blue-500/30 text-blue-100 hover:bg-blue-500/40' : 'bg-blue-600 text-white hover:bg-blue-700'
                } disabled:opacity-60`}
              >
                <Download className="h-3.5 w-3.5" />
                {isExportingAllAuditEvents
                  ? t('caseDetail.commandCenter.auditExportFullLoading')
                  : t('caseDetail.commandCenter.auditExportFullAction')}
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {filteredAuditEvents.length === 0 && (
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('caseDetail.commandCenter.auditTimelineEmpty')}
              </p>
            )}
            {filteredAuditEvents.map((event) => {
              const eventLabel = resolveEventLabel(event.event_type);
              return (
                <div key={event.id} className={`rounded-md px-3 py-2 ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-slate-100/80'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{eventLabel}</span>
                    <span className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {`${t('caseDetail.commandCenter.auditPlaybookLabel')} ${resolvePlaybookLabel(event.playbook_id)}`}
                  </p>
                  <p className={`text-[11px] mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {`${t('caseDetail.commandCenter.auditSourceLabel')} ${resolveEventSourceLabel(event.event_source)}`}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className={`text-[11px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {taskEventsHasMore
                ? t('caseDetail.commandCenter.auditEventsShownPartial', { count: String(filteredAuditEvents.length) })
                : t('caseDetail.commandCenter.auditEventsShown', { count: String(filteredAuditEvents.length) })}
            </p>
            {taskEventsHasMore && (
              <button
                onClick={() => void handleLoadMoreAuditEvents()}
                disabled={isLoadingMoreTaskEvents}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                  theme === 'dark' ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                } disabled:opacity-60`}
              >
                {isLoadingMoreTaskEvents
                  ? t('caseDetail.commandCenter.auditLoadMoreLoading')
                  : t('caseDetail.commandCenter.auditLoadMore')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="border-b border-slate-600/30">
          <nav className="-mb-px flex gap-2 overflow-x-auto pb-2">
            <button
              className={`${theme === 'dark' ? 'dark-tab-button' : 'light-tab-button'} whitespace-nowrap ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              <FileText className="w-4 h-4 mr-2 inline" />
              {t('caseDetail.tabs.documents')}
            </button>
            <button
              className={`${theme === 'dark' ? 'dark-tab-button' : 'light-tab-button'} whitespace-nowrap ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <Clock className="w-4 h-4 mr-2 inline" />
              {t('caseDetail.tabs.history')}
            </button>
            <button
              className={`${theme === 'dark' ? 'dark-tab-button' : 'light-tab-button'} whitespace-nowrap ${activeTab === 'consultations' ? 'active' : ''}`}
              onClick={() => setActiveTab('consultations')}
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {t('caseDetail.tabs.consultations')}
            </button>
            <button
              className={`${theme === 'dark' ? 'dark-tab-button' : 'light-tab-button'} whitespace-nowrap ${activeTab === 'contacts' ? 'active' : ''}`}
              onClick={() => setActiveTab('contacts')}
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              {t('caseDetail.tabs.contacts')}
            </button>
          </nav>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6`}>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{t('caseDetail.caseDocuments')}</h3>
            <button className="px-3 py-1 bg-blue-900/50 text-blue-300 text-sm rounded-lg hover:bg-blue-800/50 transition-colors border border-blue-700/30">
              <Plus className="w-4 h-4 mr-1 inline" />
              {t('caseDetail.add')}
            </button>
          </div>

          <div className="space-y-3">
            {caseData.documents.map((doc) => (
              <div key={doc.id} className={`${theme === 'dark' ? 'dark-document-card' : 'light-document-card'} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  {getDocumentIcon(doc.type)}
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} truncate`}>{doc.name}</h4>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mt-1`}>
                      {t('caseDetail.uploadedOn')} {new Date(doc.uploadedAt).toLocaleDateString()} • {(doc.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {doc.tags.map((tag) => (
                        <span key={tag}>{renderTag(tag)}</span>
                      ))}
                    </div>
                  </div>
                  <button className={`${theme === 'dark' ? 'text-slate-400 hover:text-slate-300' : 'text-slate-600 hover:text-slate-800'}`}>
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} rounded-2xl p-4 sm:p-6`}>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'} mb-6`}>{t('caseDetail.recentHistory')}</h3>

          <div className="space-y-6">
            {timelineEvents.map((event, index) => (
              <div key={index} className={`${theme === 'dark' ? 'dark-timeline-item' : 'light-timeline-item'}`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{event.title}</h4>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mt-1`}>{event.time}</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'} mt-2`}>{event.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <button className={`text-sm ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'} underline`}>
              {t('caseDetail.viewFullHistory')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
