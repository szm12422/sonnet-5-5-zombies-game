import { DiscordSDK } from '@discord/embedded-app-sdk';

export type DiscordActivityPlatform = 'desktop' | 'mobile';

export interface DiscordActivityContext {
  embedded: boolean;
  platform: DiscordActivityPlatform | null;
  frameId: string | null;
  instanceId: string | null;
  guildId: string | null;
  channelId: string | null;
}

export function parseDiscordActivityContext(search: string): DiscordActivityContext {
  const params = new URLSearchParams(search);
  const frameId = params.get('frame_id');
  const instanceId = params.get('instance_id');
  const rawPlatform = params.get('platform');
  const platform: DiscordActivityPlatform | null =
    rawPlatform === 'desktop' || rawPlatform === 'mobile' ? rawPlatform : null;

  return {
    embedded: Boolean(frameId && instanceId),
    platform,
    frameId,
    instanceId,
    guildId: params.get('guild_id'),
    channelId: params.get('channel_id'),
  };
}

function markDocument(context: DiscordActivityContext): void {
  if (!context.embedded) return;
  document.documentElement.dataset.discordActivity = 'true';
  if (context.platform) document.documentElement.dataset.discordPlatform = context.platform;
}

async function waitForDiscordReady(clientId: string, timeoutMs = 12_000): Promise<void> {
  const sdk = new DiscordSDK(clientId);
  let timeoutId = 0;
  try {
    await Promise.race([
      sdk.ready(),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error('Discord Activity handshake timed out. Close the Activity and launch it again.')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

export async function prepareDiscordActivity(
  search = window.location.search,
  clientId = import.meta.env.VITE_DISCORD_CLIENT_ID?.trim() ?? '',
): Promise<DiscordActivityContext> {
  const context = parseDiscordActivityContext(search);
  markDocument(context);

  if (!context.embedded) return context;
  if (!clientId) {
    throw new Error(
      'Discord Activity is missing VITE_DISCORD_CLIENT_ID. Configure the Discord application ID in the deployment environment and rebuild.',
    );
  }

  await waitForDiscordReady(clientId);
  return context;
}
