export interface ApplicationInstance {
  applicationUrn: string
  version: string
  trackingId: number[]
}

export interface LinkedInMetadata {
  applicationInstance?: ApplicationInstance
  clientPageInstanceId?: string
}

export interface ProfileView {
  positionGroupView: PositionGroupView
  patentView: PatentView
  summaryTreasuryMediaCount: number
  summaryTreasuryMedias: any[]
  educationView: EducationView
  organizationView: OrganizationView
  projectView: ProjectView
  positionView: PositionView
  profile: Profile
  languageView: LanguageView
  certificationView: CertificationView
  testScoreView: TestScoreView
  volunteerCauseView: VolunteerCauseView
  entityUrn: string
  courseView: CourseView
  honorView: HonorView
  skillView: SkillView
  volunteerExperienceView: VolunteerExperienceView
  primaryLocale: PrimaryLocale
  publicationView: PublicationView
}

export interface PositionGroupView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: Element[]
}

export interface Paging {
  start: number
  count: number
  total: number
  links: any[]
}

export interface Element {
  entityUrn: string
  name: string
  positions?: Position[]
  paging?: Paging
  timePeriod?: TimePeriod
  miniCompany?: MiniCompany
}

export interface TimePeriod {
  startDate?: StartDate
  endDate?: EndDate
}

export interface StartDate {
  month?: number
  year?: number
}

export interface EndDate {
  month?: number
  year?: number
}

export interface Position {
  entityUrn: string
  companyName: string
  timePeriod: TimePeriod
  description?: string
  title: string
  companyUrn: string
  company?: Company
  locationName?: string
  geoLocationName?: string
  geoUrn?: string
  region?: string
}

export interface Company {
  miniCompany: MiniCompany
  employeeCountRange: EmployeeCountRange
  industries: string[]
}

export interface MiniCompany {
  objectUrn: string
  entityUrn: string
  name: string
  showcase: boolean
  active: boolean
  logo: LinkedVectorImage
  universalName: string
  dashCompanyUrn: string
  trackingId: string
}

export interface VectorImage {
  artifacts: Artifact[]
  rootUrl: string
}

export interface Artifact {
  fileIdentifyingUrlPathSegment: string
  width: number
  height: number
  expiresAt: number
  $recipeTypes?: string[]
  $type?: string
}

export interface EmployeeCountRange {
  start: number
  end?: number
}

export interface PatentView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: any[]
}

export interface EducationView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: {
    entityUrn: string
    school?: School
    timePeriod: TimePeriod
    degreeName: string
    schoolName: string
    fieldOfStudy?: string
    schoolUrn?: string
  }[]
}

export interface School {
  objectUrn: string
  entityUrn: string
  active: boolean
  logo: LinkedVectorImage
  schoolName: string
  trackingId: string
}

export interface OrganizationView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: any[]
}

export interface ProjectView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: any[]
}

export interface PositionView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: {
    entityUrn: string
    companyName: string
    timePeriod: TimePeriod
    description?: string
    title: string
    companyUrn: string
    company?: Company
    locationName?: string
    geoLocationName?: string
    geoUrn?: string
    region?: string
  }[]
}

export interface Profile {
  summary: string
  industryName: string
  lastName: string
  supportedLocales: SupportedLocale[]
  locationName: string
  student: boolean
  geoCountryName: string
  geoCountryUrn: string
  versionTag: string
  geoLocationBackfilled: boolean
  elt: boolean
  industryUrn: string
  defaultLocale: DefaultLocale
  firstName: string
  showEducationOnProfileTopCard: boolean
  entityUrn: string
  geoLocation: GeoLocation
  geoLocationName: string
  location: Location
  miniProfile: MiniProfile
  headline: string
}

export interface SupportedLocale {
  country: string
  language: string
}

export interface DefaultLocale {
  country: string
  language: string
}

export interface GeoLocation {
  geoUrn: string
}

export interface Location {
  basicLocation: BasicLocation
}

export interface BasicLocation {
  countryCode: string
}

export interface MiniProfile {
  firstName: string
  lastName: string
  dashEntityUrn: string
  occupation: string
  objectUrn: string
  entityUrn: string
  publicIdentifier: string
  trackingId: string
  backgroundImage?: LinkedVectorImage
  picture?: LinkedVectorImage
}

export interface LinkedVectorImage {
  'com.linkedin.common.VectorImage': VectorImage
}

export interface LanguageView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: any[]
}

export interface CertificationView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: any[]
}

export interface TestScoreView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: any[]
}

export interface VolunteerCauseView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: any[]
}

export interface CourseView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: any[]
}

export interface HonorView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: any[]
}

export interface SkillView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: Element[]
}

export interface VolunteerExperienceView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: any[]
}

export interface PrimaryLocale {
  country: string
  language: string
}

export interface PublicationView {
  paging: Paging
  entityUrn: string
  profileId: string
  elements: any[]
}

export type ProfileContactInfo = {
  entityUrn: string

  websites?: Array<{
    type: Record<
      string,
      {
        category: string
      }
    >
    url: string
  }>

  twitterHandles?: Array<{
    name: string
    credentialId: string
  }>

  emailAddress?: any[]
  phoneNumbers?: any[]
  ims?: any[]
  birthDateOn?: any
}

export type ProfileSkills = {
  paging: Paging
  elements: Element[]
}

export type ExperienceItem = {
  title: string
  companyName?: string
  companyImage?: string
  companyId?: string
  employmentType?: string
  locationName?: string
  duration?: string
  startDate?: string
  endDate?: string
  description?: string
}

export type SelfProfile = {
  plainId: number
  miniProfile: MiniProfile
  publicContactInfo?: any
  premiumSubscriber: boolean
}
