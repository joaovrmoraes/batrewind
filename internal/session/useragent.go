package session

import "strings"

// parseUserAgent derives a coarse browser, browser version, OS and device type
// from a user-agent string. It uses only substring scanning (no regular
// expressions) so it cannot be driven into catastrophic backtracking by a
// hostile UA — the input is already length-capped by ClientMeta.Sanitized.
//
// The goal is human-readable grouping for the dashboard, not exhaustive device
// detection. Unknown agents return empty strings rather than guessing.
func parseUserAgent(ua string) (browser, version, os, deviceType string) {
	if ua == "" {
		return "", "", "", ""
	}

	browser, version = detectBrowser(ua)
	os = detectOS(ua)
	deviceType = detectDeviceType(ua)
	return browser, version, os, deviceType
}

// detectBrowser checks vendors in an order that respects how UA strings nest
// product tokens (Edge/Opera/Samsung impersonate Chrome; Chrome impersonates
// Safari), so the most specific match wins.
func detectBrowser(ua string) (name, version string) {
	switch {
	case strings.Contains(ua, "Edg/") || strings.Contains(ua, "Edge/") || strings.Contains(ua, "EdgiOS/"):
		return "Edge", tokenVersion(ua, "Edg/", "Edge/", "EdgiOS/")
	case strings.Contains(ua, "OPR/") || strings.Contains(ua, "Opera/"):
		return "Opera", tokenVersion(ua, "OPR/", "Opera/")
	case strings.Contains(ua, "SamsungBrowser/"):
		return "Samsung Internet", tokenVersion(ua, "SamsungBrowser/")
	case strings.Contains(ua, "Firefox/") || strings.Contains(ua, "FxiOS/"):
		return "Firefox", tokenVersion(ua, "Firefox/", "FxiOS/")
	case strings.Contains(ua, "CriOS/"):
		return "Chrome", tokenVersion(ua, "CriOS/")
	case strings.Contains(ua, "Chrome/") || strings.Contains(ua, "Chromium/"):
		return "Chrome", tokenVersion(ua, "Chrome/", "Chromium/")
	case strings.Contains(ua, "Safari/") && strings.Contains(ua, "Version/"):
		return "Safari", tokenVersion(ua, "Version/")
	default:
		return "", ""
	}
}

func detectOS(ua string) string {
	switch {
	case strings.Contains(ua, "Windows NT"):
		return "Windows"
	case strings.Contains(ua, "iPhone") || strings.Contains(ua, "iPad") || strings.Contains(ua, "iPod"):
		return "iOS"
	case strings.Contains(ua, "Mac OS X") || strings.Contains(ua, "Macintosh"):
		return "macOS"
	case strings.Contains(ua, "Android"):
		return "Android"
	case strings.Contains(ua, "CrOS"):
		return "ChromeOS"
	case strings.Contains(ua, "Linux"):
		return "Linux"
	default:
		return ""
	}
}

func detectDeviceType(ua string) string {
	switch {
	case strings.Contains(ua, "iPad") || strings.Contains(ua, "Tablet"):
		return "tablet"
	case strings.Contains(ua, "Mobi") || strings.Contains(ua, "iPhone") || strings.Contains(ua, "Android"):
		// Android tablets omit "Mobi"; an Android UA without it is a tablet.
		if strings.Contains(ua, "Android") && !strings.Contains(ua, "Mobi") {
			return "tablet"
		}
		return "mobile"
	default:
		return "desktop"
	}
}

// tokenVersion returns the version that follows the first matching marker,
// reading up to the next space, ';' or ')'. Trailing ".0" groups are kept as-is.
func tokenVersion(ua string, markers ...string) string {
	for _, m := range markers {
		i := strings.Index(ua, m)
		if i < 0 {
			continue
		}
		rest := ua[i+len(m):]
		end := strings.IndexAny(rest, " ;)")
		if end < 0 {
			end = len(rest)
		}
		return rest[:end]
	}
	return ""
}
