import { Pressable, ScrollView, Text, View } from 'react-native';

import { Colors, threadTheme } from '@/constants/theme';
import type { Coach } from '@/constants/pandavas';
import { ChevRightIcon } from '@/components/icons';
import { FIXTURE_THREADS, getFixtureBundle } from '@/lib/threads.fixture';
import { TODAY_THREADS } from '@/lib/mockData';

// Coach accents are palette hex today but defensively accept rgb()/rgba() too,
// so a future palette migration to rgba() can't silently break the border.
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && color.length === 7) {
    const hex = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0');
    return color + hex;
  }
  const rgb = color.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((s) => s.trim());
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

function SectionLabel({ children, color }: { children: string; color?: string }) {
  return (
    <Text
      style={{
        fontSize: 11,
        color: color ?? Colors.textFaint,
        fontWeight: '700',
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

export function CoachDetail({
  coach,
  embedded = false,
  topInset = 52,
  bottomInset = 0,
  onClose,
  onOpenThread,
}: {
  coach: Coach;
  // `embedded` = rendered inside the iPad/web detail pane (no back button, no
  // top safe-area padding handled by us). Phone mode is full-screen overlay.
  embedded?: boolean;
  topInset?: number;
  bottomInset?: number;
  onClose?: () => void;
  onOpenThread?: (threadId: string) => void;
}) {
  const coachThreads = FIXTURE_THREADS.filter((t) => t.coach_id === coach.id);
  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header band — coach's accent color tints the top so each brother
          has a clear identity even though the rest of the chrome is shared. */}
      <View
        style={{
          paddingTop: topInset,
          paddingHorizontal: 20,
          paddingBottom: 20,
          backgroundColor: coach.accentDim,
          borderBottomColor: Colors.border,
          borderBottomWidth: 1,
        }}
      >
        {!embedded && onClose && (
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={12}
            style={{ alignSelf: 'flex-start', marginBottom: 8 }}
          >
            <Text style={{ color: coach.accent, fontSize: 15, fontWeight: '600' }}>← Back</Text>
          </Pressable>
        )}

        <Text
          style={{
            fontSize: 34,
            fontWeight: '800',
            color: coach.accent,
            letterSpacing: -0.6,
          }}
        >
          {coach.name}
        </Text>
        <Text
          style={{
            fontSize: 13.5,
            color: Colors.textDim,
            marginTop: 4,
            fontStyle: 'italic',
          }}
        >
          {coach.domain}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 22,
          paddingBottom: 40 + bottomInset,
        }}
      >
        {/* ── Code Name ───────────────────────────────────────────── */}
        <SectionLabel color={coach.accent}>Code Name</SectionLabel>
        <View
          style={{
            borderRadius: 14,
            backgroundColor: Colors.bgCard,
            padding: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: 22,
            gap: 14,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 10.5,
                color: Colors.textFaint,
                fontWeight: '700',
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Spirit
            </Text>
            <Text style={{ fontSize: 18, color: Colors.text, fontWeight: '600' }}>
              {coach.spirit}
              {coach.spiritUncertain ? ' *' : ''}
            </Text>
            {coach.spiritGloss && (
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textDim,
                  marginTop: 2,
                  fontStyle: 'italic',
                }}
              >
                {coach.spiritGloss}
              </Text>
            )}
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: Colors.border,
            }}
          />

          <View>
            <Text
              style={{
                fontSize: 10.5,
                color: Colors.textFaint,
                fontWeight: '700',
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Visual Personification
            </Text>
            <Text style={{ fontSize: 18, color: Colors.text, fontWeight: '600' }}>
              {coach.visual}
              {coach.visualUncertain ? ' *' : ''}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: Colors.textFaint,
                marginTop: 4,
                fontStyle: 'italic',
              }}
            >
              image WIP — finding a visual
            </Text>
          </View>
        </View>

        {/* ── Sadhanas ────────────────────────────────────────────── */}
        <SectionLabel color={Colors.green}>Sadhanas</SectionLabel>
        <View style={{ gap: 10, marginBottom: 22 }}>
          {coach.sadhanas.map((s) => (
            <View
              key={s.name}
              style={{
                borderRadius: 14,
                backgroundColor: Colors.bgCard,
                borderLeftWidth: 3,
                borderLeftColor: coach.accent,
                borderTopWidth: 1,
                borderRightWidth: 1,
                borderBottomWidth: 1,
                borderTopColor: Colors.border,
                borderRightColor: Colors.border,
                borderBottomColor: Colors.border,
                paddingVertical: 13,
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ fontSize: 15.5, fontWeight: '700', color: Colors.text }}>
                {s.name}
                {s.uncertain ? ' *' : ''}
              </Text>
              {s.note && (
                <Text
                  style={{
                    fontSize: 11.5,
                    color: coach.accent,
                    marginTop: 2,
                    fontStyle: 'italic',
                  }}
                >
                  {s.note}
                </Text>
              )}
              <Text
                style={{
                  fontSize: 13.5,
                  color: Colors.textDim,
                  marginTop: 6,
                  lineHeight: 20,
                }}
              >
                {s.description}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Celebrates ──────────────────────────────────────────── */}
        {coach.celebrates.length > 0 && (
          <>
            <SectionLabel color={Colors.green}>Celebrates</SectionLabel>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 22,
              }}
            >
              {coach.celebrates.map((c) => (
                <View
                  key={c.name}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: coach.accentDim,
                    borderWidth: 1,
                    borderColor: withAlpha(coach.accent, 0.33),
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: coach.accent,
                      fontWeight: '600',
                      fontFamily: c.formula ? 'Courier' : undefined,
                    }}
                  >
                    {c.name}
                    {c.uncertain ? ' *' : ''}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Skill + Tool ────────────────────────────────────────── */}
        {(coach.skill || coach.tool) && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
            {coach.skill && (
              <View
                style={{
                  flex: 1,
                  borderRadius: 14,
                  backgroundColor: Colors.bgCard,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  padding: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    color: Colors.textFaint,
                    fontWeight: '700',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Skill
                </Text>
                <Text style={{ fontSize: 15, color: Colors.text, fontWeight: '600' }}>
                  {coach.skill}
                  {coach.skillUncertain ? ' *' : ''}
                </Text>
              </View>
            )}
            {coach.tool && (
              <View
                style={{
                  flex: 1,
                  borderRadius: 14,
                  backgroundColor: Colors.bgCard,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  padding: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 10.5,
                    color: Colors.textFaint,
                    fontWeight: '700',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  Tool
                </Text>
                <Text style={{ fontSize: 15, color: Colors.text, fontWeight: '600' }}>
                  {coach.tool}
                </Text>
              </View>
            )}
          </View>
        )}

        {(coach.spiritUncertain ||
          coach.visualUncertain ||
          coach.skillUncertain ||
          coach.celebrates.some((c) => c.uncertain) ||
          coach.sadhanas.some((s) => s.uncertain)) && (
          <Text
            style={{
              fontSize: 11,
              color: Colors.textFaint,
              marginTop: 14,
              fontStyle: 'italic',
            }}
          >
            * transcribed from the glass-board photos — readings to confirm.
          </Text>
        )}

        {/* ── Threads ─────────────────────────────────────────────── */}
        {coachThreads.length > 0 && (
          <>
            <SectionLabel color={coach.accent}>Threads</SectionLabel>
            <View style={{ gap: 10, marginBottom: 22 }}>
              {coachThreads.map((t) => {
                const bundle = getFixtureBundle(t.tag);
                const activeEntry = bundle?.entries.find((e) => e.status === 'active') ?? null;
                const activeItems = activeEntry
                  ? bundle!.items.filter((i) => i.entry_id === activeEntry.id)
                  : [];
                const doneCount = activeItems.filter((i) => i.done).length;
                const tTheme = threadTheme(t.tag);
                const todayThread = TODAY_THREADS.find((tt) => tt.tag === t.tag);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => todayThread && onOpenThread && onOpenThread(todayThread.id)}
                    style={{
                      borderRadius: 14,
                      backgroundColor: Colors.bgCard,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, color: Colors.text, fontWeight: '600' }}>
                        {t.tag}
                      </Text>
                      {activeEntry && (
                        <Text style={{ fontSize: 12.5, color: Colors.textDim, marginTop: 3 }}>
                          {activeItems.length > 0
                            ? `${doneCount} of ${activeItems.length} done`
                            : activeEntry.label ?? 'Active'}
                        </Text>
                      )}
                    </View>
                    <View
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        borderRadius: 999,
                        backgroundColor: tTheme.dim,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: tTheme.color, fontWeight: '700' }}>
                        {activeEntry?.label ?? t.title}
                      </Text>
                    </View>
                    <ChevRightIcon size={16} />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
