import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

type Message = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  sender_type: string;
  created_at: string;
};

export default function MessagesScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setMessages(data);
        // Mark unread messages as read
        const unreadIds = data.filter((m) => !m.read).map((m) => m.id);
        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ read: true })
            .in('id', unreadIds);
        }
      }
    } catch (err) {
      console.warn('Messages fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MESSAGES</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FFD700" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="mail-outline" size={48} color="#2A2A2A" />
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySub}>We'll send you updates and news here</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.list}>
            {messages.map((msg) => {
              const isExpanded = expandedId === msg.id;
              return (
                <TouchableOpacity
                  key={msg.id}
                  style={[styles.messageCard, !msg.read && styles.messageCardUnread]}
                  onPress={() => toggleExpand(msg.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.messageTop}>
                    <View style={styles.messageMeta}>
                      {!msg.read && <View style={styles.unreadDot} />}
                      <View style={styles.senderBadge}>
                        <Text style={styles.senderText}>
                          {msg.sender_type === 'admin' ? 'DOUBLEYELLOW' : 'USER'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.messageDate}>{formatDate(msg.created_at)}</Text>
                  </View>

                  <Text style={styles.messageTitle}>{msg.title}</Text>

                  {isExpanded && (
                    <Text style={styles.messageBody}>{msg.body}</Text>
                  )}

                  <View style={styles.messageFooter}>
                    <Text style={styles.expandHint}>
                      {isExpanded ? 'Tap to collapse ↑' : 'Tap to read ↓'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backText: { fontSize: 12, fontWeight: '700', color: '#666666', letterSpacing: 2 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4 },
  scroll: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    letterSpacing: 2,
  },
  emptySub: {
    fontSize: 12,
    color: '#2A2A2A',
    letterSpacing: 1,
  },

  messageCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  messageCardUnread: {
    borderColor: '#FFD700',
    backgroundColor: '#111100',
  },

  messageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
  },
  senderBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  senderText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0D0D0D',
    letterSpacing: 1.5,
  },
  messageDate: {
    fontSize: 10,
    color: '#444444',
    letterSpacing: 1,
  },

  messageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  messageBody: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 20,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  messageFooter: {
    marginTop: 4,
  },
  expandHint: {
    fontSize: 10,
    color: '#444444',
    letterSpacing: 1,
  },
});
