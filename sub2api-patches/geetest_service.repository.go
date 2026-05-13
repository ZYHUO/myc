package repository

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/httpclient"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

// Geetest v4 validate endpoint. The captcha_id is passed via query string
// because Geetest's own server-side examples do it that way; the four
// challenge fields plus a sign_token go in the form-encoded body.
const geetestVerifyURL = "https://gcaptcha4.geetest.com/validate"

type geetestVerifier struct {
	httpClient *http.Client
	verifyURL  string
}

func NewGeetestVerifier() service.GeetestVerifier {
	sharedClient, err := httpclient.GetClient(httpclient.Options{
		Timeout:            10 * time.Second,
		ValidateResolvedIP: true,
	})
	if err != nil {
		sharedClient = &http.Client{Timeout: 10 * time.Second}
	}
	return &geetestVerifier{
		httpClient: sharedClient,
		verifyURL:  geetestVerifyURL,
	}
}

func (v *geetestVerifier) VerifyToken(
	ctx context.Context,
	captchaID, captchaKey string,
	p *service.GeetestPayload,
	remoteIP string,
) (*service.GeetestVerifyResponse, error) {
	// Geetest v4 protocol: sign_token = HMAC-SHA256(captcha_key, lot_number),
	// hex-encoded. The frontend never sees captcha_key — it lives only on
	// the server side.
	mac := hmac.New(sha256.New, []byte(captchaKey))
	mac.Write([]byte(p.LotNumber))
	signToken := hex.EncodeToString(mac.Sum(nil))

	form := url.Values{}
	form.Set("lot_number", p.LotNumber)
	form.Set("captcha_output", p.CaptchaOutput)
	form.Set("pass_token", p.PassToken)
	form.Set("gen_time", p.GenTime)
	form.Set("sign_token", signToken)

	endpoint := v.verifyURL + "?captcha_id=" + url.QueryEscape(captchaID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := v.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	var result service.GeetestVerifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}
