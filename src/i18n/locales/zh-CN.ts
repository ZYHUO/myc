export default {
  common: {
    signIn: '登录',
    signUp: '注册',
    getStarted: '开始使用',
    openDashboard: '进入控制台',
    createAccount: '创建账号',
    learnMore: '了解更多',
    cancel: '取消',
    confirm: '确认',
    loading: '加载中…',
    email: '邮箱',
    password: '密码',
    or: '或',
    new: '新',
  },

  landing: {
    nav: {
      features: '功能',
      models: '模型',
      pricing: '价格',
      faq: '常见问题',
      docs: '文档',
    },

    hero: {
      eyebrow: 'AI 接口聚合网关',
      headlineLine1: '一把密钥，',
      headlineLine2: '调用所有模型。',
      lead: 'Amodel 把 Claude、GPT、Gemini 等主流模型统一到一个接口里。买一个订阅，拿一把密钥，告别在各家控制台来回切换。',
      ctaPrimary: '创建账号',
      ctaSecondary: '登录',
      authedPrimary: '进入控制台',
      authedSecondary: '管理密钥',
      codeCaption: '同一份请求换个模型名 — 上游协议差异由 Amodel 替你抹平。',
      trustedBy: '兼容你已经在用的提供商',
    },

    stats: {
      models: '主流模型',
      uptime: '接口可用率',
      setup: '接入耗时',
      setupValue: '< 1 分钟',
      regions: '可用区域',
    },

    features: {
      eyebrow: '为什么选 AMODEL',
      title: '为发布而生。',
      items: {
        unified: {
          title: '一个网关，全部模型',
          body: '通过一个兼容 OpenAI / Anthropic 协议的端点路由到 Claude、GPT、Gemini、DeepSeek 等十多个模型。切换提供商不用动业务代码。',
        },
        subscription: {
          title: '订阅制，不再按量计费',
          body: '按月购买某个模型家族的访问权限，不再盯着用量表度日。我们把上游账户池化，让你在试验阶段不再为每个 token 付费。',
        },
        analytics: {
          title: '坦诚的用量分析',
          body: '按密钥、模型、日维度细分成本和延迟。可设置 RPM 限制和余额告警。每条请求都有完整溯源 — 不做黑盒。',
        },
        byok: {
          title: '支持自带密钥',
          body: '用自己的上游 API key 跑 Amodel，或用我们的，混合部署也支持。网关会自动选择最健康、最便宜的上游。',
        },
        secure: {
          title: '内置安全护栏',
          body: '密钥级 IP 白名单、速率限制、日封顶、余额告警。一键暂停密钥。每次请求、每个模型、每一分钱都可审计。',
        },
        fast: {
          title: '全模型流式输出',
          body: 'SSE 和分块传输覆盖每个模型。网关只增加毫秒级延迟，不是秒级。上游一吐 token，你就能收到。',
        },
      },
    },

    howItWorks: {
      eyebrow: '几分钟即可上手',
      title: '三步，无需改 SDK。',
      steps: {
        signup: {
          title: '创建账号',
          body: '邮箱 + 密码。不绑卡也能浏览。',
        },
        key: {
          title: '生成密钥',
          body: '选个分组，设好速率限制，开发！',
        },
        request: {
          title: '发起请求',
          body: '把现有客户端指向 Amodel，换个模型名，就完事。',
        },
      },
    },

    pricing: {
      eyebrow: '价格',
      title: '按量付费，或购买订阅。',
      lead: '充值余额后按量付费，或购买针对特定模型家族的月度订阅 — 共享上游池容量。',
      plans: {
        payg: {
          name: '按量付费',
          price: '低至 $0.001',
          unit: '/ 1K tokens',
          features: [
            '没有月费门槛',
            '所有模型可用',
            '$10 起充',
            '细到密钥级的统计',
          ],
          cta: '立即开始',
        },
        sub: {
          name: '订阅制',
          price: '$29 起',
          unit: '/ 月',
          features: [
            '共享上游池容量',
            '月费固定',
            '路由优先级',
            '日 / 周软封顶',
          ],
          cta: '查看套餐',
        },
      },
      note: '不同部署的套餐、地区与限额可能不同。如果某项功能被关闭，请联系管理员。',
    },

    faq: {
      eyebrow: '常见问题',
      title: '你想问的，这里都有。',
      items: [
        {
          q: '需要装单独的 SDK 吗？',
          a: '不需要。Amodel 兼容 OpenAI 和 Anthropic 的协议，所以任何现成客户端（openai-python、@anthropic-ai/sdk、LangChain 等）都能对接。只要换 base URL 和模型名就行。',
        },
        {
          q: '支持哪些模型？',
          a: 'Claude（Opus/Sonnet/Haiku 3.5–4）、GPT（3.5/4o/4.1）、Gemini（1.5–2.5）、DeepSeek（V2.5/V3），以及通过托管提供商接入的 Llama 等。具体可用的模型取决于本部署接入了哪些上游。',
        },
        {
          q: '费用怎么算的？',
          a: '按量付费时，网关在上游统计 token 数，按管理员设置的倍率结算。订阅制按月固定收费，可选配日封顶防止滥用。',
        },
        {
          q: '可以使用自己的 API key 吗？',
          a: '可以。BYOK 是一等公民：配置你自己的上游 OpenAI/Anthropic 密钥，Amodel 透传请求不收差价。你仍然能用上分析、限速、池化这些功能。',
        },
        {
          q: '我的数据是否私密？',
          a: '我们记录请求元数据（模型、token 数、成本、延迟），但不记录 prompt 或响应体。上游提供商是否保留训练数据按它们的政策来 — 我们只透传请求，不做修改。',
        },
      ],
    },

    cta: {
      eyebrow: '开始使用',
      title: '选一个模型，五分钟上线。',
      lead: '注册、生成密钥、把客户端指过来。路由、重试、账单合并都交给我们。',
    },

    footer: {
      tagline: '一个保持简单的 AI 网关。',
      sections: {
        product: '产品',
        company: '公司',
        legal: '法律',
      },
      links: {
        features: '功能',
        pricing: '价格',
        docs: '文档',
        status: '状态',
        about: '关于',
        contact: '联系',
        terms: '条款',
        privacy: '隐私',
      },
      copyright: '© Amodel',
    },
  },

  auth: {
    login: {
      eyebrow: '登录',
      title: '欢迎回来',
      subtitle: '登录以管理你的 API 密钥、用量和账单。',
      submit: '登录',
      submitting: '登录中…',
      noAccount: '还没有账号？',
      register: '创建账号',
      forgotPassword: '忘记密码？',
      mockHint: 'Mock 模式下任意非空邮箱和密码均可登录。设置 VITE_USE_MOCK=false 切到真后端。',
      emailRequired: '请输入邮箱和密码',
      success: '欢迎回来',
      failed: '登录失败',
    },
    register: {
      eyebrow: '创建账号',
      title: '开始使用',
      subtitle: '一个账号，调用所有模型。注册后即可管理 API 密钥、跟踪用量、跨提供商路由请求。',
      disabledTitle: '注册功能已关闭',
      disabledBody: '本服务暂时不开放注册。请联系管理员开通账号，或使用已有账号 {signIn}。',
      emailLabel: '邮箱',
      emailPlaceholder: 'you@example.com',
      verifyCodeLabel: '验证码',
      verifyCodePlaceholder: '6 位数字',
      sendCode: '发送验证码',
      sendingCode: '发送中…',
      passwordLabel: '密码',
      passwordPlaceholder: '至少 6 位',
      passwordConfirmLabel: '确认密码',
      passwordConfirmPlaceholder: '再输一次',
      invitationLabel: '邀请码',
      invitationPlaceholder: '本服务要求填写',
      promoLabel: '优惠码',
      promoOptional: '（可选）',
      promoPlaceholder: '应用优惠码',
      referredBy: '由 {code} 推荐',
      suffixHint: '仅允许以下邮箱后缀：{list}',
      agreement: '我已阅读并同意 {terms}。',
      defaultTermsLabel: '服务条款',
      turnstileWarning: '⚠ 本服务要求 Cloudflare Turnstile 验证，但前端尚未集成。注册可能在服务端被拒；请管理员关闭 Turnstile 或在前端补上对应组件。',
      submit: '创建账号',
      submitting: '创建中…',
      hasAccount: '已有账号？',
      success: '欢迎加入 Amodel',
      failed: '注册失败',
      sendSuccess: '验证码已发送，请查收邮箱。',
      sendFailed: '发送验证码失败',
      emailFirst: '请先填写邮箱',
      vEmailRequired: '请填写邮箱',
      vPasswordRequired: '请填写密码',
      vPasswordShort: '密码至少 6 位',
      vPasswordMismatch: '两次密码不一致',
      vCodeRequired: '请填写邮箱中的验证码',
      vAgreementRequired: '请先同意条款',
    },
  },

  language: {
    label: '语言',
    names: {
      en: 'English',
      'zh-CN': '简体中文',
      ja: '日本語',
    },
  },
}
