// Yandex Games SDK wrapper with dev-mode stubs
let ysdk = null;

function createDevStub() {
  console.log('[YaGames] Dev mode — using stub SDK');
  return {
    features: {
      LoadingAPI: { ready: () => console.log('[YaGames] LoadingAPI.ready()') },
      GameplayAPI: {
        start: () => console.log('[YaGames] GameplayAPI.start()'),
        stop: () => console.log('[YaGames] GameplayAPI.stop()'),
      },
    },
    adv: {
      showFullscreenAdv: ({ callbacks }) => {
        console.log('[YaGames] showFullscreenAdv (stub)');
        callbacks?.onOpen?.();
        setTimeout(() => {
          callbacks?.onClose?.(true);
        }, 300);
      },
      showRewardedVideo: ({ callbacks }) => {
        console.log('[YaGames] showRewardedVideo (stub)');
        callbacks?.onOpen?.();
        setTimeout(() => {
          callbacks?.onRewarded?.();
          callbacks?.onClose?.();
        }, 300);
      },
    },
    getPlayer: async () => ({
      getData: async () => ({}),
      setData: async (data) => {
        console.log('[YaGames] setData', data);
      },
    }),
    getLeaderboards: async () => ({
      setLeaderboardScore: async (name, score) => {
        console.log(`[YaGames] setLeaderboardScore(${name}, ${score})`);
      },
      getLeaderboardEntries: async () => ({
        entries: [],
      }),
    }),
  };
}

export async function initYandexSDK() {
  if (ysdk) return ysdk;

  if (typeof window !== 'undefined' && window.YaGames) {
    try {
      ysdk = await window.YaGames.init();
      console.log('[YaGames] SDK initialized');
    } catch (e) {
      console.error('[YaGames] SDK init error:', e);
      ysdk = createDevStub();
    }
  } else {
    ysdk = createDevStub();
  }

  return ysdk;
}

export function gameReady() {
  ysdk?.features?.LoadingAPI?.ready();
}

export function gameplayStart() {
  ysdk?.features?.GameplayAPI?.start();
}

export function gameplayStop() {
  ysdk?.features?.GameplayAPI?.stop();
}

export function showInterstitial() {
  return new Promise((resolve) => {
    if (!ysdk) { resolve(); return; }
    ysdk.adv.showFullscreenAdv({
      callbacks: {
        onOpen: () => gameplayStop(),
        onClose: () => {
          gameplayStart();
          resolve();
        },
        onError: (e) => {
          console.warn('[YaGames] Interstitial error:', e);
          resolve();
        },
      },
    });
  });
}

export function showRewarded() {
  return new Promise((resolve) => {
    if (!ysdk) { resolve(false); return; }
    let rewarded = false;
    ysdk.adv.showRewardedVideo({
      callbacks: {
        onOpen: () => gameplayStop(),
        onRewarded: () => { rewarded = true; },
        onClose: () => {
          gameplayStart();
          resolve(rewarded);
        },
        onError: (e) => {
          console.warn('[YaGames] Rewarded error:', e);
          resolve(false);
        },
      },
    });
  });
}

export async function loadPlayerData() {
  try {
    const player = await ysdk?.getPlayer();
    const data = await player?.getData();
    return data || {};
  } catch (e) {
    console.warn('[YaGames] loadPlayerData error:', e);
    return {};
  }
}

export async function savePlayerData(data) {
  try {
    const player = await ysdk?.getPlayer();
    await player?.setData(data);
  } catch (e) {
    console.warn('[YaGames] savePlayerData error:', e);
  }
}

export async function submitScore(leaderboardName, score) {
  try {
    const lb = await ysdk?.getLeaderboards();
    await lb?.setLeaderboardScore(leaderboardName, score);
  } catch (e) {
    console.warn('[YaGames] submitScore error:', e);
  }
}

export async function getLeaderboardEntries(name, opts) {
  try {
    const lb = await ysdk?.getLeaderboards();
    return await lb?.getLeaderboardEntries(name, opts);
  } catch (e) {
    console.warn('[YaGames] getLeaderboardEntries error:', e);
    return { entries: [] };
  }
}
