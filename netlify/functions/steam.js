exports.handler = async function(event) {
  const steamId = event.queryStringParameters.steamid;
  const apiKey = process.env.STEAM_API_KEY;

  if (!steamId || !apiKey) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing steamid or STEAM_API_KEY" }) };
  }

  try {
    // 1. Fetch Player Summary (Avatar, Name, Creation Date)
    const profileUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
    // 2. Fetch Owned Games + Playtime Forever
    const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`;

    const [profileRes, gamesRes] = await Promise.all([fetch(profileUrl), fetch(gamesUrl)]);
    const profileData = await profileRes.json();
    const gamesData = await gamesRes.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        player: profileData.response?.players?.[0] || null,
        games: gamesData.response?.games || []
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};