package session

import (
	"strings"
	"testing"
)

func TestParseUserAgent(t *testing.T) {
	cases := []struct {
		name       string
		ua         string
		browser    string
		os         string
		deviceType string
	}{
		{
			name:       "chrome on windows",
			ua:         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			browser:    "Chrome",
			os:         "Windows",
			deviceType: "desktop",
		},
		{
			name:       "edge wins over chrome",
			ua:         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
			browser:    "Edge",
			os:         "Windows",
			deviceType: "desktop",
		},
		{
			name:       "safari on iphone is mobile",
			ua:         "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			browser:    "Safari",
			os:         "iOS",
			deviceType: "mobile",
		},
		{
			name:       "firefox on linux",
			ua:         "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
			browser:    "Firefox",
			os:         "Linux",
			deviceType: "desktop",
		},
		{
			name:       "ipad is tablet",
			ua:         "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			browser:    "Safari",
			os:         "iOS",
			deviceType: "tablet",
		},
		{
			name:       "android phone has Mobi",
			ua:         "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
			browser:    "Chrome",
			os:         "Android",
			deviceType: "mobile",
		},
		{
			name:       "empty ua",
			ua:         "",
			browser:    "",
			os:         "",
			deviceType: "",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			browser, _, os, deviceType := parseUserAgent(tc.ua)
			if browser != tc.browser {
				t.Errorf("browser = %q, want %q", browser, tc.browser)
			}
			if os != tc.os {
				t.Errorf("os = %q, want %q", os, tc.os)
			}
			if deviceType != tc.deviceType {
				t.Errorf("deviceType = %q, want %q", deviceType, tc.deviceType)
			}
		})
	}
}

func TestParseUserAgentVersion(t *testing.T) {
	_, version, _, _ := parseUserAgent("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.6099.71 Safari/537.36")
	if version != "120.0.6099.71" {
		t.Errorf("version = %q, want 120.0.6099.71", version)
	}
}

func TestClientMetaSanitized(t *testing.T) {
	raw := ClientMeta{
		ScreenWidth:      999999,
		ScreenHeight:     -10,
		DevicePixelRatio: 1000,
		Language:         strings.Repeat("a", 100),
		UserAgent:        strings.Repeat("x", 5000),
	}
	clean := raw.Sanitized()

	if clean.ScreenWidth != maxDimension {
		t.Errorf("ScreenWidth = %d, want clamped to %d", clean.ScreenWidth, maxDimension)
	}
	if clean.ScreenHeight != 0 {
		t.Errorf("ScreenHeight = %d, want clamped to 0", clean.ScreenHeight)
	}
	if clean.DevicePixelRatio != maxDPR {
		t.Errorf("DevicePixelRatio = %v, want clamped to %v", clean.DevicePixelRatio, maxDPR)
	}
	if len(clean.Language) != maxLangLen {
		t.Errorf("Language len = %d, want %d", len(clean.Language), maxLangLen)
	}
	if len(clean.UserAgent) != maxUALen {
		t.Errorf("UserAgent len = %d, want %d", len(clean.UserAgent), maxUALen)
	}
}
