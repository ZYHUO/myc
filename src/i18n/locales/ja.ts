export default {
  common: {
    signIn: 'ログイン',
    signUp: '新規登録',
    getStarted: '今すぐ始める',
    openDashboard: 'ダッシュボードを開く',
    createAccount: 'アカウントを作成',
    learnMore: '詳しく見る',
    cancel: 'キャンセル',
    confirm: '確定',
    loading: '読み込み中…',
    email: 'メールアドレス',
    password: 'パスワード',
    or: 'または',
    new: '新規',
  },

  landing: {
    nav: {
      features: '機能',
      models: 'モデル',
      pricing: '料金',
      faq: 'よくある質問',
      docs: 'ドキュメント',
    },

    hero: {
      eyebrow: 'AI API ゲートウェイ',
      headlineLine1: '一つの鍵で、',
      headlineLine2: 'すべてのモデルへ。',
      lead: 'Amodel は Claude / GPT / Gemini など主要モデルを一つの API に集約します。サブスクを買って単一の鍵を取得し、各社ダッシュボードの往復に終止符を打ちましょう。',
      ctaPrimary: 'アカウントを作成',
      ctaSecondary: 'ログイン',
      authedPrimary: 'ダッシュボードを開く',
      authedSecondary: 'キーを管理',
      codeCaption: '同じリクエストでモデル名だけ差し替え — 上流プロトコルの違いは Amodel が吸収します。',
      trustedBy: '主要プロバイダと互換',
    },

    stats: {
      models: 'AI モデル',
      uptime: 'API 稼働率',
      setup: 'セットアップ',
      setupValue: '< 1 分',
      regions: '対応リージョン',
    },

    features: {
      eyebrow: 'AMODEL を選ぶ理由',
      title: '出荷するチームのために。',
      items: {
        unified: {
          title: '一つの窓口で全モデル',
          body: 'OpenAI / Anthropic 互換の一つのエンドポイントで Claude、GPT、Gemini、DeepSeek など十数モデルへ。プロバイダを変えてもコードはそのまま。',
        },
        subscription: {
          title: '従量課金ではなくサブスク',
          body: 'モデル群へのアクセスを月単位で購入。トークン課金に怯えずに実験できるよう、上流アカウントを集約してプール化します。',
        },
        analytics: {
          title: '率直な利用統計',
          body: 'キー別 / モデル別 / 日別にコストとレイテンシを内訳表示。RPM 制限や残高アラートも設定可能。すべてのリクエストに来歴を残します。',
        },
        byok: {
          title: '自前キー対応 (BYOK)',
          body: '自分のプロバイダ鍵で Amodel を動かすことも、当社のものを使うこともできます。両者を混在させても一等市民です。',
        },
        secure: {
          title: '組み込みのガードレール',
          body: 'キー単位の IP 許可リスト、レート制限、日次上限、残高アラート。ワンクリックでキーを停止可能。すべてを監査できます。',
        },
        fast: {
          title: '全モデルでストリーミング',
          body: 'すべてのモデルで SSE / chunked 転送に対応。ゲートウェイは秒ではなくミリ秒しか足しません。上流が token を吐けばそのまま届きます。',
        },
      },
    },

    howItWorks: {
      eyebrow: '数分で開始',
      title: '3 ステップ、SDK 変更不要。',
      steps: {
        signup: {
          title: 'アカウントを作成',
          body: 'メール + パスワード。カードなしで触れます。',
        },
        key: {
          title: 'キーを発行',
          body: 'グループを選び、レート制限を設定して、出荷！',
        },
        request: {
          title: 'リクエストを送信',
          body: '既存クライアントを Amodel に向け、モデル名を変えるだけ。',
        },
      },
    },

    pricing: {
      eyebrow: '料金',
      title: '従量課金か、サブスクか。',
      lead: '残高をチャージして従量課金、または特定モデル群への月額サブスクを選択。',
      plans: {
        payg: {
          name: '従量課金',
          price: '$0.001 から',
          unit: '/ 1K tokens',
          features: [
            '月額の下限なし',
            '全モデル利用可',
            '$10 からチャージ',
            'キー単位の統計',
          ],
          cta: '無料で開始',
        },
        sub: {
          name: 'サブスク',
          price: '$29 から',
          unit: '/ 月',
          features: [
            '共有プール容量',
            '月額固定',
            '優先ルーティング',
            '日次 / 週次ソフト上限',
          ],
          cta: 'プランを見る',
        },
      },
      note: 'プラン・リージョン・上限はデプロイ環境ごとに異なる場合があります。',
    },

    faq: {
      eyebrow: 'FAQ',
      title: 'ご質問にお答えします。',
      items: [
        {
          q: '専用 SDK は必要ですか？',
          a: 'いいえ。Amodel は OpenAI / Anthropic プロトコル準拠なので、既存クライアント（openai-python、@anthropic-ai/sdk、LangChain など）がそのまま使えます。base URL とモデル名を差し替えるだけです。',
        },
        {
          q: '対応モデルは？',
          a: 'Claude (Opus/Sonnet/Haiku 3.5–4)、GPT (3.5/4o/4.1)、Gemini (1.5–2.5)、DeepSeek (V2.5/V3)、ホスト経由の Llama など。実際に使えるかは管理者が接続した上流に依存します。',
        },
        {
          q: '課金はどう計算されますか？',
          a: '従量課金では上流側で token を集計し、管理者が設定した倍率で精算します。サブスクは月額固定で、日次ソフト上限を任意で設定できます。',
        },
        {
          q: '自前の API キーを使えますか？',
          a: 'はい。BYOK が一等市民。自分の上流キーを設定すると、Amodel はマージンを取らずに透過するだけ。分析・レート制限・プール化はそのまま使えます。',
        },
        {
          q: 'データのプライバシーは？',
          a: 'メタデータ（モデル、token 数、コスト、レイテンシ）は記録しますが、プロンプトや応答本文は記録しません。上流側の学習データ保持はそのプロバイダのポリシーに従います。',
        },
      ],
    },

    cta: {
      eyebrow: '開始',
      title: 'モデルを選び、5 分で出荷。',
      lead: '登録、キー発行、クライアントを向ける — ルーティングと請求の集約は当社にお任せください。',
    },

    footer: {
      tagline: 'シンプルさを保つ AI ゲートウェイ。',
      sections: {
        product: 'プロダクト',
        company: '会社',
        legal: '法務',
      },
      links: {
        features: '機能',
        pricing: '料金',
        docs: 'ドキュメント',
        status: 'ステータス',
        about: '会社情報',
        contact: 'お問い合わせ',
        terms: '利用規約',
        privacy: 'プライバシー',
      },
      copyright: '© Amodel',
    },
  },

  auth: {
    login: {
      eyebrow: 'ログイン',
      title: 'おかえりなさい',
      subtitle: 'API キー、利用状況、課金を管理するにはログインしてください。',
      submit: 'ログイン',
      submitting: 'ログイン中…',
      noAccount: 'Amodel は初めてですか？',
      register: 'アカウントを作成',
      forgotPassword: 'パスワードをお忘れ？',
      mockHint: 'Mock モードでは任意のメール / パスワードで入れます。VITE_USE_MOCK=false で本番に切替。',
      emailRequired: 'メールとパスワードを入力してください',
      success: 'おかえりなさい',
      failed: 'ログインに失敗しました',
    },
    register: {
      eyebrow: 'アカウント作成',
      title: '今すぐ始める',
      subtitle: '一つのアカウントで全モデルへ。サインアップして API キー管理、利用追跡、プロバイダ横断ルーティングを。',
      disabledTitle: '現在、新規登録は受付停止中です',
      disabledBody: '本サーバーでは新規登録が無効化されています。管理者にお問い合わせいただくか、既存アカウントで {signIn} してください。',
      emailLabel: 'メールアドレス',
      emailPlaceholder: 'you@example.com',
      verifyCodeLabel: '認証コード',
      verifyCodePlaceholder: '6 桁の数字',
      sendCode: 'コードを送信',
      sendingCode: '送信中…',
      passwordLabel: 'パスワード',
      passwordPlaceholder: '6 文字以上',
      passwordConfirmLabel: 'パスワード（確認）',
      passwordConfirmPlaceholder: 'もう一度入力',
      invitationLabel: '招待コード',
      invitationPlaceholder: 'このサーバーでは必須',
      promoLabel: 'プロモコード',
      promoOptional: '（任意）',
      promoPlaceholder: 'プロモを適用',
      referredBy: '{code} の紹介',
      suffixHint: '使用可能なメールドメイン: {list}',
      agreement: '私は {terms} を読み、同意します。',
      defaultTermsLabel: '利用規約',
      turnstileWarning: '⚠ このサーバーは Cloudflare Turnstile を要求しますが、SPA には未統合です。サーバー側で拒否される可能性があります。',
      submit: 'アカウントを作成',
      submitting: '作成中…',
      hasAccount: 'すでにアカウントをお持ちですか？',
      success: 'Amodel へようこそ',
      failed: '登録に失敗しました',
      sendSuccess: '認証コードを送信しました。メールをご確認ください。',
      sendFailed: 'コードの送信に失敗しました',
      emailFirst: '先にメールアドレスを入力してください',
      vEmailRequired: 'メールは必須です',
      vPasswordRequired: 'パスワードは必須です',
      vPasswordShort: 'パスワードは 6 文字以上である必要があります',
      vPasswordMismatch: 'パスワードが一致しません',
      vCodeRequired: 'メールに届いた認証コードを入力してください',
      vAgreementRequired: '続行するには規約への同意が必要です',
    },
  },

  language: {
    label: '言語',
    names: {
      en: 'English',
      'zh-CN': '简体中文',
      ja: '日本語',
    },
  },
}
