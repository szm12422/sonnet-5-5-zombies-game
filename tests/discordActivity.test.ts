import { describe, expect, it } from 'vitest';
import { parseDiscordActivityContext } from '../src/platform/discordActivity';

describe('parseDiscordActivityContext', () => {
  it('keeps normal browser play outside Discord', () => {
    expect(parseDiscordActivityContext('')).toEqual({
      embedded: false,
      platform: null,
      frameId: null,
      instanceId: null,
      guildId: null,
      channelId: null,
    });
  });

  it('detects a desktop Discord Activity launch', () => {
    expect(
      parseDiscordActivityContext(
        '?frame_id=frame-1&instance_id=instance-1&platform=desktop&guild_id=guild-1&channel_id=channel-1',
      ),
    ).toEqual({
      embedded: true,
      platform: 'desktop',
      frameId: 'frame-1',
      instanceId: 'instance-1',
      guildId: 'guild-1',
      channelId: 'channel-1',
    });
  });

  it('detects mobile so the desktop-only guard can stop boot cleanly', () => {
    const context = parseDiscordActivityContext('?frame_id=f&instance_id=i&platform=mobile');
    expect(context.embedded).toBe(true);
    expect(context.platform).toBe('mobile');
  });

  it('does not treat incomplete launch parameters as embedded', () => {
    expect(parseDiscordActivityContext('?frame_id=f&platform=desktop').embedded).toBe(false);
  });
});
