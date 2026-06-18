import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { Task } from '@/lib/threads';
import { useCreateTask, useDropTask, usePatchTask } from '@/lib/threads.hooks';

export function TaskEditor({
  threadId,
  tasks,
  onChange,
}: {
  threadId: string;
  tasks: Task[];
  /** Called with the optimistically-updated list whenever rows mutate. */
  onChange: (next: Task[]) => void;
}) {
  const createTask = useCreateTask();
  const patchTask = usePatchTask();
  const dropTask = useDropTask();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  // Show open + in_progress only; sort by (section, position) so that
  // weekly_ritual threads (which seed review/plan sections with overlapping
  // position values 0..n) render in section-grouped order. Within a section,
  // ascending position. Sections are ordered by first-seen in the input.
  const editable = useMemo(() => {
    const live = tasks.filter((t) => t.status === 'open' || t.status === 'in_progress');
    const sectionOrder: string[] = [];
    for (const t of live) {
      const key = t.section ?? '';
      if (!sectionOrder.includes(key)) sectionOrder.push(key);
    }
    return live.slice().sort((a, b) => {
      const aSec = a.section ?? '';
      const bSec = b.section ?? '';
      if (aSec !== bSec) return sectionOrder.indexOf(aSec) - sectionOrder.indexOf(bSec);
      return a.position - b.position;
    });
  }, [tasks]);

  const replaceOne = useCallback(
    (updated: Task) => {
      onChange(tasks.map((t) => (t.id === updated.id ? updated : t)));
    },
    [tasks, onChange],
  );

  const handleRename = useCallback(
    async (task: Task, nextTitle: string) => {
      const title = nextTitle.trim();
      if (!title || title === task.title) return;
      const optimistic = { ...task, title };
      onChange(tasks.map((t) => (t.id === task.id ? optimistic : t)));
      try {
        const updated = await patchTask(task.id, { title });
        replaceOne(updated);
      } catch (e) {
        console.error('renameTask failed', e);
        onChange(tasks); // revert
      }
    },
    [tasks, onChange, patchTask, replaceOne],
  );

  const handleReorder = useCallback(
    async (task: Task, dir: -1 | 1) => {
      const idx = editable.findIndex((t) => t.id === task.id);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= editable.length) return;
      const other = editable[swapIdx]!;
      // Refuse cross-section swaps — weekly_ritual has review/plan sections
      // with overlapping position values, so a naive swap would scramble the
      // visual grouping (see WeeklyRitualSummary which segments by section).
      if ((task.section ?? '') !== (other.section ?? '')) return;
      // Swap positions optimistically.
      const optimisticTasks = tasks.map((t) => {
        if (t.id === task.id) return { ...t, position: other.position };
        if (t.id === other.id) return { ...t, position: task.position };
        return t;
      });
      onChange(optimisticTasks);
      try {
        await Promise.all([
          patchTask(task.id, { position: other.position }),
          patchTask(other.id, { position: task.position }),
        ]);
      } catch (e) {
        console.error('reorderTask failed', e);
        onChange(tasks); // revert
      }
    },
    [editable, tasks, onChange, patchTask],
  );

  const handleDelete = useCallback(
    async (task: Task) => {
      // Optimistic: remove from list (drop sets status='dropped' server-side).
      onChange(tasks.map((t) => (t.id === task.id ? { ...t, status: 'dropped' } : t)));
      try {
        const updated = await dropTask(task.id);
        replaceOne(updated);
      } catch (e) {
        console.error('dropTask failed', e);
        onChange(tasks);
      }
    },
    [tasks, onChange, dropTask, replaceOne],
  );

  const handleAdd = useCallback(async () => {
    const title = draft.trim();
    if (!title || busy) return;
    setBusy(true);
    const maxPos = editable.reduce((m, t) => Math.max(m, t.position), -1);
    try {
      const created = await createTask(threadId, {
        title,
        position: maxPos + 1,
      });
      onChange([...tasks, created]);
      setDraft('');
    } catch (e) {
      console.error('createTask failed', e);
    } finally {
      setBusy(false);
    }
  }, [draft, busy, editable, tasks, onChange, createTask, threadId]);

  return (
    <View style={{ gap: 6, paddingHorizontal: 16, paddingVertical: 12 }}>
      <Text
        style={{
          fontSize: 11,
          color: Colors.textFaint,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        Edit tasks
      </Text>
      {editable.map((task, idx) => {
        const prev = editable[idx - 1];
        const next = editable[idx + 1];
        const sec = task.section ?? '';
        const isFirstInSection = !prev || (prev.section ?? '') !== sec;
        const isLastInSection = !next || (next.section ?? '') !== sec;
        return (
          <TaskRow
            key={task.id}
            task={task}
            isFirst={isFirstInSection}
            isLast={isLastInSection}
            onRename={(nextTitle) => handleRename(task, nextTitle)}
            onMoveUp={() => handleReorder(task, -1)}
            onMoveDown={() => handleReorder(task, 1)}
            onDelete={() => handleDelete(task)}
          />
        );
      })}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: Colors.bgCard,
          borderColor: Colors.border,
          borderWidth: 1,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: Colors.textFaint, fontSize: 16, fontWeight: '700' }}>+</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          placeholder="Add task"
          placeholderTextColor={Colors.textFaint}
          style={{ flex: 1, color: Colors.text, fontSize: 14 }}
        />
        {draft.trim().length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add task"
            onPress={handleAdd}
            disabled={busy}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: Colors.accent,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Add</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function TaskRow({
  task,
  isFirst,
  isLast,
  onRename,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  task: Task;
  isFirst: boolean;
  isLast: boolean;
  onRename: (next: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const [val, setVal] = useState(task.title);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 8,
        backgroundColor: Colors.bgCard,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: 10,
      }}
    >
      <TextInput
        value={val}
        onChangeText={setVal}
        onBlur={() => onRename(val)}
        onSubmitEditing={() => onRename(val)}
        returnKeyType="done"
        style={{ flex: 1, color: Colors.text, fontSize: 14, paddingVertical: 6 }}
      />
      <Pressable
        onPress={onMoveUp}
        disabled={isFirst}
        accessibilityRole="button"
        accessibilityLabel="Move up"
        style={{ paddingVertical: 6, paddingHorizontal: 8, opacity: isFirst ? 0.3 : 1 }}
      >
        <Text style={{ color: Colors.text, fontSize: 16 }}>↑</Text>
      </Pressable>
      <Pressable
        onPress={onMoveDown}
        disabled={isLast}
        accessibilityRole="button"
        accessibilityLabel="Move down"
        style={{ paddingVertical: 6, paddingHorizontal: 8, opacity: isLast ? 0.3 : 1 }}
      >
        <Text style={{ color: Colors.text, fontSize: 16 }}>↓</Text>
      </Pressable>
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel="Delete task"
        style={{ paddingVertical: 6, paddingHorizontal: 8 }}
      >
        <Text style={{ color: Colors.danger, fontSize: 16 }}>×</Text>
      </Pressable>
    </View>
  );
}
