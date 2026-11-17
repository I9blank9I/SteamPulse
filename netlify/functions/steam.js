export async function handler(event) {
  const apiKey = process.env.STEAM_API_KEY;
  let steamId = event.queryStringParameters?.steamId;

  if (!apiKey || !steamId) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Missing STEAM_API_KEY or steamId" })
    };
  }

  try {
    // 1. Resolve Vanity URL if the input is not a 17-digit numeric SteamID64
    if (!/^\d{17}$/.test(steamId)) {
      const vanityRes = await fetch(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${apiKey}&vanityurl=${steamId}`);
      const vanityData = await vanityRes.json();
      
      if (vanityData.response?.success === 1) {
        steamId = vanityData.response.steamid;
      } else {
        return {
          statusCode: 404,
          headers: { "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "Could not find a Steam profile for that username." })
        };
      }
    }

    // 2. Fetch profile, games, and accurate live level concurrently
    const [profileRes, gamesRes, levelRes] = await Promise.all([
      fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`),
      fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`),
      fetch(`https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${apiKey}&steamid=${steamId}`)
    ]);

    const profileData = await profileRes.json();
    const gamesData = await gamesRes.json();
    const levelData = await levelRes.json();

    // 3. Return the combined dataset to your frontend
    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify({
        player: profileData.response?.players?.[0] || null,
        games: gamesData.response?.games || [],
        level: levelData.response?.player_level ?? null
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message })
    };
  }
}