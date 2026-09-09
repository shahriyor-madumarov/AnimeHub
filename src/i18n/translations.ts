export type SupportedLanguage = 'en' | 'ru';

export interface TranslationDictionary {
  // Navigation
  navHome: string;
  navAnime: string;
  navManga: string;
  navManhwa: string;
  navNews: string;
  navSearch: string;
  navLibrary: string;
  navGuest: string;
  navSavedCount: string;

  // Search
  searchPlaceholder: string;
  searchHint: string;
  searchClear: string;
  searchNoResults: string;
  searchFoundCount: string;
  searchTitle: string;
  searchSubtitle: string;
  libraryTitle: string;
  librarySubtitle: string;
  allFormats: string;
  animeOnly: string;
  mangaOnly: string;
  manhwaOnly: string;
  myLibrary: string;
  anyScore: string;
  minRating: string;
  noDiscoveryResults: string;
  noDiscoveryDesc: string;
  emptyLibraryDesc: string;
  resetAllFilters: string;
  foundResults: string;
  resultsWord: string;

  // Sections
  trending: string;
  trendingAnime: string;
  trendingManga: string;
  trendingManhwa: string;
  latestUpdates: string;
  latestAnime: string;
  popularManga: string;
  popularManhwa: string;
  latestNews: string;
  trendingSubtitle: string;
  latestAnimeSubtitle: string;
  popularMangaSubtitle: string;
  popularManhwaSubtitle: string;
  latestNewsSubtitle: string;
  popularAllTime: string;
  featuredStories: string;
  topRated: string;
  spotlight: string;
  exploreCatalog: string;
  animeSubtitle: string;
  noAnimeFound: string;
  printSerializations: string;
  mangaSubtitle: string;
  koreanWebtoons: string;
  manhwaSubtitle: string;
  noMangaFound: string;
  noManhwaFound: string;
  tryDifferentGenre: string;
  showing: string;
  titles: string;
  of: string;
  details: string;
  watchNow: string;

  // Common UI & Actions
  all: string;
  viewAll: string;
  readMore: string;
  showLess: string;
  readStory: string;
  watchTrailer: string;
  previewTrailer: string;
  addToLibrary: string;
  removeFromLibrary: string;
  inLibrary: string;
  saveToLibrary: string;
  loading: string;
  errorLoading: string;
  retry: string;
  emptyStateTitle: string;
  emptyStateDesc: string;
  resetFilters: string;
  share: string;
  linkCopied: string;

  // Filters & Sorting
  filters: string;
  genres: string;
  allGenres: string;
  clearGenre: string;
  status: string;
  allStatus: string;
  airing: string;
  completed: string;
  upcoming: string;
  publishing: string;
  hiatus: string;
  sort: string;
  sortHighestRated: string;
  sortMostPopular: string;
  sortReleaseDate: string;
  sortTitleAZ: string;

  // Formats
  format: string;
  tvSeries: string;
  movie: string;
  ova: string;
  special: string;
  manga: string;
  webtoon: string;
  oneShot: string;

  // Media Meta
  year: string;
  episodes: string;
  eps: string;
  chapters: string;
  volumes: string;
  duration: string;
  studio: string;
  author: string;
  mangaka: string;
  rating: string;
  score: string;
  popularity: string;
  rank: string;
  season: string;

  // Pagination
  pagination: string;
  page: string;
  previous: string;
  next: string;
  back: string;
  backToNews: string;

  // Detail Page Tabs & Sections
  overview: string;
  synopsis: string;
  characters: string;
  mainCharacters: string;
  voiceActors: string;
  staff: string;
  productionTeam: string;
  recommendations: string;
  relatedTitles: string;
  trailer: string;
  externalLinks: string;

  // News Meta
  news: string;
  published: string;
  source: string;
  readTime: string;
  editorialDispatch: string;
  dispatchSubtitle: string;
  allCategories: string;

  // Seasons
  winter: string;
  spring: string;
  summer: string;
  fall: string;

  // Genre Translations
  genreAction: string;
  genreAdventure: string;
  genreComedy: string;
  genreDrama: string;
  genreEcchi: string;
  genreFantasy: string;
  genreHorror: string;
  genreMahouShoujo: string;
  genreMecha: string;
  genreMusic: string;
  genreMystery: string;
  genrePsychological: string;
  genreRomance: string;
  genreSciFi: string;
  genreSliceOfLife: string;
  genreSports: string;
  genreSupernatural: string;
  genreThriller: string;
  genreMartialArts: string;
  genreMurim: string;
  genreIsekai: string;
  genreDungeon: string;
  genreReincarnation: string;
  genreSystem: string;
  genreHistorical: string;
  genreMagic: string;
  genreApocalyptic: string;
  genreHighSchool: string;

  // Footer
  footerDesc: string;
  footerExplore: string;
  footerInfo: string;
  footerLegal: string;
  footerSubscribePlaceholder: string;
  footerJoin: string;
  footerAbout: string;
  footerContact: string;
  footerPrivacy: string;
  footerTerms: string;
  footerDmca: string;
  footerRights: string;
  footerSubscribed: string;
  footerDigestNotice: string;

  // Authentication
  authLogin: string;
  authRegister: string;
  authSignIn: string;
  authSignUp: string;
  authSignOut: string;
  authLogout: string;
  authEmail: string;
  authPassword: string;
  authConfirmPassword: string;
  authDisplayName: string;
  authDisplayNamePlaceholder: string;
  authEmailPlaceholder: string;
  authPasswordPlaceholder: string;
  authConfirmPasswordPlaceholder: string;
  authAlreadyHaveAccount: string;
  authDontHaveAccount: string;
  authRegistrationSuccess: string;
  authCheckEmail: string;
  authCheckEmailNotice: string;
  authLoginSuccess: string;
  authInvalidCredentials: string;
  authEmailAlreadyRegistered: string;
  authWeakPassword: string;
  authPasswordsDoNotMatch: string;
  authEmailRequired: string;
  authInvalidEmail: string;
  authPasswordRequired: string;
  authNetworkError: string;
  authUnknownError: string;
  authNotConfiguredTitle: string;
  authNotConfiguredDesc: string;
  authProfileTitle: string;
  authAccount: string;
  authUserId: string;
  authGuest: string;
  authLoggingIn: string;
  authRegistering: string;
  authLoginRequired: string;
  authLoginRequiredDesc: string;
}

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    // Navigation
    navHome: 'Home',
    navAnime: 'Anime',
    navManga: 'Manga',
    navManhwa: 'Manhwa',
    navNews: 'News',
    navSearch: 'Search',
    navLibrary: 'My Library',
    navGuest: 'Guest User',
    navSavedCount: 'Saved in Library',

    // Search
    searchPlaceholder: 'Search anime, manga, manhwa, studios, creators...',
    searchHint: 'Press ⌘K or / to search anytime',
    searchClear: 'Clear search',
    searchNoResults: 'No titles found matching your search query.',
    searchFoundCount: 'titles found',
    searchTitle: 'Universal Discovery Search',
    searchSubtitle: 'Search and filter across our complete anime, manga, and manhwa collections.',
    libraryTitle: 'Your Personal Library',
    librarySubtitle: 'You have saved titles to your collection.',
    allFormats: 'All Formats',
    animeOnly: 'Anime Only',
    mangaOnly: 'Manga Only',
    manhwaOnly: 'Manhwa Webtoons',
    myLibrary: 'My Library',
    anyScore: 'Any Score',
    minRating: 'Min Rating',
    noDiscoveryResults: 'No discovery results',
    noDiscoveryDesc: 'We could not find any titles matching your search query. Try adjusting your search query or reset your filters.',
    emptyLibraryDesc: 'You have not saved any titles to your library yet. Click the bookmark icon on any card to add it!',
    resetAllFilters: 'Reset All Filters',
    foundResults: 'Found',
    resultsWord: 'results',

    // Sections
    trending: 'Trending',
    trendingAnime: 'Trending Anime',
    trendingManga: 'Trending Manga',
    trendingManhwa: 'Trending Webtoons',
    latestUpdates: 'Latest Releases',
    latestAnime: 'Latest Anime',
    popularManga: 'Popular Manga',
    popularManhwa: 'Popular Manhwa',
    latestNews: 'Latest News',
    trendingSubtitle: 'The most popular series captivating global audiences right now',
    latestAnimeSubtitle: 'Fresh weekly broadcast releases and new seasonal premieres',
    popularMangaSubtitle: 'Masterpiece serialized prints, dark fantasy epics, and classic narratives',
    popularManhwaSubtitle: 'High-octane digital webtoons, dungeon systems, and reincarnated martial masters',
    latestNewsSubtitle: 'Industry headlines, studio announcements, and creator interviews',
    popularAllTime: 'All-Time Popular',
    featuredStories: 'Featured Dispatches',
    topRated: 'Top Rated',
    spotlight: 'Editorial Spotlight',
    exploreCatalog: 'Broadcast Catalog & Series',
    animeSubtitle: 'Discover top television anime broadcasts, acclaimed movies, OVAs, and ongoing seasonal series from Japan.',
    noAnimeFound: 'No anime found matching selected filters',
    printSerializations: 'Print & Digital Serializations',
    mangaSubtitle: 'Explore world-renowned Japanese graphic novels, legendary serialized masterpieces, and gripping psychological sagas.',
    koreanWebtoons: 'Korean Webtoons & Digital Scrolls',
    manhwaSubtitle: 'Immerse yourself in full-color Korean webtoons featuring dungeon gates, omniscient readers, martial art revivals, and modern action thrills.',
    noMangaFound: 'No manga found matching selected filters',
    noManhwaFound: 'No manhwa found matching selected filters',
    tryDifferentGenre: 'Try selecting a different genre or clearing the status filter.',
    showing: 'Showing',
    titles: 'titles',
    of: 'of',
    details: 'Details',
    watchNow: 'Watch Now',

    // Common UI & Actions
    all: 'All',
    viewAll: 'View All',
    readMore: 'Read More',
    showLess: 'Show Less',
    readStory: 'Read Story',
    watchTrailer: 'Watch Trailer',
    previewTrailer: 'Preview Trailer',
    addToLibrary: 'Add to Library',
    removeFromLibrary: 'Remove from Library',
    inLibrary: 'In Library',
    saveToLibrary: 'Save to Library',
    loading: 'Loading content...',
    errorLoading: 'Failed to load media. Please try again.',
    retry: 'Retry',
    emptyStateTitle: 'No items found',
    emptyStateDesc: 'Try adjusting your filters or search keywords.',
    resetFilters: 'Reset Filters',
    share: 'Share',
    linkCopied: 'Link copied to clipboard',

    // Filters & Sorting
    filters: 'Filters',
    genres: 'Genres',
    allGenres: 'All Genres',
    clearGenre: 'Reset Genre',
    status: 'Status',
    allStatus: 'All Statuses',
    airing: 'Airing',
    completed: 'Completed',
    upcoming: 'Upcoming',
    publishing: 'Publishing',
    hiatus: 'Hiatus',
    sort: 'Sort By',
    sortHighestRated: 'Highest Rated',
    sortMostPopular: 'Most Popular',
    sortReleaseDate: 'Release Date',
    sortTitleAZ: 'Title (A-Z)',

    // Formats
    format: 'Format',
    tvSeries: 'TV Series',
    movie: 'Movie',
    ova: 'OVA',
    special: 'Special',
    manga: 'Manga',
    webtoon: 'Webtoon',
    oneShot: 'One Shot',

    // Media Meta
    year: 'Year',
    episodes: 'Episodes',
    eps: 'eps',
    chapters: 'Chapters',
    volumes: 'Volumes',
    duration: 'Duration',
    studio: 'Studio',
    author: 'Author',
    mangaka: 'Mangaka',
    rating: 'Rating',
    score: 'Score',
    popularity: 'Popularity',
    rank: 'Rank',
    season: 'Season',

    // Pagination
    pagination: 'Pages',
    page: 'Page',
    previous: 'Previous',
    next: 'Next',
    back: 'Back',
    backToNews: 'Back to News Dispatch',

    // Detail Page Tabs & Sections
    overview: 'Overview',
    synopsis: 'Synopsis',
    characters: 'Characters',
    mainCharacters: 'Main Characters',
    voiceActors: 'Voice Cast',
    staff: 'Production Staff',
    productionTeam: 'Creative Staff',
    recommendations: 'Recommendations',
    relatedTitles: 'Related Titles',
    trailer: 'Official Trailer',
    externalLinks: 'External Links',

    // News Meta
    news: 'News',
    published: 'Published',
    source: 'Source',
    readTime: 'Read time',
    editorialDispatch: 'Editorial & Press Dispatch',
    dispatchSubtitle: 'Stay updated with studio announcements, releases, and industry dispatches.',
    allCategories: 'All Categories',

    // Seasons
    winter: 'Winter',
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',

    // Genre Translations
    genreAction: 'Action',
    genreAdventure: 'Adventure',
    genreComedy: 'Comedy',
    genreDrama: 'Drama',
    genreEcchi: 'Ecchi',
    genreFantasy: 'Fantasy',
    genreHorror: 'Horror',
    genreMahouShoujo: 'Mahou Shoujo',
    genreMecha: 'Mecha',
    genreMusic: 'Music',
    genreMystery: 'Mystery',
    genrePsychological: 'Psychological',
    genreRomance: 'Romance',
    genreSciFi: 'Sci-Fi',
    genreSliceOfLife: 'Slice of Life',
    genreSports: 'Sports',
    genreSupernatural: 'Supernatural',
    genreThriller: 'Thriller',
    genreMartialArts: 'Martial Arts',
    genreMurim: 'Murim',
    genreIsekai: 'Isekai',
    genreDungeon: 'Dungeon',
    genreReincarnation: 'Reincarnation',
    genreSystem: 'System',
    genreHistorical: 'Historical',
    genreMagic: 'Magic',
    genreApocalyptic: 'Apocalyptic',
    genreHighSchool: 'High School',

    // Footer
    footerDesc: 'The premier entertainment discovery platform for anime enthusiasts, manga connoisseurs, and webtoon readers. Track releases, discover trending narratives, and stay ahead of the industry.',
    footerExplore: 'Explore',
    footerInfo: 'Information',
    footerLegal: 'Legal',
    footerSubscribePlaceholder: 'Enter your email for release alerts...',
    footerJoin: 'Join',
    footerAbout: 'About AnimeHub',
    footerContact: 'Contact Support',
    footerPrivacy: 'Privacy Policy',
    footerTerms: 'Terms of Service',
    footerDmca: 'DMCA & Copyright Notice',
    footerRights: 'All rights reserved. Built for anime, manga & manhwa lovers.',
    footerSubscribed: 'Subscribed!',
    footerDigestNotice: 'You have joined the AnimeHub weekly digest.',

    // Authentication
    authLogin: 'Log In',
    authRegister: 'Register',
    authSignIn: 'Sign In',
    authSignUp: 'Create Account',
    authSignOut: 'Sign Out',
    authLogout: 'Log Out',
    authEmail: 'Email Address',
    authPassword: 'Password',
    authConfirmPassword: 'Confirm Password',
    authDisplayName: 'Display Name (Optional)',
    authDisplayNamePlaceholder: 'e.g. OtakuMaster',
    authEmailPlaceholder: 'name@example.com',
    authPasswordPlaceholder: 'At least 6 characters',
    authConfirmPasswordPlaceholder: 'Re-enter your password',
    authAlreadyHaveAccount: 'Already have an account?',
    authDontHaveAccount: "Don't have an account?",
    authRegistrationSuccess: 'Registration Successful!',
    authCheckEmail: 'Check Your Email',
    authCheckEmailNotice: 'A confirmation link has been sent to your email address. Please click it to complete registration.',
    authLoginSuccess: 'Successfully signed in.',
    authInvalidCredentials: 'Invalid email address or password.',
    authEmailAlreadyRegistered: 'An account with this email is already registered.',
    authWeakPassword: 'Password must be at least 6 characters long.',
    authPasswordsDoNotMatch: 'Passwords do not match.',
    authEmailRequired: 'Email address is required.',
    authInvalidEmail: 'Please enter a valid email address.',
    authPasswordRequired: 'Password is required.',
    authNetworkError: 'Network error. Please check your connection and retry.',
    authUnknownError: 'An unexpected authentication error occurred.',
    authNotConfiguredTitle: 'Supabase Not Configured',
    authNotConfiguredDesc: 'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live authentication.',
    authProfileTitle: 'User Profile',
    authAccount: 'Account',
    authUserId: 'User ID',
    authGuest: 'Guest User',
    authLoggingIn: 'Signing in...',
    authRegistering: 'Creating account...',
    authLoginRequired: 'Sign In Required',
    authLoginRequiredDesc: 'Please sign in or create an account to access this page.',
  },
  ru: {
    // Navigation
    navHome: 'Главная',
    navAnime: 'Аниме',
    navManga: 'Манга',
    navManhwa: 'Манхва',
    navNews: 'Новости',
    navSearch: 'Поиск',
    navLibrary: 'Моя библиотека',
    navGuest: 'Гость',
    navSavedCount: 'В библиотеке',

    // Search
    searchPlaceholder: 'Поиск аниме, манги, манхвы, студий, авторов...',
    searchHint: 'Нажмите ⌘K или / для быстрого поиска',
    searchClear: 'Очистить поиск',
    searchNoResults: 'По вашему запросу ничего не найдено.',
    searchFoundCount: 'найдено тайтлов',
    searchTitle: 'Универсальный поиск',
    searchSubtitle: 'Ищите и фильтруйте по полным коллекциям аниме, манги и манхвы.',
    libraryTitle: 'Ваша личная библиотека',
    librarySubtitle: 'В вашей коллекции сохранены тайтлы.',
    allFormats: 'Все форматы',
    animeOnly: 'Только аниме',
    mangaOnly: 'Только манга',
    manhwaOnly: 'Манхва вебтуны',
    myLibrary: 'Моя библиотека',
    anyScore: 'Любая оценка',
    minRating: 'Мин. рейтинг',
    noDiscoveryResults: 'Результаты не найдены',
    noDiscoveryDesc: 'Не удалось найти тайтлы по вашему запросу. Попробуйте изменить поисковый запрос или сбросить фильтры.',
    emptyLibraryDesc: 'Вы пока не сохранили тайтлы в библиотеку. Нажмите на иконку закладки на любой карточке, чтобы добавить!',
    resetAllFilters: 'Сбросить все фильтры',
    foundResults: 'Найдено',
    resultsWord: 'результатов',

    // Sections
    trending: 'В тренде',
    trendingAnime: 'Популярное аниме',
    trendingManga: 'Популярная манга',
    trendingManhwa: 'Популярная манхва',
    latestUpdates: 'Новые релизы',
    latestAnime: 'Новинки аниме',
    popularManga: 'Популярная манга',
    popularManhwa: 'Популярная манхва',
    latestNews: 'Последние новости',
    trendingSubtitle: 'Самые популярные сериалы, покоряющие зрителей по всему миру прямо сейчас',
    latestAnimeSubtitle: 'Свежие еженедельные трансляции и новые сезонные премьеры',
    popularMangaSubtitle: 'Шедевры печатных изданий, темное фэнтези и классические истории',
    popularManhwaSubtitle: 'Захватывающие вебтуны, системы подземелий и перерождения мастеров боевых искусств',
    latestNewsSubtitle: 'Главные события индустрии, анонсы студий и интервью с создателями',
    popularAllTime: 'Популярное за все время',
    featuredStories: 'Главные новости',
    topRated: 'Высокий рейтинг',
    spotlight: 'Выбор редакции',
    exploreCatalog: 'Каталог трансляций и сериалов',
    animeSubtitle: 'Исследуйте лучшие аниме-сериалы, признанные полнометражные фильмы, OVA и онгоинги из Японии.',
    noAnimeFound: 'Аниме по выбранным фильтрам не найдено',
    printSerializations: 'Печатные и цифровые сериализации',
    mangaSubtitle: 'Исследуйте всемирно известную японскую мангу, легендарные шедевры и захватывающие истории.',
    koreanWebtoons: 'Корейские вебтуны и цифровые свитки',
    manhwaSubtitle: 'Погрузитесь в цветные корейские вебтуны с вратами подземелий, боевыми искусствами и динамичным экшеном.',
    noMangaFound: 'Манга по выбранным фильтрам не найдена',
    noManhwaFound: 'Манхва по выбранным фильтрам не найдена',
    tryDifferentGenre: 'Попробуйте выбрать другой жанр или очистить фильтр статуса.',
    showing: 'Показано',
    titles: 'тайтлов',
    of: 'из',
    details: 'Подробнее',
    watchNow: 'Смотреть',

    // Common UI & Actions
    all: 'Все',
    viewAll: 'Смотреть все',
    readMore: 'Читать далее',
    showLess: 'Свернуть',
    readStory: 'Читать новость',
    watchTrailer: 'Смотреть трейлер',
    previewTrailer: 'Трейлер',
    addToLibrary: 'Добавить в список',
    removeFromLibrary: 'Удалить из списка',
    inLibrary: 'В списке',
    saveToLibrary: 'В библиотеку',
    loading: 'Загрузка данных...',
    errorLoading: 'Не удалось загрузить данные. Попробуйте еще раз.',
    retry: 'Повторить',
    emptyStateTitle: 'Ничего не найдено',
    emptyStateDesc: 'Попробуйте изменить выбранные фильтры или поисковый запрос.',
    resetFilters: 'Сбросить фильтры',
    share: 'Поделиться',
    linkCopied: 'Ссылка скопирована в буфер',

    // Filters & Sorting
    filters: 'Фильтры',
    genres: 'Жанры',
    allGenres: 'Все жанры',
    clearGenre: 'Сбросить жанр',
    status: 'Статус',
    allStatus: 'Любой статус',
    airing: 'Онгоинг',
    completed: 'Завершено',
    upcoming: 'Анонс',
    publishing: 'Выходит',
    hiatus: 'Приостановлено',
    sort: 'Сортировка',
    sortHighestRated: 'С высоким рейтингом',
    sortMostPopular: 'Самые популярные',
    sortReleaseDate: 'По дате выхода',
    sortTitleAZ: 'По названию (А-Я)',

    // Formats
    format: 'Формат',
    tvSeries: 'ТВ-сериал',
    movie: 'Фильм',
    ova: 'OVA',
    special: 'Спецвыпуск',
    manga: 'Манга',
    webtoon: 'Вебтун',
    oneShot: 'Ваншот',

    // Media Meta
    year: 'Год',
    episodes: 'Эпизоды',
    eps: 'эп.',
    chapters: 'Главы',
    volumes: 'Тома',
    duration: 'Длительность',
    studio: 'Студия',
    author: 'Автор',
    mangaka: 'Мангака',
    rating: 'Рейтинг',
    score: 'Оценка',
    popularity: 'Популярность',
    rank: 'Место',
    season: 'Сезон',

    // Pagination
    pagination: 'Страницы',
    page: 'Стр.',
    previous: 'Назад',
    next: 'Вперед',
    back: 'Назад',
    backToNews: 'Назад к новостям',

    // Detail Page Tabs & Sections
    overview: 'Обзор',
    synopsis: 'Описание',
    characters: 'Персонажи',
    mainCharacters: 'Главные герои',
    voiceActors: 'Сэйю и озвучка',
    staff: 'Создатели',
    productionTeam: 'Команда авторов',
    recommendations: 'Рекомендации',
    relatedTitles: 'Связанные тайтлы',
    trailer: 'Официальный трейлер',
    externalLinks: 'Внешние ссылки',

    // News Meta
    news: 'Новости',
    published: 'Опубликовано',
    source: 'Источник',
    readTime: 'Время чтения',
    editorialDispatch: 'Редакционная сводка',
    dispatchSubtitle: 'Актуальные анонсы студий, премьеры и события аниме-индустрии.',
    allCategories: 'Все категории',

    // Seasons
    winter: 'Зима',
    spring: 'Весна',
    summer: 'Лето',
    fall: 'Осень',

    // Genre Translations
    genreAction: 'Экшен',
    genreAdventure: 'Приключения',
    genreComedy: 'Комедия',
    genreDrama: 'Драма',
    genreEcchi: 'Этти',
    genreFantasy: 'Фэнтези',
    genreHorror: 'Ужасы',
    genreMahouShoujo: 'Махо-сёдзё',
    genreMecha: 'Меха',
    genreMusic: 'Музыка',
    genreMystery: 'Детектив',
    genrePsychological: 'Психология',
    genreRomance: 'Романтика',
    genreSciFi: 'Фантастика',
    genreSliceOfLife: 'Повседневность',
    genreSports: 'Спорт',
    genreSupernatural: 'Сверхъестественное',
    genreThriller: 'Триллер',
    genreMartialArts: 'Боевые искусства',
    genreMurim: 'Мурим',
    genreIsekai: 'Исекай',
    genreDungeon: 'Подземелья',
    genreReincarnation: 'Реинкарнация',
    genreSystem: 'Система',
    genreHistorical: 'Исторический',
    genreMagic: 'Магия',
    genreApocalyptic: 'Апокалипсис',
    genreHighSchool: 'Школа',

    // Footer
    footerDesc: 'Ведущая платформа поиска развлечений для любителей аниме, ценителей манги и читателей вебтунов. Отслеживайте релизы, открывайте трендовые истории и будьте в курсе индустрии.',
    footerExplore: 'Навигация',
    footerInfo: 'Информация',
    footerLegal: 'Правовая информация',
    footerSubscribePlaceholder: 'Введите email для уведомлений о релизах...',
    footerJoin: 'Подписаться',
    footerAbout: 'О проекте AnimeHub',
    footerContact: 'Служба поддержки',
    footerPrivacy: 'Политика конфиденциальности',
    footerTerms: 'Условия использования',
    footerDmca: 'DMCA и авторские права',
    footerRights: 'Все права защищены. Создано для ценителей аниме, манги и манхвы.',
    footerSubscribed: 'Подписка оформлена!',
    footerDigestNotice: 'Вы подписались на еженедельный дайджест AnimeHub.',

    // Authentication
    authLogin: 'Вход',
    authRegister: 'Регистрация',
    authSignIn: 'Войти',
    authSignUp: 'Создать аккаунт',
    authSignOut: 'Выйти',
    authLogout: 'Выйти',
    authEmail: 'Электронная почта',
    authPassword: 'Пароль',
    authConfirmPassword: 'Подтвердите пароль',
    authDisplayName: 'Имя пользователя (необязательно)',
    authDisplayNamePlaceholder: 'Например, OtakuMaster',
    authEmailPlaceholder: 'name@example.com',
    authPasswordPlaceholder: 'Минимум 6 символов',
    authConfirmPasswordPlaceholder: 'Повторите пароль',
    authAlreadyHaveAccount: 'Уже есть аккаунт?',
    authDontHaveAccount: 'Еще нет аккаунта?',
    authRegistrationSuccess: 'Регистрация успешна!',
    authCheckEmail: 'Проверьте ваш email',
    authCheckEmailNotice: 'Мы отправили ссылку для подтверждения на ваш email. Перейдите по ней, чтобы завершить регистрацию.',
    authLoginSuccess: 'Вы успешно вошли в аккаунт.',
    authInvalidCredentials: 'Неверный адрес электронной почты или пароль.',
    authEmailAlreadyRegistered: 'Пользователь с таким email уже зарегистрирован.',
    authWeakPassword: 'Пароль должен содержать минимум 6 символов.',
    authPasswordsDoNotMatch: 'Пароли не совпадают.',
    authEmailRequired: 'Введите адрес электронной почты.',
    authInvalidEmail: 'Пожалуйста, введите корректный адрес email.',
    authPasswordRequired: 'Введите пароль.',
    authNetworkError: 'Ошибка сети. Проверьте подключение и повторите попытку.',
    authUnknownError: 'Произошла непредвиденная ошибка аутентификации.',
    authNotConfiguredTitle: 'Supabase не настроен',
    authNotConfiguredDesc: 'Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY для включения авторизации.',
    authProfileTitle: 'Профиль пользователя',
    authAccount: 'Аккаунт',
    authUserId: 'ID пользователя',
    authGuest: 'Гость',
    authLoggingIn: 'Вход в систему...',
    authRegistering: 'Создание аккаунта...',
    authLoginRequired: 'Требуется вход',
    authLoginRequiredDesc: 'Пожалуйста, войдите в систему или создайте аккаунт, чтобы перейти к этой странице.',
  },
};
