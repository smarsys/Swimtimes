/**
 * SwimRankings Proxy - Cloudflare Worker
 * 
 * Ce worker fait proxy vers SwimRankings.net pour contourner les restrictions CORS.
 * 
 * Déploiement :
 * 1. Va sur https://dash.cloudflare.com/
 * 2. Crée un compte gratuit si pas déjà fait
 * 3. Workers & Pages → Create Application → Create Worker
 * 4. Colle ce code et clique "Save and Deploy"
 * 5. Note l'URL du worker (ex: swimrankings-proxy.ton-compte.workers.dev)
 * 6. Mets à jour PROXY_URL dans app.js avec cette URL
 */

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(request.url);
    const athleteId = url.searchParams.get("athleteId");

    // Validation
    if (!athleteId) {
      return new Response(
        JSON.stringify({ error: "Missing athleteId parameter" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Validate athleteId is numeric
    if (!/^\d+$/.test(athleteId)) {
      return new Response(
        JSON.stringify({ error: "Invalid athleteId format" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    try {
      // Fetch from SwimRankings
      const swimRankingsUrl = `https://www.swimrankings.net/index.php?page=athleteDetail&athleteId=${athleteId}`;
      
      const response = await fetch(swimRankingsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: `SwimRankings returned ${response.status}` }),
          {
            status: response.status,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      const html = await response.text();
      
      // Parse the HTML and extract swimmer data
      const swimmerData = parseSwimRankingsHTML(html, athleteId);

      return new Response(JSON.stringify(swimmerData), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600", // Cache 1 hour
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};

/**
 * Parse SwimRankings HTML and extract swimmer data
 */
function parseSwimRankingsHTML(html, athleteId) {
  // Extract name from title
  let fullName = "Nageur";
  const titleMatch = html.match(/<title>SwimRankings\.net - ([^<]+)<\/title>/i);
  if (titleMatch) {
    fullName = titleMatch[1].trim();
  }

  // Extract basic info
  let club = "", nation = "", yearOfBirth = null, gender = "";

  // Club
  const clubMatch = html.match(/Club[^<]*<\/td>\s*<td[^>]*>([^<]+)/i);
  if (clubMatch) club = clubMatch[1].trim();

  // Nation
  const nationMatch = html.match(/Nation[^<]*<\/td>\s*<td[^>]*>([^<]+)/i);
  if (nationMatch) nation = nationMatch[1].trim();

  // Year of birth
  const birthMatch = html.match(/Born[^<]*<\/td>\s*<td[^>]*>(\d{4})/i) || 
                     html.match(/Jahrgang[^<]*<\/td>\s*<td[^>]*>(\d{4})/i);
  if (birthMatch) yearOfBirth = parseInt(birthMatch[1]);

  // Gender detection
  const htmlLower = html.toLowerCase();
  if (htmlLower.includes("women") || htmlLower.includes("female") || htmlLower.includes("damen")) {
    gender = "Female";
  } else {
    gender = "Male";
  }

  // Extract personal bests
  const personalBests = [];
  
  // Pattern for times in format MM:SS.CC or SS.CC
  const timePattern = /(\d{1,2}:\d{2}\.\d{2}|\d{2}\.\d{2})/g;
  
  // Detect pool length sections
  let currentPoolLength = 50;
  
  // Split by Long Course / Short Course sections
  const lcSection = html.match(/Long Course[^]*?(?=Short Course|$)/i);
  const scSection = html.match(/Short Course[^]*$/i);

  // Process Long Course (50m)
  if (lcSection) {
    extractTimesFromSection(lcSection[0], 50, personalBests);
  }

  // Process Short Course (25m)
  if (scSection) {
    extractTimesFromSection(scSection[0], 25, personalBests);
  }

  // If no sections found, try to extract from whole page
  if (personalBests.length === 0) {
    extractTimesFromSection(html, 50, personalBests);
  }

  const nameParts = fullName.split(" ");

  return {
    id: athleteId,
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" ") || "",
    fullName,
    gender,
    club,
    nation,
    yearOfBirth,
    personalBests,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Extract times from a section of HTML
 */
function extractTimesFromSection(html, poolLength, personalBests) {
  const strokes = [
    { pattern: /freestyle|libre|freistil/i, name: "Freestyle" },
    { pattern: /backstroke|dos|rücken/i, name: "Backstroke" },
    { pattern: /breaststroke|brasse|brust/i, name: "Breaststroke" },
    { pattern: /butterfly|papillon|schmetterling/i, name: "Butterfly" },
    { pattern: /medley|4.?nages|lagen/i, name: "Medley" },
  ];

  const distances = [50, 100, 200, 400, 800, 1500];

  // Look for patterns like "100 m Freestyle" followed by a time
  for (const stroke of strokes) {
    for (const distance of distances) {
      // Pattern: distance + stroke + time
      const pattern = new RegExp(
        `${distance}\\s*m?\\s*(?:${stroke.pattern.source})[^\\d]*(\\d{1,2}:\\d{2}\\.\\d{2}|\\d{2}\\.\\d{2})`,
        "i"
      );
      const match = html.match(pattern);
      
      if (match) {
        const timeStr = match[1];
        const timeMs = parseTime(timeStr);
        
        if (timeMs > 0) {
          // Check if already exists
          const exists = personalBests.find(
            (pb) =>
              pb.stroke === stroke.name &&
              pb.distance === distance &&
              pb.poolLength === poolLength
          );
          
          if (!exists) {
            personalBests.push({
              stroke: stroke.name,
              distance,
              poolLength,
              timeMs,
              timeDisplay: timeStr,
            });
          }
        }
      }
    }
  }
}

/**
 * Parse time string to milliseconds
 */
function parseTime(timeStr) {
  if (!timeStr) return 0;
  
  const clean = timeStr.replace(",", ".").trim();
  
  if (clean.includes(":")) {
    const [min, secPart] = clean.split(":");
    const [sec, centi] = secPart.split(".");
    return (parseInt(min) * 60 + parseInt(sec)) * 1000 + (parseInt(centi) || 0) * 10;
  } else {
    const [sec, centi] = clean.split(".");
    return parseInt(sec) * 1000 + (parseInt(centi) || 0) * 10;
  }
}
