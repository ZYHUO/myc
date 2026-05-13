package service

import (
	"context"
	"encoding/json"
	"fmt"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/pkg/logger"
)

// Geetest v4 (gcaptcha4) integration — parallel to TurnstileService so
// callers can verify either CAPTCHA with the same shape:
//
//   if err := geetestService.VerifyToken(ctx, token, ip); err != nil { ... }
//
// Admin enables Geetest in /admin/settings; frontend sees the public
// captcha_id via /settings/public and renders the v4 widget. The widget
// emits four fields (`lot_number`, `captcha_output`, `pass_token`,
// `gen_time`) — the SPA JSON-encodes them into the `geetest_token`
// request field so we don't have to thread four parameters through
// every auth endpoint. We unmarshal here and forward to GeetestVerifier
// (which talks to https://gcaptcha4.geetest.com/validate).

var (
	ErrGeetestVerificationFailed = infraerrors.BadRequest("GEETEST_VERIFICATION_FAILED", "geetest verification failed")
	ErrGeetestNotConfigured      = infraerrors.ServiceUnavailable("GEETEST_NOT_CONFIGURED", "geetest not configured")
)

// GeetestPayload is the front-end-produced challenge envelope.
type GeetestPayload struct {
	LotNumber     string `json:"lot_number"`
	CaptchaOutput string `json:"captcha_output"`
	PassToken     string `json:"pass_token"`
	GenTime       string `json:"gen_time"`
}

// GeetestVerifyResponse mirrors the relevant fields of Geetest's
// /validate JSON response.
type GeetestVerifyResponse struct {
	Result    string `json:"result"`
	Reason    string `json:"reason"`
	CaptchaID string `json:"captcha_id"`
}

// GeetestVerifier abstracts the HTTP roundtrip so tests can swap a stub.
type GeetestVerifier interface {
	VerifyToken(ctx context.Context, captchaID, captchaKey string, payload *GeetestPayload, remoteIP string) (*GeetestVerifyResponse, error)
}

// GeetestService is the high-level wrapper used by auth flows.
type GeetestService struct {
	settingService *SettingService
	verifier       GeetestVerifier
}

func NewGeetestService(settingService *SettingService, verifier GeetestVerifier) *GeetestService {
	return &GeetestService{settingService: settingService, verifier: verifier}
}

func (s *GeetestService) IsEnabled(ctx context.Context) bool {
	if s == nil || s.settingService == nil {
		return false
	}
	return s.settingService.IsGeetestEnabled(ctx)
}

// VerifyToken validates a Geetest v4 challenge. Returns nil when:
//   - Geetest is disabled (no-op pass-through, matches Turnstile behaviour)
//   - The verifier responds with `result == "success"`
//
// Returns ErrGeetestVerificationFailed for empty / malformed / failed
// tokens, and ErrGeetestNotConfigured when the admin has flipped the
// switch but not pasted in the captcha_id/captcha_key pair.
func (s *GeetestService) VerifyToken(ctx context.Context, token, remoteIP string) error {
	if !s.IsEnabled(ctx) {
		return nil
	}
	captchaID := s.settingService.GetGeetestCaptchaID(ctx)
	captchaKey := s.settingService.GetGeetestCaptchaKey(ctx)
	if captchaID == "" || captchaKey == "" {
		logger.LegacyPrintf("service.geetest", "%s", "[Geetest] Enabled but captcha_id/captcha_key not configured")
		return ErrGeetestNotConfigured
	}
	if token == "" {
		return ErrGeetestVerificationFailed
	}
	var p GeetestPayload
	if err := json.Unmarshal([]byte(token), &p); err != nil {
		logger.LegacyPrintf("service.geetest", "[Geetest] payload parse failed: %v", err)
		return ErrGeetestVerificationFailed
	}
	if p.LotNumber == "" || p.CaptchaOutput == "" || p.PassToken == "" || p.GenTime == "" {
		return ErrGeetestVerificationFailed
	}

	result, err := s.verifier.VerifyToken(ctx, captchaID, captchaKey, &p, remoteIP)
	if err != nil {
		logger.LegacyPrintf("service.geetest", "[Geetest] request failed: %v", err)
		return fmt.Errorf("geetest verify: %w", err)
	}
	if result.Result != "success" {
		logger.LegacyPrintf("service.geetest", "[Geetest] verification failed: %s", result.Reason)
		return ErrGeetestVerificationFailed
	}
	return nil
}
