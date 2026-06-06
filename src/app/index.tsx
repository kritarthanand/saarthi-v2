import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatHistoryView } from '@/components/chat/ChatHistoryView';
import { CoachDetail } from '@/components/coaches/CoachDetail';
import { CoachesPane } from '@/components/coaches/CoachesPane';
import { ProfilePane } from '@/components/profile/ProfilePane';
import { MobileTabBar } from '@/components/shell/MobileTabBar';
import { PlaceholderView } from '@/components/shell/PlaceholderView';
import { Sidebar, type TabId } from '@/components/shell/Sidebar';
import { EmptyDetail } from '@/components/shell/EmptyDetail';
import { ThreadDetail } from '@/components/thread/ThreadDetail';
import { TodayView } from '@/components/today/TodayView';
import { FloatingMic } from '@/components/voice/FloatingMic';
import { VoiceSession, type VoiceSavePayload, type VoiceSessionHandle } from '@/components/voice/VoiceSession';
import { COACHES_BY_ID, type CoachId } from '@/constants/pandavas';
import { Colors, threadTheme } from '@/constants/theme';
import type { Thread } from '@/lib/mockData';
import { adaptLiveThread } from '@/lib/threadAdapter';
import { ThreadTemplate } from '@/lib/threads';
import {
  useActiveEntries,
  useSendMessage,
  useThreads,
  useToggleItem,
} from '@/lib/threads.hooks';

type DeviceMode = 'phone' | 'ipad' | 'web';

function detectMode(width: number): DeviceMode {
  if (width >= 1180) return 'web';
  if (width >= 820) return 'ipad';
  return 'phone';
}

export default function AppRoot() {
  const { width } = useWindowDimensions();
  const mode = detectMode(width);
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<TabId>('today');
  // Default to null; on iPad/web we auto-open the morning ritual once threads load.
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<CoachId | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  // Lets the iPad/web backdrop tap delegate to the session's own `finalize` — which
  // saves any captured user lines before closing instead of dropping them.
  const voiceSessionRef = useRef<VoiceSessionHandle>(null);

  // ── Live data from Supabase ────────────────────────────────────────────────
  // `today: true` makes the server drop any thread without a today-entry —
  // belt-and-braces against any stale client bundle showing yesterday's rituals.
  const { data: liveThreads, refetch: refetchThreads } = useThreads({ today: true });
  const { byId: entriesByActiveId, refetch: refetchEntries } = useActiveEntries(liveThreads);
  const refetchAll = useCallback(() => {
    refetchThreads();
    refetchEntries();
  }, [refetchThreads, refetchEntries]);
  const toggleItemAsync = useToggleItem();
  const sendMessageAsync = useSendMessage();

  // Adapt live { Thread, Entry, items, messages } → legacy `Thread` shape so
  // TodayView / ChatHistoryView / ThreadDetail can continue consuming it
  // unchanged for now (they'll migrate next).
  const threads = useMemo<Thread[]>(() => {
    if (!liveThreads) return [];
    return liveThreads.map((t) =>
      adaptLiveThread(t, t.activeEntryId ? entriesByActiveId[t.activeEntryId] : undefined),
    );
  }, [liveThreads, entriesByActiveId]);

  // Today view only shows threads whose active entry was created today (server
  // enforces this — it nulls out active_entry_id for stale entries). Filter by
  // matching thread id, not array index, so it stays correct if `threads` and
  // `liveThreads` ever diverge in order or length (coach filters, optimistic
  // updates, etc.).
  const todayThreadIds = useMemo(
    () => new Set((liveThreads ?? []).filter((t) => !!t.activeEntryId).map((t) => t.id)),
    [liveThreads],
  );
  const todayThreads = useMemo<Thread[]>(
    () => threads.filter((t) => todayThreadIds.has(t.id)),
    [threads, todayThreadIds],
  );

  // Quick lookup: thread.id → activeEntryId, for mutations.
  const activeEntryIdByThread = useMemo(() => {
    const map: Record<string, string> = {};
    (liveThreads ?? []).forEach((t) => {
      if (t.activeEntryId) map[t.id] = t.activeEntryId;
    });
    return map;
  }, [liveThreads]);

  // First-load: auto-open morning ritual on iPad/web so the detail pane isn't empty.
  // Only fires once per session — won't reopen after the user explicitly closes a thread.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (mode === 'phone') return;
    if (!liveThreads || liveThreads.length === 0) return;
    autoOpenedRef.current = true;
    const morning = liveThreads.find((t) => t.template === ThreadTemplate.MorningRitual);
    setOpenThreadId(morning?.id ?? liveThreads[0]!.id);
  }, [liveThreads, mode]);

  // ── Mutations: fire API, then refetch authoritative state ──────────────────
  // Caller passes the desired `done` value explicitly — reading it from the
  // global `threads` array is racy when the user taps faster than the refetch
  // round-trip.
  const toggleItem = useCallback(
    async (itemId: string, done: boolean) => {
      try {
        await toggleItemAsync(itemId, done);
        refetchAll();
      } catch (e) {
        console.error('toggleItem failed', e);
      }
    },
    [toggleItemAsync, refetchAll],
  );

  const handleSendMessage = useCallback(
    async (threadId: string, text: string, opts?: { throwOnError?: boolean }) => {
      const entryId = activeEntryIdByThread[threadId];
      // Silent no-op when the active entry hasn't loaded yet — keeps the old
      // race-friendly behaviour for fire-and-forget callers (Composer, etc.).
      if (!entryId) return;
      try {
        await sendMessageAsync(entryId, text);
      } catch (e) {
        console.error('sendMessage failed', e);
        // Only re-throw for callers who opted in (handleEndRitual needs this
        // to skip the ritual_ended_at patch on failure). All other callers
        // stay fire-and-forget and don't get an unhandled rejection.
        if (opts?.throwOnError) throw e;
        return;
      }
      refetchAll();
    },
    [activeEntryIdByThread, sendMessageAsync, refetchAll],
  );

  const handleItemMessage = useCallback(
    async (threadId: string, itemLabel: string, text: string) => {
      const entryId = activeEntryIdByThread[threadId];
      if (!entryId) return;
      // Legacy callback identifies the item by label; look up its id from the
      // adapter-built items list so we can pass `item_ref` through.
      const thread = threads.find((t) => t.id === threadId);
      const item = thread?.items.find((i) => i.label === itemLabel);
      try {
        await sendMessageAsync(entryId, text, item?.id);
        refetchAll();
      } catch (e) {
        console.error('itemMessage failed', e);
      }
    },
    [threads, activeEntryIdByThread, sendMessageAsync, refetchAll],
  );

  // Voice "note" flow: ad-hoc notes don't yet have a template. Stub until that
  // path is designed; for now, log a warning so we know the capture was dropped.
  const handleSave = useCallback((_payload: VoiceSavePayload) => {
    console.warn('Voice save dropped — note template not yet wired.');
  }, []);

  const openThread = openThreadId ? threads.find((t) => t.id === openThreadId) : undefined;
  const activeAccent = openThread ? threadTheme(openThread.tag).color : Colors.accent;
  const coachDetailOpen = tab === 'coaches' && !!selectedCoachId;

  // Same reset logic for both the phone tab bar and the iPad/web sidebar so
  // switching tabs never leaves a stale coach detail in the right pane.
  const handleTabChange = (next: TabId) => {
    setTab(next);
    setOpenThreadId(null);
    setSelectedCoachId(null);
  };

  // ── Phone layout ────────────────────────────────────────────────────────
  if (mode === 'phone') {
    const phoneTopInset = Math.max(insets.top, 12) + 36;
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {tab === 'today' && (
          <TodayView threads={todayThreads} onOpenThread={setOpenThreadId} topInset={phoneTopInset} />
        )}
        {tab === 'chat' && (
          <ChatHistoryView threads={threads} onOpenThread={setOpenThreadId} topInset={phoneTopInset} />
        )}
        {tab === 'week' && (
          <PlaceholderView title="Week" subtitle="Trends and stretches across your last 7 days" topInset={phoneTopInset} />
        )}
        {tab === 'coaches' && (
          <CoachesPane
            selectedCoachId={selectedCoachId}
            onSelectCoach={setSelectedCoachId}
            topInset={phoneTopInset}
          />
        )}
        {tab === 'profile' && <ProfilePane topInset={phoneTopInset} />}

        {/* Phone coach detail — full-screen overlay above CoachesPane,
            mirroring the way ThreadDetail overlays the lists. */}
        {coachDetailOpen && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bg }}>
            <CoachDetail
              coach={COACHES_BY_ID[selectedCoachId!]}
              onClose={() => setSelectedCoachId(null)}
              onOpenThread={setOpenThreadId}
              topInset={Math.max(insets.top, 12) + 34}
              bottomInset={Math.max(insets.bottom, 12)}
            />
          </View>
        )}

        {/* Pushed Thread Detail — rendered after CoachDetail so it appears on top
            when the user navigates to a thread from the coach pane. */}
        {openThread && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: Colors.bg }}>
            <ThreadDetail
              thread={openThread}
              onToggleItem={(itemId, done) => toggleItem(itemId, done)}
              onSendMessage={(text, opts) => handleSendMessage(openThread.id, text, opts)}
              onItemMessage={(itemLabel, text) => handleItemMessage(openThread.id, itemLabel, text)}
              onClose={() => setOpenThreadId(null)}
              onMic={() => setVoiceOpen(true)}
              topInset={Math.max(insets.top, 12) + 34}
              bottomInset={Math.max(insets.bottom, 12)}
            />
          </View>
        )}

        {/* Floating mic */}
        <FloatingMic
          accent={activeAccent}
          onPress={() => setVoiceOpen(true)}
          hidden={voiceOpen || !!openThreadId || coachDetailOpen}
          bottom={96 + Math.max(insets.bottom - 8, 0)}
        />

        {/* Bottom tabs */}
        {!openThreadId && !coachDetailOpen && (
          <MobileTabBar active={tab} onChange={handleTabChange} />
        )}

        {/* Voice modal — `onRequestClose` is required on Android. Without it the system
            back button dismisses the modal but skips finalize, dropping the transcript. */}
        <Modal
          visible={voiceOpen}
          animationType="fade"
          transparent
          onRequestClose={() => voiceSessionRef.current?.dismiss()}
        >
          <View style={{ flex: 1, backgroundColor: Colors.bg }}>
            <VoiceSession
              ref={voiceSessionRef}
              accent={activeAccent}
              maxSeconds={120}
              warnSeconds={30}
              existingThreads={threads}
              onSave={handleSave}
              onClose={() => setVoiceOpen(false)}
              topInset={Math.max(insets.top, 12) + 34}
            />
          </View>
        </Modal>
      </View>
    );
  }

  // ── Desktop / iPad master-detail ────────────────────────────────────────
  const listWidth = mode === 'web' ? 408 : 340;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: Colors.bg }}>
      <Sidebar variant={mode} active={tab} onChange={handleTabChange} />

      {/* List pane */}
      <View
        style={{
          width: listWidth,
          borderRightColor: Colors.border, borderRightWidth: 1,
          overflow: 'hidden', backgroundColor: Colors.bg,
        }}
      >
        {tab === 'today' && <TodayView threads={todayThreads} onOpenThread={setOpenThreadId} topInset={28} />}
        {tab === 'chat' && <ChatHistoryView threads={threads} onOpenThread={setOpenThreadId} topInset={28} />}
        {tab === 'week' && <PlaceholderView title="Week" subtitle="Trends across your last 7 days" topInset={28} />}
        {tab === 'coaches' && (
          <CoachesPane
            selectedCoachId={selectedCoachId}
            onSelectCoach={setSelectedCoachId}
            topInset={28}
          />
        )}
        {tab === 'profile' && <ProfilePane topInset={28} />}
      </View>

      {/* Detail pane — `key` cosmetically remounts; durable state lives in `threadsById`.
          On the Coaches tab, the detail pane shows the selected coach instead
          of a thread; thread state and coach selection are independent. */}
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {openThread ? (
          <ThreadDetail
            key={openThread.id}
            thread={openThread}
            onToggleItem={(itemId, done) => toggleItem(itemId, done)}
            onSendMessage={(text, opts) => handleSendMessage(openThread.id, text, opts)}
            onItemMessage={(itemLabel, text) => handleItemMessage(openThread.id, itemLabel, text)}
            embedded
            topInset={20}
            bottomInset={0}
            onClose={() => setOpenThreadId(null)}
            onMic={() => setVoiceOpen(true)}
          />
        ) : coachDetailOpen ? (
          <CoachDetail
            key={selectedCoachId!}
            coach={COACHES_BY_ID[selectedCoachId!]}
            embedded
            topInset={28}
            onOpenThread={setOpenThreadId}
          />
        ) : (
          <EmptyDetail />
        )}
      </View>

      {/* Floating mic — also hidden when a thread is open, so it doesn't overlap the
          Composer's own mic button in the detail pane (mirrors the phone branch). */}
      <FloatingMic
        accent={activeAccent}
        onPress={() => setVoiceOpen(true)}
        hidden={voiceOpen || !!openThreadId}
        bottom={28}
        right={28}
      />

      {/* Voice modal */}
      {voiceOpen && (
        <Pressable
          accessibilityLabel="Dismiss voice capture"
          onPress={() => voiceSessionRef.current?.dismiss()}
          style={{
            position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: 440, height: 720,
              borderRadius: 28, overflow: 'hidden',
              borderColor: Colors.borderStrong, borderWidth: 1,
              backgroundColor: Colors.bg,
            }}
          >
            <VoiceSession
              ref={voiceSessionRef}
              accent={activeAccent}
              maxSeconds={120}
              warnSeconds={30}
              existingThreads={threads}
              onSave={handleSave}
              onClose={() => setVoiceOpen(false)}
              topInset={28}
            />
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}
