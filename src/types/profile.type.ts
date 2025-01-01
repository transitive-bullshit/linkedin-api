import { Company, EmployeeCountRange, MiniCompany } from "./company.type.js"
import { TimePeriod } from "./date.type.js"
import { LinkedVectorImage } from "./image.type.js"
import { DefaultLocale, SupportedLocale } from "./locale.type.js"
import { GeoLocation, Location } from "./location.type.js"
import { PagedList, Paging } from "./paging.type.js"

export interface ProfileView {
    entityUrn: string
    profile: ProfileViewProfile
    positionGroupView: PositionGroupView
    positionView: PositionView
    patentView: PatentView
    summaryTreasuryMediaCount: number
    summaryTreasuryMedias: any[]
    educationView: EducationView
    organizationView: OrganizationView
    projectView: ProjectView
    languageView: LanguageView
    certificationView: CertificationView
    testScoreView: TestScoreView
    volunteerCauseView: VolunteerCauseView
    courseView: CourseView
    honorView: HonorView
    skillView: SkillView
    volunteerExperienceView: VolunteerExperienceView
    primaryLocale: PrimaryLocale
    publicationView: PublicationView
  }
  
  export interface PositionGroupView {
    entityUrn: string
    profileId: string
    elements: Element[]
    paging: Paging
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
      school?: MiniSchool
      timePeriod: TimePeriod
      degreeName: string
      schoolName: string
      fieldOfStudy?: string
      schoolUrn?: string
    }[]
  }
  
  export interface MiniSchool {
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
      title: string
      description?: string
      timePeriod: TimePeriod
      companyUrn: string
      companyName: string
      company?: Company
      locationName?: string
      geoLocationName?: string
      geoUrn?: string
      region?: string
    }[]
  }
  
  export interface ProfileViewProfile {
    entityUrn: string
    firstName: string
    lastName: string
    headline: string
    summary: string
    locationName: string
    location: Location
    miniProfile: MiniProfile
    industryName: string
    industryUrn: string
    versionTag: string
    defaultLocale: DefaultLocale
    supportedLocales: SupportedLocale[]
    geoCountryName: string
    geoCountryUrn: string
    elt: boolean
    student: boolean
    geoLocationBackfilled: boolean
    showEducationOnProfileTopCard: boolean
    geoLocation: GeoLocation
    geoLocationName: string
  }

  export interface MiniProfile {
    entityUrn: string
    firstName: string
    lastName: string
    occupation: string
    dashEntityUrn: string
    objectUrn: string
    publicIdentifier: string
    trackingId: string
    backgroundImage?: LinkedVectorImage
    picture?: LinkedVectorImage
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
  
  export interface Profile {
    entityUrn: string
    id: string
    publicIdentifier: string
    firstName: string
    lastName: string
    headline: string
    summary: string
    occupation: string
    location: string
    industryName: string
    industryUrn: string
    trackingId: string
    defaultLocale: DefaultLocale
    backgroundImage?: string
    image?: string
    education?: PagedList<EducationItem>
    experience?: PagedList<ExperienceItem>
  }
  
  
  
  export interface EducationItem {
    entityUrn?: string
    schoolName: string
    degreeName?: string
    fieldOfStudy?: string
    startDate?: string
    endDate?: string
    school: {
      name: string
      entityUrn?: string
      id?: string
      active?: boolean
      logo?: string
    }
  }
  
  export interface ExperienceItem {
    entityUrn?: string
    title: string
    companyName?: string
    description?: string
    location?: string
    employmentType?: string
    duration?: string
    startDate?: string
    endDate?: string
    company: {
      name: string
      entityUrn?: string
      id?: string
      publicIdentifier?: string
      industry?: string
      logo?: string
      employeeCountRange?: EmployeeCountRange
    }
  }
  
  export interface ProfileContactInfo {
    entityUrn: string
  
    websites?: {
      type: Record<
        string,
        {
          category: string
        }
      >
      url: string
    }[]
  
    twitterHandles?: {
      name: string
      credentialId: string
    }[]
  
    emailAddress?: any[]
    phoneNumbers?: any[]
    ims?: any[]
    birthDateOn?: any
  }
  
  export interface ProfileSkills {
    paging: Paging
    elements: Element[]
  }
  
  export interface SelfProfile {
    plainId: number
    miniProfile: MiniProfile
    publicContactInfo?: any
    premiumSubscriber: boolean
  }

  export interface Element {
    entityUrn: string
    name: string
    positions?: Position[]
    paging?: Paging
    timePeriod?: TimePeriod
    miniCompany?: MiniCompany
  }
  