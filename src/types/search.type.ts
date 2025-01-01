import { PagingResponse } from "./paging.type.js"

export type NetworkDepth = 'F' | 'S' | 'O'

export interface SearchParams {
  offset?: number
  limit?: number
  filters?: string
  query?: string
}

export type SearchPeopleParams = Omit<SearchParams, 'filters'> & {
  connectionOf?: string
  networkDepths?: NetworkDepth[]
  currentCompany?: string[]
  pastCompanies?: string[]
  nonprofitInterests?: string[]
  profileLanguages?: string[]
  regions?: string[]
  industries?: string[]
  schools?: string[]
  contactInterests?: string[]
  serviceCategories?: string[]
  includePrivateProfiles?: boolean
  keywordFirstName?: string
  keywordLastName?: string
  keywordTitle?: string
  keywordCompany?: string
  keywordSchool?: string

  /** @deprecated use `networkDepths` instead. */
  networkDepth?: NetworkDepth

  /** @deprecated Use `keywordTitle` instead. */
  title?: string
}

export type SearchCompaniesParams = Omit<SearchParams, 'filters'>

export interface ProfileSearchResult {
  urnId: string
  name: string
  url: string
  image?: string
  distance?: string
  jobTitle?: string
  location?: string
  summary?: string
}

export interface CompanySearchResult {
  urnId: string
  name: string
  url: string
  image?: string
  industry?: string
  location?: string
  numFollowers?: string
  summary?: string
}



export interface SearchResponse {
  paging: PagingResponse
  results: EntitySearchResult[]
}

export interface SearchPeopleResponse {
  paging: PagingResponse
  results: ProfileSearchResult[]
}

export interface SearchCompaniesResponse {
  paging: PagingResponse
  results: CompanySearchResult[]
}

export interface TextData {
  textDirection: string
  text: string
  attributesV2: any[]
  accessibilityTextAttributesV2: any[]
  accessibilityText: string
  $recipeTypes: string[]
  $type: string
}

export interface ImageViewModel {
  attributes: {
    scalingType: any
    detailData: {
      imageUrl: any
      icon: string
      systemImage: any
      vectorImage: any
      ghostImage: any
      profilePicture: any
      profilePictureWithoutFrame: any
      profilePictureWithRingStatus: any
      companyLogo: any
      professionalEventLogo: any
      groupLogo: any
      schoolLogo: any
      nonEntityGroupLogo?: any
      nonEntityProfessionalEventLogo?: any
      nonEntityCompanyLogo?: any
      nonEntitySchoolLogo?: any
      nonEntityProfilePicture?: any
    }
    tintColor: any
    $recipeTypes: string[]
    tapTargets: any[]
    displayAspectRatio: any
    $type: string
  }[]
  editableAccessibilityText: boolean
  actionTarget: any
  accessibilityTextAttributes: any[]
  totalCount: any
  accessibilityText: any
  $recipeTypes: string[]
  $type: string
}

export interface EntitySearchResult {
  $type: string
  entityUrn: string
  title: TextData
  summary: TextData
  primarySubtitle: TextData
  secondarySubtitle: TextData
  badgeText: TextData
  navigationUrl: string
  template: string
  actorNavigationContext: any
  bserpEntityNavigationalUrl: string
  trackingUrn: string
  controlName: any
  interstitialComponent: any
  primaryActions: any[]
  entityCustomTrackingInfo: {
    memberDistance: string
    privacySettingsInjectionHolder: any
    $recipeTypes: string[]
    nameMatch: boolean
    $type: string
  }
  badgeData: {
    badgeHoverText: string
    targetUrn: string
    $recipeTypes: string[]
    $type: string
  }
  overflowActions: any[]
  '*lazyLoadedActions'?: string
  searchActionType: any
  actorInsights: any[]
  insightsResolutionResults: {
    jobPostingInsight: any
    relationshipsInsight: any
    serviceProviderRatingInsight: any
    simpleInsight: {
      image: ImageViewModel
      controlName: any
      navigationUrl: any
      title: TextData
      $recipeTypes: string[]
      $type: string
      searchActionType: string
      subtitleMaxNumLines: number
      titleFontSize: any
      subtitle: any
      subtitleFontSize: any
      titleMaxNumLines: number
    }
    jobPostingFooterInsight: any
    socialActivityCountsInsight: any
    labelsInsight: any
    premiumCustomCtaInsight: any
  }[]
  image: ImageViewModel
  badgeIcon: ImageViewModel
  showAdditionalCluster: boolean
  ringStatus: any
  trackingId: string
  addEntityToSearchHistory: boolean
  actorNavigationUrl: any
  entityEmbeddedObject: any
  unreadIndicatorDetails: any
  $recipeTypes: string[]
  target: any
  actorTrackingUrn: any
  navigationContext: {
    openExternally: boolean
    $recipeTypes: string[]
    url: string
    $type: string
  }
}