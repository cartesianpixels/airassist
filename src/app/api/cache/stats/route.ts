import { NextResponse } from 'next/server';
import { CacheStats } from '@/lib/cache-manager';

export async function GET() {
  try {
    const stats = CacheStats.getStats();

    // Calculate estimated savings
    const totalCacheHits = Object.values(stats).reduce((total: number, cache: any) => {
      return total + (typeof cache === 'object' && cache.size ? cache.size : 0);
    }, 0);

    const savings = CacheStats.calculateSavings(
      totalCacheHits,
      10, // Assume 10 misses for calculation
      0.002 // Average cost per AI call
    );

    return NextResponse.json({
      success: true,
      cacheStats: stats,
      savings: {
        estimatedSavedCost: savings.savedCost,
        savingsPercent: savings.savingsPercent,
        totalCacheHits: savings.cacheHits,
        totalCalls: savings.totalCalls
      },
      recommendations: getCacheRecommendations(stats)
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get cache statistics' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    CacheStats.clearAll();
    return NextResponse.json({
      success: true,
      message: 'All caches cleared successfully'
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear caches' },
      { status: 500 }
    );
  }
}

function getCacheRecommendations(stats: any): string[] {
  const recommendations: string[] = [];

  if (stats.embedding.size > 1000) {
    recommendations.push('💰 Embedding cache is working well - high reuse of queries!');
  }

  if (stats.response.size > 50) {
    recommendations.push('🎯 Response cache is saving significant AI costs!');
  }

  if (stats.queryHistory > 20) {
    recommendations.push('🧠 Query similarity detection is finding patterns!');
  }

  if (stats.query.size < 10) {
    recommendations.push('📈 Query cache could be improved - consider longer TTL');
  }

  if (recommendations.length === 0) {
    recommendations.push('🚀 Caches are warming up - expect better performance soon!');
  }

  return recommendations;
}