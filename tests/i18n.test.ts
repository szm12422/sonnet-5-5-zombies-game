import { describe, expect, it } from 'vitest';
import { translateJa } from '../src/i18n/ja';

describe('Japanese presentation', () => {
  it('translates core mission UI', () => {
    expect(translateJa('RESTORE THE RELAY')).toBe('中継器を復旧');
    expect(translateJa('ELIMINATE THE WARDEN')).toBe('ウォーデンを排除');
    expect(translateJa('OBJECTIVES')).toBe('目標');
    expect(translateJa('DISTRICT SEALED IN')).toBe('区画封鎖まで');
  });

  it('translates dynamic objective and station strings', () => {
    expect(translateJa('Activate the transmitter at the depot (113 m)')).toBe('補給拠点の送信機を起動（113 m）');
    expect(translateJa('Refill magazine and reserve (13/78)')).toBe('マガジンと予備弾を補充（13/78）');
    expect(translateJa('FUNDS  $600')).toBe('所持金  $600');
  });

  it('translates combat feedback while preserving variables', () => {
    expect(translateJa('+$55  Shambler  HEADSHOT')).toBe('+$55  シャンブラー  ヘッドショット');
    expect(translateJa('+1 ARMOR PLATE')).toBe('アーマープレート +1');
  });

  it('leaves unknown strings untouched', () => {
    expect(translateJa('KR-16')).toBe('KR-16');
  });
});
