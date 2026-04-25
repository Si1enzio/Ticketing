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
      matches: "Evenimente",
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
      venue: "Platforma independenta de ticketing",
      menuDescription:
        "Navigatie rapida pentru participanti, operatori de acces si administratori.",
      activeAccount: "Cont activ",
      stewardOnly: "Cont steward activ",
      reserveAccess: "Ticketing disponibil",
      cabinetActive: "Cabinet personal activ",
    },
    footer: {
      title: "Ticket Hub",
      description:
        "Platforma independenta pentru bilete gratuite acum si fluxuri cu plata ulterior, pregatita pentru sport, concerte, festivaluri si conferinte.",
      pills: ["QR validare", "PDF printabil", "Multi-eveniment", "Supabase RLS"],
    },
    home: {
      badge: "Ticket Hub",
      titleLine1: "Evenimente fara frictiune.",
      titleLine2: "Acces sigur, bilete clare.",
      description:
        "O interfata curata si rapida pentru participanti, operatori de acces si organizatori. Emitere simpla, QR sigur si control operational intr-o platforma multi-eveniment.",
      primaryCta: "Vezi evenimentele disponibile",
      secondaryCta: "Intra in cont",
      highlights: [
        {
          title: "Emitere controlata",
          description:
            "Organizatorii pot emite bilete gratuite sau pot pregati fluxuri cu plata, fara sa schimbe arhitectura.",
        },
        {
          title: "Validare instant",
          description:
            "Fiecare bilet are QR unic si raspuns imediat pentru operatorul de acces.",
        },
        {
          title: "Control operational",
          description:
            "Adminii vad limite, scanari, duplicate si indicatori de risc intr-un singur flux.",
        },
      ],
      snapshotBadge: "Snapshot ticketing",
      snapshotFallback: "Eveniment demo pregatit",
      issued: "Bilete emise",
      available: "Disponibile",
      limit: "Limita",
      snapshotDescription:
        "Designul pune accent pe contrast, lizibilitate si viteza de actiune, mai ales pe mobil la intrare.",
      exploreCta: "Exploreaza evenimentul",
      publishedBadge: "Evenimente publicate",
      publishedTitle: "Alege evenimentul si obtine biletul",
      publishedDescription:
        "Biletele gratuite si cele cu plata pot fi obtinute imediat dupa autentificare, iar locurile raman blocate doar temporar in timpul selectiei.",
    },
    authPage: {
      badge: "Acces participanti",
      title: "Intra. Alege. Acceseaza.",
      description:
        "Contul tau este baza pentru cabinetul personal, biletele emise sau procurate, PDF, partajare si istoricul de acces la evenimente.",
      bullets: [
        "Dupa creare cont, confirmi emailul o singura data si activezi accesul",
        "QR unic pentru fiecare loc sau acces si validare atomica la scanare",
        "Creare cont rapida, resetare parola si acces imediat prin Supabase Auth",
      ],
    },
    auth: {
      title: "Intra in platforma",
      description:
        "Creeaza cont, confirma emailul si intra apoi in cabinet pentru biletele QR emise sau procurate.",
      tabs: {
        signin: "Login",
        signup: "Cont nou",
        reset: "Resetare",
      },
      fields: {
        email: "Email",
        password: "Parola",
        fullName: "Nume complet",
        phone: "Telefon",
        contactEmail: "Email de contact",
        locality: "Localitate",
        district: "Raion / judet",
        birthDate: "Data nasterii",
        gender: "Sex",
        preferredLanguage: "Limba preferata",
        marketingConsent: "Sunt de acord sa primesc informari si oferte de marketing.",
        smsConsent: "Sunt de acord sa primesc SMS-uri despre acces, update-uri si evenimente relevante.",
      },
      fieldOptions: {
        unspecified: "Nespecificat",
        male: "Masculin",
        female: "Feminin",
        other: "Altul",
      },
      signupHelp:
        "La creare cont cerem nume, email si telefon. Restul campurilor CRM sunt optionale si ajuta la segmentare, suport si comunicare relevanta.",
      actions: {
        signin: "Autentificare",
        signup: "Creeaza cont",
        reset: "Trimite link de resetare",
      },
      validation: {
        email: "Introdu o adresa de email valida.",
        password: "Parola trebuie sa aiba minimum 6 caractere.",
        fullName: "Introdu numele complet.",
        phone: "Introdu un numar de telefon valid.",
        birthDate: "Introdu o data a nasterii valida.",
        invalidData: "Date invalide.",
      },
      toasts: {
        signInSuccess: "Autentificare reusita.",
        signUpSuccess: "Cont creat. Verifica emailul si confirma inregistrarea pentru a activa contul.",
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
      ticketingActive: "Ticketing activ pentru evenimentele deschise publicului",
      summary: {
        activeTickets: "Bilete active",
        upcomingMatches: "Evenimente viitoare",
        history: "Istoric bilete",
        subscriptions: "Abonamente active",
      },
      sections: {
        subscriptionsTitle: "Abonamente",
        subscriptionsSubtitle:
          "Daca ai primit un abonament anual sau semi-anual, il vezi aici.",
        upcomingTitle: "Evenimente urmatoare",
        upcomingSubtitle:
          "Biletele active apar aici imediat dupa confirmarea emiterii.",
        historyTitle: "Istoric si bilete folosite",
        historySubtitle:
          "Aici apar biletele scanate, folosite sau evenimentele deja trecute.",
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
          "Biletele scanate sau evenimentele trecute vor aparea aici.",
      },
      subscriptionValidUntil: "Valabil pana la",
      months: "luni",
      carousel: {
        title: "Mai multe bilete pentru acelasi meci",
        subtitle:
          "Gliseaza stanga-dreapta pentru a trece rapid la urmatorul QR din acest meci.",
        previous: "Biletul anterior",
        next: "Biletul urmator",
        counter: "Biletul {current} din {total}",
      },
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
    estimatedSeats: "locuri disponibile",
      freeOpen: "Bilet gratuit",
      paidOpen: "Procurare cu plata",
      defaultDescription:
        "Bilet emis cu QR unic, validare rapida si cabinet personal pentru participanti.",
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
      viewMatch: "Vezi evenimentul",
      pdf: "PDF",
    },
    scanner: {
      restrictedTitle: "Acces restrictionat",
      restrictedDescription:
        "Scannerul este disponibil doar pentru rolurile steward, admin sau superadmin.",
      badge: "Access tools",
      title: "Scanner acces",
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
        phone: "Телефон",
        locality: "Город",
        marketingConsent: "Согласен получать маркетинговые сообщения и предложения.",
        smsConsent: "Согласен получать SMS о доступе, обновлениях и релевантных событиях.",
      },
      signupHelp:
        "При создании аккаунта мы запрашиваем имя, email и телефон для выдачи билетов, поддержки и операционных уведомлений. Согласия на маркетинг и SMS необязательны.",
      actions: {
        signin: "Войти",
        signup: "Создать аккаунт",
        reset: "Отправить ссылку",
      },
      validation: {
        email: "Введите корректный email.",
        password: "Пароль должен содержать минимум 6 символов.",
        fullName: "Введите полное имя.",
        phone: "Введите корректный номер телефона.",
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
    estimatedSeats: "доступных мест",
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
  const base = messages[locale];

  if (locale !== "ru") {
    return base;
  }

  return {
    ...base,
    common: {
      ...base.common,
      matches: "События",
      roleCanReserve: "Расширенный доступ к билетам активен",
    },
    header: {
      ...base.header,
      venue: "Независимая ticketing-платформа",
      menuDescription:
        "Быстрая навигация для участников, операторов доступа и администраторов.",
    },
    footer: {
      ...base.footer,
      title: "Ticket Hub",
      description:
        "Независимая платформа для бесплатных билетов сейчас и платных сценариев позже: спорт, концерты, фестивали и конференции.",
      pills: ["QR-проверка", "PDF для печати", "Мульти-события", "Supabase RLS"],
    },
    home: {
      ...base.home,
      badge: "Ticket Hub",
      titleLine1: "События без трения.",
      titleLine2: "Надежный доступ.",
      description:
        "Быстрый и понятный интерфейс для участников, операторов доступа и организаторов.",
      primaryCta: "Смотреть события",
      snapshotBadge: "Ticketing snapshot",
      snapshotFallback: "Демо-событие готово",
      exploreCta: "Открыть событие",
      publishedBadge: "Опубликованные события",
      publishedTitle: "Выбери событие и получи билет",
    },
    authPage: {
      ...base.authPage,
      badge: "Доступ участников",
      title: "Войди. Выбери. Проходи.",
      description:
        "Аккаунт нужен для личного кабинета, билетов, PDF, шаринга и истории доступа.",
    },
    scanner: {
      ...base.scanner,
      badge: "Access tools",
      title: "Сканер доступа",
    },
  } as unknown as AppMessages;
}
