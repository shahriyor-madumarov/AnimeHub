/**
 * GraphQL queries with variables for AniList API.
 */

export const MEDIA_LIST_FIELDS_FRAGMENT = `
  fragment mediaListFields on Media {
    id
    idMal
    title {
      romaji
      english
      native
    }
    type
    format
    status
    description(asHtml: false)
    startDate {
      year
      month
      day
    }
    season
    seasonYear
    episodes
    duration
    chapters
    volumes
    genres
    synonyms
    synopsis: description
    averageScore
    meanScore
    popularity
    isAdult
    coverImage {
      extraLarge
      large
      medium
      color
    }
    bannerImage
    trailer {
      id
      site
      thumbnail
    }
    studios(isMain: true) {
      nodes {
        id
        name
        isAnimationStudio
      }
    }
  }
`;

export const MEDIA_FIELDS_FRAGMENT = `
  ${MEDIA_LIST_FIELDS_FRAGMENT}
  fragment mediaFields on Media {
    ...mediaListFields
    staff(perPage: 8) {
      edges {
        role
        node {
          id
          name {
            full
          }
          image {
            large
            medium
          }
        }
      }
    }
  }
`;

export const MEDIA_DETAIL_FIELDS_FRAGMENT = `
  ${MEDIA_FIELDS_FRAGMENT}
  fragment mediaDetailFields on Media {
    ...mediaFields
    characters(sort: [ROLE, RELEVANCE], perPage: 12) {
      edges {
        role
        node {
          id
          name {
            full
          }
          image {
            large
            medium
          }
        }
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          type
          format
          title {
            english
            romaji
          }
          coverImage {
            large
            medium
          }
        }
      }
    }
    recommendations(sort: [RATING_DESC], perPage: 12) {
      nodes {
        mediaRecommendation {
          id
          type
          averageScore
          meanScore
          title {
            english
            romaji
            native
          }
          coverImage {
            extraLarge
            large
            medium
          }
          startDate {
            year
          }
        }
      }
    }
  }
`;

export const GET_MEDIA_LIST_QUERY = `
  ${MEDIA_LIST_FIELDS_FRAGMENT}
  query GetMediaList(
    $page: Int = 1,
    $perPage: Int = 20,
    $type: MediaType,
    $sort: [MediaSort],
    $genre: String,
    $status: MediaStatus,
    $season: MediaSeason,
    $seasonYear: Int,
    $search: String,
    $isAdult: Boolean = false
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(
        type: $type,
        sort: $sort,
        genre: $genre,
        status: $status,
        season: $season,
        seasonYear: $seasonYear,
        search: $search,
        isAdult: $isAdult
      ) {
        ...mediaListFields
      }
    }
  }
`;

export const GET_MEDIA_DETAIL_QUERY = `
  ${MEDIA_DETAIL_FIELDS_FRAGMENT}
  query GetMediaDetail($id: Int, $type: MediaType, $isAdult: Boolean = false) {
    Media(id: $id, type: $type, isAdult: $isAdult) {
      ...mediaDetailFields
    }
  }
`;
