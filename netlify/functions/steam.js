// Save as: netlify/functions/steam.js
exports.handler = async function(event) {
  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };

  // Handle browser preflight requests
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  const apiKey = process.env.STEAM_API_KEY;
  let rawInput = (
    event.queryStringParameters?.steamId ||
    event.queryStringParameters?.steamid ||
    ""
  ).trim();

  if (!rawInput || !apiKey) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Missing steamId or STEAM_API_KEY" })
    };
  }

  // Strip full Steam profile URLs if pasted directly
  rawInput = rawInput
    .replace(/^https?:\/\/steamcommunity\.com\/(id|profiles)\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  try {
    let steamId = rawInput;

    // 1. Resolve custom Vanity Username if input is not a 17-digit SteamID64
    if (!/^\d{17}$/.test(steamId)) {
      const vanityUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${apiKey}&vanityurl=${encodeURIComponent(steamId)}`;
      const vanityRes = await fetch(vanityUrl);
      const vanityData = await vanityRes.json();

      if (vanityData.response?.success === 1) {
        steamId = vanityData.response.steamid;
      } else {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Could not find a Steam profile for that username." })
        };
      }
    }

    // 2. Fetch Player Summary, Owned Games, and Steam Level in parallel
    const [profileRes, gamesRes, levelRes] = await Promise.all([
      fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`),
      fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`),
      fetch(`https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${apiKey}&steamid=${steamId}`)
    ]);

    const profileData = await profileRes.json();
    const gamesData = await gamesRes.json();
    const levelData = await levelRes.json();

    // 3. Return the combined dataset to your frontend
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        player: profileData.response?.players?.[0] || null,
        games: gamesData.response?.games || [],
        level: levelData.response?.player_level ?? null
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message })
    };
  }
};