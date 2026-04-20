import type { AppLocale } from "@/lib/i18n/config";

export const messages = {
  ro: {
    common: {
      openMenu: "Deschide meniul",
      login: "Autentificare",
      logout: "Log out",
      tickets: "Biletele mele",
      cabinet: "Cabinet",
      scanner: "Scanner",
      admin: "Admin",
      matches: "Meciuri",
      menu: "Meniu",
      language: "Limba",
      romanian: "Romana",
      russian: "Rusa",
      roleAdminAccess: "Acces administrativ activ",
      roleCanReserve: "Rezervari extinse active",
      roleSteward: "Cont steward",
      roleCabinet: "Cabinet personal",
      noGate: "Fara poarta alocata",
    },
    header: {
      venue: "Stadionul Municipal Orhei",
      menuDescription: "Navigatie rapida pentru suporteri, stewardi si administratori.",
      activeAccount: "Cont activ",
      stewardOnly: "Cont steward activ",
      reserveAccess: "Ticketing disponibil",
      cabinetActive: "Cabinet personal activ",
    },
    footer: {
      title: "MVP ticketing pentru Stadionul Municipal Orhei",
      description:
        "Experienta construita pentru bilete gratuite acum si pentru scalare spre fluxuri comerciale ulterior.",
      pills: ["QR validare", "PDF printabil", "Moderare abuz", "Supabase RLS"],
    },
    home: {
      badge: "Stadionul Municipal Orhei",
      titleLine1: "Ticketing alb pe rosu.",
      titleLine2: "Matchday fara frictiune.",
      description:
        "O interfata mai curata, mai directa si mai sportiva pentru suporteri, stewarzi si admini. Emitere rapida, acces sigur si control operational intr-o platforma unica.",
      primaryCta: "Solicita bilete pentru urmatorul meci",
      secondaryCta: "Intra in cont",
      highlights: [
        {
          title: "Emitere controlata",
          description:
            "Adminii pot acorda acces doar suporterilor eligibili, iar emiterea ramane simpla si rapida pe mobil.",
        },
        {
          title: "Validare instant",
          description:
            "Fiecare bilet are QR unic si raspuns imediat pentru steward la poarta.",
        },
        {
          title: "Control operational",
          description:
            "Adminii vad limite, no-show, scanari duplicate si indicatori de abuz intr-un singur flux.",
        },
      ],
      snapshotBadge: "Matchday snapshot",
      snapshotFallback: "Meci demo pregatit",
      issued: "Bilete emise",
      available: "Disponibile",
      limit: "Limita",
      snapshotDescription:
        "Designul nou pune accent pe contrast, lizibilitate si viteza de actiune, mai ales pe mobil in ziua meciului.",
      exploreCta: "Exploreaza meciul",
      publishedBadge: "Meciuri publicate",
      publishedTitle: "Alege meciul si solicita-ti locul",
      publishedDescription:
        "Biletele gratuite si cele cu plata pot fi obtinute imediat dupa autentificare, iar locurile raman blocate doar temporar in timpul selectiei.",
    },
    authPage: {
      badge: "Acces suporteri",
      title: "Intra. Solicita. Acceseaza.",
      description:
        "Contul tau este baza pentru cabinetul personal, biletele emise sau procurate, PDF, partajare si istoricul de acces la stadion.",
      bullets: [
        "Biletele gratuite sau cu plata pot fi obtinute imediat dupa autentificare",
        "QR unic pentru fiecare loc si validare atomica la scanare",
        "Creare cont rapida, resetare parola si acces imediat prin Supabase Auth",
      ],
    },
    auth: {
      title: "Intra in platforma",
      description:
        "Creeaza cont, intra in cabinet si acceseaza biletele QR emise sau procurate imediat dupa selectia locurilor.",
      tabs: {
        signin: "Login",
        signup: "Cont nou",
        reset: "Resetare",
      },
      fields: {
        email: "Email",
        password: "Parola",
        fullName: "Nume complet",
      },
      actions: {
        signin: "Autentificare",
        signup: "Creeaza cont",
        reset: "Trimite link de resetare",
      },
      validation: {
        email: "Introdu o adresa de email valida.",
        password: "Parola trebuie sa aiba minimum 6 caractere.",
        fullName: "Introdu numele complet.",
        invalidData: "Date invalide.",
      },
      toasts: {
        signInSuccess: "Autentificare reusita.",
        signUpSuccess: "Cont creat. Te poti autentifica imediat.",
        signUpSession: "Cont creat si autentificat.",
        resetSuccess: "Link-ul pentru resetare a fost trimis pe email.",
        missingConfig:
          "Configuratia publica Supabase nu este disponibila in acest build. Daca rulezi local, reporneste serverul Next dupa ce actualizezi .env.local.",
      },
      missingVarsPrefix: "Lipsesc variabilele publice Supabase:",
    },
    cabinet: {
      badge: "Cabinet personal",
      title: "Biletele mele",
      description:
        "Aici vezi biletele emise, istoricul de scanare si accesul rapid spre PDF, print si pagina individuala a fiecarui loc.",
      ticketingActive: "Ticketing activ pentru meciurile deschise publicului",
      summary: {
        activeTickets: "Bilete active",
        upcomingMatches: "Meciuri viitoare",
        history: "Istoric bilete",
        subscriptions: "Abonamente active",
      },
      sections: {
        subscriptionsTitle: "Abonamente",
        subscriptionsSubtitle:
          "Daca ai primit un abonament anual sau semi-anual, il vezi aici.",
        upcomingTitle: "Meciuri urmatoare",
        upcomingSubtitle:
          "Biletele active apar aici imediat dupa confirmarea emiterii.",
        historyTitle: "Istoric si bilete folosite",
        historySubtitle:
          "Aici apar biletele scanate, folosite sau meciurile deja trecute.",
      },
      empty: {
        noSubscriptionsTitle: "Nu ai abonamente active",
        noSubscriptionsDescription:
          "Abonamentele alocate de administratie apar aici imediat.",
        noTicketsTitle: "Nu ai inca bilete active",
        noTicketsDescription:
          "Dupa ce sunt emise bilete pentru contul tau, ele apar instant aici.",
        noHistoryTitle: "Istoricul este inca gol",
        noHistoryDescription:
          "Biletele scanate sau meciurile trecute vor aparea aici.",
      },
      subscriptionValidUntil: "Valabil pana la",
      months: "luni",
    },
    confirmation: {
      badge: "Emitere confirmata",
      title: "Biletele sunt gata",
      description:
        "Fiecare loc selectat a primit un bilet cu QR unic. Le poti deschide individual, descarca in PDF sau afisa direct la poarta.",
      openFirst: "Deschide primul bilet",
      downloadPdf: "Descarca PDF",
      goToCabinet: "Mergi in cabinet",
    },
    matchCard: {
      estimatedSeats: "locuri estimate",
      freeOpen: "Bilet gratuit",
      paidOpen: "Procurare cu plata",
      defaultDescription:
        "Bilet gratuit emis cu QR unic, acces steward si cabinet personal pentru suporteri.",
      standardLimit: "Limita standard:",
      ticketsPerAccount: "bilete / cont",
      details: "Vezi detalii",
      requestSeats: "Solicita locuri",
      getFree: "Obtine bilet gratuit",
      buyPaid: "Procura bilete",
    },
    ticketList: {
      status: {
        active: "Activ",
        used: "Folosit",
        canceled: "Anulat",
        blocked: "Blocat",
      },
      row: "Rand",
      seat: "Loc",
      scannedAt: "Scanat la",
      openTicket: "Deschide biletul",
      viewMatch: "Vezi meciul",
      pdf: "PDF",
    },
    scanner: {
      restrictedTitle: "Acces restrictionat",
      restrictedDescription:
        "Scannerul este disponibil doar pentru rolurile steward, admin sau superadmin.",
      badge: "Matchday tools",
      title: "Steward scanner",
    },
  },
  ru: {
    common: {
      openMenu: "Открыть меню",
      login: "Войти",
      logout: "Выйти",
      tickets: "Мои билеты",
      cabinet: "Кабинет",
      scanner: "Сканер",
      admin: "Админ",
      matches: "Матчи",
      menu: "Меню",
      language: "Язык",
      romanian: "Румынский",
      russian: "Русский",
      roleAdminAccess: "Административный доступ активен",
      roleCanReserve: "Расширенное резервирование активно",
      roleSteward: "Аккаунт стюарда",
      roleCabinet: "Личный кабинет",
      noGate: "Без назначенных ворот",
    },
    header: {
      venue: "Муниципальный стадион Оргеев",
      menuDescription: "Быстрая навигация для болельщиков, стюардов и администраторов.",
      activeAccount: "Активный аккаунт",
      stewardOnly: "Аккаунт стюарда активен",
      reserveAccess: "Тикетинг доступен",
      cabinetActive: "Личный кабинет активен",
    },
    footer: {
      title: "MVP ticketing для Муниципального стадиона Оргеев",
      description:
        "Платформа создана для бесплатных билетов сейчас и масштабирования к коммерческим сценариям позже.",
      pills: ["QR-проверка", "PDF для печати", "Модерация злоупотреблений", "Supabase RLS"],
    },
    home: {
      badge: "Муниципальный стадион Оргеев",
      titleLine1: "Белый на красном.",
      titleLine2: "Matchday без трения.",
      description:
        "Более чистый, прямой и спортивный интерфейс для болельщиков, стюардов и администраторов. Быстрый выпуск, безопасный вход и операционный контроль в одной платформе.",
      primaryCta: "Запросить билеты на следующий матч",
      secondaryCta: "Войти в аккаунт",
      highlights: [
        {
          title: "Контролируемый выпуск",
          description:
            "Администраторы могут давать доступ только подходящим болельщикам, а выпуск остаётся быстрым и удобным на телефоне.",
        },
        {
          title: "Мгновенная проверка",
          description:
            "Каждый билет имеет уникальный QR-код и мгновенный ответ для стюарда у входа.",
        },
        {
          title: "Операционный контроль",
          description:
            "Администраторы видят лимиты, no-show, повторные сканы и признаки злоупотреблений в одном потоке.",
        },
      ],
      snapshotBadge: "Срез matchday",
      snapshotFallback: "Демо-матч готов",
      issued: "Выдано билетов",
      available: "Доступно",
      limit: "Лимит",
      snapshotDescription:
        "Новый дизайн делает акцент на контрасте, читаемости и скорости действий, особенно на мобильном в день матча.",
      exploreCta: "Открыть матч",
      publishedBadge: "Опубликованные матчи",
      publishedTitle: "Выбери матч и запроси своё место",
      publishedDescription:
        "На этом этапе билеты бесплатные, а право запроса можно включать для каждого пользователя без изменения архитектуры для будущей онлайн-оплаты.",
    },
    authPage: {
      badge: "Доступ болельщиков",
      title: "Войди. Запроси. Пройди.",
      description:
        "Твой аккаунт — основа для личного кабинета, выданных или купленных билетов, PDF, шаринга и истории прохода на стадион.",
      bullets: [
        "Доступ к запросу билетов администратор может выдать каждому пользователю отдельно",
        "Уникальный QR для каждого места и атомарная проверка при сканировании",
        "Быстрое создание аккаунта, сброс пароля и мгновенный доступ через Supabase Auth",
      ],
    },
    auth: {
      title: "Вход в платформу",
      description:
        "Создай аккаунт, открой кабинет и получи доступ к QR-билетам на матчи, для которых тебе выдали право запроса.",
      tabs: {
        signin: "Вход",
        signup: "Новый аккаунт",
        reset: "Сброс",
      },
      fields: {
        email: "Email",
        password: "Пароль",
        fullName: "Полное имя",
      },
      actions: {
        signin: "Войти",
        signup: "Создать аккаунт",
        reset: "Отправить ссылку",
      },
      validation: {
        email: "Введите корректный email.",
        password: "Пароль должен содержать минимум 6 символов.",
        fullName: "Введите полное имя.",
        invalidData: "Неверные данные.",
      },
      toasts: {
        signInSuccess: "Вход выполнен.",
        signUpSuccess: "Аккаунт создан. Теперь можно сразу войти.",
        signUpSession: "Аккаунт создан и авторизация выполнена.",
        resetSuccess: "Ссылка для сброса пароля отправлена на email.",
        missingConfig:
          "Публичная конфигурация Supabase недоступна в этой сборке. Если ты запускаешь локально, обнови .env.local и перезапусти Next сервер.",
      },
      missingVarsPrefix: "Отсутствуют публичные переменные Supabase:",
    },
    cabinet: {
      badge: "Личный кабинет",
      title: "Мои билеты",
      description:
        "Здесь ты видишь выданные билеты, историю сканирования и быстрый доступ к PDF, печати и отдельной странице каждого места.",
      ticketingActive: "Тикетинг активен для матчей, открытых для публики",
      summary: {
        activeTickets: "Активные билеты",
        upcomingMatches: "Будущие матчи",
        history: "История билетов",
        subscriptions: "Активные абонементы",
      },
      sections: {
        subscriptionsTitle: "Абонементы",
        subscriptionsSubtitle:
          "Если тебе выдали годовой или полугодовой абонемент, он появится здесь.",
        upcomingTitle: "Ближайшие матчи",
        upcomingSubtitle: "Активные билеты появляются здесь сразу после подтверждения.",
        historyTitle: "История и использованные билеты",
        historySubtitle: "Здесь появляются отсканированные, использованные билеты и уже прошедшие матчи.",
      },
      empty: {
        noSubscriptionsTitle: "Нет активных абонементов",
        noSubscriptionsDescription:
          "Абонементы, выданные администрацией, сразу появятся здесь.",
        noTicketsTitle: "У тебя пока нет активных билетов",
        noTicketsDescription:
          "Как только для твоего аккаунта будут выпущены билеты, они сразу появятся здесь.",
        noHistoryTitle: "История пока пуста",
        noHistoryDescription: "Сканированные билеты и прошедшие матчи появятся здесь.",
      },
      subscriptionValidUntil: "Действителен до",
      months: "месяцев",
    },
    confirmation: {
      badge: "Выпуск подтверждён",
      title: "Билеты готовы",
      description:
        "Для каждого выбранного места выпущен билет с уникальным QR. Ты можешь открыть их по отдельности, скачать в PDF или показать прямо у входа.",
      openFirst: "Открыть первый билет",
      downloadPdf: "Скачать PDF",
      goToCabinet: "Перейти в кабинет",
    },
    matchCard: {
      estimatedSeats: "мест примерно",
      freeOpen: "Бесплатный билет",
      paidOpen: "Платная покупка",
      defaultDescription:
        "Бесплатный билет с уникальным QR, доступом для стюарда и личным кабинетом болельщика.",
      standardLimit: "Стандартный лимит:",
      ticketsPerAccount: "билетов / аккаунт",
      details: "Подробнее",
      requestSeats: "Запросить места",
      getFree: "Получить бесплатный билет",
      buyPaid: "Купить билеты",
    },
    ticketList: {
      status: {
        active: "Активен",
        used: "Использован",
        canceled: "Отменён",
        blocked: "Заблокирован",
      },
      row: "Ряд",
      seat: "Место",
      scannedAt: "Отсканирован",
      openTicket: "Открыть билет",
      viewMatch: "Открыть матч",
      pdf: "PDF",
    },
    scanner: {
      restrictedTitle: "Доступ ограничен",
      restrictedDescription:
        "Сканер доступен только для ролей стюард, админ или суперадмин.",
      badge: "Matchday tools",
      title: "Сканер стюарда",
    },
  },
} as const;

export type AppMessages = (typeof messages)[AppLocale];

export function getMessages(locale: AppLocale): AppMessages {
  return messages[locale];
}
