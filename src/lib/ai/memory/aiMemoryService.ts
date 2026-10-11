import type { AIMemoryItem } from '../types';

// In-memory persistent cache for user memories
const MEMORY_STORE = new Map<string, AIMemoryItem[]>();

export async function getUserAIMemories(userId: string): Promise<AIMemoryItem[]> {
  const existing = MEMORY_STORE.get(userId);
  if (existing && existing.length > 0) {
    return existing;
  }

  // Default seeded memories for new users
  const defaults: AIMemoryItem[] = [
    {
      id: `mem_1_${userId}`,
      userId,
      category: 'TRAVEL_PREFERENCE',
      key: 'preferred_transit_mode',
      value: 'Vande Bharat Express / Premium Rail',
      confidence: 1.0,
      source: 'EXPLICIT_USER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `mem_2_${userId}`,
      userId,
      category: 'OPTIMIZATION_GOAL',
      key: 'schedule_preference',
      value: 'Batch WFO days into contiguous blocks to eliminate mid-week travel',
      confidence: 0.95,
      source: 'VERIFIED_PATTERN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `mem_3_${userId}`,
      userId,
      category: 'ACCOMMODATION_PREFERENCE',
      key: 'lodging_tier',
      value: 'Corporate Hotel or Verified PG near Tech Park',
      confidence: 0.9,
      source: 'EXPLICIT_USER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  MEMORY_STORE.set(userId, defaults);
  return defaults;
}

export async function saveUserAIMemory(
  userId: string,
  memory: Omit<AIMemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
): Promise<AIMemoryItem> {
  const current = await getUserAIMemories(userId);
  const existingIndex = current.findIndex((m) => m.key === memory.key);

  const now = new Date().toISOString();
  let savedItem: AIMemoryItem;

  if (existingIndex >= 0) {
    savedItem = {
      ...current[existingIndex],
      ...memory,
      userId,
      updatedAt: now,
    };
    current[existingIndex] = savedItem;
  } else {
    savedItem = {
      ...memory,
      id: `mem_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      createdAt: now,
      updatedAt: now,
    };
    current.push(savedItem);
  }

  MEMORY_STORE.set(userId, [...current]);
  return savedItem;
}

export async function clearUserAIMemories(userId: string): Promise<void> {
  MEMORY_STORE.delete(userId);
}
