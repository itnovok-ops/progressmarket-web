/**
 * Central data layer — all copy, SEO, assets.
 * Edit this file only for content changes.
 */

import { publicAssetUrl, APP_PUBLIC_PATH } from "../../paths.js";

export const SITE_URL = "https://market.teravox.ru/";
export const CANONICAL_URL = SITE_URL + "lifeos/";

const HERO_IMAGE = "images/03_system/13_system_wb_assortment_model-0373a402-c3c8-43b0-ad29-c8538af6d658.png";

export const IMAGE_META = {
  "images/01_problem/01_problem_marketplace_classic_model-933692aa-7837-4e78-94cd-3055c263d1e3.png": {
    width: 1024,
    height: 685
  },
  "images/01_problem/10_problem_full_marketplace_failure-9593bdac-0986-4be3-99da-89ae2b3118b3.png": {
    width: 1024,
    height: 683
  },
  "images/01_problem/08_problem_platform_changes_risk-54c2d8c0-8e6d-42e9-907e-9f924f1604a0.png": {
    width: 1024,
    height: 686
  },
  "images/01_problem/04_problem_hit_or_guess_strategy-066100af-628a-4706-8096-58c87c89b9ca.png": {
    width: 1024,
    height: 322
  },
  "images/01_problem/06_problem_supply_chain_issues-90d8465f-1d59-4a32-b97c-4db3cc12881d.png": {
    width: 1024,
    height: 431
  },
  "images/01_problem/07_problem_warehouse_freeze_money-116f6a4e-4057-423f-a7af-9c7e2fe80a98.png": {
    width: 1024,
    height: 684
  },
  "images/01_problem/03_problem_linear_dropshipping_flow-2f2d206e-bb1c-4b50-b905-3e4729e09ce3.png": {
    width: 1024,
    height: 201
  },
  "images/03_system/13_system_wb_assortment_model-0373a402-c3c8-43b0-ad29-c8538af6d658.png": {
    width: 1024,
    height: 592
  },
  "images/03_system/15_system_top_questions_sellers-f73fbb15-3e02-4c48-bcd6-8c230907f0f7.png": {
    width: 1024,
    height: 680
  },
  "images/02_insight/11_insight_market_teaches_wrong_model-9393c7e8-3700-441b-a5f9-b8f263df5cc2.png": {
    width: 1024,
    height: 405
  },
  "images/02_insight/12_insight_core_problem_is_bet-697604eb-0bab-4c4e-a994-12fbd04cf75b.png": {
    width: 1024,
    height: 679
  },
  "images/02_insight/02_problem_bet_logic_risk-3a815b32-6134-460b-9e34-2d181fbb5a85.png": {
    width: 1024,
    height: 640
  },
  "images/02_insight/09_problem_dead_stock_unsold_goods-26502740-62da-49b5-a5af-450f578f26e7.png": {
    width: 1024,
    height: 684
  },
  "images/02_insight/05_problem_ad_competition_overheat-fb50dc49-a26d-4947-8de8-b76618cf0175.png": {
    width: 1024,
    height: 256
  },
  "diagrams/14_system_supplier_fulfillment_flow-36328da2-76f3-4499-9fb2-8e970d97fa3e.png": {
    width: 1024,
    height: 516
  },
  "diagrams/fbs-flow.png": { width: 960, height: 540 },
  "cases/dashboard.png": { width: 960, height: 540 }
};

export const LEADS_ENDPOINT = "/api/v1/leads";

export const PAGE_CONTENT = {
  seo: {
    title: "Система WB FBS — автоматизация Wildberries FBS и дропшиппинг для селлеров в России",
    description:
      "Автоматизация Wildberries FBS для селлеров в России: дропшиппинг без закупки партии, оптимизация логистики маркетплейса, управление остатками и распределённые продажи по 70 000+ SKU.",
    keywords: [
      "Wildberries FBS automation system",
      "dropshipping system Russia e-commerce",
      "marketplace logistics optimization",
      "WB seller tools automation",
      "inventory management system WB",
      "WB FBS system",
      "Wildberries automation",
      "FBS logistics optimization"
    ],
    canonical: CANONICAL_URL,
    lang: "ru",
    robots: "index,follow",
    og: {
      type: "website",
      title: "Система дропшиппинга для Wildberries без закупки партии",
      description:
        "Автоматизация Wildberries FBS для селлеров в России: оптимизация логистики, управление остатками, 70 000+ SKU. Бесплатный расчёт запуска для предпринимателей в электронной коммерции.",
      image: publicAssetUrl(SITE_URL, HERO_IMAGE),
      imageAlt: "Система ассортимента WB FBS — панель автоматизации Wildberries",
      imageWidth: 1024,
      imageHeight: 592
    },
    twitter: {
      card: "summary_large_image",
      title: "Система дропшиппинга для Wildberries без закупки партии",
      description:
        "Автоматизация Wildberries FBS для селлеров в России: оптимизация логистики, управление остатками, 70 000+ SKU. Получите расчёт запуска.",
      image: publicAssetUrl(SITE_URL, HERO_IMAGE)
    },
    logo: publicAssetUrl(SITE_URL, HERO_IMAGE)
  },

  meta: {
    brand: "Система WB FBS",
    tagline: "Автоматизация Wildberries FBS · оптимизация логистики маркетплейса"
  },

  nav: [
    { label: "Проблема", href: "#problem", scope: "desktop" },
    { label: "Инсайт", href: "#insight" },
    { label: "Система", href: "#video" },
    { label: "Результаты", href: "#cases" },
    { label: "Вопросы", href: "#faq" }
  ],

  headerCta: {
    label: "Оставить заявку",
    mobileLabel: "Заявка",
    href: "#cta",
    ymGoal: "order",
    trackId: "click_cta_primary",
    variant: "primary"
  },

  headerContactCta: {
    label: "Связаться",
    href: "#cta",
    trackId: "click_cta_contact",
    variant: "ghost"
  },

  hero: {
    label: "АВТОМАТИЧЕСКАЯ СИСТЕМА · БЕЗ СКЛАДА",
    headline:
      "Автоматическая система, которая запускает продажи на Wildberries без склада и ручной работы",
    subtitle:
      "Подключение к поставщикам → создание карточек → управление остатками → прибыль под контролем системы. Без сотрудников, без ручного управления — под ключ.",
    image: "images/03_system/13_system_wb_assortment_model-0373a402-c3c8-43b0-ad29-c8538af6d658.png",
    imageAlt: "Автоматическая система WB FBS — продажи под контролем алгоритма",
    videoKicker:
      "Посмотри, как система автоматически создаёт и продаёт товары на Wildberries",
    videoPlayLabel: "Смотреть пошаговую демонстрацию системы",
    stats: [
      { value: "70 000+", label: "SKU под контролем алгоритма" },
      { value: "0 ₽", label: "склад · без закупки партии" },
      { value: "FBS", label: "автоматическая система" },
      { value: "24/7", label: "без ручного управления" }
    ],
    cta: {
      primary: {
        label: "Оставить заявку",
        href: "#cta",
        ymGoal: "order",
        trackId: "click_cta_primary",
        variant: "primary"
      },
      secondary: {
        label: "Смотреть видео",
        href: "#video",
        trackId: "click_cta_secondary",
        variant: "ghost"
      }
    }
  },

  problem: {
    id: "problem",
    sectionClass: "section section--problem",
    eyebrow: "Блок проблем",
    title: "Почему классическая модель Wildberries съедает маржу",
    lead:
      "Классическая модель заставляет держать склад и сотрудников — автоматическая система WB FBS продаёт без склада, без ручного управления, под контролем алгоритма.",
    carouselLabel: "Риски классической модели на маркетплейсе",
    slides: [
      {
        id: "classic-model",
        image:
          "images/01_problem/01_problem_marketplace_classic_model-933692aa-7837-4e78-94cd-3055c263d1e3.png",
        alt: "Классическая модель Wildberries: закупка партии, склад и платное хранение WB",
        title: "Классическая модель WB",
        text: "Закупка партии, склад и платное хранение каждый день — капитал заморожен в остатках, а не в росте."
      },
      {
        id: "freeze-money",
        image:
          "images/01_problem/07_problem_warehouse_freeze_money-116f6a4e-4057-423f-a7af-9c7e2fe80a98.png",
        alt: "Заморозка капитала при закупке товара на Wildberries от 300 000 рублей",
        title: "Заморозка капитала",
        text: "Минимум 300 000 ₽ в товар до первой продажи — автоматизация остатков недоступна, пока деньги лежат на складе."
      },
      {
        id: "hit-guess",
        image:
          "images/01_problem/04_problem_hit_or_guess_strategy-066100af-628a-4706-8096-58c87c89b9ca.png",
        alt: "Ставка на один хит-SKU вместо системы автоматизации Wildberries",
        title: "Ставка на один хит",
        text: "Поиск «золотого SKU» — не автоматизация Wildberries, а азартная ставка: аналитика не спасает от риска одного товара."
      },
      {
        id: "linear-dropship",
        image:
          "images/01_problem/03_problem_linear_dropshipping_flow-2f2d206e-bb1c-4b50-b905-3e4729e09ce3.png",
        alt: "Линейный поток дропшиппинга без оптимизации логистики FBS",
        title: "Дропшиппинг без системы",
        text: "Копирование чужой схемы дропшиппинга без оптимизации логистики маркетплейса — нулевой контроль и операционный стресс."
      },
      {
        id: "supply-chain",
        image:
          "images/01_problem/06_problem_supply_chain_issues-90d8465f-1d59-4a32-b97c-4db3cc12881d.png",
        alt: "Сбои в цепочке поставок на Wildberries: реклама, выкупы, сезонность",
        title: "Цепочка сбоев",
        text: "Ценовые войны, рост стоимости рекламы, низкий процент выкупа — ежедневные удары по марже без системы управления остатками WB."
      },
      {
        id: "platform-risk",
        image:
          "images/01_problem/08_problem_platform_changes_risk-54c2d8c0-8e6d-42e9-907e-9f924f1604a0.png",
        alt: "Риск изменения правил и комиссий Wildberries для селлеров",
        title: "Правила WB меняются",
        text: "Правила площадки меняются за ночь — вчерашняя модель уходит в минус без защитных механизмов автоматизации Wildberries FBS."
      },
      {
        id: "full-failure",
        image:
          "images/01_problem/10_problem_full_marketplace_failure-9593bdac-0986-4be3-99da-89ae2b3118b3.png",
        alt: "Карта рисков маркетплейса: ставка на один товар Wildberries",
        title: "Больше амбиции — больше ставка",
        text: "Чем крупнее ставка на одну карточку, тем болезненнее падение — типичный сценарий провала классического дропшиппинга."
      }
    ]
  },

  insight: {
    id: "insight",
    sectionClass: "section section--insight section--dark",
    eyebrow: "Инсайт",
    title: "Не ставка — а распределённая система продаж",
    lead:
      "Не ставка на один товар — а автоматическая система под ключ: тысячи SKU, прибыль под контролем алгоритма, без склада и без сотрудников.",
    blocks: [
      {
        type: "pair",
        reverse: false,
        title: "Рынок учит ставить на партию",
        text: "Найти нишу → закупить партию — это не автоматизация инструментов WB, а ставка капитала. Система автоматизации Wildberries FBS для селлеров в России работает иначе.",
        image:
          "images/02_insight/11_insight_market_teaches_wrong_model-9393c7e8-3700-441b-a5f9-b8f263df5cc2.png",
        alt: "Почему рынок Wildberries учит ошибочной модели закупки партии"
      },
      {
        type: "pair",
        reverse: true,
        title: "Главная проблема — ставка, а не аналитика",
        text: "Таблицы не снимают зависимость от одного SKU. Система WB FBS перераспределяет риск через управление остатками на тысячах карточек.",
        image:
          "images/02_insight/12_insight_core_problem_is_bet-697604eb-0bab-4c4e-a994-12fbd04cf75b.png",
        alt: "Главная проблема селлера Wildberries — ставка, а не расчёт"
      },
      {
        type: "grid",
        items: [
          {
            title: "Ставка vs вероятности",
            text: "Один хит — единая точка отказа. 70 000+ SKU — распределённые микропродажи: дропшиппинг на российском рынке электронной коммерции, сделанный правильно.",
            image:
              "images/02_insight/02_problem_bet_logic_risk-3a815b32-6134-460b-9e34-2d181fbb5a85.png",
            alt: "Ставка на хит vs система ассортимента Wildberries"
          },
          {
            title: "Реклама vs ассортимент",
            text: "Прекратите гонку ставок. Автоматизация Wildberries FBS создаёт сотни органических точек входа за счёт глубины каталога.",
            image:
              "images/02_insight/05_problem_ad_competition_overheat-fb50dc49-a26d-4947-8de8-b76618cf0175.png",
            alt: "Рекламная гонка vs ассортиментная система WB FBS"
          }
        ]
      },
      {
        type: "pair",
        reverse: false,
        title: "Мёртвый остаток vs оборачиваемость",
        text: "10 000 единиц на одном SKU — замороженные деньги. Оптимизация логистики маркетплейса распределяет продажи: деньги в движении, а не в коробках.",
        image:
          "images/02_insight/09_problem_dead_stock_unsold_goods-26502740-62da-49b5-a5af-450f578f26e7.png",
        alt: "Мёртвый остаток vs распределённые продажи системы дропшиппинга"
      }
    ]
  },

  system: {
    id: "system",
    sectionClass: "section section--system",
    eyebrow: "Как устроена система",
    title: "Система WB FBS: пошаговая оптимизация логистики маркетплейса",
    lead:
      "Автоматизация Wildberries FBS для селлеров в России: поставщик → каталог → заказ → фулфилмент → управление остатками WB. Полный конвейер системы дропшиппинга для бизнеса, масштабирующего ассортимент.",
    steps: [
      {
        step: 1,
        title: "Модель поставщика",
        text: "Поставщик держит остатки; вы продаёте через кабинет WB — система WB FBS без закупки партии и заморозки склада.",
        image:
          "diagrams/14_system_supplier_fulfillment_flow-36328da2-76f3-4499-9fb2-8e970d97fa3e.png",
        alt: "Оптимизация логистики FBS: поставщик → система → Wildberries → фулфилмент"
      },
      {
        step: 2,
        title: "Каталог 70 000+ SKU",
        text: "Ассортимент подключается к площадке — автоматизация Wildberries FBS распределяет продажи по каталогу, а не по одной карточке.",
        image:
          "images/03_system/13_system_wb_assortment_model-0373a402-c3c8-43b0-ad29-c8538af6d658.png",
        alt: "Автоматизация Wildberries: ассортиментная система 70 000 SKU"
      },
      {
        step: 3,
        title: "Вопросы селлера → готовая инфраструктура",
        text: "Где брать товар, как отгружать, как масштабировать — автоматизация инструментов WB заменяет ручную сборку процессов.",
        image:
          "images/03_system/15_system_top_questions_sellers-f73fbb15-3e02-4c48-bcd6-8c230907f0f7.png",
        alt: "Инструменты селлера Wildberries: ответы на ключевые вопросы"
      },
      {
        step: 4,
        title: "Поток FBS и репрайсер",
        text: "Заказ WB → фулфилмент → синхронизация остатков → репрайсер. Система управления остатками WB работает в цикле 24/7.",
        image: "diagrams/fbs-flow.png",
        alt: "Оптимизация логистики FBS: заказ, отгрузка, остатки, цены"
      }
    ]
  },

  cases: {
    id: "cases",
    sectionClass: "section section--cases section--dark",
    eyebrow: "Результаты",
    title: "Выручка селлеров после подключения автоматической системы",
    lead:
      "Реальные цифры выручки и прибыли — без склада, без ручного управления, под контролем алгоритма. Система под ключ для Wildberries.",
    items: [
      {
        type: "featured",
        title: "Запуск без склада — выручка с первого месяца",
        image: "cases/dashboard.png",
        alt: "Панель автоматической системы: выручка и прибыль под контролем алгоритма",
        metrics: [
          { value: "+1 240 000 ₽", label: "выручки за период подключения системы" },
          { value: "+580 000 ₽", label: "чистой прибыли к 3-му месяцу" }
        ]
      },
      {
        type: "stat",
        title: "Масштаб без сотрудников",
        metrics: [
          { value: "+890 000 ₽", label: "выручки при 70 000+ SKU без склада" },
          { value: "0 ₽", label: "в закупку партии · под ключ" }
        ]
      },
      {
        type: "stat",
        title: "Автоматическая система 24/7",
        metrics: [
          { value: "+420 000 ₽", label: "доп. выручки за счёт репрайсера" },
          { value: "24/7", label: "без ручного управления" }
        ]
      }
    ]
  },

  faq: {
    id: "faq",
    sectionClass: "section section--faq",
    title: "Частые вопросы — система WB FBS",
    lead:
      "Ответы об автоматизации Wildberries FBS, системе дропшиппинга в России и оптимизации логистики маркетплейса.",
    items: [
      {
        question: "Нужно ли закупать товар?",
        answer:
          "Нет. Система WB FBS использует модель поставщика — управление остатками WB без закупки партии. Капитал остаётся ликвидным для селлеров Wildberries в России."
      },
      {
        question: "Это дропшиппинг или FBS?",
        answer:
          "Это платформа автоматизации Wildberries FBS: оптимизация логистики маркетплейса, автоматизация остатков, репрайсер — не классическое копирование чужих схем дропшиппинга."
      },
      {
        question: "Подходит ли для селлеров в России?",
        answer:
          "Да. Создано для селлеров Wildberries в России и предпринимателей в электронной коммерции — автоматизация инструментов WB с учётом локальных правил FBS."
      },
      {
        question: "Какие риски остаются?",
        answer:
          "Риск смещается с закупки партии на управление системой — вы тестируете спрос по каталогу через автоматизацию Wildberries FBS, а не ставку на один SKU."
      }
    ]
  },

  cta: {
    id: "cta",
    sectionClass: "section section--cta section--dark",
    title: "Получить расчёт прибыли под ваш магазин",
    lead:
      "Автоматическая система под ключ: без склада, без сотрудников, под контролем алгоритма. Разберём, сколько выручки может принести ваша ниша на Wildberries.",
    submitLabel: "Получить расчёт прибыли для моего магазина",
    submitLoadingLabel: "Отправка…",
    successMessage: "Заявка отправлена. Мы свяжемся с вами в течение 24 часов.",
    errorMessage: "Не удалось отправить заявку. Попробуйте позже или напишите нам напрямую.",
    softCtaTitle: "Разобрать систему под ваш бизнес",
    softCtaText:
      "Покажем, как автоматическая система запустит продажи без склада и без ручного управления — под контролем алгоритма.",
    softCtaLabel: "Разобрать систему под мой бизнес",
    stickyCtaLabel: "Посмотреть, как это работает",
    exitCtaTitle: "Перед уходом — расчёт прибыли",
    exitCtaText:
      "Узнайте потенциал выручки для вашего магазина. Без склада, под ключ, без обязательств.",
    exitCtaLabel: "Получить расчёт прибыли",
    formFields: {
      name: { label: "Имя", placeholder: "Имя" },
      phone: { label: "Телефон", placeholder: "Телефон +7 …" },
      email: { label: "Электронная почта", placeholder: "Электронная почта" },
      comment: { label: "Комментарий", placeholder: "Комментарий" }
    },
    consentText: {
      prefix: "Принимаю",
      conjunction: "и",
      suffix: "Согласен на"
    },
    legalLinks: [
      { label: "оферту", href: "../offer.html" },
      { label: "согласие на ПДн", href: "../personal-data-consent.html" },
      { label: "информационные рассылки", href: "../marketing-consent.html" }
    ],
    reassurance: ["Без склада · под ключ", "Расчёт прибыли за 24 часа", "Без ручного управления"]
  },

  footer: {
    requisites: {
      legalName: "ИП Владимиров Роман Сергеевич",
      ogrnLabel: "ОГРНИП",
      ogrn: "314425219700012",
      innLabel: "ИНН",
      inn: "422803032906",
      emailLabel: "Электронная почта",
      email: "support@progress-market.ru"
    },
    legalLinks: [
      { label: "Оферта", href: "../offer.html" },
      { label: "Политика конфиденциальности", href: "../privacy-policy.html" },
      { label: "Согласие на ПДн", href: "../personal-data-consent.html" },
      { label: "Согласие на рассылку", href: "../marketing-consent.html" }
    ],
    note: "Автоматизация Wildberries FBS · оптимизация логистики маркетплейса · управление остатками WB"
  }
};

export function buildOrganizationJsonLd(content) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: content.meta.brand,
    description: "FBS dropshipping automation system for Wildberries sellers",
    url: content.seo.canonical,
    logo: content.seo.logo
  };
}

export function buildProductJsonLd(content) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: content.meta.brand,
    description: "FBS dropshipping automation system for Wildberries sellers",
    category: "Software > Business Software",
    brand: {
      "@type": "Brand",
      name: content.meta.brand
    },
    offers: {
      "@type": "Offer",
      name: "Dropshipping FBS System",
      price: "0",
      priceCurrency: "RUB",
      availability: "https://schema.org/InStock",
      url: content.seo.canonical + "#cta"
    }
  };
}

export function buildFaqJsonLd(content) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.items.map(function (item) {
      return {
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer
        }
      };
    })
  };
}

/** @deprecated Use buildProductJsonLd */
export function buildJsonLd(content) {
  return buildProductJsonLd(content);
}
