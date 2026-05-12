export default {
  // ────────────────────────────────────────────────────────────
  // Shared / common
  // ────────────────────────────────────────────────────────────
  common: {
    signIn: 'Sign in',
    signUp: 'Sign up',
    getStarted: 'Get started',
    openDashboard: 'Open dashboard',
    createAccount: 'Create an account',
    learnMore: 'Learn more',
    cancel: 'Cancel',
    confirm: 'Confirm',
    loading: 'Loading…',
    email: 'Email',
    password: 'Password',
    or: 'or',
    new: 'New',
  },

  // ────────────────────────────────────────────────────────────
  // Landing page
  // ────────────────────────────────────────────────────────────
  landing: {
    nav: {
      features: 'Features',
      models: 'Models',
      pricing: 'Pricing',
      faq: 'FAQ',
      docs: 'Docs',
    },

    hero: {
      eyebrow: 'AI API gateway',
      headlineLine1: 'One key,',
      headlineLine2: 'every model.',
      lead: "Amodel is a unified API gateway for Claude, GPT, Gemini and friends. Buy a subscription, get a single key, and stop juggling provider dashboards.",
      ctaPrimary: 'Create an account',
      ctaSecondary: 'Sign in',
      authedPrimary: 'Open dashboard',
      authedSecondary: 'Manage keys',
      codeCaption: 'Same request, swap the model name — Amodel handles the upstream protocol for you.',
      trustedBy: 'Compatible with the providers you already use',
    },

    stats: {
      models: 'AI models',
      uptime: 'API uptime',
      setup: 'Setup',
      setupValue: '< 1 min',
      regions: 'Regions',
    },

    features: {
      eyebrow: 'WHY AMODEL',
      title: 'Built for teams that ship.',
      items: {
        unified: {
          title: 'One gateway, every model',
          body: 'Route to Claude, GPT, Gemini, DeepSeek and a dozen more through a single OpenAI- or Anthropic-compatible endpoint. Keep your application code identical when you switch providers.',
        },
        subscription: {
          title: 'Subscription, not metering',
          body: "Buy access to a model family for a month and stop watching the meter. We pool capacity across upstream accounts so you don't pay per-token rates while you experiment.",
        },
        analytics: {
          title: 'Honest analytics',
          body: 'Per-key, per-model, per-day cost and latency breakdowns. Set RPM limits and balance alerts. Every request is logged with provenance — no black boxes.',
        },
        byok: {
          title: 'Bring your own keys',
          body: 'Run Amodel against your own provider keys, or use ours. Hybrid setups are first-class — the gateway picks the cheapest healthy upstream for each request.',
        },
        secure: {
          title: 'Built-in safeguards',
          body: 'Per-key IP allow-lists, rate limits, daily caps, and balance alerts. Pause a key in one click. Audit every request, model, and dollar.',
        },
        fast: {
          title: 'Streaming everywhere',
          body: 'SSE and chunked-transfer streaming on every model. The gateway adds milliseconds, not seconds. Your tokens land as soon as the upstream emits them.',
        },
      },
    },

    howItWorks: {
      eyebrow: 'GET STARTED IN MINUTES',
      title: 'Three steps. No SDK changes.',
      steps: {
        signup: {
          title: 'Create an account',
          body: 'Email + password. No credit card to look around.',
        },
        key: {
          title: 'Generate a key',
          body: 'Pick a group, set rate limits, ship.',
        },
        request: {
          title: 'Send a request',
          body: 'Point your existing client at Amodel and swap the model name. That is it.',
        },
      },
    },

    pricing: {
      eyebrow: 'PRICING',
      title: 'Pay for what you use, or subscribe.',
      lead: 'Top up balance and pay per request, or buy a monthly subscription to a specific model family with pooled capacity.',
      plans: {
        payg: {
          name: 'Pay as you go',
          price: 'From $0.001',
          unit: '/ 1K tokens',
          features: [
            'No monthly minimum',
            'All models available',
            'Top up from $10',
            'Per-key analytics',
          ],
          cta: 'Start free',
        },
        sub: {
          name: 'Subscription',
          price: 'From $29',
          unit: '/ month',
          features: [
            'Pooled upstream capacity',
            'Fixed monthly cost',
            'Priority routing',
            'Daily and weekly soft caps',
          ],
          cta: 'See plans',
        },
      },
      note: 'Plans, regions and limits may vary by deployment. Check your administrator if a feature you need is gated.',
    },

    faq: {
      eyebrow: 'FAQ',
      title: 'Questions, answered.',
      items: [
        {
          q: 'Do I need a separate SDK?',
          a: 'No. Amodel speaks the OpenAI and Anthropic protocols, so any existing client (openai-python, @anthropic-ai/sdk, LangChain, …) works against our endpoint. Just swap the base URL and the model name.',
        },
        {
          q: 'Which models are supported?',
          a: 'Claude (Opus/Sonnet/Haiku 3.5–4), GPT (3.5, 4o, 4.1), Gemini (1.5–2.5), DeepSeek (V2.5/V3), Llama via hosted providers, and more. Available models depend on what your administrator has connected to this deployment.',
        },
        {
          q: 'How is billing calculated?',
          a: 'For pay-as-you-go, the gateway logs token counts upstream-side and applies the multiplier your administrator has set. For subscriptions, the cost is fixed per month with optional daily soft caps to prevent abuse.',
        },
        {
          q: 'Can I bring my own provider keys?',
          a: 'Yes. The gateway supports BYOK: configure your own upstream OpenAI/Anthropic keys and Amodel routes traffic through them without taking a cut. You still get the analytics, rate-limits, and pooling.',
        },
        {
          q: 'Is my data private?',
          a: "We log request metadata (model, token counts, cost, latency) but not the prompt or response bodies. If the upstream provider retains training data, that is governed by their policy — we pass requests through without modification.",
        },
      ],
    },

    cta: {
      eyebrow: 'GET STARTED',
      title: 'Pick a model. Ship in five minutes.',
      lead: "Sign up, generate a key, point your client at the gateway. We'll take care of routing, retries and bill consolidation.",
    },

    footer: {
      tagline: 'An AI gateway, kept simple.',
      sections: {
        product: 'Product',
        company: 'Company',
        legal: 'Legal',
      },
      links: {
        features: 'Features',
        pricing: 'Pricing',
        docs: 'Documentation',
        status: 'Status',
        about: 'About',
        contact: 'Contact',
        terms: 'Terms',
        privacy: 'Privacy',
      },
      copyright: '© Amodel',
    },
  },

  // ────────────────────────────────────────────────────────────
  // Auth views
  // ────────────────────────────────────────────────────────────
  auth: {
    login: {
      eyebrow: 'SIGN IN',
      title: 'Welcome back',
      subtitle: 'Sign in to manage your API keys, usage, and billing.',
      submit: 'Sign in',
      submitting: 'Signing in…',
      noAccount: 'New to Amodel?',
      register: 'Create an account',
      forgotPassword: 'Forgot password?',
      mockHint: 'Any non-empty email and password are accepted. Set VITE_USE_MOCK=false to use the real backend.',
      emailRequired: 'Please enter both email and password',
      success: 'Welcome back',
      failed: 'Login failed',
    },
    register: {
      eyebrow: 'CREATE ACCOUNT',
      title: 'Get started',
      subtitle: 'One account, every model. Sign up to manage your API keys, monitor usage, and route requests across providers.',
      disabledTitle: 'Registration is currently closed',
      disabledBody: 'New sign-ups are disabled on this server. Please reach out to your administrator for an account, or {signIn} with an existing one.',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      verifyCodeLabel: 'Verification code',
      verifyCodePlaceholder: '6-digit code',
      sendCode: 'Send code',
      sendingCode: 'Sending…',
      passwordLabel: 'Password',
      passwordPlaceholder: 'At least 6 characters',
      passwordConfirmLabel: 'Confirm password',
      passwordConfirmPlaceholder: 'Repeat password',
      invitationLabel: 'Invitation code',
      invitationPlaceholder: 'Required by this server',
      promoLabel: 'Promo code',
      promoOptional: '(optional)',
      promoPlaceholder: 'Apply a promo',
      referredBy: 'Referred by {code}',
      suffixHint: 'Only the following email domains are allowed: {list}',
      agreement: 'I have read and agree to the {terms}.',
      defaultTermsLabel: 'terms of service',
      turnstileWarning: "⚠ This server requires a Cloudflare Turnstile challenge that isn't wired in the SPA yet. Registration may fail server-side; ask the administrator to disable Turnstile or add the widget.",
      submit: 'Create account',
      submitting: 'Creating account…',
      hasAccount: 'Already have an account?',
      success: 'Welcome to Amodel',
      failed: 'Registration failed',
      sendSuccess: 'Verification code sent. Check your inbox.',
      sendFailed: 'Failed to send code',
      emailFirst: 'Enter your email first',
      // Validation
      vEmailRequired: 'Email is required',
      vPasswordRequired: 'Password is required',
      vPasswordShort: 'Password must be at least 6 characters',
      vPasswordMismatch: 'Passwords do not match',
      vCodeRequired: 'Enter the verification code from your email',
      vAgreementRequired: 'You must accept the terms to continue',
    },
  },

  // ────────────────────────────────────────────────────────────
  // Language switcher
  // ────────────────────────────────────────────────────────────
  language: {
    label: 'Language',
    names: {
      en: 'English',
      'zh-CN': '简体中文',
      ja: '日本語',
    },
  },
}
